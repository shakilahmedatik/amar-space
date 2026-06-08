import {
  advanceAdjustments,
  bills,
  type Database,
  flats,
  rentalContracts,
  renters,
} from '@repo/db'
import { BILL_STATUS, ROLES } from '@repo/shared/constants'
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@repo/shared/errors'
import type { FieldError, RequestContext } from '@repo/shared/types'
import {
  type ApplyAdjustmentInput,
  applyAdjustmentSchema,
} from '@repo/shared/validation'
import { and, count, desc, eq } from 'drizzle-orm'
import type { AuditLogger } from '../plugins/audit-logger'

// --- Types ---

export interface DepositResult {
  contractId: string
  ownerAccountId: string
  renterId: string
  flatId: string
  securityDepositAmount: string
  remainingDepositBalance: string
}

export interface AdjustmentResult {
  id: string
  ownerAccountId: string
  contractId: string
  amount: string
  billId: string | null
  note: string | null
  adjustedBy: string
  createdAt: Date
}

export interface PaginationInput {
  page: number
  pageSize: number
}

export interface PaginatedAdjustments {
  data: AdjustmentResult[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// --- Service ---

/**
 * DepositService handles security deposit tracking, advance adjustments,
 * and remaining balance management for rental contracts.
 *
 * Enforces:
 * - Tenant isolation via ownerAccountId
 * - Role-based access (Owner can make adjustments, Manager can view, Renter can view own)
 * - Adjustment amount validation (min 0.01, must not exceed remaining balance)
 * - Adjustment note validation (max 500 characters)
 * - When linked to bill: apply as payment, update bill status
 * - Reject if bill already Paid or adjustment exceeds bill outstanding
 * - Pagination max 50 per page, sorted by createdAt desc
 * - Audit events with old/new balance values
 *
 */
export class DepositService {
  constructor(
    private db: Database,
    private auditLogger: AuditLogger,
  ) {}

  /**
   * Gets the deposit information for a rental contract, including remaining balance.
   *
   * - Enforces tenant isolation and role-based access
   * - Owner sees all, Manager sees assigned buildings, Renter sees own
   *
   */
  async getDeposit(
    ctx: RequestContext,
    contractId: string,
  ): Promise<DepositResult> {
    const contract = await this.findContractWithAccess(ctx, contractId)
    return this.mapToDepositResult(contract)
  }

  /**
   * Applies an advance adjustment against a rental contract's deposit balance.
   *
   * - Validates amount (min 0.01, max 99,999,999.99) (Requirement 9.2)
   * - Validates note (max 500 characters) (Requirement 9.2)
   * - Rejects if amount exceeds remaining deposit balance (Requirement 9.4)
   * - When linked to bill: applies as payment, updates bill status (Requirement 9.5)
   * - Rejects if linked bill is already Paid or adjustment exceeds bill outstanding (Requirement 9.6)
   * - Deducts from remaining deposit balance (Requirement 9.3)
   * - Records audit event with old/new balance values (Requirement 9.10)
   * - Only Owner can make adjustments (Requirement 9.7)
   *
   */
  async applyAdjustment(
    ctx: RequestContext,
    contractId: string,
    data: ApplyAdjustmentInput,
  ): Promise<AdjustmentResult> {
    // Only Owner can make adjustments (Requirement 9.7)
    if (ctx.role !== ROLES.OWNER) {
      throw new ForbiddenError()
    }

    // Validate input using Zod schema
    const parseResult = applyAdjustmentSchema.safeParse(data)
    if (!parseResult.success) {
      const errors: FieldError[] = parseResult.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'unknown',
        message: issue.message,
        rule: issue.code,
      }))
      throw new ValidationError(errors)
    }

    const validated = parseResult.data

    // Find the contract with tenant isolation
    const contract = await this.db.query.rentalContracts.findFirst({
      where: and(
        eq(rentalContracts.id, contractId),
        eq(rentalContracts.ownerAccountId, ctx.ownerAccountId),
      ),
    })

