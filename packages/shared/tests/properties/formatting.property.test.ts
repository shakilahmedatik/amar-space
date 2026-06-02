import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { formatBDT } from '../../src/formatters/index'

/**
 * Property 19: BDT currency formatting
 *
 * *For any* numeric amount, the currency formatter SHALL produce a string with
 * the ৳ symbol followed by the amount with 2 decimal places and comma separators
 * following the Bangladeshi numbering system (last 3 digits grouped, then groups of 2).
 *
 */
describe('Property 19: BDT currency formatting', () => {
  it('output always starts with ৳ for non-negative numbers or -৳ for negative numbers', () => {
    fc.assert(
      fc.property(
        fc.double({
          min: -1e12,
          max: 1e12,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (amount) => {
          const result = formatBDT(amount)
          if (amount < 0) {
            expect(result.startsWith('-৳')).toBe(true)
          } else {
            expect(result.startsWith('৳')).toBe(true)
            expect(result.startsWith('-৳')).toBe(false)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('output always has exactly 2 decimal places', () => {
    fc.assert(
      fc.property(
        fc.double({
          min: -1e12,
          max: 1e12,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (amount) => {
          const result = formatBDT(amount)
          // The result should end with a dot followed by exactly 2 digits
          const match = result.match(/\.(\d+)$/)
          expect(match).not.toBeNull()
          expect(match![1]).toHaveLength(2)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('Bangladeshi grouping pattern is correct (last group of 3, then groups of 2)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1e12, noNaN: true, noDefaultInfinity: true }),
        (amount) => {
          const result = formatBDT(amount)
          // Extract the numeric part (remove ৳ prefix and sign)
          const numericPart = result.replace(/^-?৳/, '')
          // Split into integer and decimal
          const [integerPart] = numericPart.split('.')

          if (!integerPart!.includes(',')) {
            // No commas means integer part is <= 3 digits
            expect(integerPart!.replace(/,/g, '').length).toBeLessThanOrEqual(3)
          } else {
            // Validate Bangladeshi grouping pattern:
            // The last group (rightmost) should be exactly 3 digits
            // All preceding groups should be 1-2 digits (leftmost can be 1 or 2)
            const groups = integerPart!.split(',')
            // Last group must be exactly 3 digits
            expect(groups[groups.length - 1]).toHaveLength(3)
            // Middle groups (if any) must be exactly 2 digits
            for (let i = 1; i < groups.length - 1; i++) {
              expect(groups[i]).toHaveLength(2)
            }
            // First group can be 1 or 2 digits
            expect(groups[0]!.length).toBeGreaterThanOrEqual(1)
            expect(groups[0]!.length).toBeLessThanOrEqual(2)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('non-finite numbers (NaN, Infinity) return ৳0.00', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          Number.NaN,
          Number.POSITIVE_INFINITY,
          Number.NEGATIVE_INFINITY,
        ),
        (value) => {
          expect(formatBDT(value)).toBe('৳0.00')
        },
      ),
      { numRuns: 100 },
    )
  })

  it('parsing the formatted number back gives the original value (round-trip within 2 decimal precision)', () => {
    fc.assert(
      fc.property(
        fc.double({
          min: -1e9,
          max: 1e9,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (amount) => {
          const result = formatBDT(amount)
          // Remove the ৳ symbol and sign, then remove commas to parse back
          const sign = result.startsWith('-') ? -1 : 1
          const numericStr = result.replace(/^-?৳/, '').replace(/,/g, '')
          const parsed = Number.parseFloat(numericStr) * sign

          // The original amount rounded to 2 decimal places should match
          const expected =
            (Math.round(Math.abs(amount) * 100) / 100) * (amount < 0 ? -1 : 1)
          expect(parsed).toBeCloseTo(expected, 2)
        },
      ),
      { numRuns: 100 },
    )
  })
})
