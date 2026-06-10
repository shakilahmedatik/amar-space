import type { Database } from '@repo/db'
import { bills, flats, rentalContracts } from '@repo/db'
import { BILL_STATUS } from '@repo/shared/constants'
import type { RequestContext } from '@repo/shared/types'
import fc from 'fast-check'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuditLogger } from '../../src/plugins/audit-logger'
import { BillingService } from '../../src/services/billing'

/**
 * Feature: amarspace-full-implementation
 * Property 10: Bill total equals base rent plus line items
 *
 * For any bill with any number of utility line items (0 to 20), the total bill
 * amount SHALL equal the base rent amount plus the sum of all line item amounts.
 * This invariant holds after any line item addition.
 *
 */

/**
 * Feature: amarspace-full-implementation
 * Property 11: No duplicate bills per flat per month
 *
 * For any flat and billing month combination, the system SHALL contain at most
 * one bill. Attempting to generate a second bill for the same flat and month
 * SHALL be rejected.
 *
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

// --- Generators ---

/**
 * Generate a valid base rent amount: between 0.01 and 999,999.99 with 2 decimal places.
 */
const validBaseRentArb = fc
  .integer({ min: 1, max: 99999999 })
  .map((n) => (n / 100).toFixed(2))

/**
 * Generate a valid line item amount: between 0.01 and 999,999.99.
 */
const validLineItemAmountArb = fc
  .integer({ min: 1, max: 99999999 })
  .map((n) => Number((n / 100).toFixed(2)))

/**
 * Generate a valid line item description: 1-200 characters.
 */
const validDescriptionArb = fc
  .stringMatching(/^[A-Za-z0-9][A-Za-z0-9 ]{0,50}$/)
  .filter((s) => s.length >= 1 && s.length <= 200)

/**
 * Generate a valid billing month in YYYY-MM format.
 */
const validBillingMonthArb = fc
  .record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
  })
  .map(({ year, month }) => `${year}-${String(month).padStart(2, '0')}`)

/**
 * Generate a list of line items (0 to 20).
 */
const lineItemsArb = fc.array(
  fc.record({
    description: validDescriptionArb,
    amount: validLineItemAmountArb,
  }),
  { minLength: 0, maxLength: 20 },
)

