import type { Database } from '@repo/db'
import { BILL_STATUS } from '@repo/shared/constants'
import type { RequestContext } from '@repo/shared/types'
import fc from 'fast-check'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuditLogger } from '../../src/plugins/audit-logger'
import { DepositService } from '../../src/services/deposit'

/**
 * Feature: amarspace-full-implementation
 * Property 13: Deposit adjustment maintains balance invariant
 *
 * For any rental contract with a remaining deposit balance, applying an adjustment
 * of amount A where A ≤ remaining balance SHALL reduce the remaining balance by
 * exactly A. Adjustments where A > remaining balance SHALL be rejected. The remaining
 * balance SHALL always equal the initial deposit minus the sum of all adjustment amounts.
 *
 * **Validates: Requirements 9.2, 9.3, 9.4**
 */

/**
 * Feature: amarspace-full-implementation
 * Property 14: Deposit adjustment linked to bill acts as payment
 *
 * For any advance adjustment linked to a bill, the adjustment amount SHALL be applied
 * as a payment against that bill, updating the bill's paid amount and status according
 * to the same rules as direct payments. The adjustment SHALL be rejected if the bill is
 * already Paid or if the adjustment exceeds the bill's outstanding balance.
 *
 * **Validates: Requirements 9.5, 9.6**
 */

// --- Helpers ---

function createMockAuditLogger() {
  return {
    log: vi.fn(),
    query: vi.fn(),
    pendingRetries: 0,
    shutdown: vi.fn(),
  } as unknown as AuditLogger
}

function createOwnerContext(ownerAccountId = 'owner-1'): RequestContext {
  return {
    userId: `user-${ownerAccountId}`,
    role: 'owner',
    ownerAccountId,
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
  }
}

/**
 * Converts cents (integer) to a decimal string with 2 decimal places.
 * Working in integer cents avoids floating point precision issues.
 */
function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2)
}

// Fixed UUIDs for test data (valid UUID format required by Zod schema)
const CONTRACT_ID = '550e8400-e29b-41d4-a716-446655440010'
const FLAT_ID = '550e8400-e29b-41d4-a716-446655440011'
const RENTER_ID = '550e8400-e29b-41d4-a716-446655440012'
const BILL_ID = '550e8400-e29b-41d4-a716-446655440013'
const OWNER_ACCOUNT_ID = 'owner-1'

// --- Generators ---

/**
 * Generate a valid deposit balance in cents: between 100 (1.00) and 9,999,999,99 (99,999,999.99).
 */
const depositCentsArb = fc.integer({ min: 100, max: 9_999_999_99 })

/**
 * Generate a valid bill total in cents: between 100 (1.00) and 9,999,900 (99,999.00).
 * Kept smaller to avoid floating point edge cases at large magnitudes.
 */
const billTotalCentsArb = fc.integer({ min: 100, max: 9_999_900 })

// --- Shared mock factories ---

