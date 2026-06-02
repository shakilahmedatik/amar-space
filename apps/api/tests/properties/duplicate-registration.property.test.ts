// Feature: renter-qr-portal, Property 6: Duplicate registration prevention
import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../../src/app'

/**
 * Property 6: Duplicate registration prevention
 *
 * For any flat and phone number combination that already has a registration
 * request with PENDING_APPROVAL status, a subsequent registration submission
 * with the same phone number and flat SHALL be rejected with an appropriate message.
 *
 */

// Mock the access-code-hash utility
vi.mock('../../src/utils/access-code-hash', () => ({
  compareAccessCode: vi.fn(),
  hashAccessCode: vi.fn(),
}))

// Mock the R2 plugin to avoid real S3 connections
vi.mock('../../src/plugins/r2', () => {
  const fp = (
    fn: (fastify: {
      decorate: (name: string, value: unknown) => void
    }) => Promise<void>,
  ) => {
    const wrapped = fn
    ;(wrapped as unknown as Record<string | symbol, unknown>)[
      Symbol.for('skip-override')
    ] = true
    ;(wrapped as unknown as Record<string | symbol, unknown>)[
      Symbol.for('fastify.display-name')
    ] = 'r2'
    return wrapped
  }
  return {
    default: fp(
      async (fastify: { decorate: (name: string, value: unknown) => void }) => {
        fastify.decorate('r2', {
          upload: vi.fn().mockResolvedValue('mock-storage-key/file.png'),
          getPresignedUrl: vi
            .fn()
            .mockResolvedValue('https://mock-url.com/file.png'),
          delete: vi.fn().mockResolvedValue(undefined),
        })
      },
    ),
  }
})

// Mock @repo/db to avoid real database connections
vi.mock('@repo/db', () => {
  const mockDb = {
    execute: vi.fn(),
    query: {
      flatSlugs: {
        findFirst: vi.fn(),
      },
      registrationRequests: {
        findFirst: vi.fn(),
      },
      renterAccessCodes: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => []),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => [{ id: 'mock-registration-id' }]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({})),
      })),
    })),
  }

  return {
    createDbClient: vi.fn(() => mockDb),
    validateConnection: vi.fn(),
    emergencyContacts: {
      name: 'name',
      role: 'role',
      phone: 'phone',
      type: 'type',
      sortOrder: 'sort_order',
      buildingId: 'building_id',
    },
    flatSlugs: {
      slug: 'slug',
      flatId: 'flat_id',
    },
    registrationRequests: {
      id: 'id',
      flatId: 'flat_id',
      phone: 'phone',
      status: 'status',
    },
    flats: {},
    buildings: {},
    notices: {
      id: 'id',
      title: 'title',
      body: 'body',
      createdAt: 'created_at',
      isPinned: 'is_pinned',
      ownerAccountId: 'owner_account_id',
      targetAudience: 'target_audience',
      targetBuildingId: 'target_building_id',
    },
    renterAccessCodes: {
      id: 'id',
      flatId: 'flat_id',
      renterId: 'renter_id',
      codeHash: 'code_hash',
      failedAttempts: 'failed_attempts',
      lockedUntil: 'locked_until',
    },
    portalSessions: {
      id: 'id',
      flatId: 'flat_id',
      renterId: 'renter_id',
      expiresAt: 'expires_at',
    },
  }
})

// --- Generators ---

/** Generate a valid flat slug: lowercase alphanumeric + hyphens, 1-100 chars */
const validSlugArb = fc
  .stringMatching(/^[a-z0-9][a-z0-9-]{0,29}$/)
  .filter((s) => s.length >= 1 && s.length <= 100)

/** Generate a valid Bangladeshi phone number: 11 digits starting with "01" */
const validPhoneArb = fc.stringMatching(/^01[3-9]\d{8}$/)