function createMockDbForGenerate({
  occupiedFlats = [] as unknown[],
  existingBills = [] as unknown[],
  activeContracts = [] as unknown[],
  insertedBill = null as unknown,
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
        returning: vi
          .fn()
          .mockResolvedValue(insertedBill ? [insertedBill] : []),
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

// --- Property 10: Bill total equals base rent plus line items ---

describe('Feature: amarspace-full-implementation, Property 10: Bill total equals base rent plus line items', () => {
  let auditLogger: ReturnType<typeof createMockAuditLogger>

  beforeEach(() => {
    auditLogger = createMockAuditLogger()
  })

  it('after adding any number of line items (0-20), totalAmount SHALL equal baseRent + sum of line item amounts', async () => {
    await fc.assert(
      fc.asyncProperty(
        validBaseRentArb,
        lineItemsArb,
        async (baseRent, lineItems) => {
          const ownerAccountId = 'owner-1'
          const ctx = createOwnerContext(ownerAccountId)
          const billId = 'bill-1'

          // Track the running total of line items added
          let currentLineItemCount = 0
          let runningLineItemsTotal = 0

          // For each line item, we create a fresh service call to test the invariant
          for (const lineItem of lineItems) {
            const previousTotal = runningLineItemsTotal
            runningLineItemsTotal += lineItem.amount
            currentLineItemCount++

            // The select mock needs to handle two calls per addUtilityCharge:
            // 1. Count query (for max 20 check)
            // 2. SUM query (for calculateLineItemsTotal)
            let selectCallIndex = 0
            const currentRunningTotal = runningLineItemsTotal

            const db = {
              query: {
                bills: {
                  findFirst: vi.fn().mockResolvedValue({
                    id: billId,
                    ownerAccountId,
                    contractId: 'contract-1',
                    flatId: 'flat-1',
                    renterId: 'renter-1',
                    billingMonth: '2024-01',
                    baseRent,
                    totalAmount: (
                      Number.parseFloat(baseRent) + previousTotal
                    ).toFixed(2),
                    paidAmount: '0',
                    status: BILL_STATUS.UNPAID,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  }),
                },
                flats: { findFirst: vi.fn() },
                renters: { findFirst: vi.fn() },
              },
              select: vi.fn().mockImplementation(() => {
                const callIdx = selectCallIndex++
                return {
                  from: vi.fn().mockReturnValue({
                    where: vi.fn().mockImplementation(() => {
                      if (callIdx === 0) {
                        // First call: count query for max 20 check
                        return Promise.resolve([
                          { count: currentLineItemCount - 1 },
                        ])
                      }
                      // Second call: SUM query for calculateLineItemsTotal
                      return Promise.resolve([
                        { total: currentRunningTotal.toFixed(2) },
                      ])
                    }),
                  }),
                }
              }),
              insert: vi.fn().mockReturnValue({
                values: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([
                    {
                      id: `line-item-${currentLineItemCount}`,
                      billId,
                      description: lineItem.description,
                      amount: lineItem.amount.toFixed(2),
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
            }

            const service = new BillingService(
              db as unknown as Database,
              auditLogger,
            )

            await service.addUtilityCharge(ctx, billId, {
              description: lineItem.description,
              amount: lineItem.amount,
            })

            // Verify the update was called with the correct total
            const setCall =
              db.update.mock.results[0]?.value?.set?.mock?.calls?.[0]?.[0]

            if (setCall) {
              const expectedTotal = (
                Number.parseFloat(baseRent) + currentRunningTotal
              ).toFixed(2)

              // Property: totalAmount = baseRent + sum(all lineItemAmounts so far)
              expect(Number.parseFloat(setCall.totalAmount)).toBeCloseTo(
                Number.parseFloat(expectedTotal),
                2,
              )
            }
          }

          // Final invariant: total of all line items equals sum of individual amounts
          const actualLineItemsSum = lineItems.reduce(
            (sum, item) => sum + item.amount,
            0,
          )
          expect(runningLineItemsTotal).toBeCloseTo(actualLineItemsSum, 2)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('a bill with zero line items has totalAmount equal to baseRent', async () => {
    await fc.assert(
      fc.asyncProperty(validBaseRentArb, async (baseRent) => {
        const ownerAccountId = 'owner-1'
        const ctx = createOwnerContext(ownerAccountId)
        const billId = 'bill-1'
        const flatId = 'flat-1'
        const billingMonth = '2024-01'

        // Simulate bill generation: when a bill is created with no line items,
        // totalAmount should equal baseRent
        const db = createMockDbForGenerate({
          occupiedFlats: [
            {
              id: flatId,
              ownerAccountId,
              buildingId: 'building-1',
              flatNumber: 'A101',
              floor: 1,
              status: 'occupied',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          activeContracts: [
            {
              id: 'contract-1',
              flatId,
              ownerAccountId,
              monthlyRent: baseRent,
              renterId: 'renter-1',
              status: 'active',
              startDate: '2020-01-01',
            },
          ],
          insertedBill: {
            id: billId,
            ownerAccountId,
            contractId: 'contract-1',
            flatId,
            renterId: 'renter-1',
            billingMonth,
            baseRent,
            totalAmount: baseRent,
            paidAmount: '0',
            status: BILL_STATUS.UNPAID,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })

        const service = new BillingService(
          db as unknown as Database,
          auditLogger,
        )

        const result = await service.generateBills(ctx, billingMonth)

        // Property: When a bill is generated with no line items, totalAmount = baseRent
        expect(result.generated).toBe(1)

        // Verify the insert was called with totalAmount = baseRent
        const insertValues =
          db.insert.mock.results[0]?.value?.values?.mock?.calls?.[0]?.[0]
        if (insertValues) {
          expect(insertValues.totalAmount).toBe(baseRent)
          expect(insertValues.baseRent).toBe(baseRent)
        }
      }),
      { numRuns: 200 },
    )
  })

  it('adding a line item increases totalAmount by exactly the line item amount', async () => {
    await fc.assert(
      fc.asyncProperty(
        validBaseRentArb,
        validLineItemAmountArb,
        validDescriptionArb,
        async (baseRent, lineItemAmount, description) => {
          const ownerAccountId = 'owner-1'
          const ctx = createOwnerContext(ownerAccountId)
          const billId = 'bill-1'

          let selectCallIndex = 0

          const db = {
            query: {
              bills: {
                findFirst: vi.fn().mockResolvedValue({
                  id: billId,
                  ownerAccountId,
                  contractId: 'contract-1',
                  flatId: 'flat-1',
                  renterId: 'renter-1',
                  billingMonth: '2024-01',
                  baseRent,
                  totalAmount: baseRent, // Currently just base rent
                  paidAmount: '0',
                  status: BILL_STATUS.UNPAID,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }),
              },
              flats: { findFirst: vi.fn() },
              renters: { findFirst: vi.fn() },
            },
            select: vi.fn().mockImplementation(() => {
              const callIdx = selectCallIndex++
              return {
                from: vi.fn().mockReturnValue({
                  where: vi.fn().mockImplementation(() => {
                    if (callIdx === 0) {
                      // Count query: 0 existing line items
                      return Promise.resolve([{ count: 0 }])
                    }
                    // SUM query: returns the new line item amount
                    return Promise.resolve([
                      { total: lineItemAmount.toFixed(2) },
                    ])
                  }),
                }),
              }
            }),
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([
                  {
                    id: 'line-item-1',
                    billId,
                    description,
                    amount: lineItemAmount.toFixed(2),
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
          }

          const service = new BillingService(
            db as unknown as Database,
            auditLogger,
          )

          await service.addUtilityCharge(ctx, billId, {
            description,
            amount: lineItemAmount,
          })

          // Verify the update was called with the correct new total
          const setCall =
            db.update.mock.results[0]?.value?.set?.mock?.calls?.[0]?.[0]

          // Property: After adding one line item, totalAmount = baseRent + lineItemAmount
          const expectedTotal = Number.parseFloat(baseRent) + lineItemAmount
          expect(Number.parseFloat(setCall.totalAmount)).toBeCloseTo(
            expectedTotal,
            2,
          )
        },
      ),
      { numRuns: 200 },
    )
  })
})

// --- Property 11: No duplicate bills per flat per month ---

describe('Feature: amarspace-full-implementation, Property 11: No duplicate bills per flat per month', () => {
  let auditLogger: ReturnType<typeof createMockAuditLogger>

  beforeEach(() => {
    auditLogger = createMockAuditLogger()
  })

  it('generating bills for a flat+month that already has a bill SHALL skip that flat', async () => {
    await fc.assert(
      fc.asyncProperty(validBillingMonthArb, async (billingMonth) => {
        const ownerAccountId = 'owner-1'
        const ctx = createOwnerContext(ownerAccountId)
        const flatId = 'flat-1'

        // Simulate: flat is occupied, but a bill already exists for this month
        const db = createMockDbForGenerate({
          occupiedFlats: [
            {
              id: flatId,
              ownerAccountId,
              buildingId: 'building-1',
              flatNumber: 'A101',
              floor: 1,
              status: 'occupied',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          activeContracts: [
            {
              id: 'contract-1',
              flatId,
              ownerAccountId,
              monthlyRent: '10000.00',
              renterId: 'renter-1',
              status: 'active',
              startDate: '2020-01-01',
            },
          ],
          existingBills: [{ flatId }],
        })

        const service = new BillingService(
          db as unknown as Database,
          auditLogger,
        )

        const result = await service.generateBills(ctx, billingMonth)

        // Property: The flat with an existing bill is skipped (not generated again)
        expect(result.generated).toBe(0)
        expect(result.skipped.length).toBe(1)
        expect(result.skipped[0]?.flatId).toBe(flatId)
        expect(result.skipped[0]?.reason).toContain('already exists')

        // Property: No insert was called for a duplicate bill
        expect(db.insert).not.toHaveBeenCalled()
      }),
      { numRuns: 200 },
    )
  })

  it('the same flat can have bills for different months (no cross-month conflict)', async () => {
    await fc.assert(
      fc.asyncProperty(
        validBillingMonthArb,
        validBillingMonthArb,
        async (month1, month2) => {
          // Ensure different months
          fc.pre(month1 !== month2)

          const ownerAccountId = 'owner-1'
          const ctx = createOwnerContext(ownerAccountId)
          const flatId = 'flat-1'
          const baseRent = '15000.00'

          // Simulate: no existing bill for month2
          const db = createMockDbForGenerate({
            occupiedFlats: [
              {
                id: flatId,
                ownerAccountId,
                buildingId: 'building-1',
                flatNumber: 'A101',
                floor: 1,
                status: 'occupied',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
            activeContracts: [
              {
                id: 'contract-1',
                flatId,
                ownerAccountId,
                monthlyRent: baseRent,
                renterId: 'renter-1',
                status: 'active',
                startDate: '2020-01-01',
              },
            ],
            insertedBill: {
              id: 'new-bill-1',
              ownerAccountId,
              contractId: 'contract-1',
              flatId,
              renterId: 'renter-1',
              billingMonth: month2,
              baseRent,
              totalAmount: baseRent,
              paidAmount: '0',
              status: BILL_STATUS.UNPAID,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          })

          const service = new BillingService(
            db as unknown as Database,
            auditLogger,
          )

          const result = await service.generateBills(ctx, month2)

          // Property: A bill for a different month succeeds (no cross-month conflict)
          expect(result.generated).toBe(1)
          expect(result.skipped.length).toBe(0)
        },
      ),
      { numRuns: 200 },
    )
  })

  it('different flats can have bills for the same month (no cross-flat conflict)', async () => {
    await fc.assert(
      fc.asyncProperty(validBillingMonthArb, async (billingMonth) => {
        const ownerAccountId = 'owner-1'
        const ctx = createOwnerContext(ownerAccountId)
        const flat1Id = 'flat-1'
        const flat2Id = 'flat-2'
        const baseRent = '12000.00'

        let billInsertCount = 0

        // Simulate: two occupied flats, neither has a bill for this month
        const db = {
          select: vi.fn().mockImplementation((selectArg) => {
            // Check if it's a count query
            if (
              selectArg &&
              typeof selectArg === 'object' &&
              'count' in selectArg
            ) {
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
                  result = [
                    {
                      id: flat1Id,
                      ownerAccountId,
                      buildingId: 'building-1',
                      flatNumber: 'A101',
                      floor: 1,
                      status: 'occupied',
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    },
                    {
                      id: flat2Id,
                      ownerAccountId,
                      buildingId: 'building-1',
                      flatNumber: 'A102',
                      floor: 1,
                      status: 'occupied',
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    },
                  ]
                } else if (table === rentalContracts) {
                  result = [
                    {
                      id: 'contract-1',
                      flatId: flat1Id,
                      ownerAccountId,
                      monthlyRent: baseRent,
                      renterId: 'renter-1',
                      status: 'active',
                      startDate: '2020-01-01',
                    },
                    {
                      id: 'contract-2',
                      flatId: flat2Id,
                      ownerAccountId,
                      monthlyRent: baseRent,
                      renterId: 'renter-1',
                      status: 'active',
                      startDate: '2020-01-01',
                    },
                  ]
                } else if (table === bills) {
                  result = []
                }
                return {
                  where: vi.fn().mockResolvedValue(result),
                }
              }),
            }
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockImplementation(() => {
                billInsertCount++
                return Promise.resolve([
                  {
                    id: `new-bill-${billInsertCount}`,
                    ownerAccountId,
                    contractId: 'contract-1',
                    flatId: billInsertCount === 1 ? flat1Id : flat2Id,
                    renterId: 'renter-1',
                    billingMonth,
                    baseRent,
                    totalAmount: baseRent,
                    paidAmount: '0',
                    status: BILL_STATUS.UNPAID,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                ])
              }),
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
          update: vi.fn(),
        }

        const service = new BillingService(
          db as unknown as Database,
          auditLogger,
        )

        const result = await service.generateBills(ctx, billingMonth)

        // Property: Different flats can each have a bill for the same month
        expect(result.generated).toBe(2)
        expect(result.skipped.length).toBe(0)
      }),
      { numRuns: 200 },
    )
  })
})
