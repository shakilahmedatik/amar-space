import type { Database } from '@repo/db'
import { BILL_STATUS } from '@repo/shared/constants'
import type { RequestContext } from '@repo/shared/types'
import fc from 'fast-check'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuditLogger } from '../../src/plugins/audit-logger'
import { PaymentService } from '../../src/services/payment'

/**
 * Feature: amarspace-full-implementation
 * Property 12: Payment correctly updates bill status
 *
 * For any bill with a remaining balance and any payment amount: if payment equals
 * remaining balance, bill status SHALL become Paid; if payment is less than remaining
 * balance, bill status SHALL become Partially_Paid; if payment exceeds remaining balance,
 * the payment SHALL be rejected. The paid amount on the bill SHALL equal the sum of all
 * recorded payments.
 *
 */

// --- Helpers ---

function mockDbWithTransaction<
  T extends {
    transaction?: unknown
    select?: unknown
    query: {
      bills: {
        findFirst: () => Promise<unknown>
      }
      [key: string]: unknown
    }
    [key: string]: unknown
  },
>(db: T): T {
  const dbObj = db as Record<string, unknown>
  dbObj.transaction = vi.fn(async (cb) => await cb(db))
  dbObj.select = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        for: vi.fn().mockImplementation(async () => {
          const query = db.query as {
            bills: { findFirst: () => Promise<unknown> }
          }
          const bill = await query.bills.findFirst()
          return bill ? [bill] : []
        }),
      }),
    }),
  })
  return db
}

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
 * Creates a valid payment date string (today) in YYYY-MM-DD format.
 */
function getTodayDateString(): string {
  const today = new Date()
  return today.toISOString().split('T')[0]!
}

/**
 * Converts cents (integer) to a decimal string with 2 decimal places.
 * This avoids floating point issues by working in integer cents.
 */
function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2)
}

/**
 * Computes remaining balance the same way the service does:
 * Number((total - paid).toFixed(2))
 * This ensures our test payment amounts match the service's internal computation,
 * including the rounding to 2 decimal places that the service applies.
 */
function computeRemainingBalance(totalStr: string, paidStr: string): number {
  return Number(
    (Number.parseFloat(totalStr) - Number.parseFloat(paidStr)).toFixed(2),
  )
}

// Fixed UUIDs for test data (valid UUID format required by Zod schema)
const BILL_ID = '550e8400-e29b-41d4-a716-446655440000'
const CONTRACT_ID = '550e8400-e29b-41d4-a716-446655440001'
const FLAT_ID = '550e8400-e29b-41d4-a716-446655440002'
const RENTER_ID = '550e8400-e29b-41d4-a716-446655440003'

// --- Generators ---

/**
 * Generate a valid bill total in cents: between 100 (1.00) and 9999900 (99,999.00).
 * Working in cents avoids floating point precision issues.
 */
const totalCentsArb = fc.integer({ min: 100, max: 9999900 })

// --- Property 12: Payment correctly updates bill status ---

