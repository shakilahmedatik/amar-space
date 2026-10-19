import type { Database } from "@omniheaven/db";
import { and, desc, eq, inArray, schema } from "@omniheaven/db";
import { ErrorCode, throwDomainError } from "@omniheaven/errors";
import {
  type applyAdvanceAdjustmentSchema,
  type billStatusEnum,
  calculateBillTotals,
  type generateMonthlyBillsSchema,
  type payBillSchema,
  type recordPaymentSchema,
  type updateBillUtilitiesSchema,
  validateDepositAdjustmentSafety,
} from "@omniheaven/validators";
import type { z } from "zod";
import { recordAuditLog } from "./audit.service";

export type GenerateMonthlyBillsInput = z.infer<typeof generateMonthlyBillsSchema>;
export type UpdateBillUtilitiesInput = z.infer<typeof updateBillUtilitiesSchema>;
export type ApplyAdvanceAdjustmentInput = z.infer<typeof applyAdvanceAdjustmentSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type PayBillInput = z.infer<typeof payBillSchema>;

export interface ServiceActor {
  id: string;
  email: string;
}

/**
 * 1. List Bills with Filters & Financial Metrics
 */
export async function listBills(
  db: Database,
  orgId: string,
  filter?: {
    billingMonth?: string;
    status?: z.infer<typeof billStatusEnum>;
    flatId?: string;
    buildingId?: string;
    limit?: number;
    offset?: number;
  },
) {
  const billingMonth = filter?.billingMonth;
  const status = filter?.status;
  const flatId = filter?.flatId;
  const limit = filter?.limit ?? 50;
  const offset = filter?.offset ?? 0;

  const whereConditions = [eq(schema.bills.organizationId, orgId)];

  if (billingMonth) {
    whereConditions.push(eq(schema.bills.billingMonth, billingMonth));
  }
  if (status) {
    whereConditions.push(eq(schema.bills.status, status));
  }

  const billsList = await db.query.bills.findMany({
    where: and(...whereConditions),
    with: {
      contract: {
        with: {
          renter: true,
          flat: {
            with: {
              building: true,
            },
          },
        },
      },
      payments: {
        orderBy: [desc(schema.payments.createdAt)],
      },
      advanceAdjustments: {
        orderBy: [desc(schema.advanceAdjustments.createdAt)],
      },
    },
    orderBy: [desc(schema.bills.createdAt)],
    limit,
    offset,
  });

  const filteredBills = billsList.filter((b) => {
    if (flatId && b.contract.flatId !== flatId) return false;
    if (filter?.buildingId && b.contract.flat.buildingId !== filter.buildingId) return false;
    return true;
  });

  let totalBilled = 0;
  let totalCollected = 0;
  let totalOutstanding = 0;
  let totalAdvanceAdjusted = 0;

  for (const b of filteredBills) {
    totalBilled += parseFloat(b.totalAmount || "0");
    totalCollected += parseFloat(b.amountPaid || "0");
    totalOutstanding += parseFloat(b.balanceDue || "0");
    totalAdvanceAdjusted += parseFloat(b.advanceAdjustedAmount || "0");
  }

  return {
    bills: filteredBills,
    metrics: {
      totalBilled: Math.round(totalBilled * 100) / 100,
      totalCollected: Math.round(totalCollected * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      totalAdvanceAdjusted: Math.round(totalAdvanceAdjusted * 100) / 100,
    },
  };
}

/**
 * 2. Get Single Bill by ID
 */
export async function getBillById(db: Database, orgId: string, billId: string) {
  const bill = await db.query.bills.findFirst({
    where: and(eq(schema.bills.id, billId), eq(schema.bills.organizationId, orgId)),
    with: {
      contract: {
        with: {
          renter: true,
          flat: {
            with: {
              building: true,
            },
          },
        },
      },
      payments: {
        with: {
          receivedByUser: true,
        },
        orderBy: [desc(schema.payments.createdAt)],
      },
      advanceAdjustments: {
        with: {
          adjustedByUser: true,
        },
        orderBy: [desc(schema.advanceAdjustments.createdAt)],
      },
    },
  });

  if (!bill) {
    throwDomainError(ErrorCode.BILL_NOT_FOUND);
  }

  return bill;
}

/**
 * 3. Batch Generate Monthly Invoices (Idempotent per contract per month)
 */
export async function generateMonthlyBills(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: GenerateMonthlyBillsInput,
) {
  return await db.transaction(async (tx) => {
    const activeContracts = await tx.query.rentalContracts.findMany({
      where: and(
        eq(schema.rentalContracts.organizationId, orgId),
        inArray(schema.rentalContracts.status, ["active", "notice_period"]),
      ),
      with: {
        flat: true,
        renter: true,
      },
    });

    const targetContracts = activeContracts.filter((c) => c.flat.buildingId === input.buildingId);

    if (targetContracts.length === 0) {
      return {
        createdCount: 0,
        skippedCount: 0,
        bills: [],
      };
    }

    const createdBills = [];
    let skippedCount = 0;

    for (const contract of targetContracts) {
      const existing = await tx.query.bills.findFirst({
        where: and(
          eq(schema.bills.organizationId, orgId),
          eq(schema.bills.contractId, contract.id),
          eq(schema.bills.billingMonth, input.billingMonth),
        ),
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      const rentAmount = contract.monthlyRent || "0.00";
      const serviceChargeAmount = contract.serviceCharge || "0.00";
      const totalAmount = (parseFloat(rentAmount) + parseFloat(serviceChargeAmount)).toFixed(2);
      const balanceDue = totalAmount;

      const billId = `bill-${crypto.randomUUID()}`;
      const cleanMonth = input.billingMonth.replace("-", "");
      const cleanFlat = contract.flat.flatNumber.replace(/[^a-zA-Z0-9]/g, "");
      const billNumber = `INV-${cleanMonth}-${cleanFlat}`;

      const [newBill] = await tx
        .insert(schema.bills)
        .values({
          id: billId,
          organizationId: orgId,
          contractId: contract.id,
          billNumber,
          billingMonth: input.billingMonth,
          rentAmount,
          serviceChargeAmount,
          gasAmount: "0.00",
          waterAmount: "0.00",
          electricityAmount: "0.00",
          wasteAndOtherAmount: "0.00",
          lateFeeAmount: "0.00",
          totalAmount,
          advanceAdjustedAmount: "0.00",
          amountPaid: "0.00",
          balanceDue,
          status: "unpaid",
          dueDate: input.dueDate,
          notes: input.notes || "Automated monthly rent roll batch",
        })
        .returning();

      if (newBill) {
        createdBills.push(newBill);
      }
    }

    if (createdBills.length > 0) {
      await recordAuditLog({
        db: tx,
        organizationId: orgId,
        actorId: actor.id,
        actorEmail: actor.email,
        action: "MONTHLY_BILLS_GENERATED",
        entityType: "bill_batch",
        entityId: `${input.buildingId}-${input.billingMonth}`,
        details: {
          buildingId: input.buildingId,
          billingMonth: input.billingMonth,
          createdCount: createdBills.length,
          skippedCount,
        },
      });
    }

    return {
      createdCount: createdBills.length,
      skippedCount,
      bills: createdBills,
    };
  });
}

/**
 * 4. Update Bill Utilities & Recalculate Balance
 */
export async function updateBillUtilities(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: UpdateBillUtilitiesInput,
) {
  return await db.transaction(async (tx) => {
    const bill = await tx.query.bills.findFirst({
      where: and(eq(schema.bills.id, input.billId), eq(schema.bills.organizationId, orgId)),
    });

    if (!bill) {
      throwDomainError(ErrorCode.BILL_NOT_FOUND);
    }

    const financials = {
      rentAmount: parseFloat(bill.rentAmount),
      serviceChargeAmount: parseFloat(bill.serviceChargeAmount || "0"),
      gasAmount: input.gasAmount,
      waterAmount: input.waterAmount,
      electricityAmount: input.electricityAmount,
      wasteAndOtherAmount: input.wasteAndOtherAmount,
      lateFeeAmount: input.lateFeeAmount,
      advanceAdjustedAmount: parseFloat(bill.advanceAdjustedAmount || "0"),
      amountPaid: parseFloat(bill.amountPaid || "0"),
    };

    const { totalAmount, balanceDue, status } = calculateBillTotals(financials);

    const [updatedBill] = await tx
      .update(schema.bills)
      .set({
        gasAmount: input.gasAmount.toFixed(2),
        waterAmount: input.waterAmount.toFixed(2),
        electricityAmount: input.electricityAmount.toFixed(2),
        wasteAndOtherAmount: input.wasteAndOtherAmount.toFixed(2),
        lateFeeAmount: input.lateFeeAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        balanceDue: balanceDue.toFixed(2),
        status,
        notes: input.notes ?? bill.notes,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.bills.id, input.billId), eq(schema.bills.organizationId, orgId)))
      .returning();

    await recordAuditLog({
      db: tx,
      organizationId: orgId,
      actorId: actor.id,
      actorEmail: actor.email,
      action: "BILL_UTILITIES_UPDATED",
      entityType: "bill",
      entityId: input.billId,
      details: {
        gasAmount: input.gasAmount,
        waterAmount: input.waterAmount,
        electricityAmount: input.electricityAmount,
        wasteAndOtherAmount: input.wasteAndOtherAmount,
        lateFeeAmount: input.lateFeeAmount,
        totalAmount,
        balanceDue,
        status,
      },
    });

    return updatedBill;
  });
}

/**
 * 5. Apply Advance Security Deposit Adjustment (Atomic Drawdown Ledger)
 */
export async function applyAdvanceAdjustment(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: ApplyAdvanceAdjustmentInput,
) {
  return await db.transaction(async (tx) => {
    const contract = await tx.query.rentalContracts.findFirst({
      where: and(
        eq(schema.rentalContracts.id, input.contractId),
        eq(schema.rentalContracts.organizationId, orgId),
      ),
    });

    if (!contract) {
      throwDomainError(ErrorCode.CONTRACT_NOT_FOUND);
    }

    const remainingBalance = parseFloat(contract.remainingDepositBalance || "0.00");
    if (!validateDepositAdjustmentSafety(remainingBalance, input.amount)) {
      throwDomainError(ErrorCode.DEPOSIT_INSUFFICIENT);
    }

    const bill = await tx.query.bills.findFirst({
      where: and(
        eq(schema.bills.id, input.billId),
        eq(schema.bills.organizationId, orgId),
        eq(schema.bills.contractId, input.contractId),
      ),
    });

    if (!bill) {
      throwDomainError(ErrorCode.BILL_NOT_FOUND);
    }

    const balanceDue = parseFloat(bill.balanceDue);
    if (balanceDue <= 0) {
      throwDomainError(ErrorCode.BILL_ALREADY_PAID);
    }

    if (input.amount > balanceDue) {
      throwDomainError(ErrorCode.PAYMENT_EXCEEDS_BALANCE);
    }

    const newContractDepositBalance = (remainingBalance - input.amount).toFixed(2);
    await tx
      .update(schema.rentalContracts)
      .set({
        remainingDepositBalance: newContractDepositBalance,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.rentalContracts.id, input.contractId),
          eq(schema.rentalContracts.organizationId, orgId),
        ),
      );

    const currentAdvanceAdjusted = parseFloat(bill.advanceAdjustedAmount || "0.00");
    const newAdvanceAdjusted = (currentAdvanceAdjusted + input.amount).toFixed(2);
    const amountPaid = parseFloat(bill.amountPaid || "0.00");
    const totalAmount = parseFloat(bill.totalAmount);
    const newBalanceDue = Math.max(
      0,
      Math.round((totalAmount - parseFloat(newAdvanceAdjusted) - amountPaid) * 100) / 100,
    ).toFixed(2);

    let nextStatus: string = bill.status;
    if (parseFloat(newBalanceDue) <= 0) {
      if (parseFloat(newAdvanceAdjusted) >= totalAmount && amountPaid === 0) {
        nextStatus = "adjusted";
      } else {
        nextStatus = "paid";
      }
    } else {
      nextStatus = "partially_paid";
    }

    const [updatedBill] = await tx
      .update(schema.bills)
      .set({
        advanceAdjustedAmount: newAdvanceAdjusted,
        balanceDue: newBalanceDue,
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.bills.id, input.billId), eq(schema.bills.organizationId, orgId)))
      .returning();

    const adjustmentId = `adj-${crypto.randomUUID()}`;
    const [adjustment] = await tx
      .insert(schema.advanceAdjustments)
      .values({
        id: adjustmentId,
        organizationId: orgId,
        contractId: input.contractId,
        adjustedAgainstBillId: input.billId,
        adjustmentType: input.adjustmentType,
        amount: input.amount.toFixed(2),
        balanceBefore: remainingBalance.toFixed(2),
        balanceAfter: newContractDepositBalance,
        note: input.note,
        adjustedBy: actor.id,
      })
      .returning();

    await recordAuditLog({
      db: tx,
      organizationId: orgId,
      actorId: actor.id,
      actorEmail: actor.email,
      action: "ADVANCE_ADJUSTMENT_APPLIED",
      entityType: "advance_adjustment",
      entityId: adjustmentId,
      details: {
        contractId: input.contractId,
        billId: input.billId,
        adjustmentAmount: input.amount,
        previousDepositBalance: remainingBalance,
        newDepositBalance: parseFloat(newContractDepositBalance),
        newBalanceDue: parseFloat(newBalanceDue),
      },
    });

    return {
      adjustment,
      updatedBill,
      remainingDepositBalance: newContractDepositBalance,
    };
  });
}

