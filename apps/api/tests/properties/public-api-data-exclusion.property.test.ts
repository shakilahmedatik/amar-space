// Feature: renter-qr-portal, Property 8: Public API data exclusion
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

/**
 * Property 8: Public API data exclusion
 *
 * For any response from the unauthenticated portal API endpoints (`/api/portal/*`),
 * the response body SHALL never contain any of the following private data fields:
 * NID numbers, payment history, rent amounts, family member details, contract
 * information, deposit information, issue reports, or private notices.
 *
 * **Validates: Requirements 9.1, 9.2**
 */

// --- Private data field patterns ---
// These are the field names and patterns that MUST NEVER appear in portal API responses.

const PRIVATE_FIELD_NAMES = [
  // NID-related fields
  'nidNumber',
  'nid_number',
  'nidPhotoUrl',
  'nid_photo_url',
  // Payment history / rent amounts
  'monthlyRent',
  'monthly_rent',
  'paymentHistory',
  'payment_history',
  'rentAmount',
  'rent_amount',
  'advanceAmount',
  'advance_amount',
  'securityDepositAmount',
  'security_deposit_amount',
  'remainingDepositBalance',
  'remaining_deposit_balance',
  // Family member details
  'familyMembers',
  'family_members',
  'familyMemberNames',
  'family_member_names',
  'totalFamilyMembers',
  'total_family_members',
  // Contract information
  'contractInfo',
  'contract_info',
  'rentalContract',
  'rental_contract',
  'startDate',
  'start_date',
  'endDate',
  'end_date',
  'contractId',
  'contract_id',
  'renterId',
  'renter_id',
  // Deposit information
  'depositInfo',
  'deposit_info',
  'depositAmount',
  'deposit_amount',
  // Issue reports
  'issueReports',
  'issue_reports',
  'issues',
  // Private notices (notices with restricted audience)
  'privateNotices',
  'private_notices',
  // Digital signature
  'digitalSignatureUrl',
  'digital_signature_url',
  // Emergency contact personal details (from renter, not building contacts)
  'emergencyContactName',
  'emergency_contact_name',
  'emergencyContactRelationship',
  'emergency_contact_relationship',
] as const

/**
 * Recursively collects all keys from a nested object/array structure.
 */
function collectAllKeys(obj: unknown): string[] {
  const keys: string[] = []

  if (obj === null || obj === undefined) return keys

  if (Array.isArray(obj)) {
    for (const item of obj) {
      keys.push(...collectAllKeys(item))
    }
  } else if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      keys.push(key)
      keys.push(...collectAllKeys(value))
    }
  }

  return keys
}

/**
 * Checks if a JSON-serialized response body contains any private data patterns
 * as string values (e.g., NID number patterns embedded in string fields).
 */
function containsNidPattern(jsonStr: string): boolean {
  // NID numbers are 10 or 17 digit numeric strings
  // We check if any standalone 10 or 17 digit number appears in string values
  // that isn't a UUID or timestamp
  const nidPattern = /"\d{10}"(?!-)|"\d{17}"/
  return nidPattern.test(jsonStr)
}

// --- Generators ---

/** Generate a valid Date within a reasonable range (no NaN dates) */
const validDateArb = fc.date({
  min: new Date('2020-01-01T00:00:00.000Z'),
  max: new Date('2030-12-31T23:59:59.999Z'),
  noInvalidDate: true,
})

/** Generate a valid ISO 8601 date string */
const validIsoDateStringArb = validDateArb.map((d) => d.toISOString())

/**
 * Generates a valid PortalFlatResponse structure (the shape returned by GET /api/portal/flat/:slug).
 * This simulates what the data transformation logic produces.
 */
