import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@repo/shared/errors'
import type { RequestContext } from '@repo/shared/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PaymentService } from '../../src/services/payment'

/**
 * Unit tests for the PaymentService.
 *
 * Tests validate:
 * - Payment recording with amount, date, and method validation
 * - Receipt reference generation (alphanumeric, 12-20 chars)
 * - Rejection when payment exceeds remaining balance
 * - Rejection when bill is already Paid
 * - Payment date validation (not future, not > 365 days past)
 * - Payment method validation (cash, bank_transfer, mobile_banking)
 * - Bill status update (Paid if fully paid, Partially_Paid if partial)
 * - Role-based access control (Owner/Manager can record, Renter cannot)
 * - Tenant isolation via ownerAccountId
 * - Payment listing with filters and pagination (max 50 per page)
 * - Audit event recording
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11
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
    userId: OWNER_USER_ID,
    role: 'owner',
    ownerAccountId: OWNER_ACCOUNT_ID,
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    ...overrides,
  }
}

function createManagerContext(
  overrides: Partial<RequestContext> = {},
): RequestContext {
  return {
    userId: MANAGER_USER_ID,
    role: 'manager',
    ownerAccountId: OWNER_ACCOUNT_ID,
    assignedBuildingIds: [BUILDING_ID],
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    ...overrides,
  }
}

function createRenterContext(
  overrides: Partial<RequestContext> = {},
): RequestContext {
  return {
    userId: RENTER_USER_ID,
    role: 'renter',
    ownerAccountId: OWNER_ACCOUNT_ID,
    assignedFlatId: FLAT_ID,
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    ...overrides,
  }
}

// Use valid UUIDs for test data since Zod validates UUID format
const BILL_ID = '00000000-0000-4000-8000-000000000001'
const FLAT_ID = '00000000-0000-4000-8000-000000000002'
const BUILDING_ID = '00000000-0000-4000-8000-000000000003'
const OWNER_ACCOUNT_ID = '00000000-0000-4000-8000-000000000004'
const CONTRACT_ID = '00000000-0000-4000-8000-000000000005'
const RENTER_ID = '00000000-0000-4000-8000-000000000006'
const PAYMENT_ID = '00000000-0000-4000-8000-000000000007'
const OWNER_USER_ID = '00000000-0000-4000-8000-000000000008'
const MANAGER_USER_ID = '00000000-0000-4000-8000-000000000009'
const RENTER_USER_ID = '00000000-0000-4000-8000-00000000000a'
const UNASSIGNED_BUILDING_ID = '00000000-0000-4000-8000-00000000000b'

const defaultFlat = {
  id: FLAT_ID,
  ownerAccountId: OWNER_ACCOUNT_ID,
  buildingId: BUILDING_ID,
  flatNumber: 'A101',
  floor: 1,
  status: 'occupied',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

const defaultBill = {
  id: BILL_ID,
  ownerAccountId: OWNER_ACCOUNT_ID,
  contractId: CONTRACT_ID,
  flatId: FLAT_ID,
  renterId: RENTER_ID,
  billingMonth: '2024-03',
  baseRent: '15000.00',
  totalAmount: '15000.00',
  paidAmount: '0',
  status: 'unpaid',
  createdAt: new Date('2024-03-01'),
  updatedAt: new Date('2024-03-01'),
}

const defaultPayment = {
  id: PAYMENT_ID,
  ownerAccountId: OWNER_ACCOUNT_ID,
  billId: BILL_ID,
  receiptReference: 'ABC123DEF456GH',
  amount: '5000.00',
  paymentDate: '2024-03-15',
  paymentMethod: 'cash',
  note: null,
  createdAt: new Date('2024-03-15'),
}

function getYesterdayStr(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]!
}

// --- Tests ---

describe('PaymentService', () => {
  let auditLogger: ReturnType<typeof createMockAuditLogger>

  beforeEach(() => {
    auditLogger = createMockAuditLogger()
  })

  describe('recordPayment', () => {
    it('should record a full payment and update bill status to Paid (Requirement 8.2)', async () => {
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
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                ...defaultPayment,
                amount: '15000.00',
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
      const service = new PaymentService(db as any, auditLogger as any)

      const result = await service.recordPayment(ctx, {
        billId: BILL_ID,
        amount: 15000,
        paymentDate: getYesterdayStr(),
        paymentMethod: 'cash',
      })

      expect(result.billId).toBe(BILL_ID)
      expect(result.amount).toBe('15000.00')
      expect(db.update).toHaveBeenCalled()
      expect(auditLogger.log).toHaveBeenCalled()
    })

    it('should record a partial payment and update bill status to Partially_Paid (Requirement 8.3)', async () => {
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
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([defaultPayment]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      }

      const ctx = createOwnerContext()
      const service = new PaymentService(db as any, auditLogger as any)

      const result = await service.recordPayment(ctx, {
        billId: BILL_ID,
        amount: 5000,
        paymentDate: getYesterdayStr(),
        paymentMethod: 'cash',
      })

      expect(result.amount).toBe('5000.00')
      // Verify update was called with partially_paid status
      const updateSetCall = db.update.mock.results[0]?.value.set
      expect(updateSetCall).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'partially_paid',
          paidAmount: '5000.00',
        }),
      )
    })

    it('should reject payment exceeding remaining balance (Requirement 8.4)', async () => {
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
        insert: vi.fn(),
        update: vi.fn(),
      }

      const ctx = createOwnerContext()
      const service = new PaymentService(db as any, auditLogger as any)

      await expect(
        service.recordPayment(ctx, {
          billId: BILL_ID,
          amount: 20000, // exceeds 15000 total
          paymentDate: getYesterdayStr(),
          paymentMethod: 'cash',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject payment against already Paid bill (Requirement 8.10)', async () => {
      const paidBill = {
        ...defaultBill,
        status: 'paid',
        paidAmount: '15000.00',
      }

      const db = {
        query: {
          bills: {
            findFirst: vi.fn().mockResolvedValue(paidBill),
          },
          flats: {
            findFirst: vi.fn().mockResolvedValue(defaultFlat),
          },
          renters: {
            findFirst: vi.fn(),
          },
        },
        insert: vi.fn(),
        update: vi.fn(),
      }

      const ctx = createOwnerContext()
      const service = new PaymentService(db as any, auditLogger as any)

      await expect(
        service.recordPayment(ctx, {
          billId: BILL_ID,
          amount: 1000,
          paymentDate: getYesterdayStr(),
          paymentMethod: 'cash',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject renter from recording payments (Requirement 8.6)', async () => {
      const db = { query: {}, insert: vi.fn(), update: vi.fn() }
      const ctx = createRenterContext()
      const service = new PaymentService(db as any, auditLogger as any)

      await expect(
        service.recordPayment(ctx, {
          billId: BILL_ID,
          amount: 5000,
          paymentDate: getYesterdayStr(),
          paymentMethod: 'cash',
        }),
      ).rejects.toThrow(ForbiddenError)
    })

    it('should reject future payment date (Requirement 8.1)', async () => {
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
        insert: vi.fn(),
        update: vi.fn(),
      }

      const ctx = createOwnerContext()
      const service = new PaymentService(db as any, auditLogger as any)

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)
      const futureDateStr = futureDate.toISOString().split('T')[0]!

      await expect(
        service.recordPayment(ctx, {
          billId: BILL_ID,
          amount: 5000,
          paymentDate: futureDateStr,
          paymentMethod: 'cash',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject payment date more than 365 days in the past (Requirement 8.1)', async () => {
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
        insert: vi.fn(),
        update: vi.fn(),
      }

      const ctx = createOwnerContext()
      const service = new PaymentService(db as any, auditLogger as any)

      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 400)
      const oldDateStr = oldDate.toISOString().split('T')[0]!

      await expect(
        service.recordPayment(ctx, {
          billId: BILL_ID,
          amount: 5000,
          paymentDate: oldDateStr,
          paymentMethod: 'cash',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject invalid payment method', async () => {
      const db = { query: {}, insert: vi.fn(), update: vi.fn() }
      const ctx = createOwnerContext()
      const service = new PaymentService(db as any, auditLogger as any)

      await expect(
        service.recordPayment(ctx, {
          billId: BILL_ID,
          amount: 5000,
          paymentDate: getYesterdayStr(),
          paymentMethod: 'credit_card' as any,
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject amount with more than 2 decimal places (Requirement 8.11)', async () => {
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
        insert: vi.fn(),
        update: vi.fn(),
      }

      const ctx = createOwnerContext()
      const service = new PaymentService(db as any, auditLogger as any)

      await expect(
        service.recordPayment(ctx, {
          billId: BILL_ID,
          amount: 5000.123,
          paymentDate: getYesterdayStr(),
          paymentMethod: 'cash',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject amount less than 0.01 (Requirement 8.11)', async () => {
      const db = { query: {}, insert: vi.fn(), update: vi.fn() }
      const ctx = createOwnerContext()
      const service = new PaymentService(db as any, auditLogger as any)

      await expect(
        service.recordPayment(ctx, {
          billId: BILL_ID,
          amount: 0,
          paymentDate: getYesterdayStr(),
          paymentMethod: 'cash',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should generate receipt reference between 12-20 alphanumeric chars (Requirement 8.8)', async () => {
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
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([defaultPayment]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      }

      const ctx = createOwnerContext()
      const service = new PaymentService(db as any, auditLogger as any)

      await service.recordPayment(ctx, {
        billId: BILL_ID,
        amount: 5000,
        paymentDate: getYesterdayStr(),
        paymentMethod: 'cash',
      })

      // Verify the insert was called with a valid receipt reference
      const insertValues =
        db.insert.mock.results[0]?.value.values.mock.calls[0][0]
      const receiptRef = insertValues.receiptReference
      expect(receiptRef.length).toBeGreaterThanOrEqual(12)
      expect(receiptRef.length).toBeLessThanOrEqual(20)
      expect(/^[A-Z0-9]+$/.test(receiptRef)).toBe(true)
    })

    it('should allow manager to record payments for assigned buildings', async () => {
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
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([defaultPayment]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      }

      const ctx = createManagerContext()
      const service = new PaymentService(db as any, auditLogger as any)

      const result = await service.recordPayment(ctx, {
        billId: BILL_ID,
        amount: 5000,
        paymentDate: getYesterdayStr(),
        paymentMethod: 'bank_transfer',
      })

      expect(result.billId).toBe(BILL_ID)
    })

    it('should reject manager recording payment for unassigned building', async () => {
      const unassignedFlat = {
        ...defaultFlat,
        buildingId: UNASSIGNED_BUILDING_ID,
      }

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
        insert: vi.fn(),
        update: vi.fn(),
      }

      const ctx = createManagerContext({ assignedBuildingIds: [BUILDING_ID] })
      const service = new PaymentService(db as any, auditLogger as any)

      await expect(
        service.recordPayment(ctx, {
          billId: BILL_ID,
          amount: 5000,
          paymentDate: getYesterdayStr(),
          paymentMethod: 'cash',
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('should record audit event when payment is recorded (Requirement 8.7)', async () => {
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
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([defaultPayment]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      }

      const ctx = createOwnerContext()
      const service = new PaymentService(db as any, auditLogger as any)

      await service.recordPayment(ctx, {
        billId: BILL_ID,
        amount: 5000,
        paymentDate: getYesterdayStr(),
        paymentMethod: 'cash',
      })

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: OWNER_USER_ID,
          action: 'payment_recorded',
          entityType: 'bill',
          entityId: BILL_ID,
          ownerAccountId: OWNER_ACCOUNT_ID,
        }),
      )
    })

    it('should support multiple partial payments against a single bill (Requirement 8.5)', async () => {
      // Bill already has a partial payment
      const partiallyPaidBill = {
        ...defaultBill,
        paidAmount: '5000.00',
        status: 'partially_paid',
      }

      const db = {
        query: {
          bills: {
            findFirst: vi.fn().mockResolvedValue(partiallyPaidBill),
          },
          flats: {
            findFirst: vi.fn().mockResolvedValue(defaultFlat),
          },
          renters: {
            findFirst: vi.fn(),
          },
        },
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi
              .fn()
              .mockResolvedValue([{ ...defaultPayment, amount: '3000.00' }]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      }

      const ctx = createOwnerContext()
      const service = new PaymentService(db as any, auditLogger as any)

      const result = await service.recordPayment(ctx, {
        billId: BILL_ID,
        amount: 3000,
        paymentDate: getYesterdayStr(),
        paymentMethod: 'mobile_banking',
      })

      expect(result.amount).toBe('3000.00')
      // Verify update was called with correct new paidAmount (5000 + 3000 = 8000)
      const updateSetCall = db.update.mock.results[0]?.value.set
      expect(updateSetCall).toHaveBeenCalledWith(
        expect.objectContaining({
          paidAmount: '8000.00',
          status: 'partially_paid',
        }),
      )
    })

    it('should throw NotFoundError for non-existent bill', async () => {
      const db = {
        query: {
          bills: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
          flats: {
            findFirst: vi.fn(),
          },
          renters: {
            findFirst: vi.fn(),
          },
        },
        insert: vi.fn(),
        update: vi.fn(),
      }

      const ctx = createOwnerContext()
      const service = new PaymentService(db as any, auditLogger as any)

      await expect(
        service.recordPayment(ctx, {
          billId: '00000000-0000-4000-8000-ffffffffffff',
          amount: 5000,
          paymentDate: getYesterdayStr(),
          paymentMethod: 'cash',
        }),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('getPayment', () => {
    it('should return payment details for owner', async () => {
      const db = {
        query: {
          payments: {
            findFirst: vi.fn().mockResolvedValue(defaultPayment),
          },
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
      }

      const ctx = createOwnerContext()
      const service = new PaymentService(db as any, auditLogger as any)

      const result = await service.getPayment(ctx, PAYMENT_ID)

      expect(result.id).toBe(PAYMENT_ID)
      expect(result.receiptReference).toBe('ABC123DEF456GH')
      expect(result.amount).toBe('5000.00')
    })

    it('should throw NotFoundError for non-existent payment', async () => {
      const db = {
        query: {
          payments: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
      }

      const ctx = createOwnerContext()
      const service = new PaymentService(db as any, auditLogger as any)

      await expect(
        service.getPayment(ctx, '00000000-0000-4000-8000-ffffffffffff'),
      ).rejects.toThrow(NotFoundError)
    })

    it('should enforce renter can only see their own payments (Requirement 8.6)', async () => {
      const db = {
        query: {
          payments: {
            findFirst: vi.fn().mockResolvedValue(defaultPayment),
          },
          bills: {
            findFirst: vi.fn().mockResolvedValue(defaultBill),
          },
          flats: {
            findFirst: vi.fn().mockResolvedValue(defaultFlat),
          },
          renters: {
            findFirst: vi.fn().mockResolvedValue(null), // renter not found
          },
        },
      }

      const ctx = createRenterContext({
        userId: '00000000-0000-4000-8000-eeeeeeeeeeee',
      })
      const service = new PaymentService(db as any, auditLogger as any)

      await expect(service.getPayment(ctx, PAYMENT_ID)).rejects.toThrow(
        NotFoundError,
      )
    })

    it('should enforce manager can only see payments for assigned buildings', async () => {
      const unassignedFlat = {
        ...defaultFlat,
        buildingId: UNASSIGNED_BUILDING_ID,
      }

      const db = {
        query: {
          payments: {
            findFirst: vi.fn().mockResolvedValue(defaultPayment),
          },
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
      }

      const ctx = createManagerContext({ assignedBuildingIds: [BUILDING_ID] })
      const service = new PaymentService(db as any, auditLogger as any)

      await expect(service.getPayment(ctx, PAYMENT_ID)).rejects.toThrow(
        NotFoundError,
      )
    })
  })

  describe('listPayments', () => {
    it('should return paginated payments for owner', async () => {
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
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      offset: vi.fn().mockResolvedValue([defaultPayment]),
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
      const service = new PaymentService(db as any, auditLogger as any)

      const result = await service.listPayments(
        ctx,
        {},
        { page: 1, pageSize: 50 },
      )

      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(50)
    })

    it('should cap pageSize at 50 (Requirement 8.9)', async () => {
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
      const service = new PaymentService(db as any, auditLogger as any)

      const result = await service.listPayments(
        ctx,
        {},
        { page: 1, pageSize: 100 },
      )

      expect(result.pageSize).toBe(50)
    })

    it('should reject date range exceeding 365 days (Requirement 8.9)', async () => {
      const db = {
        query: {
          renters: {
            findFirst: vi.fn(),
          },
        },
        select: vi.fn(),
      }

      const ctx = createOwnerContext()
      const service = new PaymentService(db as any, auditLogger as any)

      await expect(
        service.listPayments(
          ctx,
          { startDate: '2023-01-01', endDate: '2024-06-01' },
          { page: 1, pageSize: 50 },
        ),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject invalid date range (start after end)', async () => {
      const db = {
        query: {
          renters: {
            findFirst: vi.fn(),
          },
        },
        select: vi.fn(),
      }

      const ctx = createOwnerContext()
      const service = new PaymentService(db as any, auditLogger as any)

      await expect(
        service.listPayments(
          ctx,
          { startDate: '2024-06-01', endDate: '2024-01-01' },
          { page: 1, pageSize: 50 },
        ),
      ).rejects.toThrow(ValidationError)
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
      const service = new PaymentService(db as any, auditLogger as any)

      const result = await service.listPayments(
        ctx,
        {},
        { page: 1, pageSize: 50 },
      )

      expect(result.data).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('should return empty result for manager with no assigned flats', async () => {
      const db = {
        query: {
          renters: {
            findFirst: vi.fn(),
          },
        },
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      }

      const ctx = createManagerContext({
        assignedBuildingIds: [UNASSIGNED_BUILDING_ID],
      })
      const service = new PaymentService(db as any, auditLogger as any)

      const result = await service.listPayments(
        ctx,
        {},
        { page: 1, pageSize: 50 },
      )

      expect(result.data).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })
})
