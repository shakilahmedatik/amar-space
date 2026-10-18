import { and, desc, eq, inArray, schema } from "@omniheaven/db";
import {
  applyAdvanceAdjustmentSchema,
  BILLING_ERROR_CODES,
  billStatusEnum,
  calculateBillTotals,
  generateMonthlyBillsSchema,
  recordPaymentSchema,
  updateBillUtilitiesSchema,
  validateDepositAdjustmentSafety,
} from "@omniheaven/validators";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { orgProtectedProcedure, protectedProcedure, requireRole, router } from "../trpc";
import { recordAuditLog } from "../utils/audit";

export const billingRouter = router({
  // 1. List Bills with Filters & Financial Metrics
  listBills: orgProtectedProcedure
    .input(
      z
        .object({
          billingMonth: z.string().optional(),
          status: billStatusEnum.optional(),
          flatId: z.string().optional(),
          buildingId: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const billingMonth = input?.billingMonth;
      const status = input?.status;
      const flatId = input?.flatId;
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      const whereConditions = [eq(schema.bills.organizationId, ctx.organizationId)];

      if (billingMonth) {
        whereConditions.push(eq(schema.bills.billingMonth, billingMonth));
      }
      if (status) {
        whereConditions.push(eq(schema.bills.status, status));
      }

      const billsList = await ctx.db.query.bills.findMany({
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

      // Filter by flatId or buildingId in-memory if requested
      const filteredBills = billsList.filter((b) => {
        if (flatId && b.contract.flatId !== flatId) return false;
        if (input?.buildingId && b.contract.flat.buildingId !== input.buildingId) return false;
        return true;
      });

      // Aggregate Financial Metrics
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
    }),

  // 2. Get Single Bill by ID
  getBillById: orgProtectedProcedure
    .input(z.object({ billId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const bill = await ctx.db.query.bills.findFirst({
        where: and(
          eq(schema.bills.id, input.billId),
          eq(schema.bills.organizationId, ctx.organizationId),
        ),
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: BILLING_ERROR_CODES.BILL_NOT_FOUND,
        });
      }

      return bill;
    }),

  // 3. Batch Generate Monthly Invoices (Idempotent per contract per month)
  generateMonthlyBills: requireRole(["owner", "admin", "manager"])
    .input(generateMonthlyBillsSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.transaction(async (tx) => {
        // Fetch all active or notice_period contracts for this building
        const activeContracts = await tx.query.rentalContracts.findMany({
          where: and(
            eq(schema.rentalContracts.organizationId, ctx.organizationId),
            inArray(schema.rentalContracts.status, ["active", "notice_period"]),
          ),
          with: {
            flat: true,
            renter: true,
          },
        });

        const targetContracts = activeContracts.filter(
          (c) => c.flat.buildingId === input.buildingId,
        );

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
          // Check for existing bill for this month
          const existing = await tx.query.bills.findFirst({
            where: and(
              eq(schema.bills.organizationId, ctx.organizationId),
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
              organizationId: ctx.organizationId,
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

        // Record Audit Log
        if (createdBills.length > 0) {
          await recordAuditLog({
            db: tx,
            organizationId: ctx.organizationId,
            actorId: ctx.user.id,
            actorEmail: ctx.user.email,
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
    }),

  // 4. Update Bill Utilities & Recalculate Balance
  updateBillUtilities: requireRole(["owner", "admin", "manager"])
    .input(updateBillUtilitiesSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.transaction(async (tx) => {
        const bill = await tx.query.bills.findFirst({
          where: and(
            eq(schema.bills.id, input.billId),
            eq(schema.bills.organizationId, ctx.organizationId),
          ),
        });

        if (!bill) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: BILLING_ERROR_CODES.BILL_NOT_FOUND,
          });
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
          .where(
            and(
              eq(schema.bills.id, input.billId),
              eq(schema.bills.organizationId, ctx.organizationId),
            ),
          )
          .returning();

        await recordAuditLog({
          db: tx,
          organizationId: ctx.organizationId,
          actorId: ctx.user.id,
          actorEmail: ctx.user.email,
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
    }),

  // 5. Apply Advance Security Deposit Adjustment (Atomic Drawdown Ledger)
  applyAdvanceAdjustment: requireRole(["owner", "admin", "manager"])
    .input(applyAdvanceAdjustmentSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.transaction(async (tx) => {
        // 1. Verify Contract & Remaining Advance Balance
        const contract = await tx.query.rentalContracts.findFirst({
          where: and(
            eq(schema.rentalContracts.id, input.contractId),
            eq(schema.rentalContracts.organizationId, ctx.organizationId),
          ),
        });

        if (!contract) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: BILLING_ERROR_CODES.CONTRACT_NOT_FOUND,
          });
        }

        const remainingBalance = parseFloat(contract.remainingDepositBalance || "0.00");
        if (!validateDepositAdjustmentSafety(remainingBalance, input.amount)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: BILLING_ERROR_CODES.DEPOSIT_INSUFFICIENT,
          });
        }

        // 2. Verify Bill & Balance Due
        const bill = await tx.query.bills.findFirst({
          where: and(
            eq(schema.bills.id, input.billId),
            eq(schema.bills.organizationId, ctx.organizationId),
            eq(schema.bills.contractId, input.contractId),
          ),
        });

        if (!bill) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: BILLING_ERROR_CODES.BILL_NOT_FOUND,
          });
        }

        const balanceDue = parseFloat(bill.balanceDue);
        if (balanceDue <= 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: BILLING_ERROR_CODES.BILL_ALREADY_PAID,
          });
        }

        if (input.amount > balanceDue) {
          throw new TRPCError({
            code: "UNPROCESSABLE_CONTENT",
            message: BILLING_ERROR_CODES.PAYMENT_EXCEEDS_BALANCE,
          });
        }

        // 3. Decrement Contract Remaining Advance Deposit Balance
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
              eq(schema.rentalContracts.organizationId, ctx.organizationId),
            ),
          );

        // 4. Credit Bill & Recalculate Balance Due
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
          .where(
            and(
              eq(schema.bills.id, input.billId),
              eq(schema.bills.organizationId, ctx.organizationId),
            ),
          )
          .returning();

        // 5. Insert Advance Adjustment Ledger Record
        const adjustmentId = `adj-${crypto.randomUUID()}`;
        const [adjustment] = await tx
          .insert(schema.advanceAdjustments)
          .values({
            id: adjustmentId,
            organizationId: ctx.organizationId,
            contractId: input.contractId,
            adjustedAgainstBillId: input.billId,
            adjustmentType: input.adjustmentType,
            amount: input.amount.toFixed(2),
            balanceBefore: remainingBalance.toFixed(2),
            balanceAfter: newContractDepositBalance,
            note: input.note,
            adjustedBy: ctx.user.id,
          })
          .returning();

        // 6. Record Audit Log
        await recordAuditLog({
          db: tx,
          organizationId: ctx.organizationId,
          actorId: ctx.user.id,
          actorEmail: ctx.user.email,
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
    }),

  // 6. List Advance Adjustments for a Tenancy Contract
  listAdvanceAdjustments: orgProtectedProcedure
    .input(z.object({ contractId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.advanceAdjustments.findMany({
        where: and(
          eq(schema.advanceAdjustments.contractId, input.contractId),
          eq(schema.advanceAdjustments.organizationId, ctx.organizationId),
        ),
        with: {
          adjustedByUser: true,
          bill: true,
        },
        orderBy: [desc(schema.advanceAdjustments.createdAt)],
      });
    }),

  // 7. Record Payment & Issue Immutable Receipt
  recordPayment: requireRole(["owner", "admin", "manager"])
    .input(recordPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify transaction ID if electronic/mobile payment
      const electronicMethods = ["bkash", "nagad", "rocket", "bank_transfer", "sslcommerz"];
      if (
        electronicMethods.includes(input.paymentMethod) &&
        (!input.transactionId || input.transactionId.trim().length === 0)
      ) {
        throw new TRPCError({
          code: "UNPROCESSABLE_CONTENT",
          message: BILLING_ERROR_CODES.INVALID_TRANSACTION_ID,
        });
      }

      return await ctx.db.transaction(async (tx) => {
        const bill = await tx.query.bills.findFirst({
          where: and(
            eq(schema.bills.id, input.billId),
            eq(schema.bills.organizationId, ctx.organizationId),
          ),
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
          throw new TRPCError({
            code: "NOT_FOUND",
            message: BILLING_ERROR_CODES.BILL_NOT_FOUND,
          });
        }

        const balanceDue = parseFloat(bill.balanceDue);
        if (balanceDue <= 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: BILLING_ERROR_CODES.BILL_ALREADY_PAID,
          });
        }

        if (input.amount > balanceDue) {
          throw new TRPCError({
            code: "UNPROCESSABLE_CONTENT",
            message: BILLING_ERROR_CODES.PAYMENT_EXCEEDS_BALANCE,
          });
        }

        // 1. Recalculate Bill Financials
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

        // 2. Generate Unique Receipt Number (REC-YYYYMMDD-XXXX)
        const dateCode = input.paymentDate.replace(/-/g, "");
        const randCode = Math.floor(1000 + Math.random() * 9000).toString();
        const receiptNumber = `REC-${dateCode}-${randCode}`;

        // 3. Insert Payment
        const paymentId = `pay-${crypto.randomUUID()}`;
        const [payment] = await tx
          .insert(schema.payments)
          .values({
            id: paymentId,
            organizationId: ctx.organizationId,
            billId: bill.id,
            amount: input.amount.toFixed(2),
            paymentMethod: input.paymentMethod,
            transactionId: input.transactionId || null,
            paymentDate: input.paymentDate,
            receiptNumber,
            receivedBy: ctx.user.id,
            status: "completed",
            note: input.note || null,
          })
          .returning();

        // 4. Update Bill
        const [updatedBill] = await tx
          .update(schema.bills)
          .set({
            amountPaid: newPaid,
            balanceDue: newBalanceDue,
            status: newStatus,
            paidAt,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.bills.id, input.billId),
              eq(schema.bills.organizationId, ctx.organizationId),
            ),
          )
          .returning();

        // 5. Record Audit Log
        await recordAuditLog({
          db: tx,
          organizationId: ctx.organizationId,
          actorId: ctx.user.id,
          actorEmail: ctx.user.email,
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
    }),

  // 8. Get Receipt by Payment ID
  getReceiptById: orgProtectedProcedure
    .input(z.object({ paymentId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const payment = await ctx.db.query.payments.findFirst({
        where: and(
          eq(schema.payments.id, input.paymentId),
          eq(schema.payments.organizationId, ctx.organizationId),
        ),
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment receipt not found",
        });
      }

      return payment;
    }),

  // 9. Renter Portal: Get Current User's Bills (Scoped strictly to session.user.id)
  getMyBills: protectedProcedure.query(async ({ ctx }) => {
    const renter = await ctx.db.query.renters.findFirst({
      where: eq(schema.renters.userId, ctx.user.id),
    });

    if (!renter) {
      return [];
    }

    const contracts = await ctx.db.query.rentalContracts.findMany({
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

    return allBills.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }),

  // 10. Renter Portal: Get Single Bill by ID with Tenant Ownership Verification
  getMyBillById: protectedProcedure
    .input(z.object({ billId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const bill = await ctx.db.query.bills.findFirst({
        where: eq(schema.bills.id, input.billId),
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: BILLING_ERROR_CODES.BILL_NOT_FOUND,
        });
      }

      // Enforce tenant boundary: user must own the renter record
      if (bill.contract.renter.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: BILLING_ERROR_CODES.UNAUTHORIZED_BILL_ACCESS,
        });
      }

      return bill;
    }),
});
