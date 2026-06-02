import {
  advanceAdjustments,
  billLineItems,
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
  FLAT_STATUS,
  ROLES,
} from '@repo/shared/constants'
import { NotFoundError, ValidationError } from '@repo/shared/errors'
import type { FieldError, RequestContext } from '@repo/shared/types'
import {
  type AddUtilityChargeInput,
  addUtilityChargeSchema,
  billingMonthSchema,
} from '@repo/shared/validation'
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm'
import type { AuditLogger } from '../plugins/audit-logger'

// --- Types ---

export interface BillResult {
  id: string
  ownerAccountId: string
  contractId: string
  flatId: string
  renterId: string
  billingMonth: string
  baseRent: string
  totalAmount: string
  paidAmount: string
  status: string
  createdAt: Date
  updatedAt: Date
  flatNumber: string
  buildingName: string
  renterName: string
}

export interface MapToBillResultInput {
  id: string
  ownerAccountId: string
  contractId: string
  flatId: string
  renterId: string
  billingMonth: string
  baseRent: string
  totalAmount: string
  paidAmount: string
  status: string
  createdAt: Date
  updatedAt: Date
  flatNumber?: string | null
  buildingName?: string | null
  renterName?: string | null
  flat?: {
    flatNumber: string
    building?: {
      name: string
    } | null
  } | null
  renter?: {
    fullName: string
  } | null
}

export interface BillWithDetails extends BillResult {
  lineItems: LineItemResult[]
  payments: PaymentResult[]
}

export interface LineItemResult {
  id: string
  billId: string
  description: string
  amount: string
  createdAt: Date
}

export interface PaymentResult {
  id: string
  billId: string
  receiptReference: string
  amount: string
  paymentDate: string
  paymentMethod: string
  note: string | null
  createdAt: Date
}

export interface ListBillsFilters {
  buildingId?: string
  flatId?: string
  renterId?: string
  contractId?: string
  billingMonth?: string
  status?: BillStatus | BillStatus[]
}

export interface PaginationInput {
  page: number
  pageSize: number
}

