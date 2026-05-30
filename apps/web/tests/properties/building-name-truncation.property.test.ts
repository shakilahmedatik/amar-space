// Feature: renter-qr-portal, Property 2: Building name truncation
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { formatBuildingName } from '../../app/f/[flatSlug]/lib/format-building-name'

/**
 * Property 2: Building name truncation
 *
 * For any building name string, the display formatter SHALL return the string
 * unchanged if its length is 100 characters or fewer, and SHALL return the first
 * 100 characters followed by an ellipsis ("…") if its length exceeds 100 characters.
 *
 * **Validates: Requirements 2.1**
 */

describe('Feature: renter-qr-portal, Property 2: Building name truncation', () => {
  it('for any building name of 100 characters or fewer, the formatter returns the string unchanged', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 100 }), (name) => {
        const result = formatBuildingName(name)
        expect(result).toBe(name)
      }),
      { numRuns: 100 },
    )
  })

  it('for any building name exceeding 100 characters, the formatter returns the first 100 characters followed by an ellipsis', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 101, maxLength: 500 }), (name) => {
        const result = formatBuildingName(name)

        // Result should be exactly 101 characters (100 chars + 1 ellipsis char)
        expect(result.length).toBe(101)

        // Result should start with the first 100 characters of the input
        expect(result.slice(0, 100)).toBe(name.slice(0, 100))

        // Result should end with the ellipsis character "…"
        expect(result[100]).toBe('\u2026')
      }),
      { numRuns: 100 },
    )
  })

  it('for any building name string, the formatter output length is at most 101 characters', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 1000 }), (name) => {
        const result = formatBuildingName(name)
        expect(result.length).toBeLessThanOrEqual(101)
      }),
      { numRuns: 100 },
    )
  })

  it('for any building name of exactly 100 characters, the formatter returns it unchanged (boundary case)', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 100, maxLength: 100 }), (name) => {
        const result = formatBuildingName(name)
        expect(result).toBe(name)
        expect(result.length).toBe(100)
      }),
      { numRuns: 100 },
    )
  })

  it('for any building name of exactly 101 characters, the formatter truncates and appends ellipsis', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 101, maxLength: 101 }), (name) => {
        const result = formatBuildingName(name)
        expect(result.length).toBe(101)
        expect(result).toBe(name.slice(0, 100) + '\u2026')
      }),
      { numRuns: 100 },
    )
  })
})
