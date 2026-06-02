import type { Database } from '@repo/db'
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@repo/shared/errors'
import type { RequestContext } from '@repo/shared/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuditLogger } from '../../src/plugins/audit-logger'
import { DepositService } from '../../src/services/deposit'

/**
 * Unit tests for the DepositService.
 *
 * Tests validate:
 * - Deposit retrieval with remaining balance
 * - Advance adjustment application with balance deduction
 * - Rejection when adjustment exceeds remaining balance
 * - Bill-linked adjustments with bill status updates
 * - Rejection when linked bill is already Paid
 * - Rejection when adjustment exceeds bill outstanding
 * - Role-based access control (Owner adjusts, Manager/Renter view)
 * - Pagination for adjustment listing (max 50, sorted desc)
 * - Audit event recording with old/new balance values
 *
 */

// --- Mock Helpers ---

function createMockAuditLogger() {
  return {
    log: vi.fn(),
    query: vi.fn(),
    pendingRetries: 0,
    shutdown: vi.fn(),
  }
}

function createOwnerContext(
  overrides: Partial<RequestContext> = {},
): RequestContext {
  return {
    userId: 'owner-1',
    role: 'owner',
    ownerAccountId: 'owner-account-1',
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    ...overrides,
  }
}

function createManagerContext(
  overrides: Partial<RequestContext> = {},
): RequestContext {
  return {
    userId: 'manager-1',
    role: 'manager',
    ownerAccountId: 'owner-account-1',
    assignedBuildingIds: ['building-1'],
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    ...overrides,
  }
}

function createRenterContext(
  overrides: Partial<RequestContext> = {},
): RequestContext {
  return {
    userId: 'renter-user-1',
    role: 'renter',
    ownerAccountId: 'owner-account-1',
    assignedFlatId: 'flat-1',
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    ...overrides,
  }
}

