// Feature: renter-qr-portal, Property 5: Registration form validation
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { validateRegistrationForm } from '../../src/portal/registration-validation'

/**
 * Property 5: Registration form validation
 *
 * *For any* registration form input, the validation function SHALL accept the input
 * if and only if all required fields satisfy their constraints: Full Name (1–100 chars),
 * Phone (11 digits starting with 01), NID (10 or 17 digits), Blood Group (one of
 * A+, A−, B+, B−, O+, O−, AB+, AB−), Occupation (1–100 chars), Family Members
 * (integer 1–20), Emergency Contact (11 digits starting with 01), Rental Start Date
 * (current or future within 90 days), Advance Amount (0–99,999,999), and Digital
 * Signature (at least 1 stroke). For any invalid input, the function SHALL produce
 * a Bangla error message for each invalid field.
 *
 */

// ─── Generators ─────────────────────────────────────────────────────────────

/** Generates a valid full name (1–100 chars) */
const validFullName = () =>
  fc
    .string({ minLength: 1, maxLength: 100, unit: 'grapheme' })
    .filter((s) => s.trim().length > 0)

/** Generates a valid Bangladeshi phone number (11 digits starting with 01) */
const validPhone = () => fc.stringMatching(/^01[0-9]{9}$/)

/** Generates a valid NID number (10 or 17 digits) */
const validNid = () =>
  fc.oneof(fc.stringMatching(/^[0-9]{10}$/), fc.stringMatching(/^[0-9]{17}$/))

/** Generates a valid blood group */
const validBloodGroup = () =>
  fc.constantFrom('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-')

/** Generates a valid occupation (1–100 chars) */
const validOccupation = () =>
  fc
    .string({ minLength: 1, maxLength: 100, unit: 'grapheme' })
    .filter((s) => s.trim().length > 0)

/** Generates a valid family members count (integer 1–20) */
const validFamilyMembers = () => fc.integer({ min: 1, max: 20 })

/** Generates a valid emergency contact (11 digits starting with 01) */
const validEmergencyContact = () => fc.stringMatching(/^01[0-9]{9}$/)

/** Generates a valid rental start date (today or future within 90 days) */
const validRentalStartDate = () =>
  fc.integer({ min: 0, max: 89 }).map((daysFromNow) => {
    // Use the same date computation approach as the validation schema:
    // new Date() with setHours(0,0,0,0) for "today", then format as YYYY-MM-DD.
    // We use max: 89 to avoid timezone boundary issues at the 90-day edge.
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + daysFromNow)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })

/** Generates a valid advance amount (0–99,999,999) */
const validAdvanceAmount = () => fc.integer({ min: 0, max: 99_999_999 })

/** Generates a valid digital signature (non-empty base64 string) */
const validDigitalSignature = () =>
  fc.constantFrom(
    'data:image/png;base64,iVBORw0KGgo=',
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'AQID',
    'dGVzdA==',
  )

/** Generates a valid image/base64 string for photo uploads */
const validPhoto = () =>
  fc.constantFrom(
    'data:image/png;base64,iVBORw0KGgo=',
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  )

/** Generates family member names */
const validFamilyMemberNames = () =>
  fc.array(
    fc
      .string({ minLength: 1, maxLength: 50, unit: 'grapheme' })
      .filter((s) => s.trim().length > 0),
    { minLength: 1, maxLength: 20 },
  )