/**
 * 6. List Advance Adjustments for a Tenancy Contract
 */
export async function listAdvanceAdjustments(db: Database, orgId: string, contractId: string) {
  return await db.query.advanceAdjustments.findMany({
    where: and(
      eq(schema.advanceAdjustments.contractId, contractId),
      eq(schema.advanceAdjustments.organizationId, orgId),
    ),
    with: {
      adjustedByUser: true,
      bill: true,
    },
    orderBy: [desc(schema.advanceAdjustments.createdAt)],
  });
}

/**
 * 7. Record Payment & Issue Immutable Receipt
 */
export async function recordPayment(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: RecordPaymentInput,
) {
  const electronicMethods = ["bkash", "nagad", "rocket", "bank_transfer", "sslcommerz"];
  if (
    electronicMethods.includes(input.paymentMethod) &&
    (!input.transactionId || input.transactionId.trim().length === 0)
  ) {
    throwDomainError(ErrorCode.INVALID_TRANSACTION_ID);
  }

  return await db.transaction(async (tx) => {
    const bill = await tx.query.bills.findFirst({
      where: and(eq(schema.bills.id, input.billId), eq(schema.bills.organizationId, orgId)),
      with: {
        contract: {
          with: {
            renter: true,
            flat: true,
          },
        },
      },
    });

    if (!bill) {
      throwDomainError(ErrorCode.BILL_NOT_FOUND);
    }

    const balanceDue = parseFloat(bill.balanceDue);
    if (balanceDue <= 0) {
      throwDomainError(ErrorCode.BILL_ALREADY_PAID);
    }

    if (input.amount > balanceDue) {
      throwDomainError(ErrorCode.PAYMENT_EXCEEDS_BALANCE);
    }

    const currentPaid = parseFloat(bill.amountPaid || "0.00");
    const newPaid = (currentPaid + input.amount).toFixed(2);
    const totalAmount = parseFloat(bill.totalAmount);
    const advanceAdjusted = parseFloat(bill.advanceAdjustedAmount || "0.00");
    const newBalanceDue = Math.max(
      0,
      Math.round((totalAmount - advanceAdjusted - parseFloat(newPaid)) * 100) / 100,
    ).toFixed(2);

    const newStatus = parseFloat(newBalanceDue) <= 0 ? "paid" : "partially_paid";
    const paidAt = parseFloat(newBalanceDue) <= 0 ? new Date() : bill.paidAt;

    const dateCode = input.paymentDate.replace(/-/g, "");
    const randCode = Math.floor(1000 + Math.random() * 9000).toString();
    const receiptNumber = `REC-${dateCode}-${randCode}`;

    const paymentId = `pay-${crypto.randomUUID()}`;
    const [payment] = await tx
      .insert(schema.payments)
      .values({
        id: paymentId,
        organizationId: orgId,
        billId: bill.id,
        amount: input.amount.toFixed(2),
        paymentMethod: input.paymentMethod,
        transactionId: input.transactionId || null,
        paymentDate: input.paymentDate,
        receiptNumber,
        receivedBy: actor.id,
        status: "completed",
        note: input.note || null,
      })
      .returning();

    const [updatedBill] = await tx
      .update(schema.bills)
      .set({
        amountPaid: newPaid,
        balanceDue: newBalanceDue,
        status: newStatus,
        paidAt,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.bills.id, input.billId), eq(schema.bills.organizationId, orgId)))
      .returning();

    await recordAuditLog({
      db: tx,
      organizationId: orgId,
      actorId: actor.id,
      actorEmail: actor.email,
      action: "PAYMENT_RECORDED",
      entityType: "payment",
      entityId: paymentId,
      details: {
        billId: bill.id,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        transactionId: input.transactionId,
        receiptNumber,
        newBalanceDue: parseFloat(newBalanceDue),
        status: newStatus,
      },
    });

    return {
      payment,
      updatedBill,
    };
  });
}

