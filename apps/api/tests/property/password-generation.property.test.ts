import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { generateTemporaryPassword } from '../../src/utils/password-generator'

// --- Character pools (matching the implementation) ---
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const DIGITS = '0123456789'
const SPECIAL = '!@#$%^&*'

// --- Generators ---

/** Generate an arbitrary password length parameter (including values below the minimum) */
const lengthArb = fc.integer({ min: 1, max: 128 })

// --- Property Tests ---

// Feature: role-based-user-management, Property 10: Generated temporary passwords meet all character requirements
describe('Feature: role-based-user-management, Property 10: Generated temporary passwords meet all character requirements', () => {
  /**
   *
   * For any invocation of the password generation function, the resulting password
   * SHALL have length ≥ 12 AND contain at least one uppercase letter, one lowercase
   * letter, one digit, and one special character.
   */
  it('generated password has length >= 12 and contains all required character types', () => {
    return fc.assert(
      fc.property(lengthArb, (length) => {
        const password = generateTemporaryPassword(length)

        // Property: Password length MUST be at least 12
        expect(password.length).toBeGreaterThanOrEqual(12)

        // Property: Password length MUST be at least the requested length (when >= 12)
        if (length >= 12) {
          expect(password.length).toBe(length)
        }

        // Property: Password MUST contain at least one uppercase letter
        const hasUppercase = [...password].some((ch) => UPPERCASE.includes(ch))
        expect(hasUppercase).toBe(true)

        // Property: Password MUST contain at least one lowercase letter
        const hasLowercase = [...password].some((ch) => LOWERCASE.includes(ch))
        expect(hasLowercase).toBe(true)

        // Property: Password MUST contain at least one digit
        const hasDigit = [...password].some((ch) => DIGITS.includes(ch))
        expect(hasDigit).toBe(true)

        // Property: Password MUST contain at least one special character
        const hasSpecial = [...password].some((ch) => SPECIAL.includes(ch))
        expect(hasSpecial).toBe(true)

        // Property: All characters MUST come from the valid character pools
        const allValidChars = UPPERCASE + LOWERCASE + DIGITS + SPECIAL
        const allValid = [...password].every((ch) => allValidChars.includes(ch))
        expect(allValid).toBe(true)
      }),
      { numRuns: 100 },
    )
  })

  it('generated password with default length meets all requirements', () => {
    return fc.assert(
      fc.property(fc.constant(undefined), () => {
        const password = generateTemporaryPassword()

        // Property: Default password length MUST be 16
        expect(password.length).toBe(16)

        // Property: Password MUST contain at least one uppercase letter
        const hasUppercase = [...password].some((ch) => UPPERCASE.includes(ch))
        expect(hasUppercase).toBe(true)

        // Property: Password MUST contain at least one lowercase letter
        const hasLowercase = [...password].some((ch) => LOWERCASE.includes(ch))
        expect(hasLowercase).toBe(true)

        // Property: Password MUST contain at least one digit
        const hasDigit = [...password].some((ch) => DIGITS.includes(ch))
        expect(hasDigit).toBe(true)

        // Property: Password MUST contain at least one special character
        const hasSpecial = [...password].some((ch) => SPECIAL.includes(ch))
        expect(hasSpecial).toBe(true)
      }),
      { numRuns: 100 },
    )
  })
})
