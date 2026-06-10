import type { Database } from '@repo/db'
import { bills, flats, rentalContracts } from '@repo/db'
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@repo/shared/errors'
import type { RequestContext } from '@repo/shared/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuditLogger } from '../../src/plugins/audit-logger'

import { BillingService } from '../../src/services/billing'

/**
 * Unit tests for the BillingService.
 *
 * Tests validate:
 * - Bill generation for occupied flats with active contracts
 * - Duplicate bill prevention per flat per month
 * - Utility charge addition with max 20 line items
 * - Total amount recalculation after adding charges
 * - Role-based access control (Owner/Manager can generate, Renter cannot)
 * - Tenant isolation via ownerAccountId
 * - Bill listing with multi-field filters and pagination
 * - Overdue bill marking
 * - Audit event recording
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

function createMockDbForGenerate({
  occupiedFlats = [defaultFlat],
  existingBills = [] as unknown[],
  activeContracts = [defaultContract] as unknown[],
  insertedBill = defaultBill,
} = {}) {
  return {
    select: vi.fn().mockImplementation((selectArg) => {
      // Check if it's a count query
      if (selectArg && typeof selectArg === 'object' && 'count' in selectArg) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        }
      }

      // Default select implementation
      return {
        from: vi.fn().mockImplementation((table) => {
          let result: unknown[] = []
          if (table === flats) {
            result = occupiedFlats
          } else if (table === rentalContracts) {
            result = activeContracts
          } else if (table === bills) {
            result = existingBills
          }
          return {
            where: vi.fn().mockResolvedValue(result),
          }
        }),
      }
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([insertedBill]),
      }),
    }),
    query: {
      bills: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      rentalContracts: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
  }
}

// --- Tests ---

describe('BillingService', () => {
  let auditLogger: ReturnType<typeof createMockAuditLogger>

  beforeEach(() => {
    auditLogger = createMockAuditLogger()
  })

  describe('generateBills', () => {
    it('should generate bills for occupied flats with active contracts', async () => {
      const db = createMockDbForGenerate()

      const ctx = createOwnerContext()
      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.generateBills(ctx, '2024-03')

      expect(result.generated).toBe(1)
      expect(result.skipped).toHaveLength(0)
      expect(db.insert).toHaveBeenCalled()
    })

    it('should skip flats that already have a bill for the month (Requirement 7.10)', async () => {
      const db = createMockDbForGenerate({
        existingBills: [{ flatId: 'flat-1' }],
      })

      const ctx = createOwnerContext()
      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.generateBills(ctx, '2024-03')

      expect(result.generated).toBe(0)
      expect(result.skipped).toHaveLength(1)
      expect(result.skipped[0]?.reason).toContain('already exists')
      expect(db.insert).not.toHaveBeenCalled()
    })

    it('should skip flats without active rental contract', async () => {
      const db = createMockDbForGenerate({
        activeContracts: [],
      })

      const ctx = createOwnerContext()
      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.generateBills(ctx, '2024-03')

      expect(result.generated).toBe(0)
      expect(result.skipped).toHaveLength(1)
      expect(result.skipped[0]?.reason).toContain('No active rental contract')
    })

    it('should skip flats with no rent amount defined (Requirement 7.12)', async () => {
      const contractNoRent = { ...defaultContract, monthlyRent: '0' }

      const db = createMockDbForGenerate({
        activeContracts: [contractNoRent],
      })

      const ctx = createOwnerContext()
      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.generateBills(ctx, '2024-03')

      expect(result.generated).toBe(0)
      expect(result.skipped).toHaveLength(1)
      expect(result.skipped[0]?.reason).toContain('No rent amount defined')
    })

    it('should reject renter from generating bills (Requirement 7.14)', async () => {
      const db = { select: vi.fn(), query: {} }
      const ctx = createRenterContext()
      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(service.generateBills(ctx, '2024-03')).rejects.toThrow(
        ForbiddenError,
      )
    })

    it('should reject invalid billing month format', async () => {
      const db = { select: vi.fn(), query: {} }
      const ctx = createOwnerContext()
      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(service.generateBills(ctx, '2024-13')).rejects.toThrow(
        ValidationError,
      )
      await expect(service.generateBills(ctx, 'invalid')).rejects.toThrow(
        ValidationError,
      )
    })

    it('should record audit event for each generated bill (Requirement 7.9)', async () => {
      const db = createMockDbForGenerate()

      const ctx = createOwnerContext()
      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await service.generateBills(ctx, '2024-03')

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'owner-1',
          action: 'bill_created',
          entityType: 'bill',
          entityId: 'bill-1',
          ownerAccountId: 'owner-account-1',
        }),
      )
    })

    it('should allow manager to generate bills for assigned buildings', async () => {
      const db = createMockDbForGenerate()

      const ctx = createManagerContext()
      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.generateBills(ctx, '2024-03')

      expect(result.generated).toBe(1)
    })
  })

  describe('addUtilityCharge', () => {
    it('should add a utility charge and recalculate total', async () => {
      const db = {
        query: {
          bills: {
            findFirst: vi.fn().mockResolvedValue(defaultBill),
          },
          flats: {
            findFirst: vi.fn().mockResolvedValue(defaultFlat),
          },
          renters: {
            findFirst: vi.fn(),
          },
        },
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 2 }]),
          }),
        })),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 'line-item-1',
                billId: 'bill-1',
                description: 'Water bill',
                amount: '500.00',
                createdAt: new Date(),
              },
            ]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      }

      // Override select for the sum query (second call)
      let selectCallCount = 0
      db.select = vi.fn().mockImplementation(() => {
        selectCallCount++
        if (selectCallCount === 1) {
          // count query for line items
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 2 }]),
            }),
          }
        }
        // sum query for total
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: '2500.00' }]),
          }),
        }
      })

      const ctx = createOwnerContext()
      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.addUtilityCharge(ctx, 'bill-1', {
        description: 'Water bill',
        amount: 500,
      })

      expect(result.id).toBe('line-item-1')
      expect(result.description).toBe('Water bill')
      expect(result.amount).toBe('500.00')
      expect(db.update).toHaveBeenCalled()
    })

    it('should reject when max 20 line items reached (Requirement 7.2)', async () => {
      const db = {
        query: {
          bills: {
            findFirst: vi.fn().mockResolvedValue(defaultBill),
          },
          flats: {
            findFirst: vi.fn().mockResolvedValue(defaultFlat),
          },
          renters: {
            findFirst: vi.fn(),
          },
        },
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 20 }]),
          }),
        }),
        insert: vi.fn(),
      }

      const ctx = createOwnerContext()
      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.addUtilityCharge(ctx, 'bill-1', {
          description: 'Extra charge',
          amount: 100,
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject renter from adding utility charges (Requirement 7.14)', async () => {
      const db = { query: {}, select: vi.fn() }
      const ctx = createRenterContext()
      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.addUtilityCharge(ctx, 'bill-1', {
          description: 'Water',
          amount: 500,
        }),
      ).rejects.toThrow(ForbiddenError)
    })

    it('should reject invalid charge description (empty)', async () => {
      const db = { query: {}, select: vi.fn() }
      const ctx = createOwnerContext()
      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.addUtilityCharge(ctx, 'bill-1', {
          description: '',
          amount: 500,
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject charge amount exceeding 999,999.99', async () => {
      const db = { query: {}, select: vi.fn() }
      const ctx = createOwnerContext()
      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.addUtilityCharge(ctx, 'bill-1', {
          description: 'Big charge',
          amount: 1_000_000,
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject charge amount less than 0.01', async () => {
      const db = { query: {}, select: vi.fn() }
      const ctx = createOwnerContext()
      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.addUtilityCharge(ctx, 'bill-1', {
          description: 'Tiny charge',
          amount: 0,
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should throw NotFoundError for non-existent bill', async () => {
      const db = {
        query: {
          bills: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        }),
      }

      const ctx = createOwnerContext()
      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.addUtilityCharge(ctx, 'nonexistent-bill', {
          description: 'Water',
          amount: 500,
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('should record audit event when charge is added (Requirement 7.9)', async () => {
      let selectCallCount = 0
      const db = {
        query: {
          bills: {
            findFirst: vi.fn().mockResolvedValue(defaultBill),
          },
          flats: {
            findFirst: vi.fn().mockResolvedValue(defaultFlat),
          },
          renters: {
            findFirst: vi.fn(),
          },
        },
        select: vi.fn().mockImplementation(() => {
          selectCallCount++
          if (selectCallCount === 1) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ count: 0 }]),
              }),
            }
          }
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ total: '500.00' }]),
            }),
          }
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 'line-item-1',
                billId: 'bill-1',
                description: 'Water',
                amount: '500.00',
                createdAt: new Date(),
              },
            ]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      }

      const ctx = createOwnerContext()
      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await service.addUtilityCharge(ctx, 'bill-1', {
        description: 'Water',
        amount: 500,
      })

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'owner-1',
          action: 'bill_utility_charge_added',
          entityType: 'bill',
          entityId: 'bill-1',
          ownerAccountId: 'owner-account-1',
        }),
      )
    })
  })

  describe('getBill', () => {
    it('should return bill with line items and payments', async () => {
      const lineItems = [
        {
          id: 'li-1',
          billId: 'bill-1',
          description: 'Water',
          amount: '500.00',
          createdAt: new Date(),
        },
      ]
      const billPayments = [
        {
          id: 'pay-1',
          ownerAccountId: 'owner-account-1',
          billId: 'bill-1',
          receiptReference: 'RCP123456789012',
          amount: '5000.00',
          paymentDate: '2024-03-15',
          paymentMethod: 'cash',
          note: null,
          createdAt: new Date(),
        },
      ]

      const db = {
        query: {
          bills: {
            findFirst: vi.fn().mockResolvedValue(defaultBill),
          },
          flats: {
            findFirst: vi.fn().mockResolvedValue(defaultFlat),
          },
          renters: {
            findFirst: vi.fn(),
          },
        },
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockImplementation((_table: unknown) => ({
            where: vi.fn().mockImplementation(() => {
              // Determine which table is being queried based on call order
              return []
            }),
          })),
        })),
      }

      // Override select to return different data based on call
      let selectCallCount = 0
      db.select = vi.fn().mockImplementation(() => {
        selectCallCount++
        return {
          from: vi.fn().mockReturnValue({
            where: vi
              .fn()
              .mockResolvedValue(
                selectCallCount === 1 ? lineItems : billPayments,
              ),
          }),
        }
      })

      const ctx = createOwnerContext()
      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.getBill(ctx, 'bill-1')

      expect(result.id).toBe('bill-1')
      expect(result.lineItems).toHaveLength(1)
      expect(result.lineItems[0]?.description).toBe('Water')
      expect(result.payments).toHaveLength(1)
      expect(result.payments[0]?.receiptReference).toBe('RCP123456789012')
    })

    it('should throw NotFoundError for non-existent bill', async () => {
      const db = {
        query: {
          bills: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
        select: vi.fn(),
      }

      const ctx = createOwnerContext()
      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(service.getBill(ctx, 'nonexistent')).rejects.toThrow(
        NotFoundError,
      )
    })

    it('should enforce renter can only see their own bills (Requirement 7.8)', async () => {
      const db = {
        query: {
          bills: {
            findFirst: vi.fn().mockResolvedValue(defaultBill),
          },
          flats: {
            findFirst: vi.fn().mockResolvedValue(defaultFlat),
          },
          renters: {
            findFirst: vi.fn().mockResolvedValue(null), // renter not found for this user
          },
        },
        select: vi.fn(),
      }

      const ctx = createRenterContext({ userId: 'different-user' })
      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(service.getBill(ctx, 'bill-1')).rejects.toThrow(
        NotFoundError,
      )
    })

    it('should enforce manager can only see bills for assigned buildings (Requirement 7.7)', async () => {
      const unassignedFlat = { ...defaultFlat, buildingId: 'building-99' }

      const db = {
        query: {
          bills: {
            findFirst: vi.fn().mockResolvedValue(defaultBill),
          },
          flats: {
            findFirst: vi.fn().mockResolvedValue(unassignedFlat),
          },
          renters: {
            findFirst: vi.fn(),
          },
        },
        select: vi.fn(),
      }

      const ctx = createManagerContext({
        assignedBuildingIds: ['building-1'],
      })
      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(service.getBill(ctx, 'bill-1')).rejects.toThrow(
        NotFoundError,
      )
    })
  })

  describe('listBills', () => {
    it('should return paginated bills for owner', async () => {
      const billsList = [defaultBill]

      let selectCallCount = 0
      const db = {
        query: {
          renters: {
            findFirst: vi.fn(),
          },
        },
        select: vi.fn().mockImplementation(() => {
          selectCallCount++
          if (selectCallCount % 2 === 1) {
            const fromObj = {
              leftJoin: vi.fn(),
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue(billsList),
                  }),
                }),
              }),
            }
            fromObj.leftJoin.mockImplementation(() => fromObj)
            return {
              from: vi.fn().mockReturnValue(fromObj),
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
      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.listBills(ctx, {}, { page: 1, pageSize: 50 })

      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(50)
    })

    it('should cap pageSize at 50 (Requirement 7.11)', async () => {
      let selectCallCount = 0
      const db = {
        query: {
          renters: {
            findFirst: vi.fn(),
          },
        },
        select: vi.fn().mockImplementation(() => {
          selectCallCount++
          if (selectCallCount % 2 === 1) {
            const fromObj = {
              leftJoin: vi.fn(),
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue([]),
                  }),
                }),
              }),
            }
            fromObj.leftJoin.mockImplementation(() => fromObj)
            return {
              from: vi.fn().mockReturnValue(fromObj),
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
      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.listBills(
        ctx,
        {},
        { page: 1, pageSize: 100 },
      )

      expect(result.pageSize).toBe(50)
    })

    it('should return empty result for renter with no renter record', async () => {
      const db = {
        query: {
          renters: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
        select: vi.fn(),
      }

      const ctx = createRenterContext()
      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.listBills(ctx, {}, { page: 1, pageSize: 50 })

      expect(result.data).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('should return empty result for manager with no assigned flats', async () => {
      let selectCallCount = 0
      const db = {
        query: {
          renters: {
            findFirst: vi.fn(),
          },
        },
        select: vi.fn().mockImplementation(() => {
          selectCallCount++
          if (selectCallCount % 2 === 1) {
            const fromObj = {
              leftJoin: vi.fn(),
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue([]),
                  }),
                }),
              }),
            }
            fromObj.leftJoin.mockImplementation(() => fromObj)
            return {
              from: vi.fn().mockReturnValue(fromObj),
            }
          }
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 0 }]),
            }),
          }
        }),
      }

      const ctx = createManagerContext({ assignedBuildingIds: ['building-99'] })
      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.listBills(ctx, {}, { page: 1, pageSize: 50 })

      expect(result.data).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })

  describe('updateOverdueBills', () => {
    it('should mark overdue bills and return count', async () => {
      const db = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi
                .fn()
                .mockResolvedValue([{ id: 'bill-1' }, { id: 'bill-2' }]),
            }),
          }),
        }),
      }

      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const count = await service.updateOverdueBills()

      expect(count).toBe(2)
      expect(db.update).toHaveBeenCalled()
    })

    it('should return 0 when no bills are overdue', async () => {
      const db = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }

      const service = new BillingService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const count = await service.updateOverdueBills()

      expect(count).toBe(0)
    })
  })
})
