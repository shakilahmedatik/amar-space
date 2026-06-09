import {
  billLineItems,
  bills,
  buildings,
  type Database,
  flats,
  payments,
  rentalContracts,
  renters,
} from '@repo/db'
import type { BillStatus } from '@repo/shared/constants'
import { and, count, desc, eq, inArray, type SQL } from 'drizzle-orm'
import { BaseRepository, type ScopeContext } from './scoped-query'

export interface ListBillsFilters {
  buildingId?: string
  flatId?: string
  renterId?: string
  contractId?: string
  billingMonth?: string
  status?: BillStatus | BillStatus[]
}

export class BillingRepository extends BaseRepository {
  findById(id: string, ownerAccountId: string, tx?: Database) {
    const client = this.txOrDb(tx)
    return client.query.bills.findFirst({
      where: and(eq(bills.id, id), eq(bills.ownerAccountId, ownerAccountId)),
      with: {
        flat: { with: { building: true } },
        renter: true,
        lineItems: { orderBy: (li, { asc }) => [asc(li.createdAt)] },
        payments: { orderBy: (p, { desc: descFn }) => [descFn(p.createdAt)] },
      },
    })
  }

  findByIdWithAccess(id: string, scope: ScopeContext) {
    const conditions: SQL[] = [eq(bills.id, id)]

    if (scope.role !== 'superadmin') {
      conditions.push(eq(bills.ownerAccountId, scope.ownerAccountId))
    }

    if (scope.role === 'renter' && scope.assignedFlatId) {
      conditions.push(eq(bills.flatId, scope.assignedFlatId))
    }

    return this.db.query.bills.findFirst({
      where: and(...conditions),
      with: {
        flat: { with: { building: true } },
        renter: true,
        lineItems: { orderBy: (li, { asc }) => [asc(li.createdAt)] },
        payments: { orderBy: (p, { desc: descFn }) => [descFn(p.createdAt)] },
      },
    })
  }

  list(
    scope: ScopeContext,
    filters: ListBillsFilters,
    page: number,
    pageSize: number,
  ) {
    const client = this.db
    const offset = (page - 1) * pageSize

    const conditions: SQL[] = []

    if (scope.role !== 'superadmin') {
      conditions.push(eq(bills.ownerAccountId, scope.ownerAccountId))
    }

    if (scope.role === 'renter' && scope.assignedFlatId) {
      conditions.push(eq(bills.flatId, scope.assignedFlatId))
    }

    if (
      scope.role === 'manager' &&
      scope.assignedBuildingIds &&
      scope.assignedBuildingIds.length > 0
    ) {
      conditions.push(
        inArray(bills.flatId, this.getAssignedFlatIdsQuery(scope)),
      )
    }

    if (filters.buildingId) {
      conditions.push(
        inArray(
          bills.flatId,
          this.db
            .select({ id: flats.id })
            .from(flats)
            .where(eq(flats.buildingId, filters.buildingId)),
        ),
      )
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

    const whereClause = conditions.length > 0 ? and(...conditions)! : undefined

    return Promise.all([
      client
        .select({
          id: bills.id,
          ownerAccountId: bills.ownerAccountId,
          contractId: bills.contractId,
          flatId: bills.flatId,
          renterId: bills.renterId,
          billingMonth: bills.billingMonth,
          dueDate: bills.dueDate,
          baseRent: bills.baseRent,
          rentDays: bills.rentDays,
          totalDaysInMonth: bills.totalDaysInMonth,
          monthlyRent: bills.monthlyRent,
          totalAmount: bills.totalAmount,
          paidAmount: bills.paidAmount,
          status: bills.status,
          createdAt: bills.createdAt,
          updatedAt: bills.updatedAt,
          flatNumber: flats.flatNumber,
          buildingName: buildings.name,
          renterName: renters.fullName,
        })
        .from(bills)
        .leftJoin(flats, eq(bills.flatId, flats.id))
        .leftJoin(buildings, eq(flats.buildingId, buildings.id))
        .leftJoin(renters, eq(bills.renterId, renters.id))
        .where(whereClause)
        .orderBy(desc(bills.createdAt))
        .limit(pageSize)
        .offset(offset),
      client.select({ count: count() }).from(bills).where(whereClause),
    ])
  }

  private getAssignedFlatIdsQuery(scope: ScopeContext): string[] {
    return scope.assignedBuildingIds ?? []
  }

  findActiveContractForFlat(flatId: string, ownerAccountId: string) {
    return this.db.query.rentalContracts.findFirst({
      where: and(
        eq(rentalContracts.flatId, flatId),
        eq(rentalContracts.ownerAccountId, ownerAccountId),
        inArray(rentalContracts.status, ['active', 'pending_termination']),
      ),
    })
  }

  findExistingBill(flatId: string, billingMonth: string) {
    return this.db.query.bills.findFirst({
      where: and(
        eq(bills.flatId, flatId),
        eq(bills.billingMonth, billingMonth),
      ),
    })
  }

  create(data: typeof bills.$inferInsert, tx?: Database) {
    const client = this.txOrDb(tx)
    return client.insert(bills).values(data).returning()
  }

  update(id: string, data: Partial<typeof bills.$inferInsert>, tx?: Database) {
    const client = this.txOrDb(tx)
    return client
      .update(bills)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(bills.id, id))
      .returning()
  }

  delete(id: string, tx?: Database) {
    const client = this.txOrDb(tx)
    return client.delete(bills).where(eq(bills.id, id))
  }

  insertLineItems(data: (typeof billLineItems.$inferInsert)[], tx?: Database) {
    const client = this.txOrDb(tx)
    if (data.length === 0) return []
    return client.insert(billLineItems).values(data).returning()
  }

  getLineItems(billId: string) {
    return this.db
      .select()
      .from(billLineItems)
      .where(eq(billLineItems.billId, billId))
  }

  getPayments(billId: string) {
    return this.db.select().from(payments).where(eq(payments.billId, billId))
  }

  countLineItems(billId: string) {
    return this.db
      .select({ count: count() })
      .from(billLineItems)
      .where(eq(billLineItems.billId, billId))
  }

  batchFindActiveContracts(flatIds: string[], ownerAccountId: string) {
    if (flatIds.length === 0) return []
    return this.db
      .select()
      .from(rentalContracts)
      .where(
        and(
          inArray(rentalContracts.flatId, flatIds),
          eq(rentalContracts.ownerAccountId, ownerAccountId),
          eq(rentalContracts.status, 'active'),
        ),
      )
  }

  batchFindExistingBills(flatIds: string[], billingMonth: string) {
    if (flatIds.length === 0) return []
    return this.db
      .select({ flatId: bills.flatId })
      .from(bills)
      .where(
        and(
          inArray(bills.flatId, flatIds),
          eq(bills.billingMonth, billingMonth),
        ),
      )
  }
}
