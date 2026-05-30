// Feature: renter-qr-portal, Property 1: Flat slug validation
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  FLAT_SLUG_PATTERN,
  isValidFlatSlug,
} from '../../src/portal/slug-validation'

/**
 * Property 1: Flat slug validation
 *
 * *For any* string, the slug validation function SHALL accept it if and only if
 * it consists exclusively of lowercase alphanumeric characters (a-z, 0-9) and
 * hyphens, with a length between 1 and 100 characters inclusive. All other
 * strings SHALL be rejected without triggering a database lookup.
 *
 * **Validates: Requirements 1.3, 1.5**
 */
describe('Property 1: Flat slug validation', () => {
  it('accepts any string composed of lowercase alphanumeric characters and hyphens with length 1-100', () => {
    const validSlugChar = fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyz0123456789-'.split(''),
    )
    const validSlug = fc
      .array(validSlugChar, { minLength: 1, maxLength: 100 })
      .map((chars) => chars.join(''))

    fc.assert(
      fc.property(validSlug, (slug) => {
        expect(isValidFlatSlug(slug)).toBe(true)
      }),
      { numRuns: 100 },
    )
  })

  it('rejects empty strings', () => {
    expect(isValidFlatSlug('')).toBe(false)
  })

  it('rejects strings longer than 100 characters', () => {
    const validSlugChar = fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyz0123456789-'.split(''),
    )
    const tooLongSlug = fc
      .array(validSlugChar, { minLength: 101, maxLength: 200 })
      .map((chars) => chars.join(''))

    fc.assert(
      fc.property(tooLongSlug, (slug) => {
        expect(isValidFlatSlug(slug)).toBe(false)
      }),
      { numRuns: 100 },
    )
  })

  it('rejects strings containing uppercase letters', () => {
    const uppercaseChar = fc.constantFrom(
      ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    )
    // Generate a string that has at least one uppercase character
    const slugWithUppercase = fc
      .tuple(
        fc.array(
          fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')),
          { minLength: 0, maxLength: 50 },
        ),
        uppercaseChar,
        fc.array(
          fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')),
          { minLength: 0, maxLength: 50 },
        ),
      )
      .map(([prefix, upper, suffix]) => [...prefix, upper, ...suffix].join(''))
      .filter((s) => s.length >= 1 && s.length <= 100)

    fc.assert(
      fc.property(slugWithUppercase, (slug) => {
        expect(isValidFlatSlug(slug)).toBe(false)
      }),
      { numRuns: 100 },
    )
  })

  it('rejects strings containing special characters (not alphanumeric or hyphen)', () => {
    const specialChar = fc.constantFrom(
      ...'!@#$%^&*()_+=[]{}|;:\'",.<>?/\\~ '.split(''),
    )
    const slugWithSpecial = fc
      .tuple(
        fc.array(
          fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')),
          { minLength: 0, maxLength: 50 },
        ),
        specialChar,
        fc.array(
          fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')),
          { minLength: 0, maxLength: 50 },
        ),
      )
      .map(([prefix, special, suffix]) =>
        [...prefix, special, ...suffix].join(''),
      )
      .filter((s) => s.length >= 1 && s.length <= 100)

    fc.assert(
      fc.property(slugWithSpecial, (slug) => {
        expect(isValidFlatSlug(slug)).toBe(false)
      }),
      { numRuns: 100 },
    )
  })

  it('the validation function and FLAT_SLUG_PATTERN regex produce identical results for any string', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 150 }), (input) => {
        const functionResult = isValidFlatSlug(input)
        const regexResult = FLAT_SLUG_PATTERN.test(input)
        expect(functionResult).toBe(regexResult)
      }),
      { numRuns: 100 },
    )
  })
})