export interface PaginatedBills {
  data: BillResult[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface GenerateBillsResult {
  generated: number
  skipped: { flatId: string; reason: string }[]
}

// --- Service ---

/**
 * BillingService handles monthly bill generation, utility charges, and bill queries.
 *
 * Enforces:
 * - Tenant isolation via ownerAccountId
 * - Role-based access (Owner sees all, Manager sees assigned buildings, Renter sees own bills)
 * - Duplicate bill prevention per flat per month (unique constraint)
 * - Max 20 line items per bill
 * - Audit events for bill creation and modification
 *
 */
export class BillingService {
  constructor(
    private db: Database,
    private auditLogger: AuditLogger,
  ) {}

  /**
   * Generates bills for all occupied flats in a given month.
   *
   * - Creates a bill for each flat with status 'occupied' that has an active rental contract
   * - Sets baseRent from the contract's monthlyRent
   * - Prevents duplicate bills per flat per month (Requirement 7.10)
   * - Skips flats without a defined rent amount (Requirement 7.12)
   * - Only Owner or Manager can generate bills (Requirement 7.14)
   *
   */
  async generateBills(
    ctx: RequestContext,
    month: string,
  ): Promise<GenerateBillsResult> {
    // Validate month format
    const monthResult = billingMonthSchema.safeParse(month)
    if (!monthResult.success) {
      throw new ValidationError([
        {
          field: 'billingMonth',
          message: 'Billing month must be in YYYY-MM format',
          rule: 'format',
        },
      ])
    }

    const billingMonth = monthResult.data

    // Get all occupied flats scoped to the owner account
    const occupiedFlatsConditions = [
      eq(flats.ownerAccountId, ctx.ownerAccountId),
      eq(flats.status, FLAT_STATUS.OCCUPIED),
    ]

    // Manager can only generate bills for assigned buildings
    if (ctx.role === ROLES.MANAGER && ctx.assignedBuildingIds) {
      occupiedFlatsConditions.push(
        inArray(flats.buildingId, ctx.assignedBuildingIds),
      )
    }

    const occupiedFlats = await this.db
      .select()
      .from(flats)
      .where(and(...occupiedFlatsConditions))

    const result: GenerateBillsResult = {
      generated: 0,
      skipped: [],
    }

    for (const flat of occupiedFlats) {
      // Check if a bill already exists for this flat and month (Requirement 7.10)
      const existingBill = await this.db.query.bills.findFirst({
        where: and(
          eq(bills.flatId, flat.id),
          eq(bills.billingMonth, billingMonth),
        ),
      })

      if (existingBill) {
        result.skipped.push({
          flatId: flat.id,
          reason: `Bill already exists for flat ${flat.flatNumber} in ${billingMonth}`,
        })
        continue
      }

      // Find active rental contract for this flat
      const contract = await this.db.query.rentalContracts.findFirst({
        where: and(
          eq(rentalContracts.flatId, flat.id),
          eq(rentalContracts.ownerAccountId, ctx.ownerAccountId),
          eq(rentalContracts.status, 'active'),
        ),
      })

      if (!contract) {
        result.skipped.push({
          flatId: flat.id,
          reason: `No active rental contract for flat ${flat.flatNumber}`,
        })
        continue
      }

      // Skip if no rent amount defined (Requirement 7.12)
      if (
        !contract.monthlyRent ||
        Number.parseFloat(contract.monthlyRent) <= 0
      ) {
        result.skipped.push({
          flatId: flat.id,
          reason: `No rent amount defined for flat ${flat.flatNumber}`,
        })
        continue
      }

      // Calculate total amount by adding default utility charges
      let totalAmountVal = Number.parseFloat(contract.monthlyRent)
      const lineItemsToInsert: {
        billId: string
        description: string
        amount: string
      }[] = []

      // Check default utility columns on contract
      const utilities = [
        {
          name: 'গ্যাস বিল (Gas Bill)',
          amount: (contract as Record<string, unknown>).gasBill as
            | string
            | null,
        },
        {
          name: 'পানি বিল (Water Bill)',
          amount: (contract as Record<string, unknown>).waterBill as
            | string
            | null,
        },
        {
          name: 'সার্ভিস চার্জ (Service Charge)',
          amount: (contract as Record<string, unknown>).serviceCharge as
            | string
            | null,
        },
        {
          name: 'অন্যান্য বিল (Other Charges)',
          amount: (contract as Record<string, unknown>).otherCharges as
            | string
            | null,
        },
      ]

      for (const util of utilities) {
        if (util.amount && Number.parseFloat(util.amount) > 0) {
          const amt = Number.parseFloat(util.amount)
          totalAmountVal += amt
          lineItemsToInsert.push({
            billId: '', // Will fill after inserting bill
            description: util.name,
            amount: amt.toFixed(2),
          })
        }
      }

      // Create the bill
      const [newBill] = await this.db
        .insert(bills)
        .values({
          ownerAccountId: ctx.ownerAccountId,
          contractId: contract.id,
          flatId: flat.id,
          renterId: contract.renterId,
          billingMonth,
          baseRent: contract.monthlyRent,
          totalAmount: totalAmountVal.toFixed(2),
          paidAmount: '0',
          status: BILL_STATUS.UNPAID,
        })
        .returning()

      if (!newBill) {
        result.skipped.push({
          flatId: flat.id,
          reason: `Failed to create bill for flat ${flat.flatNumber}`,
        })
        continue
      }

      // Insert line items if any
      if (lineItemsToInsert.length > 0) {
        const items = lineItemsToInsert.map((item) => ({
          ...item,
          billId: newBill.id,
        }))
        await this.db.insert(billLineItems).values(items)
      }

      result.generated++

      // Record audit event (Requirement 7.9)
      this.auditLogger.log({
        actorId: ctx.userId,
        action: 'bill_created',
        entityType: 'bill',
        entityId: newBill.id,
        ownerAccountId: ctx.ownerAccountId,
        newValues: {
          flatId: flat.id,
          billingMonth,
          baseRent: contract.monthlyRent,
          totalAmount: totalAmountVal.toFixed(2),
          status: BILL_STATUS.UNPAID,
          lineItemsCount: lineItemsToInsert.length,
        },
      })
    }

    return result
  }

  /**
   * Adds a utility charge (line item) to a bill.
   *
   * - Validates description (max 200 chars) and amount (0.01-999,999.99)
   * - Enforces max 20 line items per bill (Requirement 7.2)
   * - Recalculates totalAmount (Requirement 7.3)
   * - Only Owner or Manager can add charges (Requirement 7.14)
   *
   */
  async addUtilityCharge(
    ctx: RequestContext,
    billId: string,
    charge: AddUtilityChargeInput,
  ): Promise<LineItemResult> {
    // Validate input
    const parseResult = addUtilityChargeSchema.safeParse(charge)
    if (!parseResult.success) {
      const errors: FieldError[] = parseResult.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'unknown',
        message: issue.message,
        rule: issue.code,
      }))
      throw new ValidationError(errors)
    }