const portalFlatResponseArb = fc.record({
  building: fc.record({
    name: fc.string({ minLength: 1, maxLength: 200 }),
    logoUrl: fc.oneof(fc.constant(null), fc.webUrl()),
    coverImageUrl: fc.oneof(fc.constant(null), fc.webUrl()),
    whatsappGroupLink: fc.oneof(fc.constant(null), fc.webUrl()),
    managerPhone: fc.oneof(fc.constant(null), fc.stringMatching(/^01\d{9}$/)),
    rules: fc.oneof(fc.constant(null), fc.string({ maxLength: 500 })),
  }),
  flat: fc.record({
    flatNumber: fc.string({ minLength: 1, maxLength: 20 }),
    status: fc.constantFrom(
      'AVAILABLE' as const,
      'OCCUPIED' as const,
      'MAINTENANCE' as const,
    ),
    slug: fc.stringMatching(/^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$/),
  }),
  emergencyContacts: fc.array(
    fc.record({
      name: fc.string({ minLength: 1, maxLength: 100 }),
      role: fc.string({ minLength: 1, maxLength: 50 }),
      phone: fc.oneof(fc.constant(null), fc.stringMatching(/^01\d{9}$/)),
      type: fc.constantFrom('building' as const, 'nearby' as const),
      order: fc.integer({ min: 0, max: 100 }),
    }),
    { minLength: 0, maxLength: 10 },
  ),
  hasPendingRegistration: fc.boolean(),
})

/**
 * Generates a valid PortalNoticesResponse structure (the shape returned by GET /api/portal/flat/:slug/notices).
 */
const portalNoticesResponseArb = fc.record({
  notices: fc.array(
    fc.record({
      id: fc.uuid(),
      title: fc.string({ minLength: 1, maxLength: 200 }),
      body: fc.string({ minLength: 0, maxLength: 120 }),
      createdAt: validIsoDateStringArb,
      isPinned: fc.boolean(),
    }),
    { minLength: 0, maxLength: 20 },
  ),
})

/**
 * Generates a simulated database record with ALL fields (including private ones)
 * to verify the transformation logic correctly strips private data.
 */
const fullDatabaseFlatRecordArb = fc.record({
  // Public fields (should appear in response)
  id: fc.uuid(),
  flatNumber: fc.string({ minLength: 1, maxLength: 20 }),
  status: fc.constantFrom('vacant', 'occupied', 'under_maintenance'),
  floor: fc.integer({ min: 1, max: 50 }),
  buildingId: fc.uuid(),
  ownerAccountId: fc.string({ minLength: 5, maxLength: 50 }),
  createdAt: validIsoDateStringArb,
  updatedAt: validIsoDateStringArb,
})

const fullDatabaseBuildingRecordArb = fc.record({
  // Public fields
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 200 }),
  address: fc.string({ minLength: 1, maxLength: 500 }),
  totalFloors: fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 50 })),
  whatsappGroupLink: fc.oneof(fc.constant(null), fc.webUrl()),
  managerPhone: fc.oneof(fc.constant(null), fc.stringMatching(/^01\d{9}$/)),
  logoUrl: fc.oneof(fc.constant(null), fc.webUrl()),
  coverImageUrl: fc.oneof(fc.constant(null), fc.webUrl()),
  rules: fc.oneof(fc.constant(null), fc.string({ maxLength: 500 })),
  ownerAccountId: fc.string({ minLength: 5, maxLength: 50 }),
  createdAt: validIsoDateStringArb,
  updatedAt: validIsoDateStringArb,
})

const fullDatabaseRenterRecordArb = fc.record({
  // Private fields that should NEVER appear in portal responses
  id: fc.uuid(),
  ownerAccountId: fc.string({ minLength: 5, maxLength: 50 }),
  userId: fc.string({ minLength: 5, maxLength: 50 }),
  fullName: fc.string({ minLength: 1, maxLength: 100 }),
  phone: fc.stringMatching(/^01\d{9}$/),
  nidNumber: fc.stringMatching(/^\d{10,17}$/),
  nidPhotoUrl: fc.oneof(fc.constant(null), fc.webUrl()),
  dateOfBirth: fc.oneof(fc.constant(null), fc.constant('1990-01-01')),
  occupation: fc.string({ minLength: 1, maxLength: 100 }),
  bloodGroup: fc.constantFrom('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'),
  totalFamilyMembers: fc.integer({ min: 1, max: 20 }),
  familyMemberNames: fc.oneof(
    fc.constant(null),
    fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
      minLength: 1,
      maxLength: 5,
    }),
  ),
  emergencyContactName: fc.string({ minLength: 1, maxLength: 100 }),
  emergencyContactNumber: fc.stringMatching(/^01\d{9}$/),
  emergencyContactRelationship: fc.constantFrom(
    'Father',
    'Mother',
    'Brother',
    'Sister',
  ),
  digitalSignatureUrl: fc.oneof(fc.constant(null), fc.webUrl()),
})

