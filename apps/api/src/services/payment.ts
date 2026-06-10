import { randomInt } from 'node:crypto'
import {
  bills,
  buildings,
  type Database,
  flats,
  payments,
  rentalContracts,
  renters,
} from '@repo/db'
import {
  BILL_STATUS,
  type BillStatus,
  type PaymentMethod,
  ROLES,
} from '@repo/shared/constants'
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@repo/shared/errors'
import type {
  FieldError,
  PaginationInput,
  RequestContext,
} from '@repo/shared/types'
import {
  type RecordPaymentInput,
  recordPaymentSchema,
  validateOrThrow,
} from '@repo/shared/validation'
import { and, count, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import type { AuditLogger } from '../plugins/audit-logger'

// --- Types ---

export interface PaymentResult {
  id: string
  ownerAccountId: string
  billId: string
  receiptReference: string
  amount: string
  paymentDate: string
  paymentMethod: string
  note: string | null
  createdAt: Date
  renterName?: string
  flatNumber?: string
  buildingName?: string
  billingMonth?: string
}

export interface ListPaymentsFilters {
  billId?: string
  renterId?: string
  startDate?: string
  endDate?: string
  paymentMethod?: PaymentMethod
}

export interface PaginatedPayments {
  data: PaymentResult[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// --- Service ---

/**
 * PaymentService handles recording payments against bills, viewing payment receipts,
 * and listing payment history with filtering and pagination.
 *
 * Enforces:
 * - Tenant isolation via ownerAccountId
 * - Role-based access (Owner/Manager can record, Renter can only view own)
 * - Payment amount validation (0.01-999,999,999.99, 2 decimal places)
 * - Payment date validation (not future, not > 365 days past)
 * - Payment method validation (Cash, Bank_Transfer, Mobile_Banking)
 * - Rejects if payment exceeds remaining balance or bill is already Paid
 * - Generates unique receipt reference (alphanumeric, 12-20 chars)
 * - Updates bill paidAmount and status
 * - Supports multiple partial payments against a single bill
 * - Pagination max 50 per page
 * - Audit events for payment recording
 *
 */
export class PaymentService {
  constructor(
    private db: Database,
    private auditLogger: AuditLogger,
  ) {}

  /**
   * Records a payment against a bill.
   *
   * - Validates amount (0.01-999,999,999.99, max 2 decimal places) (Requirement 8.1, 8.11)
   * - Validates payment date (not future, not > 365 days past) (Requirement 8.1)
   * - Validates payment method (cash, bank_transfer, mobile_banking) (Requirement 8.1)
   * - Rejects if bill does not exist or is already Paid (Requirement 8.10)
   * - Rejects if amount exceeds remaining balance (Requirement 8.4)
   * - Updates bill paidAmount and status (Paid or Partially_Paid) (Requirement 8.2, 8.3)
   * - Generates unique receipt reference (Requirement 8.8)
   * - Records audit event (Requirement 8.7)
   * - Only Owner or Manager can record payments (Requirement 8.6)
   *
   */
  async recordPayment(
    ctx: RequestContext,
    data: RecordPaymentInput,
  ): Promise<PaymentResult> {
    // Renters cannot record payments
    if (ctx.role === 'renter') {
      throw new ForbiddenError()
    }

    // Validate input using Zod schema
    const validated = validateOrThrow(recordPaymentSchema, data)

    // Additional validation: amount must have at most 2 decimal places (Requirement 8.11)
    if (!this.hasMaxTwoDecimalPlaces(validated.amount)) {
      throw new ValidationError([
        {
          field: 'amount',
          message: 'Payment amount must have at most 2 decimal places',
          rule: 'decimal_places',
        },
      ])
    }

    // Validate payment date (Requirement 8.1)
    const dateErrors = this.validatePaymentDate(validated.paymentDate)
    if (dateErrors.length > 0) {
      throw new ValidationError(dateErrors)
    }

    const paymentResult = await this.db.transaction(async (tx) => {
      // Find the bill with tenant isolation and row lock
      const [lockedBill] = await tx
        .select()
        .from(bills)
        .where(
          and(
            eq(bills.id, validated.billId),
            eq(bills.ownerAccountId, ctx.ownerAccountId),
          ),
        )
        .for('update')

      if (!lockedBill) {
        throw new NotFoundError('Bill')
      }

      // Reject if bill is already Paid (Requirement 8.10)
      if (lockedBill.status === BILL_STATUS.PAID) {
        throw new ValidationError([
          {
            field: 'billId',
            message: 'Bill is already fully paid and not eligible for payment',
            rule: 'bill_status',
          },
        ])
      }

      // Role-based access check for Manager
      if (ctx.role === ROLES.MANAGER && ctx.assignedBuildingIds) {
        const flat = await tx.query.flats.findFirst({
          where: eq(flats.id, lockedBill.flatId),
        })

        if (!flat || !ctx.assignedBuildingIds.includes(flat.buildingId)) {
          throw new NotFoundError('Bill')
        }
      }

      // Calculate remaining balance (Requirement 8.4)
      // Use rounded arithmetic to avoid floating point precision issues
      const totalAmount = Number.parseFloat(lockedBill.totalAmount)
      const paidAmount = Number.parseFloat(lockedBill.paidAmount)
      const remainingBalance = Number((totalAmount - paidAmount).toFixed(2))

      if (Number(validated.amount.toFixed(2)) > remainingBalance) {
        throw new ValidationError([
          {
            field: 'amount',
            message: `Payment amount exceeds remaining balance. Maximum payable amount is ${remainingBalance.toFixed(2)}`,
            rule: 'exceeds_balance',
          },
        ])
      }

      // Generate unique receipt reference (Requirement 8.8)
      const receiptReference = this.generateReceiptReference()

      // Record the payment
      const [payment] = await tx
        .insert(payments)
        .values({
          ownerAccountId: ctx.ownerAccountId,
          billId: validated.billId,
          receiptReference,
          amount: validated.amount.toFixed(2),
          paymentDate: validated.paymentDate,
          paymentMethod: validated.paymentMethod,
          note: validated.note ?? null,
        })
        .returning()

      if (!payment) {
        throw new Error('Failed to record payment')
      }

      // Update bill paidAmount and status (Requirements 8.2, 8.3)
      // Use rounded arithmetic to avoid floating point precision issues
      const newPaidAmount = paidAmount + validated.amount
      const newPaidAmountRounded = Number(newPaidAmount.toFixed(2))
      const totalAmountRounded = Number(totalAmount.toFixed(2))
      const newStatus =
        newPaidAmountRounded >= totalAmountRounded
          ? BILL_STATUS.PAID
          : BILL_STATUS.PARTIALLY_PAID

      await tx
        .update(bills)
        .set({
          paidAmount: newPaidAmount.toFixed(2),
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(bills.id, validated.billId))

      return {
        payment,
        newPaidAmount,
        newStatus,
        receiptReference,
      }
    })

    // Record audit event (Requirement 8.7)
    this.auditLogger.log({
      actorId: ctx.userId,
      action: 'payment_recorded',
      entityType: 'bill',
      entityId: validated.billId,
      ownerAccountId: ctx.ownerAccountId,
      newValues: {
        paymentId: paymentResult.payment.id,
        amount: validated.amount,
        paymentMethod: validated.paymentMethod,
        receiptReference: paymentResult.receiptReference,
        newPaidAmount: paymentResult.newPaidAmount.toFixed(2),
        newStatus: paymentResult.newStatus,
      },
    })

    return this.mapToPaymentResult(paymentResult.payment)
  }

  /**
   * Gets a payment receipt by ID.
   *
   * - Enforces tenant isolation and role-based access
   * - Owner sees all, Manager sees assigned buildings, Renter sees own payments
   *
   */
  async getPayment(
    ctx: RequestContext,
    paymentId: string,
  ): Promise<PaymentResult> {
    const payment = await this.findPaymentWithAccess(ctx, paymentId)
    return payment
  }

  /**
   * Lists payments with filtering and pagination.
   *
   * Filters: bill, renter, date range (max 365 days), payment method
   * Pagination: max 50 per page (Requirement 8.9)
   * Role-based access: Owner sees all, Manager sees assigned buildings, Renter sees own
   *
   */
  async listPayments(
    ctx: RequestContext,
    filters: ListPaymentsFilters,
    pagination: PaginationInput,
  ): Promise<PaginatedPayments> {
    const pageSize = Math.min(Math.max(pagination.pageSize, 1), 50)
    const page = Math.max(pagination.page, 1)
    const offset = (page - 1) * pageSize

    // Validate date range filter (max 365 days span)
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate)
      const end = new Date(filters.endDate)
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      if (diffDays > 365) {
        throw new ValidationError([
          {
            field: 'dateRange',
            message: 'Date range must not exceed 365 days',
            rule: 'max_range',
          },
        ])
      }
      if (diffDays < 0) {
        throw new ValidationError([
          {
            field: 'dateRange',
            message: 'Start date must be before or equal to end date',
            rule: 'invalid_range',
          },
        ])
      }
    }

    const conditions = [eq(payments.ownerAccountId, ctx.ownerAccountId)]

    // Role-based filtering
    if (ctx.role === 'renter') {
      // Look up the renter record for this user
      const renterRecord = await this.db.query.renters.findFirst({
        where: eq(renters.userId, ctx.userId),
      })

      if (!renterRecord) {
        return {
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        }
      }

      // Find the active contract for this renter
      const activeContract = await this.db.query.rentalContracts.findFirst({
        where: and(
          eq(rentalContracts.renterId, renterRecord.id),
          eq(rentalContracts.status, 'active'),
        ),
      })

      if (!activeContract) {
        return {
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        }
      }

      // Filter payments by bills linked to the renter's flat
      const renterBills = await this.db
        .select({ id: bills.id })
        .from(bills)
        .where(
          and(
            eq(bills.ownerAccountId, ctx.ownerAccountId),
            eq(bills.flatId, activeContract.flatId),
          ),
        )

      const billIds = renterBills.map((b) => b.id)
      if (billIds.length === 0) {
        return {
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        }
      }
      conditions.push(inArray(payments.billId, billIds))
    }

    if (ctx.role === ROLES.MANAGER && ctx.assignedBuildingIds) {
      // Manager can only see payments for bills in assigned buildings
      const assignedFlats = await this.db
        .select({ id: flats.id })
        .from(flats)
        .where(
          and(
            eq(flats.ownerAccountId, ctx.ownerAccountId),
            inArray(flats.buildingId, ctx.assignedBuildingIds),
          ),
        )

      const assignedFlatIds = assignedFlats.map((f) => f.id)
      if (assignedFlatIds.length === 0) {
        return {
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        }
      }

      // Get bill IDs for assigned flats
      const assignedBills = await this.db
        .select({ id: bills.id })
        .from(bills)
        .where(
          and(
            eq(bills.ownerAccountId, ctx.ownerAccountId),
            inArray(bills.flatId, assignedFlatIds),
          ),
        )

      const assignedBillIds = assignedBills.map((b) => b.id)
      if (assignedBillIds.length === 0) {
        return {
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        }
      }
      conditions.push(inArray(payments.billId, assignedBillIds))
    }

    // Apply filters
    if (filters.billId) {
      conditions.push(eq(payments.billId, filters.billId))
    }

    if (filters.renterId) {
      // Get bill IDs for this renter
      const renterBills = await this.db
        .select({ id: bills.id })
        .from(bills)
        .where(
          and(
            eq(bills.renterId, filters.renterId),
            eq(bills.ownerAccountId, ctx.ownerAccountId),
          ),
        )

      const renterBillIds = renterBills.map((b) => b.id)
      if (renterBillIds.length === 0) {
        return {
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        }
      }
      conditions.push(inArray(payments.billId, renterBillIds))
    }

    if (filters.startDate) {
      conditions.push(gte(payments.paymentDate, filters.startDate))
    }

    if (filters.endDate) {
      conditions.push(lte(payments.paymentDate, filters.endDate))
    }

    if (filters.paymentMethod) {
      conditions.push(eq(payments.paymentMethod, filters.paymentMethod))
    }

    const whereClause = and(...conditions)

    const [data, totalResult] = await Promise.all([
      this.db
        .select({
          id: payments.id,
          ownerAccountId: payments.ownerAccountId,
          billId: payments.billId,
          receiptReference: payments.receiptReference,
          amount: payments.amount,
          paymentDate: payments.paymentDate,
          paymentMethod: payments.paymentMethod,
          note: payments.note,
          createdAt: payments.createdAt,
          renterName: renters.fullName,
          flatNumber: flats.flatNumber,
          buildingName: buildings.name,
          billingMonth: bills.billingMonth,
        })
        .from(payments)
        .leftJoin(bills, eq(payments.billId, bills.id))
        .leftJoin(renters, eq(bills.renterId, renters.id))
        .leftJoin(flats, eq(bills.flatId, flats.id))
        .leftJoin(buildings, eq(flats.buildingId, buildings.id))
        .where(whereClause)
        .orderBy(desc(payments.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: count() }).from(payments).where(whereClause),
    ])

    const total = totalResult[0]?.count ?? 0

    return {
      data: data.map((payment) => this.mapToPaymentResult(payment)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  /**
   * Deletes a payment record and updates the associated bill's paidAmount and status.
   * Scoped to the owner account and role-based access.
   */
  async deletePayment(ctx: RequestContext, paymentId: string): Promise<void> {
    // Find the payment and verify access
    const payment = await this.findPaymentWithAccess(ctx, paymentId)

    await this.db.transaction(async (tx) => {
      // 1. Delete the payment
      await tx.delete(payments).where(eq(payments.id, paymentId))

      // 2. Find the associated bill
      const bill = await tx.query.bills.findFirst({
        where: eq(bills.id, payment.billId),
      })

      if (bill) {
        // Recalculate paidAmount by summing all remaining payments
        const remainingPayments = await tx
          .select({
            sum: sql<string>`COALESCE(SUM(${payments.amount}::numeric), 0)`,
          })
          .from(payments)
          .where(eq(payments.billId, payment.billId))

        const newPaidAmount = Number.parseFloat(
          remainingPayments[0]?.sum ?? '0',
        )

        // Recalculate bill status
        const total = Number.parseFloat(bill.totalAmount)
        let newStatus: BillStatus = BILL_STATUS.UNPAID
        if (newPaidAmount >= total) {
          newStatus = BILL_STATUS.PAID
        } else if (newPaidAmount > 0) {
          newStatus = BILL_STATUS.PARTIALLY_PAID
        } else {
          newStatus = BILL_STATUS.UNPAID
        }

        // Update the bill
        await tx
          .update(bills)
          .set({
            paidAmount: newPaidAmount.toFixed(2),
            status: newStatus,
            updatedAt: new Date(),
          })
          .where(eq(bills.id, payment.billId))
      }
    })

    // Record audit event
    this.auditLogger.log({
      actorId: ctx.userId,
      action: 'payment_deleted',
      entityType: 'payment',
      entityId: paymentId,
      ownerAccountId: ctx.ownerAccountId,
      oldValues: {
        billId: payment.billId,
        amount: payment.amount,
        receiptReference: payment.receiptReference,
      },
    })
  }

  // --- Private Helpers ---

  /**
   * Finds a payment by ID with tenant isolation and role-based access enforcement.
   */
  private async findPaymentWithAccess(
    ctx: RequestContext,
    paymentId: string,
  ): Promise<PaymentResult> {
    // Renters can only see payments for their assigned flat
    if (ctx.role === 'renter') {
      // Look up the renter record for this user
      const renterRecord = await this.db.query.renters.findFirst({
        where: eq(renters.userId, ctx.userId),
      })

      if (!renterRecord) {
        throw new NotFoundError('Payment')
      }

      // Find the active contract for this renter
      const activeContract = await this.db.query.rentalContracts.findFirst({
        where: and(
          eq(rentalContracts.renterId, renterRecord.id),
          eq(rentalContracts.status, 'active'),
        ),
      })

      if (!activeContract) {
        throw new NotFoundError('Payment')
      }

      const payment = await this.db.query.payments.findFirst({
        where: and(
          eq(payments.id, paymentId),
          eq(payments.ownerAccountId, ctx.ownerAccountId),
        ),
        with: {
          bill: true,
        },
      })

      if (!payment) {
        throw new NotFoundError('Payment')
      }

      const bill = payment.bill as { flatId?: string } | null
      if (!bill || bill.flatId !== activeContract.flatId) {
        throw new NotFoundError('Payment')
      }

      return this.mapToPaymentResult(payment)
    }

    const payment = await this.db.query.payments.findFirst({
      where: and(
        eq(payments.id, paymentId),
        eq(payments.ownerAccountId, ctx.ownerAccountId),
      ),
    })

    if (!payment) {
      throw new NotFoundError('Payment')
    }

    // Role-based access check
    if (ctx.role === ROLES.MANAGER && ctx.assignedBuildingIds) {
      // Check if the payment's bill is for a flat in an assigned building
      const bill = await this.db.query.bills.findFirst({
        where: eq(bills.id, payment.billId),
      })

      if (!bill) {
        throw new NotFoundError('Payment')
      }

      const flat = await this.db.query.flats.findFirst({
        where: eq(flats.id, bill.flatId),
      })

      if (!flat || !ctx.assignedBuildingIds.includes(flat.buildingId)) {
        throw new NotFoundError('Payment')
      }
    }

    return this.mapToPaymentResult(payment)
  }

  /**
   * Validates that the payment date is not in the future and not more than 365 days in the past.
   */
  private validatePaymentDate(dateStr: string): FieldError[] {
    const errors: FieldError[] = []
    const paymentDate = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    if (paymentDate > todayEnd) {
      errors.push({
        field: 'paymentDate',
        message: 'Payment date must not be a future date',
        rule: 'not_future',
      })
    }

    const pastLimit = new Date(today)
    pastLimit.setDate(pastLimit.getDate() - 365)

    if (paymentDate < pastLimit) {
      errors.push({
        field: 'paymentDate',
        message: 'Payment date must not be more than 365 days in the past',
        rule: 'max_past',
      })
    }

    return errors
  }

  /**
   * Checks if a number has at most 2 decimal places.
   */
  private hasMaxTwoDecimalPlaces(value: number): boolean {
    const str = value.toString()
    const decimalIndex = str.indexOf('.')
    if (decimalIndex === -1) return true
    return str.length - decimalIndex - 1 <= 2
  }

  private generateReceiptReference(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const timestamp = Date.now().toString(36).toUpperCase()
    const randomLength = 16 - timestamp.length - 1 // Target ~16 chars total
    let random = ''
    for (let i = 0; i < Math.max(randomLength, 4); i++) {
      random += chars.charAt(randomInt(0, chars.length))
    }
    const reference = `${timestamp}${random}`
    // Ensure it's between 12-20 characters
    return reference.slice(0, 20).padEnd(12, '0')
  }

  private mapToPaymentResult(payment: {
    id: string
    ownerAccountId: string
    billId: string
    receiptReference: string
    amount: string
    paymentDate: string
    paymentMethod: string
    note: string | null
    createdAt: Date
    renterName?: string | null
    flatNumber?: string | null
    buildingName?: string | null
    billingMonth?: string | null
  }): PaymentResult {
    return {
      id: payment.id,
      ownerAccountId: payment.ownerAccountId,
      billId: payment.billId,
      receiptReference: payment.receiptReference,
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      note: payment.note,
      createdAt: payment.createdAt,
      renterName: payment.renterName ?? undefined,
      flatNumber: payment.flatNumber ?? undefined,
      buildingName: payment.buildingName ?? undefined,
      billingMonth: payment.billingMonth ?? undefined,
    }
  }
}