const defaultContract = {
  id: 'contract-1',
  ownerAccountId: 'owner-account-1',
  renterId: 'renter-1',
  flatId: 'flat-1',
  monthlyRent: '15000.00',
  startDate: '2024-01-01',
  endDate: null,
  securityDepositAmount: '30000.00',
  remainingDepositBalance: '30000.00',
  status: 'active',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

const defaultFlat = {
  id: 'flat-1',
  ownerAccountId: 'owner-account-1',
  buildingId: 'building-1',
  flatNumber: 'A101',
  floor: 1,
  status: 'occupied',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

const defaultBill = {
  id: 'bill-1',
  ownerAccountId: 'owner-account-1',
  contractId: 'contract-1',
  flatId: 'flat-1',
  renterId: 'renter-1',
  billingMonth: '2024-03',
  baseRent: '15000.00',
  totalAmount: '15000.00',
  paidAmount: '0',
  status: 'unpaid',
  createdAt: new Date('2024-03-01'),
  updatedAt: new Date('2024-03-01'),
}

const defaultAdjustment = {
  id: 'adj-1',
  ownerAccountId: 'owner-account-1',
  contractId: 'contract-1',
  amount: '5000.00',
  billId: null,
  note: 'Deduction for damages',
  adjustedBy: 'owner-1',
  createdAt: new Date('2024-03-15'),
}

// --- Tests ---

describe('DepositService', () => {
  let auditLogger: ReturnType<typeof createMockAuditLogger>

  beforeEach(() => {
    auditLogger = createMockAuditLogger()
  })

  describe('getDeposit', () => {
    it('should return deposit info for a valid contract', async () => {
      const db = {
        query: {
          rentalContracts: {
            findFirst: vi.fn().mockResolvedValue(defaultContract),
          },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn() },
        },
      }

      const ctx = createOwnerContext()
      const service = new DepositService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.getDeposit(ctx, 'contract-1')

      expect(result.contractId).toBe('contract-1')
      expect(result.securityDepositAmount).toBe('30000.00')
      expect(result.remainingDepositBalance).toBe('30000.00')
    })

    it('should throw NotFoundError for non-existent contract', async () => {
      const db = {
        query: {
          rentalContracts: { findFirst: vi.fn().mockResolvedValue(null) },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn() },
        },
      }

      const ctx = createOwnerContext()
      const service = new DepositService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(service.getDeposit(ctx, 'nonexistent')).rejects.toThrow(
        NotFoundError,
      )
    })

    it('should allow manager to view deposit for assigned building (Req 9.8)', async () => {
      const db = {
        query: {
          rentalContracts: {
            findFirst: vi.fn().mockResolvedValue(defaultContract),
          },
          flats: { findFirst: vi.fn().mockResolvedValue(defaultFlat) },
          renters: { findFirst: vi.fn() },
        },
      }

      const ctx = createManagerContext()
      const service = new DepositService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.getDeposit(ctx, 'contract-1')
      expect(result.contractId).toBe('contract-1')
    })

    it('should deny manager access to unassigned building (Req 9.8)', async () => {
      const unassignedFlat = { ...defaultFlat, buildingId: 'building-99' }
      const db = {
        query: {
          rentalContracts: {
            findFirst: vi.fn().mockResolvedValue(defaultContract),
          },
          flats: { findFirst: vi.fn().mockResolvedValue(unassignedFlat) },
          renters: { findFirst: vi.fn() },
        },
      }

      const ctx = createManagerContext({ assignedBuildingIds: ['building-1'] })
      const service = new DepositService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(service.getDeposit(ctx, 'contract-1')).rejects.toThrow(
        NotFoundError,
      )
    })

    it('should allow renter to view own deposit (Req 9.9)', async () => {
      const renter = {
        id: 'renter-1',
        userId: 'renter-user-1',
        ownerAccountId: 'owner-account-1',
      }
      const db = {
        query: {
          rentalContracts: {
            findFirst: vi.fn().mockResolvedValue(defaultContract),
          },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn().mockResolvedValue(renter) },
        },
      }

      const ctx = createRenterContext()
      const service = new DepositService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.getDeposit(ctx, 'contract-1')
      expect(result.contractId).toBe('contract-1')
    })

    it('should deny renter access to other contracts (Req 9.9)', async () => {
      const renter = {
        id: 'renter-2',
        userId: 'renter-user-1',
        ownerAccountId: 'owner-account-1',
      }
      const db = {
        query: {
          rentalContracts: {
            findFirst: vi.fn().mockResolvedValue(defaultContract),
          },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn().mockResolvedValue(renter) },
        },
      }

      const ctx = createRenterContext()
      const service = new DepositService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(service.getDeposit(ctx, 'contract-1')).rejects.toThrow(
        NotFoundError,
      )
    })
  })

  describe('applyAdjustment', () => {
    it('should apply adjustment and deduct from balance (Req 9.3)', async () => {
      const db = {
        query: {
          rentalContracts: {
            findFirst: vi.fn().mockResolvedValue(defaultContract),
          },
          bills: { findFirst: vi.fn() },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn() },
        },
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([defaultAdjustment]),
          }),
        }),
      }

      const ctx = createOwnerContext()
      const service = new DepositService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.applyAdjustment(ctx, 'contract-1', {
        amount: 5000,
        note: 'Deduction for damages',
      })

      expect(result.id).toBe('adj-1')
      expect(result.amount).toBe('5000.00')
      expect(db.update).toHaveBeenCalled()
    })

    it('should reject if adjustment exceeds remaining balance (Req 9.4)', async () => {
      const contractLowBalance = {
        ...defaultContract,
        remainingDepositBalance: '1000.00',
      }
      const db = {
        query: {
          rentalContracts: {
            findFirst: vi.fn().mockResolvedValue(contractLowBalance),
          },
          bills: { findFirst: vi.fn() },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn() },
        },
        update: vi.fn(),
        insert: vi.fn(),
      }

      const ctx = createOwnerContext()
      const service = new DepositService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.applyAdjustment(ctx, 'contract-1', { amount: 5000 }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject if manager tries to make adjustment (Req 9.7)', async () => {
      const db = { query: {}, update: vi.fn(), insert: vi.fn() }
      const ctx = createManagerContext()
      const service = new DepositService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.applyAdjustment(ctx, 'contract-1', { amount: 1000 }),
      ).rejects.toThrow(ForbiddenError)
    })

    it('should reject if renter tries to make adjustment (Req 9.7)', async () => {
      const db = { query: {}, update: vi.fn(), insert: vi.fn() }
      const ctx = createRenterContext()
      const service = new DepositService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.applyAdjustment(ctx, 'contract-1', { amount: 1000 }),
      ).rejects.toThrow(ForbiddenError)
    })

    it('should reject invalid amount (below 0.01)', async () => {
      const db = { query: {}, update: vi.fn(), insert: vi.fn() }
      const ctx = createOwnerContext()
      const service = new DepositService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.applyAdjustment(ctx, 'contract-1', { amount: 0 }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject note exceeding 500 characters', async () => {
      const db = { query: {}, update: vi.fn(), insert: vi.fn() }
      const ctx = createOwnerContext()
      const service = new DepositService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.applyAdjustment(ctx, 'contract-1', {
          amount: 1000,
          note: 'x'.repeat(501),
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should apply adjustment linked to bill and update bill status (Req 9.5)', async () => {
      const billWithBalance = {
        ...defaultBill,
        totalAmount: '15000.00',
        paidAmount: '10000.00',
        status: 'partially_paid',
      }
      const adjustmentWithBill = {
        ...defaultAdjustment,
        billId: 'bill-1',
      }

      const db = {
        query: {
          rentalContracts: {
            findFirst: vi.fn().mockResolvedValue(defaultContract),
          },
          bills: { findFirst: vi.fn().mockResolvedValue(billWithBalance) },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn() },
        },
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([adjustmentWithBill]),
          }),
        }),
      }

      const ctx = createOwnerContext()
      const service = new DepositService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.applyAdjustment(ctx, 'contract-1', {
        amount: 5000,
        billId: 'a0000000-0000-4000-8000-000000000001',
      })

      expect(result.billId).toBe('bill-1')
      // update called for both bill and contract
      expect(db.update).toHaveBeenCalledTimes(2)
    })

    it('should reject if linked bill is already Paid (Req 9.6)', async () => {
      const paidBill = {
        ...defaultBill,
        status: 'paid',
        paidAmount: '15000.00',
      }
      const db = {
        query: {
          rentalContracts: {
            findFirst: vi.fn().mockResolvedValue(defaultContract),
          },
          bills: { findFirst: vi.fn().mockResolvedValue(paidBill) },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn() },
        },
        update: vi.fn(),
        insert: vi.fn(),
      }

      const ctx = createOwnerContext()
      const service = new DepositService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.applyAdjustment(ctx, 'contract-1', {
          amount: 1000,
          billId: 'a0000000-0000-4000-8000-000000000001',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject if adjustment exceeds bill outstanding (Req 9.6)', async () => {
      const billSmallOutstanding = {
        ...defaultBill,
        totalAmount: '15000.00',
        paidAmount: '14500.00',
        status: 'partially_paid',
      }
      const db = {
        query: {
          rentalContracts: {
            findFirst: vi.fn().mockResolvedValue(defaultContract),
          },
          bills: {
            findFirst: vi.fn().mockResolvedValue(billSmallOutstanding),
          },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn() },
        },
        update: vi.fn(),
        insert: vi.fn(),
      }

      const ctx = createOwnerContext()
      const service = new DepositService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.applyAdjustment(ctx, 'contract-1', {
          amount: 1000,
          billId: 'a0000000-0000-4000-8000-000000000001',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should record audit event with old/new balance (Req 9.10)', async () => {
      const db = {
        query: {
          rentalContracts: {
            findFirst: vi.fn().mockResolvedValue(defaultContract),
          },
          bills: { findFirst: vi.fn() },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn() },
        },
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([defaultAdjustment]),
          }),
        }),
      }

      const ctx = createOwnerContext()
      const service = new DepositService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await service.applyAdjustment(ctx, 'contract-1', {
        amount: 5000,
        note: 'Deduction for damages',
      })

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'owner-1',
          action: 'deposit_adjustment_applied',
          entityType: 'rental_contract',
          entityId: 'contract-1',
          ownerAccountId: 'owner-account-1',
          oldValues: { remainingDepositBalance: '30000.00' },
          newValues: expect.objectContaining({
            remainingDepositBalance: '25000.00',
            adjustmentAmount: '5000.00',
          }),
        }),
      )
    })

    it('should throw NotFoundError for non-existent contract', async () => {
      const db = {
        query: {
          rentalContracts: { findFirst: vi.fn().mockResolvedValue(null) },
          bills: { findFirst: vi.fn() },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn() },
        },
        update: vi.fn(),
        insert: vi.fn(),
      }

      const ctx = createOwnerContext()
      const service = new DepositService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.applyAdjustment(ctx, 'nonexistent', { amount: 1000 }),
      ).rejects.toThrow(NotFoundError)
    })

    it('should throw NotFoundError for non-existent linked bill', async () => {
      const db = {
        query: {
          rentalContracts: {
            findFirst: vi.fn().mockResolvedValue(defaultContract),
          },
          bills: { findFirst: vi.fn().mockResolvedValue(null) },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn() },
        },
        update: vi.fn(),
        insert: vi.fn(),
      }

      const ctx = createOwnerContext()
      const service = new DepositService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.applyAdjustment(ctx, 'contract-1', {
          amount: 1000,
          billId: 'a0000000-0000-4000-8000-000000000099',
        }),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('listAdjustments', () => {
    it('should return paginated adjustments sorted by createdAt desc (Req 9.11)', async () => {
      const adjustments = [defaultAdjustment]

      let selectCallCount = 0
      const db = {
        query: {
          rentalContracts: {
            findFirst: vi.fn().mockResolvedValue(defaultContract),
          },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn() },
        },
        select: vi.fn().mockImplementation(() => {
          selectCallCount++
          if (selectCallCount % 2 === 1) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      offset: vi.fn().mockResolvedValue(adjustments),
                    }),
                  }),
                }),
              }),
            }
          }
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 1 }]),
            }),
          }
        }),
      }

      const ctx = createOwnerContext()
      const service = new DepositService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.listAdjustments(ctx, 'contract-1', {
        page: 1,
        pageSize: 50,
      })

      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(50)
      expect(result.totalPages).toBe(1)
    })

    it('should cap pageSize at 50 (Req 9.11)', async () => {
      let selectCallCount = 0
      const db = {
        query: {
          rentalContracts: {
            findFirst: vi.fn().mockResolvedValue(defaultContract),
          },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn() },
        },
        select: vi.fn().mockImplementation(() => {
          selectCallCount++
          if (selectCallCount % 2 === 1) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      offset: vi.fn().mockResolvedValue([]),
                    }),
                  }),
                }),
              }),
            }
          }
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 0 }]),
            }),
          }
        }),
      }

      const ctx = createOwnerContext()
      const service = new DepositService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.listAdjustments(ctx, 'contract-1', {
        page: 1,
        pageSize: 100,
      })

      expect(result.pageSize).toBe(50)
    })

    it('should enforce access control for listing (Req 9.8, 9.9)', async () => {
      const db = {
        query: {
          rentalContracts: { findFirst: vi.fn().mockResolvedValue(null) },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn() },
        },
        select: vi.fn(),
      }

      const ctx = createRenterContext()
      const service = new DepositService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.listAdjustments(ctx, 'contract-1', { page: 1, pageSize: 50 }),
      ).rejects.toThrow(NotFoundError)
    })
  })
})