/** Generates a complete valid registration form input */
const validRegistrationForm = () =>
  fc.record({
    fullName: validFullName(),
    phone: validPhone(),
    nidNumber: validNid(),
    nidPhoto: validPhoto(),
    selfiePhoto: validPhoto(),
    bloodGroup: validBloodGroup(),
    occupation: validOccupation(),
    familyMembers: validFamilyMembers(),
    familyMemberNames: validFamilyMemberNames(),
    emergencyContactName: validFullName(),
    emergencyContact: validEmergencyContact(),
    emergencyContactRelationship: fc
      .string({ minLength: 1, maxLength: 50, unit: 'grapheme' })
      .filter((s) => s.trim().length > 0),
    rentalStartDate: validRentalStartDate(),
    advanceAmount: validAdvanceAmount(),
    digitalSignature: validDigitalSignature(),
  })

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Property 5: Registration form validation', () => {
  it('accepts all valid registration form inputs', () => {
    fc.assert(
      fc.property(validRegistrationForm(), (input) => {
        const result = validateRegistrationForm(input)
        expect(result.success).toBe(true)
        expect(result.data).toBeDefined()
        expect(result.errors).toBeUndefined()
      }),
      { numRuns: 100 },
    )
  })

  it('rejects inputs with invalid full name (empty or >100 chars)', () => {
    const invalidFullName = fc.oneof(
      fc.constant(''),
      fc.string({ minLength: 101, maxLength: 200, unit: 'grapheme' }),
    )

    fc.assert(
      fc.property(
        validRegistrationForm(),
        invalidFullName,
        (validInput, badName) => {
          const input = { ...validInput, fullName: badName }
          const result = validateRegistrationForm(input)
          expect(result.success).toBe(false)
          expect(result.errors).toBeDefined()
          expect(result.errors!.fullName).toBeDefined()
          // Error message should be in Bangla
          expect(result.errors!.fullName).toMatch(/[\u0980-\u09FF]/)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('rejects inputs with invalid phone number', () => {
    const invalidPhone = fc.oneof(
      fc.constant(''),
      fc.constant('1234567890'), // doesn't start with 01
      fc.constant('0123456'), // too short
      fc.constant('012345678901'), // too long
      fc.constant('02123456789'), // starts with 02
    )

    fc.assert(
      fc.property(
        validRegistrationForm(),
        invalidPhone,
        (validInput, badPhone) => {
          const input = { ...validInput, phone: badPhone }
          const result = validateRegistrationForm(input)
          expect(result.success).toBe(false)
          expect(result.errors).toBeDefined()
          expect(result.errors!.phone).toBeDefined()
          expect(result.errors!.phone).toMatch(/[\u0980-\u09FF]/)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('rejects inputs with invalid NID number', () => {
    const invalidNid = fc.oneof(
      fc.constant(''),
      fc.constant('12345'), // too short
      fc.constant('12345678901'), // 11 digits (not 10 or 17)
      fc.constant('1234567890123456'), // 16 digits
      fc.constant('123456789012345678'), // 18 digits
      fc.constant('abcdefghij'), // non-numeric
    )

    fc.assert(
      fc.property(validRegistrationForm(), invalidNid, (validInput, badNid) => {
        const input = { ...validInput, nidNumber: badNid }
        const result = validateRegistrationForm(input)
        expect(result.success).toBe(false)
        expect(result.errors).toBeDefined()
        expect(result.errors!.nidNumber).toBeDefined()
        expect(result.errors!.nidNumber).toMatch(/[\u0980-\u09FF]/)
      }),
      { numRuns: 100 },
    )
  })

  it('rejects inputs with invalid blood group', () => {
    const invalidBloodGroup = fc
      .string({ minLength: 1, maxLength: 5 })
      .filter(
        (s) => !['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].includes(s),
      )

    fc.assert(
      fc.property(
        validRegistrationForm(),
        invalidBloodGroup,
        (validInput, badBloodGroup) => {
          const input = { ...validInput, bloodGroup: badBloodGroup }
          const result = validateRegistrationForm(input)
          expect(result.success).toBe(false)
          expect(result.errors).toBeDefined()
          expect(result.errors!.bloodGroup).toBeDefined()
          expect(result.errors!.bloodGroup).toMatch(/[\u0980-\u09FF]/)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('rejects inputs with invalid family members count', () => {
    const invalidFamilyMembers = fc.oneof(
      fc.integer({ min: -100, max: 0 }),
      fc.integer({ min: 21, max: 200 }),
      fc
        .double({ min: 1.1, max: 19.9, noNaN: true, noDefaultInfinity: true })
        .filter((n) => !Number.isInteger(n)),
    )

    fc.assert(
      fc.property(
        validRegistrationForm(),
        invalidFamilyMembers,
        (validInput, badCount) => {
          const input = { ...validInput, familyMembers: badCount }
          const result = validateRegistrationForm(input)
          expect(result.success).toBe(false)
          expect(result.errors).toBeDefined()
          expect(result.errors!.familyMembers).toBeDefined()
          expect(result.errors!.familyMembers).toMatch(/[\u0980-\u09FF]/)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('rejects inputs with invalid advance amount', () => {
    const invalidAdvanceAmount = fc.oneof(
      fc.integer({ min: -1000, max: -1 }),
      fc.integer({ min: 100_000_000, max: 999_999_999 }),
    )

    fc.assert(
      fc.property(
        validRegistrationForm(),
        invalidAdvanceAmount,
        (validInput, badAmount) => {
          const input = { ...validInput, advanceAmount: badAmount }
          const result = validateRegistrationForm(input)
          expect(result.success).toBe(false)
          expect(result.errors).toBeDefined()
          expect(result.errors!.advanceAmount).toBeDefined()
          expect(result.errors!.advanceAmount).toMatch(/[\u0980-\u09FF]/)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('rejects inputs with invalid digital signature (empty)', () => {
    const invalidSignature = fc.constantFrom('', '   ')

    fc.assert(
      fc.property(
        validRegistrationForm(),
        invalidSignature,
        (validInput, badSig) => {
          const input = { ...validInput, digitalSignature: badSig }
          const result = validateRegistrationForm(input)
          expect(result.success).toBe(false)
          expect(result.errors).toBeDefined()
          expect(result.errors!.digitalSignature).toBeDefined()
          expect(result.errors!.digitalSignature).toMatch(/[\u0980-\u09FF]/)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('rejects inputs with past rental start date', () => {
    const pastDate = fc.integer({ min: 1, max: 365 }).map((daysAgo) => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - daysAgo)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    })

    fc.assert(
      fc.property(validRegistrationForm(), pastDate, (validInput, badDate) => {
        const input = { ...validInput, rentalStartDate: badDate }
        const result = validateRegistrationForm(input)
        expect(result.success).toBe(false)
        expect(result.errors).toBeDefined()
        expect(result.errors!.rentalStartDate).toBeDefined()
        expect(result.errors!.rentalStartDate).toMatch(/[\u0980-\u09FF]/)
      }),
      { numRuns: 100 },
    )
  })

  it('rejects inputs with rental start date beyond 90 days', () => {
    const farFutureDate = fc
      .integer({ min: 91, max: 365 })
      .map((daysFromNow) => {
        const date = new Date()
        date.setHours(0, 0, 0, 0)
        date.setDate(date.getDate() + daysFromNow)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      })

    fc.assert(
      fc.property(
        validRegistrationForm(),
        farFutureDate,
        (validInput, badDate) => {
          const input = { ...validInput, rentalStartDate: badDate }
          const result = validateRegistrationForm(input)
          expect(result.success).toBe(false)
          expect(result.errors).toBeDefined()
          expect(result.errors!.rentalStartDate).toBeDefined()
          expect(result.errors!.rentalStartDate).toMatch(/[\u0980-\u09FF]/)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('produces errors for multiple invalid fields simultaneously', () => {
    fc.assert(
      fc.property(validRegistrationForm(), (validInput) => {
        const input = {
          ...validInput,
          fullName: '', // invalid
          phone: '123', // invalid
          familyMembers: 0, // invalid
        }
        const result = validateRegistrationForm(input)
        expect(result.success).toBe(false)
        expect(result.errors).toBeDefined()
        // Should have errors for all three invalid fields
        expect(result.errors!.fullName).toBeDefined()
        expect(result.errors!.phone).toBeDefined()
        expect(result.errors!.familyMembers).toBeDefined()
        // All error messages should be in Bangla
        expect(result.errors!.fullName).toMatch(/[\u0980-\u09FF]/)
        expect(result.errors!.phone).toMatch(/[\u0980-\u09FF]/)
        expect(result.errors!.familyMembers).toMatch(/[\u0980-\u09FF]/)
      }),
      { numRuns: 100 },
    )
  })
})