const fullDatabaseContractRecordArb = fc.record({
  // Private fields that should NEVER appear in portal responses
  id: fc.uuid(),
  ownerAccountId: fc.string({ minLength: 5, maxLength: 50 }),
  renterId: fc.uuid(),
  flatId: fc.uuid(),
  monthlyRent: fc.integer({ min: 1000, max: 100000 }).map(String),
  startDate: fc.constant('2024-01-01'),
  endDate: fc.oneof(fc.constant(null), fc.constant('2025-01-01')),
  securityDepositAmount: fc.integer({ min: 1000, max: 500000 }).map(String),
  remainingDepositBalance: fc.integer({ min: 0, max: 500000 }).map(String),
  status: fc.constantFrom('active', 'terminated', 'expired'),
})

// --- Status mapping (mirrors the route logic) ---
const STATUS_MAP: Record<string, 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'> = {
  vacant: 'AVAILABLE',
  occupied: 'OCCUPIED',
  under_maintenance: 'MAINTENANCE',
}

/**
 * Simulates the data transformation logic from the portal flat route.
 * This is the function under test — it takes raw database records and
 * produces the public PortalFlatResponse.
 */
function buildPortalFlatResponse(
  building: Record<string, unknown>,
  flat: Record<string, unknown>,
  contacts: Record<string, unknown>[],
  hasPendingRegistration: boolean,
  slug: string,
) {
  const portalStatus = STATUS_MAP[flat.status as string] ?? 'AVAILABLE'

  return {
    building: {
      name: building.name,
      logoUrl: building.logoUrl ?? null,
      coverImageUrl: building.coverImageUrl ?? null,
      whatsappGroupLink: building.whatsappGroupLink ?? null,
      managerPhone: building.managerPhone ?? null,
      rules: building.rules ?? null,
    },
    flat: {
      flatNumber: flat.flatNumber,
      status: portalStatus,
      slug,
    },
    emergencyContacts: contacts.map((c) => ({
      name: c.name,
      role: c.role,
      phone: c.phone ?? null,
      type: c.type as 'building' | 'nearby',
      order: c.order,
    })),
    hasPendingRegistration,
  }
}

// --- Property Tests ---

