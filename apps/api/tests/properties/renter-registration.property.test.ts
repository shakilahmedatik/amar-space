import { FLAT_STATUS } from '@repo/shared/constants'
import { ValidationError } from '@repo/shared/errors'
import type { RequestContext } from '@repo/shared/types'
import {
  bdPhoneSchema,
  bloodGroupEnum,
  nidSchema,
  registerRenterSchema,
} from '@repo/shared/validation'
import fc from 'fast-check'
import { describe, expect, it, vi } from 'vitest'
import { RenterRegistrationService } from '../../src/services/renter-registration'

/**
 * Feature: amarspace-full-implementation
 * Property 5: Renter registration field validation
 *
 * For any input to the renter registration form:
 * NID validation SHALL accept only numeric strings of 10-17 digits;
 * blood group validation SHALL accept only one of {A+, A-, B+, B-, AB+, AB-, O+, O-};
 * total family members SHALL accept only integers 1-50 inclusive;
 * phone number SHALL accept only 11-digit strings starting with "01".
 * All invalid inputs SHALL be rejected with field-level errors.
 *
 */

/**
 * Feature: amarspace-full-implementation
 * Property 6: Flat assignment requires Vacant status
 *
 * For any flat with a status other than Vacant, attempting to assign a renter
 * to that flat SHALL be rejected. Only flats with status Vacant SHALL accept
 * renter assignment.
 *
 */

// --- Generators ---

/** Generate a valid NID: numeric string of 10-17 digits */
const validNidArb = fc
  .integer({ min: 10, max: 17 })
  .chain((length) => fc.stringMatching(new RegExp(`^\\d{${length}}$`)))

/** Generate an invalid NID: non-numeric, too short, or too long */
const invalidNidArb = fc.oneof(
  // Empty string
  fc.constant(''),
  // Too short (< 10 digits)
  fc.stringMatching(/^\d{1,9}$/),
  // Too long (> 17 digits)
  fc.stringMatching(/^\d{18,25}$/),
  // Contains non-numeric characters
  fc.stringMatching(/^[a-zA-Z]{10,17}$/),
  // Mixed alphanumeric
  fc.stringMatching(/^\d{5}[a-z]{5}$/),
)

/** Generate a valid blood group */
const validBloodGroupArb = fc.constantFrom(
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
)

/** Generate an invalid blood group */
const invalidBloodGroupArb = fc.oneof(
  fc.constant(''),
  fc.constant('C+'),
  fc.constant('AB'),
  fc.constant('O'),
  fc.constant('A'),
  fc.constant('B'),
  fc.constant('AB++'),
  fc.constant('X+'),
  fc.constant('a+'),
  fc.constant('ab+'),
)

/** Generate a valid total family members: integer 1-50 */
const validFamilyMembersArb = fc.integer({ min: 1, max: 50 })

/** Generate an invalid total family members */
const invalidFamilyMembersArb = fc.oneof(
  // Zero
  fc.constant(0),
  // Negative
  fc.integer({ min: -100, max: -1 }),
  // Too large (> 50)
  fc.integer({ min: 51, max: 1000 }),
  // Non-integer (float)
  fc
    .double({ min: 1.1, max: 49.9, noNaN: true })
    .filter((n) => !Number.isInteger(n)),
)

/** Generate a valid Bangladeshi phone number: 11 digits starting with "01" */
const validPhoneArb = fc.stringMatching(/^01\d{9}$/)

/** Generate an invalid phone number */
const invalidPhoneArb = fc.oneof(
  // Empty string
  fc.constant(''),
  // Too short
  fc.constant('0123456789'),
  // Too long
  fc.constant('012345678901'),
  // Doesn't start with 01
  fc.constant('02123456789'),
  fc.constant('11234567890'),
  // Contains non-digits
  fc.constant('01a23456789'),
  // Only 10 digits starting with 01
  fc.stringMatching(/^01\d{8}$/),
)

/** Generate a valid UUID */
const uuidArb = fc.uuid()