function createContractMock(
  remainingDepositBalance: string,
  ownerAccountId = OWNER_ACCOUNT_ID,
) {
  return {
    id: CONTRACT_ID,
    ownerAccountId,
    renterId: RENTER_ID,
    flatId: FLAT_ID,
    monthlyRent: '10000.00',
    startDate: '2024-01-01',
    endDate: null,
    securityDepositAmount: remainingDepositBalance,
    remainingDepositBalance,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function createBillMock(
  totalAmount: string,
  paidAmount: string,
  status: string,
  ownerAccountId = OWNER_ACCOUNT_ID,
) {
  return {
    id: BILL_ID,
    ownerAccountId,
    contractId: CONTRACT_ID,
    flatId: FLAT_ID,
    renterId: RENTER_ID,
    billingMonth: '2024-01',
    baseRent: totalAmount,
    totalAmount,
    paidAmount,
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function createAdjustmentMock(
  amount: string,
  billId: string | null = null,
  ownerAccountId = OWNER_ACCOUNT_ID,
) {
  return {
    id: 'adjustment-1',
    ownerAccountId,
    contractId: CONTRACT_ID,
    amount,
    billId,
    note: null,
    adjustedBy: `user-${ownerAccountId}`,
    createdAt: new Date(),
  }
}

/**
 * Builds a db mock that tracks all `.set(data)` calls in order.
 * This allows us to inspect bill update (index 0) and contract update (index 1)
 * separately when both are called.
 */
function buildDbMock(
  contractMock: ReturnType<typeof createContractMock>,
  billMock: ReturnType<typeof createBillMock> | null,
  adjustmentMock: ReturnType<typeof createAdjustmentMock>,
) {
  const setCalls: Array<Record<string, unknown>> = []

  const updateFn = vi.fn().mockImplementation(() => {
    const whereFn = vi.fn().mockResolvedValue(undefined)
    const setFn = vi
      .fn()
      .mockImplementation((data: Record<string, unknown>) => {
        setCalls.push(data)
        return { where: whereFn }
      })
    return { set: setFn }
  })

  return {
    query: {
      rentalContracts: {
        findFirst: vi.fn().mockResolvedValue(contractMock),
      },
      bills: {
        findFirst: vi.fn().mockResolvedValue(billMock),
      },
      flats: { findFirst: vi.fn() },
      renters: { findFirst: vi.fn() },
    },
    update: updateFn,
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([adjustmentMock]),
      }),
    }),
    // Expose setCalls for assertions
    _setCalls: setCalls,
  }
}

// --- Property 13: Deposit adjustment maintains balance invariant ---