    if (!contract) {
      throw new NotFoundError('Contract')
    }

    const remainingBalance = Number.parseFloat(contract.remainingDepositBalance)

    // Reject if adjustment exceeds remaining deposit balance (Requirement 9.4)
    if (validated.amount > remainingBalance) {
      throw new ValidationError([
        {
          field: 'amount',
          message: `Adjustment amount exceeds remaining deposit balance. Maximum adjustable amount is ${remainingBalance.toFixed(2)}`,
          rule: 'exceeds_balance',
        },
      ])
    }

    // If linked to a bill, validate the bill (Requirement 9.5, 9.6)
    if (validated.billId) {
      const bill = await this.db.query.bills.findFirst({
        where: and(
          eq(bills.id, validated.billId),
          eq(bills.ownerAccountId, ctx.ownerAccountId),
        ),
      })

      if (!bill) {
        throw new NotFoundError('Bill')
      }

      // Reject if bill is already Paid (Requirement 9.6)
      if (bill.status === BILL_STATUS.PAID) {
        throw new ValidationError([
          {
            field: 'billId',
            message:
              'Bill is already fully paid and not eligible for adjustment',
            rule: 'bill_status',
          },
        ])
      }

      // Calculate bill outstanding balance
      const billTotal = Number.parseFloat(bill.totalAmount)
      const billPaid = Number.parseFloat(bill.paidAmount)
      const billOutstanding = billTotal - billPaid

      // Reject if adjustment exceeds bill outstanding (Requirement 9.6)
      if (validated.amount > billOutstanding) {
        throw new ValidationError([
          {
            field: 'amount',
            message: `Adjustment amount exceeds bill outstanding balance. Bill outstanding is ${billOutstanding.toFixed(2)}`,
            rule: 'exceeds_bill_outstanding',
          },
        ])
      }

      // Apply adjustment as payment against the bill (Requirement 9.5)
      const newPaidAmount = billPaid + validated.amount
      const newBillStatus =
        newPaidAmount >= billTotal
          ? BILL_STATUS.PAID
          : BILL_STATUS.PARTIALLY_PAID

      await this.db
        .update(bills)
        .set({
          paidAmount: newPaidAmount.toFixed(2),
          status: newBillStatus,
          updatedAt: new Date(),
        })
        .where(eq(bills.id, validated.billId))
    }

    // Deduct from remaining deposit balance (Requirement 9.3)
    const oldBalance = remainingBalance
    const newBalance = remainingBalance - validated.amount

    await this.db
      .update(rentalContracts)
      .set({
        remainingDepositBalance: newBalance.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(rentalContracts.id, contractId))

    // Create the advance adjustment record (Requirement 9.2)
    const [adjustment] = await this.db
      .insert(advanceAdjustments)
      .values({
        ownerAccountId: ctx.ownerAccountId,
        contractId,
        amount: validated.amount.toFixed(2),
        billId: validated.billId ?? null,
        note: validated.note ?? null,
        adjustedBy: ctx.userId,
      })
      .returning()

    if (!adjustment) {
      throw new Error('Failed to create advance adjustment')
    }

    // Record audit event with old/new balance values (Requirement 9.10)
    this.auditLogger.log({
      actorId: ctx.userId,
      action: 'deposit_adjustment_applied',
      entityType: 'rental_contract',
      entityId: contractId,
      ownerAccountId: ctx.ownerAccountId,
      oldValues: {
        remainingDepositBalance: oldBalance.toFixed(2),
      },
      newValues: {
        remainingDepositBalance: newBalance.toFixed(2),
        adjustmentId: adjustment.id,
        adjustmentAmount: validated.amount.toFixed(2),
        billId: validated.billId ?? null,
      },
    })

    return this.mapToAdjustmentResult(adjustment)
  }