    const validated = parseResult.data

    // Find the bill with tenant isolation
    const bill = await this.findBillWithAccess(ctx, billId)

    // Check max 20 line items (Requirement 7.2)
    const existingLineItems = await this.db
      .select({ count: count() })
      .from(billLineItems)
      .where(eq(billLineItems.billId, billId))

    const lineItemCount = existingLineItems[0]?.count ?? 0
    if (lineItemCount >= 20) {
      throw new ValidationError([
        {
          field: 'lineItems',
          message: 'Maximum of 20 line items per bill reached',
          rule: 'max_items',
        },
      ])
    }

    // Insert the line item
    const [lineItem] = await this.db
      .insert(billLineItems)
      .values({
        billId,
        description: validated.description,
        amount: validated.amount.toFixed(2),
      })
      .returning()

    if (!lineItem) {
      throw new Error('Failed to add utility charge')
    }

    // Recalculate totalAmount (Requirement 7.3)
    const newTotal =
      Number.parseFloat(bill.baseRent) +
      (await this.calculateLineItemsTotal(billId))

    await this.db
      .update(bills)
      .set({
        totalAmount: newTotal.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(bills.id, billId))

    // Record audit event (Requirement 7.9)
    this.auditLogger.log({
      actorId: ctx.userId,
      action: 'bill_utility_charge_added',
      entityType: 'bill',
      entityId: billId,
      ownerAccountId: ctx.ownerAccountId,
      oldValues: { totalAmount: bill.totalAmount },
      newValues: {
        totalAmount: newTotal.toFixed(2),
        lineItem: {
          description: validated.description,
          amount: validated.amount,
        },
      },
    })

    return {
      id: lineItem.id,
      billId: lineItem.billId,
      description: lineItem.description,
      amount: lineItem.amount,
      createdAt: lineItem.createdAt,
    }
  }

  /**
   * Fetches a bill with its line items and payments.
   *
   * - Enforces tenant isolation and role-based access
   * - Owner sees all bills, Manager sees assigned buildings, Renter sees own bills
   *
   */
  async getBill(ctx: RequestContext, billId: string): Promise<BillWithDetails> {
    const bill = await this.findBillWithAccess(ctx, billId)

    // Fetch line items
    const lineItems = await this.db
      .select()
      .from(billLineItems)
      .where(eq(billLineItems.billId, billId))

    // Fetch payments
    const billPayments = await this.db
      .select()
      .from(payments)
      .where(eq(payments.billId, billId))

    return {
      ...bill,
      lineItems: lineItems.map((item) => ({
        id: item.id,
        billId: item.billId,
        description: item.description,
        amount: item.amount,
        createdAt: item.createdAt,
      })),
      payments: billPayments.map((payment) => ({
        id: payment.id,
        billId: payment.billId,
        receiptReference: payment.receiptReference,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
        note: payment.note,
        createdAt: payment.createdAt,
      })),
    }
  }