/** Generate a valid renter registration base input */
const validRenterBaseArb = fc.record({
  fullName: fc.stringMatching(/^[A-Za-z ]{2,50}$/),
  phone: validPhoneArb,
  nidNumber: validNidArb,
  occupation: fc.stringMatching(/^[A-Za-z ]{2,50}$/),
  bloodGroup: validBloodGroupArb,
  totalFamilyMembers: validFamilyMembersArb,
  emergencyContactName: fc.stringMatching(/^[A-Za-z ]{2,50}$/),
  emergencyContactNumber: validPhoneArb,
  emergencyContactRelationship: fc.constantFrom(
    'Father',
    'Mother',
    'Brother',
    'Sister',
    'Spouse',
  ),
  flatId: uuidArb,
  monthlyRent: fc
    .double({ min: 1000, max: 100000, noNaN: true })
    .map((n) => Math.round(n * 100) / 100),
  startDate: fc.constantFrom('2024-01-01', '2024-06-15', '2025-01-01'),
  advanceAmount: fc
    .double({ min: 1000, max: 500000, noNaN: true })
    .map((n) => Math.round(n * 100) / 100),
})

// --- Mock Helpers ---

function createMockAuditLogger() {
  return {
    log: vi.fn(),
    query: vi.fn(),
    pendingRetries: 0,
    shutdown: vi.fn(),
  }
}

function createMockR2() {
  return {
    upload: vi.fn().mockResolvedValue('mock-storage-key'),
    getPresignedUrl: vi.fn().mockResolvedValue('https://mock-url.com'),
    delete: vi.fn().mockResolvedValue(undefined),
  }
}

function createOwnerContext(ownerAccountId = 'owner-1'): RequestContext {
  return {
    userId: ownerAccountId,
    role: 'owner',
    ownerAccountId,
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
  }
}

// --- Property 5: Renter registration field validation ---

describe('Feature: amarspace-full-implementation, Property 5: Renter registration field validation', () => {
  describe('NID validation', () => {
    it('nidSchema accepts only numeric strings of 10-17 digits', () => {
      return fc.assert(
        fc.property(validNidArb, (nid) => {
          const result = nidSchema.safeParse(nid)

          // Property: Valid NIDs are accepted
          expect(result.success).toBe(true)

          // Property: Accepted NID is 10-17 digits, all numeric
          expect(nid.length).toBeGreaterThanOrEqual(10)
          expect(nid.length).toBeLessThanOrEqual(17)
          expect(/^\d+$/.test(nid)).toBe(true)
        }),
        { numRuns: 200 },
      )
    })

    it('nidSchema rejects all invalid NID formats', () => {
      return fc.assert(
        fc.property(invalidNidArb, (invalidNid) => {
          const result = nidSchema.safeParse(invalidNid)

          // Property: Invalid NIDs are rejected
          expect(result.success).toBe(false)
        }),
        { numRuns: 200 },
      )
    })
  })

  describe('Blood group validation', () => {
    it('bloodGroupEnum accepts only valid blood group values', () => {
      return fc.assert(
        fc.property(validBloodGroupArb, (bloodGroup) => {
          const result = bloodGroupEnum.safeParse(bloodGroup)

          // Property: Valid blood groups are accepted
          expect(result.success).toBe(true)
        }),
        { numRuns: 200 },
      )
    })

    it('bloodGroupEnum rejects all invalid blood group values', () => {
      return fc.assert(
        fc.property(invalidBloodGroupArb, (invalidBloodGroup) => {
          const result = bloodGroupEnum.safeParse(invalidBloodGroup)

          // Property: Invalid blood groups are rejected
          expect(result.success).toBe(false)
        }),
        { numRuns: 200 },
      )
    })
  })

  describe('Total family members validation', () => {
    it('registerRenterSchema accepts integers 1-50 for totalFamilyMembers', () => {
      return fc.assert(
        fc.property(validRenterBaseArb, (input) => {
          const result = registerRenterSchema.safeParse(input)

          // Property: Valid total family members (1-50) are accepted
          expect(result.success).toBe(true)
          if (result.success) {
            expect(result.data.totalFamilyMembers).toBeGreaterThanOrEqual(1)
            expect(result.data.totalFamilyMembers).toBeLessThanOrEqual(50)
            expect(Number.isInteger(result.data.totalFamilyMembers)).toBe(true)
          }
        }),
        { numRuns: 200 },
      )
    })

    it('registerRenterSchema rejects invalid totalFamilyMembers values', () => {
      return fc.assert(
        fc.property(
          validRenterBaseArb,
          invalidFamilyMembersArb,
          (base, invalidMembers) => {
            const input = { ...base, totalFamilyMembers: invalidMembers }
            const result = registerRenterSchema.safeParse(input)

            // Property: Invalid family member counts are rejected
            expect(result.success).toBe(false)
          },
        ),
        { numRuns: 200 },
      )
    })
  })

  describe('Phone number validation', () => {
    it('bdPhoneSchema accepts only 11-digit strings starting with "01"', () => {
      return fc.assert(
        fc.property(validPhoneArb, (phone) => {
          const result = bdPhoneSchema.safeParse(phone)

          // Property: Valid phone numbers are accepted
          expect(result.success).toBe(true)

          // Property: Accepted phone is 11 digits starting with "01"
          expect(phone.length).toBe(11)
          expect(phone.startsWith('01')).toBe(true)
          expect(/^\d+$/.test(phone)).toBe(true)
        }),
        { numRuns: 200 },
      )
    })

    it('bdPhoneSchema rejects all invalid phone number formats', () => {
      return fc.assert(
        fc.property(invalidPhoneArb, (invalidPhone) => {
          const result = bdPhoneSchema.safeParse(invalidPhone)

          // Property: Invalid phone numbers are rejected
          expect(result.success).toBe(false)
        }),
        { numRuns: 200 },
      )
    })
  })

  describe('Field-level error reporting', () => {
    it('invalid NID in registration produces field-level error for nidNumber', () => {
      return fc.assert(
        fc.property(validRenterBaseArb, invalidNidArb, (base, invalidNid) => {
          const input = { ...base, nidNumber: invalidNid }
          const result = registerRenterSchema.safeParse(input)

          // Property: Invalid NID produces a validation error
          expect(result.success).toBe(false)
          if (!result.success) {
            const nidErrors = result.error.issues.filter((issue) =>
              issue.path.includes('nidNumber'),
            )
            expect(nidErrors.length).toBeGreaterThan(0)
          }
        }),
        { numRuns: 200 },
      )
    })

    it('invalid phone in registration produces field-level error for phone', () => {
      return fc.assert(
        fc.property(
          validRenterBaseArb,
          invalidPhoneArb,
          (base, invalidPhone) => {
            const input = { ...base, phone: invalidPhone }
            const result = registerRenterSchema.safeParse(input)

            // Property: Invalid phone produces a validation error
            expect(result.success).toBe(false)
            if (!result.success) {
              const phoneErrors = result.error.issues.filter((issue) =>
                issue.path.includes('phone'),
              )
              expect(phoneErrors.length).toBeGreaterThan(0)
            }
          },
        ),
        { numRuns: 200 },
      )
    })

    it('invalid blood group in registration produces field-level error for bloodGroup', () => {
      return fc.assert(
        fc.property(
          validRenterBaseArb,
          invalidBloodGroupArb,
          (base, invalidBloodGroup) => {
            const input = { ...base, bloodGroup: invalidBloodGroup }
            const result = registerRenterSchema.safeParse(input)

            // Property: Invalid blood group produces a validation error
            expect(result.success).toBe(false)
            if (!result.success) {
              const bgErrors = result.error.issues.filter((issue) =>
                issue.path.includes('bloodGroup'),
              )
              expect(bgErrors.length).toBeGreaterThan(0)
            }
          },
        ),
        { numRuns: 200 },
      )
    })
  })
})