/**
 * 8. Get Receipt by Payment ID
 */
export async function getReceiptById(db: Database, orgId: string, paymentId: string) {
  const payment = await db.query.payments.findFirst({
    where: and(eq(schema.payments.id, paymentId), eq(schema.payments.organizationId, orgId)),
    with: {
      receivedByUser: true,
      bill: {
        with: {
          contract: {
            with: {
              renter: true,
              flat: {
                with: {
                  building: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!payment) {
    throwDomainError(ErrorCode.BILL_NOT_FOUND, "Payment receipt not found");
  }

  return payment;
}

/**
 * 9. Renter Portal: Get Current User's Bills
 */
export async function getMyBills(db: Database, userId: string) {
  const renter = await db.query.renters.findFirst({
    where: eq(schema.renters.userId, userId),
  });

  if (!renter) {
    return [];
  }

  const contracts = await db.query.rentalContracts.findMany({
    where: eq(schema.rentalContracts.renterId, renter.id),
    with: {
      bills: {
        with: {
          payments: {
            orderBy: [desc(schema.payments.createdAt)],
          },
          advanceAdjustments: true,
        },
        orderBy: [desc(schema.bills.createdAt)],
      },
      flat: {
        with: {
          building: true,
        },
      },
    },
  });

  const allBills = contracts.flatMap((c) =>
    c.bills.map((b) => ({
      ...b,
      flat: c.flat,
    })),
  );

  return allBills.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * 10. Renter Portal: Get Single Bill by ID with Tenant Ownership Verification
 */
export async function getMyBillById(db: Database, userId: string, billId: string) {
  const bill = await db.query.bills.findFirst({
    where: eq(schema.bills.id, billId),
    with: {
      contract: {
        with: {
          renter: true,
          flat: {
            with: {
              building: true,
            },
          },
        },
      },
      payments: {
        orderBy: [desc(schema.payments.createdAt)],
      },
      advanceAdjustments: true,
    },
  });

  if (!bill) {
    throwDomainError(ErrorCode.BILL_NOT_FOUND);
  }

  if (bill.contract.renter.userId !== userId) {
    throwDomainError(ErrorCode.UNAUTHORIZED_BILL_ACCESS);
  }

  return bill;
}

/**
 * 11. Renter Portal: Pay My Bill
 */
export async function payMyBill(
  db: Database,
  user: { id: string; email: string },
  input: PayBillInput,
) {
  return await db.transaction(async (tx) => {
    const bill = await tx.query.bills.findFirst({
      where: eq(schema.bills.id, input.billId),
      with: {
        contract: {
          with: {
            renter: true,
            flat: true,
          },
        },
      },
    });

    if (!bill) {
      throwDomainError(ErrorCode.BILL_NOT_FOUND);
    }

    if (bill.contract.renter.userId !== user.id) {
      throwDomainError(ErrorCode.UNAUTHORIZED_BILL_ACCESS);
    }

    const balanceDue = parseFloat(bill.balanceDue);
    if (balanceDue <= 0) {
      throwDomainError(ErrorCode.BILL_ALREADY_PAID);
    }

    if (input.amount > balanceDue) {
      throwDomainError(ErrorCode.PAYMENT_EXCEEDS_BALANCE);
    }

    const currentPaid = parseFloat(bill.amountPaid || "0.00");
    const newPaid = (currentPaid + input.amount).toFixed(2);
    const totalAmount = parseFloat(bill.totalAmount);
    const advanceAdjusted = parseFloat(bill.advanceAdjustedAmount || "0.00");
    const newBalanceDue = Math.max(
      0,
      Math.round((totalAmount - advanceAdjusted - parseFloat(newPaid)) * 100) / 100,
    ).toFixed(2);

    const newStatus = parseFloat(newBalanceDue) <= 0 ? "paid" : "partially_paid";
    const paidAt = parseFloat(newBalanceDue) <= 0 ? new Date() : bill.paidAt;

    const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randCode = Math.floor(1000 + Math.random() * 9000).toString();
    const receiptNumber = `REC-${dateCode}-${randCode}`;

    const paymentId = `pay-${crypto.randomUUID()}`;
    const [payment] = await tx
      .insert(schema.payments)
      .values({
        id: paymentId,
        organizationId: bill.organizationId,
        billId: bill.id,
        amount: input.amount.toFixed(2),
        paymentMethod: input.paymentMethod,
        transactionId: input.transactionId,
        paymentDate: new Date().toISOString().slice(0, 10),
        receiptNumber,
        receivedBy: user.id,
        status: "completed",
        note:
          input.note || `Digital ${input.paymentMethod.toUpperCase()} payment via Renter Portal`,
      })
      .returning();

    const [updatedBill] = await tx
      .update(schema.bills)
      .set({
        amountPaid: newPaid,
        balanceDue: newBalanceDue,
        status: newStatus,
        paidAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.bills.id, input.billId))
      .returning();

    await recordAuditLog({
      db: tx,
      organizationId: bill.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: "PAYMENT_RECORDED",
      entityType: "payment",
      entityId: paymentId,
      details: {
        billId: bill.id,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        transactionId: input.transactionId,
        receiptNumber,
        newBalanceDue: parseFloat(newBalanceDue),
        status: newStatus,
      },
    });

    return {
      payment,
      updatedBill,
    };
  });
}

/**
 * 12. Flat Portal: Pay Bill by Access Link / QR Code (Public / Flat-scoped)
 */
export async function payPortalBill(db: Database, input: PayBillInput) {
  return await db.transaction(async (tx) => {
    const bill = await tx.query.bills.findFirst({
      where: eq(schema.bills.id, input.billId),
      with: {
        contract: {
          with: {
            renter: true,
            flat: true,
          },
        },
      },
    });

    if (!bill) {
      throwDomainError(ErrorCode.BILL_NOT_FOUND);
    }

    const balanceDue = parseFloat(bill.balanceDue);
    if (balanceDue <= 0) {
      throwDomainError(ErrorCode.BILL_ALREADY_PAID);
    }

    if (input.amount > balanceDue) {
      throwDomainError(ErrorCode.PAYMENT_EXCEEDS_BALANCE);
    }

    const currentPaid = parseFloat(bill.amountPaid || "0.00");
    const newPaid = (currentPaid + input.amount).toFixed(2);
    const totalAmount = parseFloat(bill.totalAmount);
    const advanceAdjusted = parseFloat(bill.advanceAdjustedAmount || "0.00");
    const newBalanceDue = Math.max(
      0,
      Math.round((totalAmount - advanceAdjusted - parseFloat(newPaid)) * 100) / 100,
    ).toFixed(2);

    const newStatus = parseFloat(newBalanceDue) <= 0 ? "paid" : "partially_paid";
    const paidAt = parseFloat(newBalanceDue) <= 0 ? new Date() : bill.paidAt;

    const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randCode = Math.floor(1000 + Math.random() * 9000).toString();
    const receiptNumber = `REC-${dateCode}-${randCode}`;

    const paymentId = `pay-${crypto.randomUUID()}`;
    const [payment] = await tx
      .insert(schema.payments)
      .values({
        id: paymentId,
        organizationId: bill.organizationId,
        billId: bill.id,
        amount: input.amount.toFixed(2),
        paymentMethod: input.paymentMethod,
        transactionId: input.transactionId,
        paymentDate: new Date().toISOString().slice(0, 10),
        receiptNumber,
        receivedBy: bill.contract.renter.userId || "portal-system",
        status: "completed",
        note: input.note || `Digital ${input.paymentMethod.toUpperCase()} payment via Flat Portal`,
      })
      .returning();

    const [updatedBill] = await tx
      .update(schema.bills)
      .set({
        amountPaid: newPaid,
        balanceDue: newBalanceDue,
        status: newStatus,
        paidAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.bills.id, input.billId))
      .returning();

    return {
      payment,
      updatedBill,
    };
  });
}

/**
 * 13. Flat Portal: Get complete billing, lease, and building metadata by flat slug or identifier
 */
export async function getPortalFlatBilling(db: Database, flatSlug: string) {
  const normalized = flatSlug
    .toLowerCase()
    .replace(/^flat-/, "")
    .toUpperCase();

  const allFlats = await db.query.flats.findMany({
    with: {
      building: {
        with: {
          emergencyContacts: true,
        },
      },
      rentalContracts: {
        where: inArray(schema.rentalContracts.status, ["active", "notice_period"]),
        with: {
          renter: true,
          bills: {
            with: {
              payments: {
                orderBy: [desc(schema.payments.createdAt)],
              },
              advanceAdjustments: {
                orderBy: [desc(schema.advanceAdjustments.createdAt)],
              },
            },
            orderBy: [desc(schema.bills.createdAt)],
          },
        },
        orderBy: [desc(schema.rentalContracts.createdAt)],
      },
    },
  });

  let targetFlat = allFlats.find(
    (f) =>
      f.flatNumber.toUpperCase() === normalized ||
      f.flatNumber.toUpperCase() === flatSlug.toUpperCase() ||
      `flat-${f.flatNumber.toLowerCase()}` === flatSlug.toLowerCase(),
  );

  if (!targetFlat || targetFlat.rentalContracts.length === 0) {
    targetFlat = allFlats.find((f) => f.rentalContracts.length > 0) ?? allFlats[0];
  }

  if (!targetFlat) {
    throwDomainError(ErrorCode.FLAT_NOT_FOUND, "No flat found");
  }

  const activeContract = targetFlat.rentalContracts[0] ?? null;
  const bills = activeContract ? activeContract.bills : [];

  const notices = await db.query.notices.findMany({
    where: targetFlat.buildingId
      ? eq(schema.notices.targetBuildingId, targetFlat.buildingId)
      : eq(schema.notices.targetAudience, "all_renters"),
    orderBy: [desc(schema.notices.isPinned), desc(schema.notices.createdAt)],
  });

  return {
    flat: {
      id: targetFlat.id,
      flatNumber: targetFlat.flatNumber,
      floor: targetFlat.floor,
      unitType: targetFlat.unitType,
      bedrooms: targetFlat.bedrooms,
      bathrooms: targetFlat.bathrooms,
      squareFeet: targetFlat.squareFeet,
      status: targetFlat.status,
      electricityMeterNumber: targetFlat.electricityMeterNumber,
      waterSubmeterNumber: targetFlat.waterSubmeterNumber,
      gasType: targetFlat.gasType,
    },
    building: targetFlat.building,
    contract: activeContract
      ? {
          id: activeContract.id,
          status: activeContract.status,
          startDate: activeContract.startDate,
          endDate: activeContract.endDate,
          monthlyRent: activeContract.monthlyRent,
          serviceCharge: activeContract.serviceCharge,
          advanceDepositAmount:
            activeContract.advanceAmount || activeContract.securityDepositAmount,
          remainingDepositBalance: activeContract.remainingDepositBalance,
          noticePeriodDays: activeContract.noticePeriodDays,
          signedContractUrl: activeContract.contractDocumentUrl,
          renter: activeContract.renter,
        }
      : null,
    bills,
    emergencyContacts: targetFlat.building?.emergencyContacts ?? [],
    notices,
  };
}