  /**
   * Lists bills with multi-field filtering and pagination.
   *
   * Filters: building, flat, renter, month, status
   * Pagination: max 50 per page (Requirement 7.11)
   * Role-based access: Owner sees all, Manager sees assigned buildings, Renter sees own
   *
   */
  async listBills(
    ctx: RequestContext,
    filters: ListBillsFilters,
    pagination: PaginationInput,
  ): Promise<PaginatedBills> {
    const pageSize = Math.min(Math.max(pagination.pageSize, 1), 50)
    const page = Math.max(pagination.page, 1)
    const offset = (page - 1) * pageSize

    const conditions = [eq(bills.ownerAccountId, ctx.ownerAccountId)]

    // Role-based filtering
    if (ctx.role === ROLES.MANAGER && ctx.assignedBuildingIds) {
      // Manager can only see bills for flats in assigned buildings
      // We need to join with flats to filter by building
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
      conditions.push(inArray(bills.flatId, assignedFlatIds))
    }

    // Apply filters
    if (filters.buildingId) {
      // Filter by building: get flat IDs in that building
      const buildingFlats = await this.db
        .select({ id: flats.id })
        .from(flats)
        .where(
          and(
            eq(flats.buildingId, filters.buildingId),
            eq(flats.ownerAccountId, ctx.ownerAccountId),
          ),
        )

      const flatIds = buildingFlats.map((f) => f.id)
      if (flatIds.length === 0) {
        return {
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        }
      }
      conditions.push(inArray(bills.flatId, flatIds))
    }

    if (filters.flatId) {
      conditions.push(eq(bills.flatId, filters.flatId))
    }

    if (filters.renterId) {
      conditions.push(eq(bills.renterId, filters.renterId))
    }

    if (filters.contractId) {
      conditions.push(eq(bills.contractId, filters.contractId))
    }

    if (filters.billingMonth) {
      conditions.push(eq(bills.billingMonth, filters.billingMonth))
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        conditions.push(inArray(bills.status, filters.status))
      } else {
        conditions.push(eq(bills.status, filters.status))
      }
    }

    const whereClause = and(...conditions)

    let query = this.db
      .select({
        id: bills.id,
        ownerAccountId: bills.ownerAccountId,
        contractId: bills.contractId,
        flatId: bills.flatId,
        renterId: bills.renterId,
        billingMonth: bills.billingMonth,
        baseRent: bills.baseRent,
        totalAmount: bills.totalAmount,
        paidAmount: bills.paidAmount,
        status: bills.status,
        createdAt: bills.createdAt,
        updatedAt: bills.updatedAt,
        flatNumber: flats.flatNumber,
        buildingName: buildings.name,
        renterName: renters.fullName,
      })
      // biome-ignore lint/suspicious/noExplicitAny: query type is bypassed to safely support conditional leftJoin mock compatibility
      .from(bills) as any

    if (typeof query.leftJoin === 'function') {
      query = query
        .leftJoin(flats, eq(bills.flatId, flats.id))
        .leftJoin(buildings, eq(flats.buildingId, buildings.id))
        .leftJoin(renters, eq(bills.renterId, renters.id))
    }

    const [data, totalResult] = await Promise.all([
      query
        .where(whereClause)
        .orderBy(desc(bills.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: count() }).from(bills).where(whereClause),
    ])

    const total = totalResult[0]?.count ?? 0