describe('Feature: amarspace-full-implementation, Property 12: Payment correctly updates bill status', () => {
  let auditLogger: ReturnType<typeof createMockAuditLogger>

  beforeEach(() => {
    auditLogger = createMockAuditLogger()
  })

  it('when payment amount equals remaining balance, bill status SHALL become Paid', async () => {
    await fc.assert(
      fc.asyncProperty(
        totalCentsArb,
        fc.integer({ min: 0, max: 9999899 }),
        async (totalCents, existingPaidCents) => {
          // Ensure existingPaidCents < totalCents so there's a remaining balance
          fc.pre(existingPaidCents < totalCents)

          const ownerAccountId = 'owner-1'
          const ctx = createOwnerContext(ownerAccountId)
          const totalAmount = centsToDecimal(totalCents)
          const existingPaidAmount = centsToDecimal(existingPaidCents)

          // Compute remaining balance the same way the service does to avoid FP mismatch
          const remainingBalance = computeRemainingBalance(
            totalAmount,
            existingPaidAmount,
          )

          // Pay exactly the remaining balance (as the service sees it)
          // Round to 2 decimal places to satisfy the hasMaxTwoDecimalPlaces check
          const paymentAmount = Number(remainingBalance.toFixed(2))
          const paymentDate = getTodayDateString()

          // Ensure payment is valid (>= 0.01)
          fc.pre(paymentAmount >= 0.01)

          const db = mockDbWithTransaction({
            query: {
              bills: {
                findFirst: vi.fn().mockResolvedValue({
                  id: BILL_ID,
                  ownerAccountId,
                  contractId: CONTRACT_ID,
                  flatId: FLAT_ID,
                  renterId: RENTER_ID,
                  billingMonth: '2024-01',
                  baseRent: totalAmount,
                  totalAmount,
                  paidAmount: existingPaidAmount,
                  status:
                    existingPaidCents > 0
                      ? BILL_STATUS.PARTIALLY_PAID
                      : BILL_STATUS.UNPAID,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }),
              },
              flats: { findFirst: vi.fn() },
              renters: { findFirst: vi.fn() },
            },
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([
                  {
                    id: 'payment-1',
                    ownerAccountId,
                    billId: BILL_ID,
                    receiptReference: 'ABCDEF123456',
                    amount: paymentAmount.toFixed(2),
                    paymentDate,
                    paymentMethod: 'cash',
                    note: null,
                    createdAt: new Date(),
                  },
                ]),
              }),
            }),
            update: vi.fn().mockReturnValue({
              set: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(undefined),
              }),
            }),
          })

          const service = new PaymentService(
            db as unknown as Database,
            auditLogger,
          )

          await service.recordPayment(ctx, {
            billId: BILL_ID,
            amount: paymentAmount,
            paymentDate,
            paymentMethod: 'cash',
          })

          // Property: When payment equals remaining balance, status becomes Paid
          const setCall =
            db.update.mock.results[0]?.value?.set?.mock?.calls?.[0]?.[0]

          expect(setCall.status).toBe(BILL_STATUS.PAID)
        },
      ),
      { numRuns: 200 },
    )
  })

  it('when payment amount is less than remaining balance, bill status SHALL become Partially_Paid', async () => {
    await fc.assert(
      fc.asyncProperty(
        totalCentsArb,
        fc.integer({ min: 0, max: 9999899 }),
        fc.integer({ min: 1, max: 99 }),
        async (totalCents, existingPaidCents, paymentPercent) => {
          // Ensure existingPaidCents < totalCents
          fc.pre(existingPaidCents < totalCents)

          const ownerAccountId = 'owner-1'
          const ctx = createOwnerContext(ownerAccountId)
          const totalAmount = centsToDecimal(totalCents)
          const existingPaidAmount = centsToDecimal(existingPaidCents)

          // Compute remaining balance the same way the service does
          const remainingBalance = computeRemainingBalance(
            totalAmount,
            existingPaidAmount,
          )

          // Pay a percentage of the remaining (always less than remaining)
          const paymentAmount = Number(
            ((remainingBalance * paymentPercent) / 100).toFixed(2),
          )

          // Ensure payment is at least 0.01 and strictly less than remaining
          fc.pre(paymentAmount >= 0.01 && paymentAmount < remainingBalance)

          const paymentDate = getTodayDateString()

          const db = mockDbWithTransaction({
            query: {
              bills: {
                findFirst: vi.fn().mockResolvedValue({
                  id: BILL_ID,
                  ownerAccountId,
                  contractId: CONTRACT_ID,
                  flatId: FLAT_ID,
                  renterId: RENTER_ID,
                  billingMonth: '2024-01',
                  baseRent: totalAmount,
                  totalAmount,
                  paidAmount: existingPaidAmount,
                  status:
                    existingPaidCents > 0
                      ? BILL_STATUS.PARTIALLY_PAID
                      : BILL_STATUS.UNPAID,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }),
              },
              flats: { findFirst: vi.fn() },
              renters: { findFirst: vi.fn() },
            },
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([
                  {
                    id: 'payment-1',
                    ownerAccountId,
                    billId: BILL_ID,
                    receiptReference: 'ABCDEF123456',
                    amount: paymentAmount.toFixed(2),
                    paymentDate,
                    paymentMethod: 'bank_transfer',
                    note: null,
                    createdAt: new Date(),
                  },
                ]),
              }),
            }),
            update: vi.fn().mockReturnValue({
              set: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(undefined),
              }),
            }),
          })

          const service = new PaymentService(
            db as unknown as Database,
            auditLogger,
          )

          await service.recordPayment(ctx, {
            billId: BILL_ID,
            amount: paymentAmount,
            paymentDate,
            paymentMethod: 'bank_transfer',
          })

          // Property: When payment is less than remaining balance, status becomes Partially_Paid
          const setCall =
            db.update.mock.results[0]?.value?.set?.mock?.calls?.[0]?.[0]

          expect(setCall.status).toBe(BILL_STATUS.PARTIALLY_PAID)

          // Verify paidAmount increased but is still less than totalAmount
          const newPaidAmount = Number.parseFloat(setCall.paidAmount)
          const totalParsed = Number.parseFloat(totalAmount)
          expect(newPaidAmount).toBeLessThan(totalParsed)
        },
      ),
      { numRuns: 200 },
    )
  })

  it('if payment amount exceeds remaining balance, the payment SHALL be rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        totalCentsArb,
        fc.integer({ min: 0, max: 9999899 }),
        fc.integer({ min: 1, max: 9999900 }),
        async (totalCents, existingPaidCents, excessCents) => {
          // Ensure existingPaidCents < totalCents
          fc.pre(existingPaidCents < totalCents)

          const ownerAccountId = 'owner-1'
          const ctx = createOwnerContext(ownerAccountId)
          const totalAmount = centsToDecimal(totalCents)
          const existingPaidAmount = centsToDecimal(existingPaidCents)

          // Compute remaining balance the same way the service does
          const remainingBalance = computeRemainingBalance(
            totalAmount,
            existingPaidAmount,
          )

          // Payment exceeds remaining balance by at least 0.01
          const paymentAmount = Number(
            (remainingBalance + excessCents / 100).toFixed(2),
          )
          const paymentDate = getTodayDateString()

          // Ensure payment actually exceeds remaining
          fc.pre(paymentAmount > remainingBalance)
          // Stay within valid amount range for Zod schema
          fc.pre(paymentAmount <= 999_999_999.99)

          const db = mockDbWithTransaction({
            query: {
              bills: {
                findFirst: vi.fn().mockResolvedValue({
                  id: BILL_ID,
                  ownerAccountId,
                  contractId: CONTRACT_ID,
                  flatId: FLAT_ID,
                  renterId: RENTER_ID,
                  billingMonth: '2024-01',
                  baseRent: totalAmount,
                  totalAmount,
                  paidAmount: existingPaidAmount,
                  status:
                    existingPaidCents > 0
                      ? BILL_STATUS.PARTIALLY_PAID
                      : BILL_STATUS.UNPAID,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }),
              },
              flats: { findFirst: vi.fn() },
              renters: { findFirst: vi.fn() },
            },
            insert: vi.fn(),
            update: vi.fn(),
          })

          const service = new PaymentService(
            db as unknown as Database,
            auditLogger,
          )

          // Property: Payment exceeding remaining balance SHALL be rejected
          await expect(
            service.recordPayment(ctx, {
              billId: BILL_ID,
              amount: paymentAmount,
              paymentDate,
              paymentMethod: 'mobile_banking',
            }),
          ).rejects.toThrow()

          // No payment should be inserted
          expect(db.insert).not.toHaveBeenCalled()
          // No bill update should occur
          expect(db.update).not.toHaveBeenCalled()
        },
      ),
      { numRuns: 200 },
    )
  })

  it('multiple partial payments maintain correct running totals and final status', async () => {
    await fc.assert(
      fc.asyncProperty(
        totalCentsArb,
        fc.integer({ min: 2, max: 4 }),
        async (totalCents, numPayments) => {
          // Ensure total is large enough to split into numPayments parts (each >= 1 cent)
          fc.pre(totalCents >= numPayments * 10) // At least 10 cents per payment

          const ownerAccountId = 'owner-1'
          const ctx = createOwnerContext(ownerAccountId)
          const paymentDate = getTodayDateString()
          const totalAmount = centsToDecimal(totalCents)

          // Split totalCents into numPayments integer parts that sum exactly to totalCents
          const partsCents: number[] = []
          let remainingCents = totalCents
          for (let i = 0; i < numPayments - 1; i++) {
            // Each part must be at least 1 cent, leave room for remaining parts
            const maxForThisPart = remainingCents - (numPayments - i - 1)
            const part = Math.max(1, Math.floor(Math.random() * maxForThisPart))
            partsCents.push(part)
            remainingCents -= part
          }
          // Last part gets the remainder
          partsCents.push(remainingCents)

          // Verify all parts are at least 1 cent
          fc.pre(partsCents.every((p) => p >= 1))
          // Verify sum equals total
          fc.pre(partsCents.reduce((sum, p) => sum + p, 0) === totalCents)

          // Track running paid amount as a string (same as DB stores it)
          let runningPaidStr = '0.00'

          for (let i = 0; i < partsCents.length; i++) {
            const paymentCents = partsCents[i]!

            // Compute remaining balance the same way the service does
            const serviceRemainingBalance = computeRemainingBalance(
              totalAmount,
              runningPaidStr,
            )

            // The payment amount: for the last payment, pay exactly the remaining balance
            // For intermediate payments, pay the part amount
            let paymentAmount: number
            if (i === partsCents.length - 1) {
              // Last payment: pay exactly what the service sees as remaining
              paymentAmount = Number(serviceRemainingBalance.toFixed(2))
            } else {
              paymentAmount = paymentCents / 100
              // Ensure intermediate payment doesn't exceed remaining
              fc.pre(paymentAmount < serviceRemainingBalance)
            }

            // Ensure payment is valid
            fc.pre(paymentAmount >= 0.01)

            const db = mockDbWithTransaction({
              query: {
                bills: {
                  findFirst: vi.fn().mockResolvedValue({
                    id: BILL_ID,
                    ownerAccountId,
                    contractId: CONTRACT_ID,
                    flatId: FLAT_ID,
                    renterId: RENTER_ID,
                    billingMonth: '2024-01',
                    baseRent: totalAmount,
                    totalAmount,
                    paidAmount: runningPaidStr,
                    status:
                      runningPaidStr === '0.00'
                        ? BILL_STATUS.UNPAID
                        : BILL_STATUS.PARTIALLY_PAID,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  }),
                },
                flats: { findFirst: vi.fn() },
                renters: { findFirst: vi.fn() },
              },
              insert: vi.fn().mockReturnValue({
                values: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([
                    {
                      id: `payment-${i + 1}`,
                      ownerAccountId,
                      billId: BILL_ID,
                      receiptReference: `RECEIPT${String(i + 1).padStart(8, '0')}`,
                      amount: paymentAmount.toFixed(2),
                      paymentDate,
                      paymentMethod: 'cash',
                      note: null,
                      createdAt: new Date(),
                    },
                  ]),
                }),
              }),
              update: vi.fn().mockReturnValue({
                set: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue(undefined),
                }),
              }),
            })

            const service = new PaymentService(
              db as unknown as Database,
              auditLogger,
            )

            await service.recordPayment(ctx, {
              billId: BILL_ID,
              amount: paymentAmount,
              paymentDate,
              paymentMethod: 'cash',
            })

            const setCall =
              db.update.mock.results[0]?.value?.set?.mock?.calls?.[0]?.[0]

            // Update running paid amount to what the service computed
            runningPaidStr = setCall.paidAmount

            // Property: status is Paid only on the last payment, Partially_Paid otherwise
            if (i === partsCents.length - 1) {
              // Last payment should make it Paid
              expect(setCall.status).toBe(BILL_STATUS.PAID)
            } else {
              expect(setCall.status).toBe(BILL_STATUS.PARTIALLY_PAID)
            }
          }

          // Property: After all payments, the final paidAmount equals totalAmount
          expect(Number.parseFloat(runningPaidStr)).toBeCloseTo(
            Number.parseFloat(totalAmount),
            2,
          )
        },
      ),
      { numRuns: 100 },
    )
  })
})