// --- Property 6: Flat assignment requires Vacant status ---

describe('Feature: amarspace-full-implementation, Property 6: Flat assignment requires Vacant status', () => {
  it('assigning a renter to a flat with status other than Vacant SHALL be rejected', async () => {
    const nonVacantStatuses = [
      FLAT_STATUS.OCCUPIED,
      FLAT_STATUS.UNDER_MAINTENANCE,
    ]
    const nonVacantStatusArb = fc.constantFrom(...nonVacantStatuses)

    await fc.assert(
      fc.asyncProperty(
        validRenterBaseArb,
        nonVacantStatusArb,
        async (renterInput, flatStatus) => {
          const ownerAccountId = 'owner-1'
          const ctx = createOwnerContext(ownerAccountId)
          const auditLogger = createMockAuditLogger()
          const r2 = createMockR2()

          // Mock DB where the flat exists but is NOT Vacant
          const db = {
            query: {
              flats: {
                findFirst: vi.fn().mockResolvedValue({
                  id: renterInput.flatId,
                  ownerAccountId,
                  buildingId: 'building-1',
                  flatNumber: 'A101',
                  floor: 1,
                  status: flatStatus,
                  createdAt: new Date('2024-01-01'),
                  updatedAt: new Date('2024-01-01'),
                }),
              },
            },
            insert: vi.fn(),
            update: vi.fn(),
            select: vi.fn(),
          } as unknown

          const service = new RenterRegistrationService(
            db as never,
            auditLogger as never,
            r2 as never,
          )

          // Property: Assigning a renter to a non-Vacant flat is rejected
          await expect(
            service.registerRenter(ctx, renterInput),
          ).rejects.toThrow(ValidationError)
        },
      ),
      { numRuns: 200 },
    )
  })

  it('assigning a renter to a flat with Vacant status SHALL succeed', async () => {
    await fc.assert(
      fc.asyncProperty(validRenterBaseArb, async (renterInput) => {
        const ownerAccountId = 'owner-1'
        const ctx = createOwnerContext(ownerAccountId)
        const auditLogger = createMockAuditLogger()
        const r2 = createMockR2()

        const mockUserId = 'new-user-id'
        const mockRenterId = 'new-renter-id'
        const mockContractId = 'new-contract-id'

        // Mock DB where the flat exists and IS Vacant
        const db = {
          query: {
            flats: {
              findFirst: vi.fn().mockResolvedValue({
                id: renterInput.flatId,
                ownerAccountId,
                buildingId: 'building-1',
                flatNumber: 'A101',
                floor: 1,
                status: FLAT_STATUS.VACANT,
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
              }),
            },
          },
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi
                .fn()
                .mockResolvedValueOnce([
                  {
                    id: mockUserId,
                    email: `renter_${renterInput.phone}@amarspace.local`,
                    name: renterInput.fullName,
                    role: 'renter',
                    ownerAccountId,
                    phone: renterInput.phone,
                    hashedPassword: '',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                ])
                .mockResolvedValueOnce([
                  {
                    id: mockRenterId,
                    ownerAccountId,
                    userId: mockUserId,
                    fullName: renterInput.fullName,
                    phone: renterInput.phone,
                    nidNumber: renterInput.nidNumber,
                    nidPhotoUrl: null,
                    dateOfBirth:
                      ((renterInput as Record<string, unknown>)
                        .dateOfBirth as string) ?? null,
                    occupation: renterInput.occupation,
                    bloodGroup: renterInput.bloodGroup,
                    totalFamilyMembers: renterInput.totalFamilyMembers,
                    familyMemberNames:
                      ((renterInput as Record<string, unknown>)
                        .familyMemberNames as string) ?? null,
                    emergencyContactName: renterInput.emergencyContactName,
                    emergencyContactNumber: renterInput.emergencyContactNumber,
                    emergencyContactRelationship:
                      renterInput.emergencyContactRelationship,
                    digitalSignatureUrl: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                ])
                .mockResolvedValueOnce([
                  {
                    id: mockContractId,
                    ownerAccountId,
                    renterId: mockRenterId,
                    flatId: renterInput.flatId,
                    monthlyRent: renterInput.monthlyRent.toFixed(2),
                    startDate: renterInput.startDate,
                    securityDepositAmount: renterInput.advanceAmount.toFixed(2),
                    remainingDepositBalance:
                      renterInput.advanceAmount.toFixed(2),
                    status: 'active',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                ]),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
          select: vi.fn(),
        } as unknown

        const service = new RenterRegistrationService(
          db as never,
          auditLogger as never,
          r2 as never,
        )

        // Property: Assigning a renter to a Vacant flat succeeds
        const result = await service.registerRenter(ctx, renterInput)

        expect(result).toBeDefined()
        expect(result.renter.fullName).toBe(renterInput.fullName)
        expect(result.renter.phone).toBe(renterInput.phone)
        expect(result.renter.nidNumber).toBe(renterInput.nidNumber)
        expect(result.renter.bloodGroup).toBe(renterInput.bloodGroup)
        expect(result.contract.status).toBe('active')
        expect(result.user.role).toBe('renter')
      }),
      { numRuns: 200 },
    )
  })

  it('flat that does not exist SHALL reject renter assignment', async () => {
    await fc.assert(
      fc.asyncProperty(validRenterBaseArb, async (renterInput) => {
        const ownerAccountId = 'owner-1'
        const ctx = createOwnerContext(ownerAccountId)
        const auditLogger = createMockAuditLogger()
        const r2 = createMockR2()

        // Mock DB where the flat does NOT exist
        const db = {
          query: {
            flats: {
              findFirst: vi.fn().mockResolvedValue(null),
            },
          },
          insert: vi.fn(),
          update: vi.fn(),
          select: vi.fn(),
        } as unknown

        const service = new RenterRegistrationService(
          db as never,
          auditLogger as never,
          r2 as never,
        )

        // Property: Non-existent flat rejects renter assignment
        await expect(service.registerRenter(ctx, renterInput)).rejects.toThrow()
      }),
      { numRuns: 200 },
    )
  })
})