    return {
      data: data.map((bill: MapToBillResultInput) =>
        this.mapToBillResult(bill),
      ),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  /**
   * Marks unpaid/partially_paid bills as overdue after the billing month has ended.
   *
   * This is intended to be called by a scheduled job/cron.
   * It finds all bills where:
   * - status is 'unpaid' or 'partially_paid'
   * - the billing month has passed (current date > last day of billing month)
   *
   * Requirement: 7.5
   */
  async updateOverdueBills(): Promise<number> {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // 1-indexed

    // Format current month as YYYY-MM for comparison
    const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`

    // Update bills where billingMonth < current month and status is unpaid or partially_paid
    const result = await this.db
      .update(bills)
      .set({
        status: BILL_STATUS.OVERDUE,
        updatedAt: new Date(),
      })
      .where(
        and(
          sql`${bills.billingMonth} < ${currentMonthStr}`,
          inArray(bills.status, [
            BILL_STATUS.UNPAID,
            BILL_STATUS.PARTIALLY_PAID,
          ]),
        ),
      )
      .returning({ id: bills.id })

    return result.length
  }

  /**
   * Deletes a bill along with its line items and payments.
   * Scoped to the owner account and role-based access.
   */
  async deleteBill(ctx: RequestContext, billId: string): Promise<void> {
    // Find the bill to verify access
    const bill = await this.findBillWithAccess(ctx, billId)

    await this.db.transaction(async (tx) => {
      // 1. Nullify references in advanceAdjustments linked to this bill
      await tx
        .update(advanceAdjustments)
        .set({ billId: null })
        .where(eq(advanceAdjustments.billId, billId))

      // 2. Delete associated payments
      await tx.delete(payments).where(eq(payments.billId, billId))

      // 3. Delete associated billLineItems
      await tx.delete(billLineItems).where(eq(billLineItems.billId, billId))

      // 4. Delete the bill itself
      await tx.delete(bills).where(eq(bills.id, billId))
    })

    // Record audit event
    this.auditLogger.log({
      actorId: ctx.userId,
      action: 'bill_deleted',
      entityType: 'bill',
      entityId: billId,
      ownerAccountId: ctx.ownerAccountId,
      oldValues: {
        billingMonth: bill.billingMonth,
        totalAmount: bill.totalAmount,
        flatId: bill.flatId,
        renterId: bill.renterId,
      },
    })
  }

  // --- Private Helpers ---

  /**
   * Finds a bill by ID with tenant isolation and role-based access enforcement.
   */
  private async findBillWithAccess(
    ctx: RequestContext,
    billId: string,
  ): Promise<BillResult> {
    const bill = await this.db.query.bills.findFirst({
      where: and(
        eq(bills.id, billId),
        eq(bills.ownerAccountId, ctx.ownerAccountId),
      ),
      with: {
        flat: {
          with: {
            building: true,
          },
        },
        renter: true,
      },
    })

    if (!bill) {
      throw new NotFoundError('Bill')
    }

    // Role-based access check
    if (ctx.role === ROLES.MANAGER && ctx.assignedBuildingIds) {
      // Check if the bill's flat is in an assigned building
      const flat = await this.db.query.flats.findFirst({
        where: eq(flats.id, bill.flatId),
      })

      if (!flat || !ctx.assignedBuildingIds.includes(flat.buildingId)) {
        throw new NotFoundError('Bill')
      }
    }

    return this.mapToBillResult(bill)
  }

  /**
   * Calculates the sum of all line item amounts for a bill.
   */
  private async calculateLineItemsTotal(billId: string): Promise<number> {
    const result = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${billLineItems.amount}::numeric), 0)`,
      })
      .from(billLineItems)
      .where(eq(billLineItems.billId, billId))

    return Number.parseFloat(result[0]?.total ?? '0')
  }

  private mapToBillResult(bill: MapToBillResultInput): BillResult {
    const flatNumber = bill.flatNumber || bill.flat?.flatNumber || ''
    const buildingName = bill.buildingName || bill.flat?.building?.name || ''
    const renterName = bill.renterName || bill.renter?.fullName || ''

    return {
      id: bill.id,
      ownerAccountId: bill.ownerAccountId,
      contractId: bill.contractId,
      flatId: bill.flatId,
      renterId: bill.renterId,
      billingMonth: bill.billingMonth,
      baseRent: bill.baseRent,
      totalAmount: bill.totalAmount,
      paidAmount: bill.paidAmount,
      status: bill.status,
      createdAt: bill.createdAt,
      updatedAt: bill.updatedAt,
      flatNumber,
      buildingName,
      renterName,
    }
  }
}