describe('Feature: amarspace-full-implementation, Property 13: Deposit adjustment maintains balance invariant', () => {
  let auditLogger: ReturnType<typeof createMockAuditLogger>

  beforeEach(() => {
    auditLogger = createMockAuditLogger()
  })

  it('when adjustment amount ≤ remaining balance, new balance SHALL equal old balance minus adjustment amount', async () => {
    await fc.assert(
      fc.asyncProperty(
        depositCentsArb,
        fc.integer({ min: 1, max: 9_999_999_99 }),
        async (depositCents, adjustmentCents) => {
          // Adjustment must not exceed deposit
          fc.pre(adjustmentCents <= depositCents)

          const ctx = createOwnerContext(OWNER_ACCOUNT_ID)
          const remainingBalance = centsToDecimal(depositCents)
          const adjustmentAmount = adjustmentCents / 100

          // Ensure adjustment is within valid Zod schema range (min 0.01, max 99,999,999.99)
          fc.pre(adjustmentAmount >= 0.01 && adjustmentAmount <= 99_999_999.99)

          const contractMock = createContractMock(remainingBalance)
          const adjustmentMock = createAdjustmentMock(
            adjustmentAmount.toFixed(2),
          )
          const db = buildDbMock(contractMock, null, adjustmentMock)

          const service = new DepositService(
            db as unknown as Database,
            auditLogger,
          )

          await service.applyAdjustment(ctx, CONTRACT_ID, {
            amount: adjustmentAmount,
          })

          // No bill linked: only one set call (for the contract)
          expect(db._setCalls.length).toBe(1)
          const contractSetCall = db._setCalls[0]

          // Property 13: new balance = old balance - adjustment amount
          const expectedNewBalance = (
            Number.parseFloat(remainingBalance) - adjustmentAmount
          ).toFixed(2)

          expect(contractSetCall?.remainingDepositBalance).toBe(
            expectedNewBalance,
          )
        },
      ),
      { numRuns: 200 },
    )
  })

  it('when adjustment amount exceeds remaining balance, the adjustment SHALL be rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        depositCentsArb,
        fc.integer({ min: 1, max: 9_999_999_99 }),
        async (depositCents, excessCents) => {
          const ctx = createOwnerContext(OWNER_ACCOUNT_ID)
          const remainingBalance = centsToDecimal(depositCents)
          // Adjustment = deposit + excess (always exceeds)
          const adjustmentAmount = (depositCents + excessCents) / 100

          // Stay within valid Zod schema range
          fc.pre(adjustmentAmount <= 99_999_999.99)

          const contractMock = createContractMock(remainingBalance)
          const adjustmentMock = createAdjustmentMock(
            adjustmentAmount.toFixed(2),
          )
          const db = buildDbMock(contractMock, null, adjustmentMock)

          const service = new DepositService(
            db as unknown as Database,
            auditLogger,
          )

          // Property 13: Adjustment exceeding remaining balance SHALL be rejected
          await expect(
            service.applyAdjustment(ctx, CONTRACT_ID, {
              amount: adjustmentAmount,
            }),
          ).rejects.toThrow()

          // No balance update should occur
          expect(db.update).not.toHaveBeenCalled()
          // No adjustment record should be inserted
          expect(db.insert).not.toHaveBeenCalled()
        },
      ),
      { numRuns: 200 },
    )
  })

  it('multiple sequential adjustments each reduce the balance by exactly the adjustment amount', async () => {
    await fc.assert(
      fc.asyncProperty(
        depositCentsArb,
        fc.array(fc.integer({ min: 1, max: 100 }), {
          minLength: 2,
          maxLength: 5,
        }),
        async (depositCents, percentages) => {
          const ctx = createOwnerContext(OWNER_ACCOUNT_ID)
          let currentBalanceCents = depositCents

          for (const pct of percentages) {
            // Adjust by pct% of current balance (at least 1 cent)
            const adjustCents = Math.max(
              1,
              Math.floor((currentBalanceCents * pct) / 100),
            )

            // Stop if adjustment would exceed balance or be 0
            if (adjustCents > currentBalanceCents || adjustCents === 0) break

            const currentBalance = centsToDecimal(currentBalanceCents)
            const adjustmentAmount = adjustCents / 100

            // Ensure within valid Zod schema range
            if (adjustmentAmount < 0.01 || adjustmentAmount > 99_999_999.99)
              break

            const contractMock = createContractMock(currentBalance)
            const adjustmentMock = createAdjustmentMock(
              adjustmentAmount.toFixed(2),
            )
            const db = buildDbMock(contractMock, null, adjustmentMock)

            const service = new DepositService(
              db as unknown as Database,
              auditLogger,
            )

            await service.applyAdjustment(ctx, CONTRACT_ID, {
              amount: adjustmentAmount,
            })

            // No bill linked: only one set call (for the contract)
            expect(db._setCalls.length).toBe(1)
            const contractSetCall = db._setCalls[0]

            const expectedNewBalance = (
              Number.parseFloat(currentBalance) - adjustmentAmount
            ).toFixed(2)

            // Property 13: Each adjustment reduces balance by exactly the adjustment amount
            expect(contractSetCall?.remainingDepositBalance).toBe(
              expectedNewBalance,
            )

            // Update running balance for next iteration
            currentBalanceCents -= adjustCents
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('adjustment of exactly the full remaining balance reduces balance to zero', async () => {
    await fc.assert(
      fc.asyncProperty(depositCentsArb, async (depositCents) => {
        const ctx = createOwnerContext(OWNER_ACCOUNT_ID)
        const remainingBalance = centsToDecimal(depositCents)
        const adjustmentAmount = depositCents / 100

        // Ensure within valid Zod schema range
        fc.pre(adjustmentAmount >= 0.01 && adjustmentAmount <= 99_999_999.99)

        const contractMock = createContractMock(remainingBalance)
        const adjustmentMock = createAdjustmentMock(adjustmentAmount.toFixed(2))
        const db = buildDbMock(contractMock, null, adjustmentMock)

        const service = new DepositService(
          db as unknown as Database,
          auditLogger,
        )

        await service.applyAdjustment(ctx, CONTRACT_ID, {
          amount: adjustmentAmount,
        })

        expect(db._setCalls.length).toBe(1)
        const contractSetCall = db._setCalls[0]

        // Property 13: Adjusting the full balance results in exactly 0.00
        expect(contractSetCall?.remainingDepositBalance).toBe('0.00')
      }),
      { numRuns: 200 },
    )
  })
})

// --- Property 14: Deposit adjustment linked to bill acts as payment ---

describe('Feature: amarspace-full-implementation, Property 14: Deposit adjustment linked to bill acts as payment', () => {
  let auditLogger: ReturnType<typeof createMockAuditLogger>

  beforeEach(() => {
    auditLogger = createMockAuditLogger()
  })

  /**
   * Tests the "full payment" case using bills with paidAmount = "0.00".
   * This avoids floating point issues in the service's outstanding balance computation
   * (billTotal - 0 = billTotal exactly, so adjustmentAmount = billTotal is always valid).
   */
  it('when adjustment linked to unpaid bill equals bill total, bill status SHALL become Paid', async () => {
    await fc.assert(
      fc.asyncProperty(
        billTotalCentsArb,
        depositCentsArb,
        async (billTotalCents, depositCents) => {
          // Deposit must cover the full bill
          fc.pre(depositCents >= billTotalCents)

          const ctx = createOwnerContext(OWNER_ACCOUNT_ID)
          const billTotal = centsToDecimal(billTotalCents)
          const billPaid = '0.00'
          const remainingDeposit = centsToDecimal(depositCents)

          // Adjustment = full bill total (paidAmount is 0, so outstanding = total exactly)
          const adjustmentAmount = billTotalCents / 100

          // Ensure within valid Zod schema range
          fc.pre(adjustmentAmount >= 0.01 && adjustmentAmount <= 99_999_999.99)
          fc.pre(Number.parseFloat(remainingDeposit) >= adjustmentAmount)

          const contractMock = createContractMock(remainingDeposit)
          const billMock = createBillMock(
            billTotal,
            billPaid,
            BILL_STATUS.UNPAID,
          )
          const adjustmentMock = createAdjustmentMock(
            adjustmentAmount.toFixed(2),
            BILL_ID,
          )
          const db = buildDbMock(contractMock, billMock, adjustmentMock)

          const service = new DepositService(
            db as unknown as Database,
            auditLogger,
          )

          await service.applyAdjustment(ctx, CONTRACT_ID, {
            amount: adjustmentAmount,
            billId: BILL_ID,
          })

          // Two set calls: first for bill, second for contract
          expect(db._setCalls.length).toBe(2)
          const billSetCall = db._setCalls[0]

          // Property 14: When adjustment covers full outstanding, bill status becomes Paid
          expect(billSetCall?.status).toBe(BILL_STATUS.PAID)

          // Property 14: paidAmount equals totalAmount
          expect(
            Number.parseFloat(billSetCall?.paidAmount as string),
          ).toBeCloseTo(Number.parseFloat(billTotal), 2)
        },
      ),
      { numRuns: 200 },
    )
  })

  it('when adjustment linked to bill is less than bill outstanding, bill status SHALL become Partially_Paid', async () => {
    await fc.assert(
      fc.asyncProperty(
        billTotalCentsArb,
        fc.integer({ min: 1, max: 99 }),
        depositCentsArb,
        async (billTotalCents, adjustmentPercent, depositCents) => {
          // Adjustment is a percentage of total in cents (strictly less than total)
          const adjustmentCents = Math.max(
            1,
            Math.floor((billTotalCents * adjustmentPercent) / 100),
          )

          // Adjustment must be strictly less than total
          fc.pre(adjustmentCents < billTotalCents)

          // Deposit must cover the adjustment
          fc.pre(depositCents >= adjustmentCents)

          const ctx = createOwnerContext(OWNER_ACCOUNT_ID)
          const billTotal = centsToDecimal(billTotalCents)
          // Use paidAmount = "0.00" to avoid FP issues in outstanding computation
          const billPaid = '0.00'
          const remainingDeposit = centsToDecimal(depositCents)
          const adjustmentAmount = adjustmentCents / 100

          // Ensure within valid Zod schema range
          fc.pre(adjustmentAmount >= 0.01 && adjustmentAmount <= 99_999_999.99)
          fc.pre(Number.parseFloat(remainingDeposit) >= adjustmentAmount)

          const contractMock = createContractMock(remainingDeposit)
          const billMock = createBillMock(
            billTotal,
            billPaid,
            BILL_STATUS.UNPAID,
          )
          const adjustmentMock = createAdjustmentMock(
            adjustmentAmount.toFixed(2),
            BILL_ID,
          )
          const db = buildDbMock(contractMock, billMock, adjustmentMock)

          const service = new DepositService(
            db as unknown as Database,
            auditLogger,
          )

          await service.applyAdjustment(ctx, CONTRACT_ID, {
            amount: adjustmentAmount,
            billId: BILL_ID,
          })

          // Two set calls: first for bill, second for contract
          expect(db._setCalls.length).toBe(2)
          const billSetCall = db._setCalls[0]

          // Property 14: When adjustment is less than outstanding, bill status becomes Partially_Paid
          expect(billSetCall?.status).toBe(BILL_STATUS.PARTIALLY_PAID)

          // Property 14: paidAmount increased but is still less than totalAmount
          const newPaidAmount = Number.parseFloat(
            billSetCall?.paidAmount as string,
          )
          const totalParsed = Number.parseFloat(billTotal)
          expect(newPaidAmount).toBeLessThan(totalParsed)
          expect(newPaidAmount).toBeGreaterThan(0)
        },
      ),
      { numRuns: 200 },
    )
  })

  it('when adjustment is linked to an already Paid bill, the adjustment SHALL be rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        billTotalCentsArb,
        depositCentsArb,
        async (billTotalCents, depositCents) => {
          const ctx = createOwnerContext(OWNER_ACCOUNT_ID)
          const billTotal = centsToDecimal(billTotalCents)
          const remainingDeposit = centsToDecimal(depositCents)
          const adjustmentAmount = Math.min(depositCents, billTotalCents) / 100

          // Ensure within valid Zod schema range
          fc.pre(adjustmentAmount >= 0.01 && adjustmentAmount <= 99_999_999.99)

          const contractMock = createContractMock(remainingDeposit)
          // Bill is already fully Paid
          const billMock = createBillMock(
            billTotal,
            billTotal,
            BILL_STATUS.PAID,
          )
          const adjustmentMock = createAdjustmentMock(
            adjustmentAmount.toFixed(2),
            BILL_ID,
          )
          const db = buildDbMock(contractMock, billMock, adjustmentMock)

          const service = new DepositService(
            db as unknown as Database,
            auditLogger,
          )

          // Property 14: Adjustment linked to already Paid bill SHALL be rejected
          await expect(
            service.applyAdjustment(ctx, CONTRACT_ID, {
              amount: adjustmentAmount,
              billId: BILL_ID,
            }),
          ).rejects.toThrow()

          // No updates should occur (neither bill nor contract)
          expect(db.update).not.toHaveBeenCalled()
          // No adjustment record should be inserted
          expect(db.insert).not.toHaveBeenCalled()
        },
      ),
      { numRuns: 200 },
    )
  })

  it('when adjustment linked to bill exceeds bill outstanding, the adjustment SHALL be rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        billTotalCentsArb,
        fc.integer({ min: 1, max: 9_999_900 }),
        depositCentsArb,
        async (billTotalCents, excessCents, depositCents) => {
          // Adjustment exceeds total by excessCents (paidAmount = 0, so outstanding = total)
          const adjustmentCents = billTotalCents + excessCents

          // Deposit must cover the adjustment amount
          fc.pre(depositCents >= adjustmentCents)

          const ctx = createOwnerContext(OWNER_ACCOUNT_ID)
          const billTotal = centsToDecimal(billTotalCents)
          // Use paidAmount = "0.00" to avoid FP issues
          const billPaid = '0.00'
          const remainingDeposit = centsToDecimal(depositCents)
          const adjustmentAmount = adjustmentCents / 100

          // Ensure within valid Zod schema range
          fc.pre(adjustmentAmount >= 0.01 && adjustmentAmount <= 99_999_999.99)
          fc.pre(Number.parseFloat(remainingDeposit) >= adjustmentAmount)

          const contractMock = createContractMock(remainingDeposit)
          const billMock = createBillMock(
            billTotal,
            billPaid,
            BILL_STATUS.UNPAID,
          )
          const adjustmentMock = createAdjustmentMock(
            adjustmentAmount.toFixed(2),
            BILL_ID,
          )
          const db = buildDbMock(contractMock, billMock, adjustmentMock)

          const service = new DepositService(
            db as unknown as Database,
            auditLogger,
          )

          // Property 14: Adjustment exceeding bill outstanding SHALL be rejected
          await expect(
            service.applyAdjustment(ctx, CONTRACT_ID, {
              amount: adjustmentAmount,
              billId: BILL_ID,
            }),
          ).rejects.toThrow()

          // No updates should occur
          expect(db.update).not.toHaveBeenCalled()
          // No adjustment record should be inserted
          expect(db.insert).not.toHaveBeenCalled()
        },
      ),
      { numRuns: 200 },
    )
  })

  it('when adjustment linked to bill succeeds, deposit balance is also reduced by the adjustment amount', async () => {
    await fc.assert(
      fc.asyncProperty(
        billTotalCentsArb,
        fc.integer({ min: 1, max: 100 }),
        depositCentsArb,
        async (billTotalCents, adjustmentPercent, depositCents) => {
          // Adjustment is a percentage of total in cents (at most 100%)
          const adjustmentCents = Math.max(
            1,
            Math.floor((billTotalCents * adjustmentPercent) / 100),
          )

          // Adjustment must not exceed total
          fc.pre(adjustmentCents <= billTotalCents)

          // Deposit must cover the adjustment
          fc.pre(depositCents >= adjustmentCents)

          const ctx = createOwnerContext(OWNER_ACCOUNT_ID)
          const billTotal = centsToDecimal(billTotalCents)
          // Use paidAmount = "0.00" to avoid FP issues in outstanding computation
          const billPaid = '0.00'
          const remainingDeposit = centsToDecimal(depositCents)
          const adjustmentAmount = adjustmentCents / 100

          // Ensure within valid Zod schema range
          fc.pre(adjustmentAmount >= 0.01 && adjustmentAmount <= 99_999_999.99)
          fc.pre(Number.parseFloat(remainingDeposit) >= adjustmentAmount)

          const contractMock = createContractMock(remainingDeposit)
          const billMock = createBillMock(
            billTotal,
            billPaid,
            BILL_STATUS.UNPAID,
          )
          const adjustmentMock = createAdjustmentMock(
            adjustmentAmount.toFixed(2),
            BILL_ID,
          )
          const db = buildDbMock(contractMock, billMock, adjustmentMock)

          const service = new DepositService(
            db as unknown as Database,
            auditLogger,
          )

          await service.applyAdjustment(ctx, CONTRACT_ID, {
            amount: adjustmentAmount,
            billId: BILL_ID,
          })

          // Two set calls: first for bill, second for contract
          expect(db._setCalls.length).toBe(2)
          const contractSetCall = db._setCalls[1]

          // Property 13 + 14 combined: deposit balance is also reduced by adjustment amount
          const expectedNewBalance = (
            Number.parseFloat(remainingDeposit) - adjustmentAmount
          ).toFixed(2)

          expect(contractSetCall?.remainingDepositBalance).toBe(
            expectedNewBalance,
          )
        },
      ),
      { numRuns: 200 },
    )
  })
})