/** Generate a valid full name: 1-100 characters */
const validFullNameArb = fc
  .stringMatching(/^[A-Za-z\u0980-\u09FF ]{2,50}$/)
  .filter((s) => s.trim().length >= 1)

/** Generate a valid NID: 10 or 17 digits */
const validNidArb = fc.oneof(
  fc.stringMatching(/^\d{10}$/),
  fc.stringMatching(/^\d{17}$/),
)

/** Generate a valid blood group */
const validBloodGroupArb = fc.constantFrom(
  'A+',
  'A-',
  'B+',
  'B-',
  'O+',
  'O-',
  'AB+',
  'AB-',
)

/** Generate a valid occupation: 1-100 characters */
const validOccupationArb = fc
  .stringMatching(/^[A-Za-z\u0980-\u09FF ]{2,50}$/)
  .filter((s) => s.trim().length >= 1)

/** Generate a valid family members count: 1-20 */
const validFamilyMembersArb = fc.integer({ min: 1, max: 20 })

/** Generate a valid rental start date: future date within 90 days */
const validRentalStartDateArb = fc
  .integer({ min: 0, max: 89 })
  .map((daysFromNow) => {
    const date = new Date()
    date.setDate(date.getDate() + daysFromNow)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })

/** Generate a valid advance amount: 0-99,999,999 */
const validAdvanceAmountArb = fc.integer({ min: 0, max: 99_999_999 })

/** A minimal valid base64 PNG for digital signature */
const validSignatureBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

// --- Tests ---