  /**
   * Lists all adjustments for a contract with pagination.
   *
   * - Max 50 per page, sorted by createdAt desc (Requirement 9.11)
   * - Enforces tenant isolation and role-based access
   * - Owner sees all, Manager sees assigned buildings, Renter sees own
   *
   */
  async listAdjustments(
    ctx: RequestContext,
    contractId: string,
    pagination: PaginationInput,
  ): Promise<PaginatedAdjustments> {
    // Verify access to the contract
    await this.findContractWithAccess(ctx, contractId)

    const pageSize = Math.min(Math.max(pagination.pageSize, 1), 50)
    const page = Math.max(pagination.page, 1)
    const offset = (page - 1) * pageSize

    const conditions = [
      eq(advanceAdjustments.contractId, contractId),
      eq(advanceAdjustments.ownerAccountId, ctx.ownerAccountId),
    ]

    const whereClause = and(...conditions)

    const [data, totalResult] = await Promise.all([
      this.db
        .select()
        .from(advanceAdjustments)
        .where(whereClause)
        .orderBy(desc(advanceAdjustments.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(advanceAdjustments)
        .where(whereClause),
    ])

    const total = totalResult[0]?.count ?? 0

    return {
      data: data.map((adj) => this.mapToAdjustmentResult(adj)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  // --- Private Helpers ---

  /**
   * Finds a rental contract by ID with tenant isolation and role-based access enforcement.
   */
  private async findContractWithAccess(
    ctx: RequestContext,
    contractId: string,
  ): Promise<typeof rentalContracts.$inferSelect> {
    // Renters can only see their own contract
    if (ctx.role === 'renter') {
      // Look up the renter record for this user
      const renterRecord = await this.db.query.renters.findFirst({
        where: eq(renters.userId, ctx.userId),
      })

      if (!renterRecord) {
        throw new NotFoundError('Contract')
      }

      // Find the active contract for this renter
      const contract = await this.db.query.rentalContracts.findFirst({
        where: and(
          eq(rentalContracts.id, contractId),
          eq(rentalContracts.renterId, renterRecord.id),
          eq(rentalContracts.ownerAccountId, ctx.ownerAccountId),
          eq(rentalContracts.status, 'active'),
        ),
      })

      if (!contract) {
        throw new NotFoundError('Contract')
      }

      return contract
    }

    const contract = await this.db.query.rentalContracts.findFirst({
      where: and(
        eq(rentalContracts.id, contractId),
        eq(rentalContracts.ownerAccountId, ctx.ownerAccountId),
      ),
    })

    if (!contract) {
      throw new NotFoundError('Contract')
    }

    // Role-based access check
    if (ctx.role === ROLES.MANAGER && ctx.assignedBuildingIds) {
      // Manager can view contracts for flats in assigned buildings
      const flat = await this.db.query.flats.findFirst({
        where: eq(flats.id, contract.flatId),
      })

      if (!flat || !ctx.assignedBuildingIds.includes(flat.buildingId)) {
        throw new NotFoundError('Contract')
      }
    }

    return contract
  }

  private mapToDepositResult(
    contract: typeof rentalContracts.$inferSelect,
  ): DepositResult {
    return {
      contractId: contract.id,
      ownerAccountId: contract.ownerAccountId,
      renterId: contract.renterId,
      flatId: contract.flatId,
      securityDepositAmount: contract.securityDepositAmount,
      remainingDepositBalance: contract.remainingDepositBalance,
    }
  }

  private mapToAdjustmentResult(
    adjustment: typeof advanceAdjustments.$inferSelect,
  ): AdjustmentResult {
    return {
      id: adjustment.id,
      ownerAccountId: adjustment.ownerAccountId,
      contractId: adjustment.contractId,
      amount: adjustment.amount,
      billId: adjustment.billId,
      note: adjustment.note,
      adjustedBy: adjustment.adjustedBy,
      createdAt: adjustment.createdAt,
    }
  }
}
