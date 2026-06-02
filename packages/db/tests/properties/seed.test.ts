/**
 * Feature: amarspace-infrastructure-setup, Property 3: Seed Script Idempotence
 *
 *
 * For any database state, executing the seed script N times (where N ≥ 1)
 * SHALL produce the same database state as executing it exactly once —
 * specifically, the row count and content of all seeded tables SHALL be
 * identical after any number of executions.
 */

import * as fc from 'fast-check'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { seed } from '../../src/seed'

/**
 * Mock database layer that simulates Drizzle's insert().values().onConflictDoNothing() chain.
 * Tracks inserted rows and respects the onConflictDoNothing behavior by deduplicating on email.
 */
function createMockDb() {
  const insertedRows: Array<{
    email: string
    name: string
    hashedPassword: string
    emailVerified: boolean
  }> = []

  const mockDb = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockImplementation((rows: Record<string, unknown>[]) => {
      // Store the rows that would be inserted (before conflict resolution)
      const pendingRows = rows.map((row) => ({
        email: row.email as string,
        name: row.name as string,
        hashedPassword: row.hashedPassword as string,
        emailVerified: row.emailVerified as boolean,
      }))

      return {
        onConflictDoNothing: vi.fn().mockImplementation(() => {
          // Simulate ON CONFLICT DO NOTHING: only insert rows with unique emails
          for (const row of pendingRows) {
            const exists = insertedRows.some((r) => r.email === row.email)
            if (!exists) {
              insertedRows.push(row)
            }
          }
          return Promise.resolve()
        }),
      }
    }),
    getInsertedRows: () => [...insertedRows],
    reset: () => {
      insertedRows.length = 0
    },
  }

  // Chain: db.insert(table).values([...]).onConflictDoNothing(...)
  mockDb.insert = vi.fn().mockReturnValue({
    values: mockDb.values,
  })

  return mockDb
}

describe('Feature: amarspace-infrastructure-setup, Property 3: Seed Script Idempotence', () => {
  beforeEach(() => {
    // Suppress console.log from seed function
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('running seed N times produces same row count as running once', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate N between 1 and 10 (number of times to run seed)
        fc.integer({ min: 1, max: 10 }),
        async (n) => {
          // Run seed once and capture state
          const singleRunDb = createMockDb()
          await seed(singleRunDb as unknown as Parameters<typeof seed>[0])
          const singleRunRows = singleRunDb.getInsertedRows()

          // Run seed N times on a fresh db
          const multiRunDb = createMockDb()
          for (let i = 0; i < n; i++) {
            await seed(multiRunDb as unknown as Parameters<typeof seed>[0])
          }
          const multiRunRows = multiRunDb.getInsertedRows()

          // Row count must be identical
          expect(multiRunRows.length).toBe(singleRunRows.length)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('running seed N times produces same content as running once', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 10 }), async (n) => {
        // Run seed once
        const singleRunDb = createMockDb()
        await seed(singleRunDb as unknown as Parameters<typeof seed>[0])
        const singleRunRows = singleRunDb.getInsertedRows()

        // Run seed N times
        const multiRunDb = createMockDb()
        for (let i = 0; i < n; i++) {
          await seed(multiRunDb as unknown as Parameters<typeof seed>[0])
        }
        const multiRunRows = multiRunDb.getInsertedRows()

        // Content must be identical (same emails, names, etc.)
        const sortByEmail = (a: { email: string }, b: { email: string }) =>
          a.email.localeCompare(b.email)

        const sortedSingle = [...singleRunRows].sort(sortByEmail)
        const sortedMulti = [...multiRunRows].sort(sortByEmail)

        expect(sortedMulti).toEqual(sortedSingle)
      }),
      { numRuns: 100 },
    )
  })

  it('seed uses onConflictDoNothing to ensure idempotence', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 2, max: 5 }), async (n) => {
        let onConflictDoNothingCallCount = 0

        // Create a db mock that tracks onConflictDoNothing calls
        const trackingDb = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              onConflictDoNothing: vi.fn().mockImplementation(() => {
                onConflictDoNothingCallCount++
                return Promise.resolve()
              }),
            }),
          }),
        }

        for (let i = 0; i < n; i++) {
          await seed(trackingDb as unknown as Parameters<typeof seed>[0])
        }

        // onConflictDoNothing must be called on every seed invocation
        expect(onConflictDoNothingCallCount).toBe(n)
      }),
      { numRuns: 100 },
    )
  })
})