describe('Feature: renter-qr-portal, Property 6: Duplicate registration prevention', () => {
  const validEnv = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    AUTH_SECRET: 'a'.repeat(32),
    AUTH_BASE_URL: 'http://localhost:3001',
    R2_ACCOUNT_ID: 'test-account-id',
    R2_ACCESS_KEY_ID: 'test-access-key',
    R2_SECRET_ACCESS_KEY: 'test-secret-key',
    R2_BUCKET_NAME: 'test-bucket',
  }

  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    process.env = { ...originalEnv, ...validEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('rejects registration with 409 when a PENDING_APPROVAL request already exists for the same flat and phone', async () => {
    await fc.assert(
      fc.asyncProperty(
        validSlugArb,
        validPhoneArb,
        validFullNameArb,
        validNidArb,
        validBloodGroupArb,
        validOccupationArb,
        validFamilyMembersArb,
        validRentalStartDateArb,
        validAdvanceAmountArb,
        async (
          slug,
          phone,
          fullName,
          nidNumber,
          bloodGroup,
          occupation,
          familyMembers,
          rentalStartDate,
          advanceAmount,
        ) => {
          const { createDbClient } = await import('@repo/db')
          const mockDb = vi.mocked(createDbClient)()

          // Simulate: flat slug exists and resolves to a valid flat
          ;(
            mockDb.query.flatSlugs.findFirst as ReturnType<typeof vi.fn>
          ).mockResolvedValue({
            id: 'slug-id-1',
            flatId: 'flat-id-1',
            slug,
            createdAt: new Date(),
            flat: {
              id: 'flat-id-1',
              flatNumber: '4A',
              status: 'vacant',
              buildingId: 'building-id-1',
              ownerAccountId: 'owner-1',
              floor: 4,
              createdAt: new Date(),
              updatedAt: new Date(),
              building: {
                id: 'building-id-1',
                name: 'Building A',
                address: '123 Street',
                totalFloors: 5,
                ownerAccountId: 'owner-1',
                whatsappGroupLink: null,
                managerPhone: null,
                logoUrl: null,
                coverImageUrl: null,
                rules: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            },
          })

          // Simulate: a PENDING_APPROVAL registration already exists for this flat + phone
          ;(
            mockDb.query.registrationRequests.findFirst as ReturnType<
              typeof vi.fn
            >
          ).mockResolvedValue({ id: 'existing-pending-request-id' })

          const app = buildApp({ logger: false })
          await app.ready()

          const response = await app.inject({
            method: 'POST',
            url: `/api/portal/flat/${slug}/register`,
            payload: {
              fullName,
              phone,
              nidNumber,
              bloodGroup,
              occupation,
              familyMembers,
              familyMemberNames: ['সদস্য ১'],
              emergencyContactName: 'জরুরি নাম',
              emergencyContact: phone, // Use same phone as emergency contact (valid BD number)
              emergencyContactRelationship: 'ভাই',
              rentalStartDate,
              advanceAmount,
              digitalSignature: validSignatureBase64,
              nidPhoto: validSignatureBase64,
              selfiePhoto: validSignatureBase64,
            },
          })

          const body = response.json()

          // Property: duplicate registration is ALWAYS rejected with 409
          expect(response.statusCode).toBe(409)
          expect(body.error).toBe('DUPLICATE_REQUEST')
          // Property: response contains an appropriate message
          expect(body.message).toBeTruthy()
          expect(typeof body.message).toBe('string')
          expect(body.message.length).toBeGreaterThan(0)

          await app.close()
        },
      ),
      { numRuns: 100 },
    )
  }, 60000)

  it('accepts registration with 201 when no PENDING_APPROVAL request exists for the same flat and phone', async () => {
    await fc.assert(
      fc.asyncProperty(
        validSlugArb,
        validPhoneArb,
        validFullNameArb,
        validNidArb,
        validBloodGroupArb,
        validOccupationArb,
        validFamilyMembersArb,
        validRentalStartDateArb,
        validAdvanceAmountArb,
        async (
          slug,
          phone,
          fullName,
          nidNumber,
          bloodGroup,
          occupation,
          familyMembers,
          rentalStartDate,
          advanceAmount,
        ) => {
          const { createDbClient } = await import('@repo/db')
          const mockDb = vi.mocked(createDbClient)()

          // Simulate: flat slug exists and resolves to a valid flat
          ;(
            mockDb.query.flatSlugs.findFirst as ReturnType<typeof vi.fn>
          ).mockResolvedValue({
            id: 'slug-id-1',
            flatId: 'flat-id-1',
            slug,
            createdAt: new Date(),
            flat: {
              id: 'flat-id-1',
              flatNumber: '4A',
              status: 'vacant',
              buildingId: 'building-id-1',
              ownerAccountId: 'owner-1',
              floor: 4,
              createdAt: new Date(),
              updatedAt: new Date(),
              building: {
                id: 'building-id-1',
                name: 'Building A',
                address: '123 Street',
                totalFloors: 5,
                ownerAccountId: 'owner-1',
                whatsappGroupLink: null,
                managerPhone: null,
                logoUrl: null,
                coverImageUrl: null,
                rules: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            },
          })

          // Simulate: NO pending registration exists for this flat + phone
          ;(
            mockDb.query.registrationRequests.findFirst as ReturnType<
              typeof vi.fn
            >
          ).mockResolvedValue(null)

          const app = buildApp({ logger: false })
          await app.ready()

          const response = await app.inject({
            method: 'POST',
            url: `/api/portal/flat/${slug}/register`,
            payload: {
              fullName,
              phone,
              nidNumber,
              bloodGroup,
              occupation,
              familyMembers,
              familyMemberNames: ['সদস্য ১'],
              emergencyContactName: 'জরুরি নাম',
              emergencyContact: phone,
              emergencyContactRelationship: 'ভাই',
              rentalStartDate,
              advanceAmount,
              digitalSignature: validSignatureBase64,
              nidPhoto: validSignatureBase64,
              selfiePhoto: validSignatureBase64,
            },
          })

          const body = response.json()

          // Property: registration is accepted when no duplicate exists
          expect(response.statusCode).toBe(201)
          expect(body.success).toBe(true)
          expect(body.requestId).toBeTruthy()
          expect(body.message).toBeTruthy()

          await app.close()
        },
      ),
      { numRuns: 100 },
    )
  }, 60000)
})
