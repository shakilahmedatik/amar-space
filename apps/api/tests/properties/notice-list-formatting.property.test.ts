// Feature: renter-qr-portal, Property 3: Notice list formatting invariants
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  formatNoticesForPortal,
  type RawNotice,
} from '../../src/utils/notice-formatting'

/**
 * Property 3: Notice list formatting invariants
 *
 * For any list of notices, the portal's notice formatting function SHALL:
 * (a) return notices sorted in reverse chronological order (most recent first),
 * (b) truncate each notice description to a maximum of 120 characters, and
 * (c) return at most 20 notices regardless of input list size.
 *
 */

// --- Generators ---

/** Generate a valid Date within a reasonable range (no NaN dates) */
const validDateArb = fc.date({
  min: new Date('2020-01-01T00:00:00.000Z'),
  max: new Date('2030-12-31T23:59:59.999Z'),
  noInvalidDate: true,
})

/** Generate a single raw notice with arbitrary body length */
const rawNoticeArb: fc.Arbitrary<RawNotice> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 200 }),
  body: fc.string({ minLength: 0, maxLength: 500 }),
  createdAt: validDateArb,
  isPinned: fc.boolean(),
})

/** Generate a list of raw notices (0 to 50 items to test beyond the 20 limit) */
const noticeListArb = fc.array(rawNoticeArb, { minLength: 0, maxLength: 50 })

// --- Property Tests ---

describe('Feature: renter-qr-portal, Property 3: Notice list formatting invariants', () => {
  it('(a) notices are sorted in reverse chronological order (most recent first)', () => {
    fc.assert(
      fc.property(noticeListArb, (rawNotices) => {
        const result = formatNoticesForPortal(rawNotices)

        // Verify sorted in descending order by createdAt
        for (let i = 1; i < result.length; i++) {
          const prev = new Date(result[i - 1]!.createdAt).getTime()
          const curr = new Date(result[i]!.createdAt).getTime()
          expect(prev).toBeGreaterThanOrEqual(curr)
        }
      }),
      { numRuns: 100 },
    )
  })

  it('(b) each notice body is truncated to a maximum of 120 characters', () => {
    fc.assert(
      fc.property(noticeListArb, (rawNotices) => {
        const result = formatNoticesForPortal(rawNotices)

        for (const notice of result) {
          if (notice.body.endsWith('…')) {
            // Truncated: 120 chars + ellipsis character = 121 total
            expect(notice.body.length).toBe(121)
          } else {
            // Not truncated: original body was <= 120 chars
            expect(notice.body.length).toBeLessThanOrEqual(120)
          }
        }
      }),
      { numRuns: 100 },
    )
  })

  it('(b) truncated notices end with ellipsis and preserve the first 120 characters', () => {
    // Generate notices with body > 120 chars to ensure truncation happens
    const longBodyNoticeArb: fc.Arbitrary<RawNotice> = fc.record({
      id: fc.uuid(),
      title: fc.string({ minLength: 1, maxLength: 200 }),
      body: fc.string({ minLength: 121, maxLength: 500 }),
      createdAt: validDateArb,
      isPinned: fc.boolean(),
    })

    fc.assert(
      fc.property(
        fc.array(longBodyNoticeArb, { minLength: 1, maxLength: 20 }),
        (rawNotices) => {
          const result = formatNoticesForPortal(rawNotices)

          // Each result notice should correspond to the same index in sorted input
          const sortedInput = [...rawNotices].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
          )

          for (let i = 0; i < result.length; i++) {
            const formatted = result[i]!
            const original = sortedInput[i]!

            // Body > 120 chars should be truncated with ellipsis
            expect(formatted.body).toBe(`${original.body.slice(0, 120)}…`)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('(b) notices with body <= 120 characters are not truncated', () => {
    const shortBodyNoticeArb: fc.Arbitrary<RawNotice> = fc.record({
      id: fc.uuid(),
      title: fc.string({ minLength: 1, maxLength: 200 }),
      body: fc.string({ minLength: 0, maxLength: 120 }),
      createdAt: validDateArb,
      isPinned: fc.boolean(),
    })

    fc.assert(
      fc.property(
        fc.array(shortBodyNoticeArb, { minLength: 1, maxLength: 20 }),
        (rawNotices) => {
          const result = formatNoticesForPortal(rawNotices)

          // Sort input the same way the function does
          const sortedInput = [...rawNotices].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
          )

          for (let i = 0; i < result.length; i++) {
            const formatted = result[i]!
            const original = sortedInput[i]!
            // Body should be unchanged
            expect(formatted.body).toBe(original.body)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('(c) returns at most 20 notices regardless of input list size', () => {
    fc.assert(
      fc.property(noticeListArb, (rawNotices) => {
        const result = formatNoticesForPortal(rawNotices)

        expect(result.length).toBeLessThanOrEqual(20)

        // If input has more than 20, output should be exactly 20
        if (rawNotices.length > 20) {
          expect(result.length).toBe(20)
        }

        // If input has <= 20, output should match input length
        if (rawNotices.length <= 20) {
          expect(result.length).toBe(rawNotices.length)
        }
      }),
      { numRuns: 100 },
    )
  })

  it('(c) when limited to 20, the most recent 20 notices are kept', () => {
    // Generate lists with more than 20 notices
    const largeNoticeListArb = fc.array(rawNoticeArb, {
      minLength: 21,
      maxLength: 50,
    })

    fc.assert(
      fc.property(largeNoticeListArb, (rawNotices) => {
        const result = formatNoticesForPortal(rawNotices)

        // Sort the input by createdAt DESC to determine expected top 20
        const sortedInput = [...rawNotices].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        )
        const expectedTop20Ids = sortedInput.slice(0, 20).map((n) => n.id)

        // The result should contain exactly the top 20 most recent notices
        const resultIds = result.map((n) => n.id)
        expect(resultIds).toEqual(expectedTop20Ids)
      }),
      { numRuns: 100 },
    )
  })

  it('empty input returns empty output', () => {
    const result = formatNoticesForPortal([])
    expect(result).toEqual([])
  })

  it('createdAt is formatted as ISO 8601 string', () => {
    fc.assert(
      fc.property(
        fc.array(rawNoticeArb, { minLength: 1, maxLength: 20 }),
        (rawNotices) => {
          const result = formatNoticesForPortal(rawNotices)

          for (const notice of result) {
            // Should be a valid ISO 8601 date string
            const parsed = new Date(notice.createdAt)
            expect(parsed.toISOString()).toBe(notice.createdAt)
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