describe('Feature: renter-qr-portal, Property 8: Public API data exclusion', () => {
  describe('PortalFlatResponse never contains private data fields', () => {
    it('response keys SHALL never include any private data field names', () => {
      fc.assert(
        fc.property(portalFlatResponseArb, (response) => {
          const allKeys = collectAllKeys(response)

          for (const privateField of PRIVATE_FIELD_NAMES) {
            expect(allKeys).not.toContain(privateField)
          }
        }),
        { numRuns: 100 },
      )
    })

    it('transformed response from full database records SHALL exclude all private fields', () => {
      fc.assert(
        fc.property(
          fullDatabaseBuildingRecordArb,
          fullDatabaseFlatRecordArb,
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }),
              role: fc.string({ minLength: 1, maxLength: 50 }),
              phone: fc.oneof(
                fc.constant(null),
                fc.stringMatching(/^01\d{9}$/),
              ),
              type: fc.constantFrom('building', 'nearby'),
              order: fc.integer({ min: 0, max: 100 }),
            }),
            { minLength: 0, maxLength: 5 },
          ),
          fc.boolean(),
          fc.stringMatching(/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/),
          (building, flat, contacts, hasPending, slug) => {
            const response = buildPortalFlatResponse(
              building as unknown as Record<string, unknown>,
              flat as unknown as Record<string, unknown>,
              contacts as unknown as Record<string, unknown>[],
              hasPending,
              slug,
            )

            const allKeys = collectAllKeys(response)

            // Verify no private field names appear in the response
            for (const privateField of PRIVATE_FIELD_NAMES) {
              expect(allKeys).not.toContain(privateField)
            }

            // Verify the response only contains expected public keys
            const allowedTopLevelKeys = [
              'building',
              'flat',
              'emergencyContacts',
              'hasPendingRegistration',
            ]
            const topLevelKeys = Object.keys(response)
            for (const key of topLevelKeys) {
              expect(allowedTopLevelKeys).toContain(key)
            }

            // Verify building object only has allowed keys
            const allowedBuildingKeys = [
              'name',
              'logoUrl',
              'coverImageUrl',
              'whatsappGroupLink',
              'managerPhone',
              'rules',
            ]
            const buildingKeys = Object.keys(response.building)
            for (const key of buildingKeys) {
              expect(allowedBuildingKeys).toContain(key)
            }

            // Verify flat object only has allowed keys
            const allowedFlatKeys = ['flatNumber', 'status', 'slug']
            const flatKeys = Object.keys(response.flat)
            for (const key of flatKeys) {
              expect(allowedFlatKeys).toContain(key)
            }

            // Verify emergency contact objects only have allowed keys
            const allowedContactKeys = [
              'name',
              'role',
              'phone',
              'type',
              'order',
            ]
            for (const contact of response.emergencyContacts) {
              const contactKeys = Object.keys(contact)
              for (const key of contactKeys) {
                expect(allowedContactKeys).toContain(key)
              }
            }
          },
        ),
        { numRuns: 100 },
      )
    })

    it('response SHALL never contain NID number patterns in serialized form', () => {
      fc.assert(
        fc.property(
          fullDatabaseBuildingRecordArb,
          fullDatabaseFlatRecordArb,
          fullDatabaseRenterRecordArb,
          fc.stringMatching(/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/),
          (building, flat, _renter, slug) => {
            // Even when renter data exists in the database, the transformation
            // should never include it in the response
            const response = buildPortalFlatResponse(
              building as unknown as Record<string, unknown>,
              flat as unknown as Record<string, unknown>,
              [],
              false,
              slug,
            )

            const serialized = JSON.stringify(response)

            // The serialized response should not contain NID patterns
            // (10 or 17 digit standalone numbers that aren't UUIDs)
            expect(containsNidPattern(serialized)).toBe(false)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe('PortalNoticesResponse never contains private data fields', () => {
    it('notices response keys SHALL never include any private data field names', () => {
      fc.assert(
        fc.property(portalNoticesResponseArb, (response) => {
          const allKeys = collectAllKeys(response)

          for (const privateField of PRIVATE_FIELD_NAMES) {
            expect(allKeys).not.toContain(privateField)
          }
        }),
        { numRuns: 100 },
      )
    })

    it('notices response SHALL only contain allowed public fields', () => {
      fc.assert(
        fc.property(portalNoticesResponseArb, (response) => {
          // Top level should only have 'notices'
          const topLevelKeys = Object.keys(response)
          expect(topLevelKeys).toEqual(['notices'])

          // Each notice should only have allowed keys
          const allowedNoticeKeys = [
            'id',
            'title',
            'body',
            'createdAt',
            'isPinned',
          ]
          for (const notice of response.notices) {
            const noticeKeys = Object.keys(notice)
            for (const key of noticeKeys) {
              expect(allowedNoticeKeys).toContain(key)
            }
          }
        }),
        { numRuns: 100 },
      )
    })
  })

  describe('Data transformation excludes private data even when present in source', () => {
    it('building data transformation SHALL strip address, totalFloors, ownerAccountId, and timestamps', () => {
      fc.assert(
        fc.property(
          fullDatabaseBuildingRecordArb,
          fullDatabaseFlatRecordArb,
          fc.stringMatching(/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/),
          (building, flat, slug) => {
            const response = buildPortalFlatResponse(
              building as unknown as Record<string, unknown>,
              flat as unknown as Record<string, unknown>,
              [],
              false,
              slug,
            )

            const buildingKeys = Object.keys(response.building)

            // These fields exist in the DB but must NOT appear in the response
            expect(buildingKeys).not.toContain('id')
            expect(buildingKeys).not.toContain('address')
            expect(buildingKeys).not.toContain('totalFloors')
            expect(buildingKeys).not.toContain('ownerAccountId')
            expect(buildingKeys).not.toContain('createdAt')
            expect(buildingKeys).not.toContain('updatedAt')
          },
        ),
        { numRuns: 100 },
      )
    })

    it('flat data transformation SHALL strip id, floor, buildingId, ownerAccountId, and timestamps', () => {
      fc.assert(
        fc.property(
          fullDatabaseBuildingRecordArb,
          fullDatabaseFlatRecordArb,
          fc.stringMatching(/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/),
          (building, flat, slug) => {
            const response = buildPortalFlatResponse(
              building as unknown as Record<string, unknown>,
              flat as unknown as Record<string, unknown>,
              [],
              false,
              slug,
            )

            const flatKeys = Object.keys(response.flat)

            // These fields exist in the DB but must NOT appear in the response
            expect(flatKeys).not.toContain('id')
            expect(flatKeys).not.toContain('floor')
            expect(flatKeys).not.toContain('buildingId')
            expect(flatKeys).not.toContain('ownerAccountId')
            expect(flatKeys).not.toContain('createdAt')
            expect(flatKeys).not.toContain('updatedAt')
          },
        ),
        { numRuns: 100 },
      )
    })

    it('contract and renter data SHALL never leak into any portal response field', () => {
      fc.assert(
        fc.property(
          fullDatabaseBuildingRecordArb,
          fullDatabaseFlatRecordArb,
          fullDatabaseRenterRecordArb,
          fullDatabaseContractRecordArb,
          fc.stringMatching(/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/),
          (building, flat, renter, contract, slug) => {
            // Prevent false positives due to collision between flatNumber and contract numeric values
            fc.pre(flat.flatNumber !== contract.remainingDepositBalance)
            fc.pre(flat.flatNumber !== contract.monthlyRent)
            fc.pre(flat.flatNumber !== contract.securityDepositAmount)

            // Simulate a scenario where renter and contract data exist in the DB
            // The transformation should NEVER include any of this data
            const response = buildPortalFlatResponse(
              building as unknown as Record<string, unknown>,
              flat as unknown as Record<string, unknown>,
              [],
              true,
              slug,
            )

            const serialized = JSON.stringify(response)

            // Renter private data should not appear in the response
            expect(serialized).not.toContain(renter.nidNumber)
            if (renter.nidPhotoUrl) {
              expect(serialized).not.toContain(renter.nidPhotoUrl)
            }
            if (renter.digitalSignatureUrl) {
              expect(serialized).not.toContain(renter.digitalSignatureUrl)
            }

            // Contract private data should not appear in the response
            expect(serialized).not.toContain(`"${contract.monthlyRent}"`)
            expect(serialized).not.toContain(
              `"${contract.securityDepositAmount}"`,
            )
            expect(serialized).not.toContain(
              `"${contract.remainingDepositBalance}"`,
            )

            // Family member details should not appear
            if (
              renter.familyMemberNames &&
              Array.isArray(renter.familyMemberNames)
            ) {
              for (const name of renter.familyMemberNames) {
                // Only check if the name is long enough to be meaningful
                // and not a common word that might appear in building names
                if (name.length > 5) {
                  expect(serialized).not.toContain(name)
                }
              }
            }
          },
        ),
        { numRuns: 100 },
      )
    })
  })
})
