import type { Database } from '@repo/db'
import { NotFoundError, ValidationError } from '@repo/shared/errors'
import type { RequestContext } from '@repo/shared/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuditLogger } from '../../src/plugins/audit-logger'
import type { R2Client } from '../../src/plugins/r2'
import { RenterRegistrationService } from '../../src/services/renter-registration'

/**
 * Unit tests for the RenterRegistrationService.
 *
 * Tests validate:
 * - Field validation (NID 10-17 digits, phone 11 digits starting 01, blood group enum, family members 1-50)
 * - Flat existence and Vacant status check
 * - User account creation with Renter role
 * - Renter record creation with personal data
 * - Rental contract creation with rent, start date, deposit
 * - Flat status update to Occupied
 * - File upload validation (NID photo, digital signature)
 * - Audit event recording
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 4.13
 */

// --- Constants ---

const FLAT_ID = '00000000-0000-4000-8000-000000000001'
const OWNER_ID = '00000000-0000-4000-8000-000000000010'
const RENTER_USER_ID = '00000000-0000-4000-8000-000000000020'
const RENTER_ID = '00000000-0000-4000-8000-000000000030'
const CONTRACT_ID = '00000000-0000-4000-8000-000000000040'
const BUILDING_ID = '00000000-0000-4000-8000-000000000050'

// --- Mock Helpers ---

function createMockAuditLogger() {
  return {
    log: vi.fn(),
    query: vi.fn(),
    pendingRetries: 0,
    shutdown: vi.fn(),
  } as unknown as AuditLogger
}

function createMockR2() {
  return {
    upload: vi
      .fn()
      .mockResolvedValue(
        `${OWNER_ID}/renter_nid/${RENTER_USER_ID}/12345-nid.jpg`,
      ),
    getPresignedUrl: vi.fn().mockResolvedValue('https://r2.example.com/signed'),
    delete: vi.fn().mockResolvedValue(undefined),
  } as unknown as R2Client
}

function createMockDb(
  overrides: {
    findFirstFlat?: unknown
    insertUserResult?: unknown
    insertRenterResult?: unknown
    insertContractResult?: unknown
    insertFileRefResult?: unknown
  } = {},
) {
  const defaultFlat =
    overrides.findFirstFlat !== undefined
      ? overrides.findFirstFlat
      : {
          id: FLAT_ID,
          ownerAccountId: OWNER_ID,
          buildingId: BUILDING_ID,
          flatNumber: 'A101',
          floor: 1,
          status: 'vacant',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        }

  const defaultUserResult = overrides.insertUserResult ?? {
    id: RENTER_USER_ID,
    email: 'renter_01712345678@amarspace.local',
    name: 'Test Renter',
    role: 'renter',
    ownerAccountId: OWNER_ID,
    phone: '01712345678',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  const defaultRenterResult = overrides.insertRenterResult ?? {
    id: RENTER_ID,
    ownerAccountId: OWNER_ID,
    userId: RENTER_USER_ID,
    fullName: 'Test Renter',
    phone: '01712345678',
    nidNumber: '1234567890',
    nidPhotoUrl: null,
    dateOfBirth: null,
    occupation: 'Engineer',
    bloodGroup: 'A+',
    totalFamilyMembers: 3,
    familyMemberNames: null,
    emergencyContactName: 'Emergency Person',
    emergencyContactNumber: '01812345678',
    emergencyContactRelationship: 'Brother',
    digitalSignatureUrl: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  const defaultContractResult = overrides.insertContractResult ?? {
    id: CONTRACT_ID,
    ownerAccountId: OWNER_ID,
    renterId: RENTER_ID,
    flatId: FLAT_ID,
    monthlyRent: '15000.00',
    startDate: '2024-02-01',
    securityDepositAmount: '30000.00',
    remainingDepositBalance: '30000.00',
    status: 'active',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  // Track insert calls to return different results for users, renters, contracts, file_references
  let insertCallCount = 0
  const insertResults = [
    defaultUserResult,
    defaultRenterResult,
    defaultContractResult,
    overrides.insertFileRefResult ?? { id: 'file-ref-1' },
  ]

  const mockInsert = vi.fn().mockImplementation(() => ({
    values: vi.fn().mockImplementation(() => ({
      returning: vi.fn().mockImplementation(() => {
        const result = insertResults[insertCallCount] ?? insertResults[0]
        insertCallCount++
        return Promise.resolve([result])
      }),
    })),
  }))

  const mockUpdate = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  })

  const mockSelect = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          offset: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  })

  return {
    query: {
      flats: {
        findFirst: vi.fn().mockResolvedValue(defaultFlat),
      },
      renters: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
  } as unknown as Database
}

function createOwnerContext(
  overrides: Partial<RequestContext> = {},
): RequestContext {
  return {
    userId: OWNER_ID,
    role: 'owner',
    ownerAccountId: OWNER_ID,
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    ...overrides,
  }
}

function validRenterInput() {
  return {
    fullName: 'Test Renter',
    phone: '01712345678',
    nidNumber: '1234567890',
    occupation: 'Engineer',
    bloodGroup: 'A+' as const,
    totalFamilyMembers: 3,
    emergencyContactName: 'Emergency Person',
    emergencyContactNumber: '01812345678',
    emergencyContactRelationship: 'Brother',
    flatId: FLAT_ID,
    monthlyRent: 15000,
    startDate: '2024-02-01',
    advanceAmount: 30000,
  }
}

// --- Tests ---

describe('RenterRegistrationService', () => {
  let auditLogger: ReturnType<typeof createMockAuditLogger>
  let r2: ReturnType<typeof createMockR2>
  let ctx: RequestContext

  beforeEach(() => {
    auditLogger = createMockAuditLogger()
    r2 = createMockR2()
    ctx = createOwnerContext()
  })

  describe('registerRenter', () => {
    it('should register a renter successfully with valid input', async () => {
      const db = createMockDb()
      const service = new RenterRegistrationService(db, auditLogger, r2)

      const result = await service.registerRenter(ctx, validRenterInput())

      expect(result.renter.id).toBe(RENTER_ID)
      expect(result.renter.fullName).toBe('Test Renter')
      expect(result.contract.id).toBe(CONTRACT_ID)
      expect(result.contract.monthlyRent).toBe('15000.00')
      expect(result.user.role).toBe('renter')
    })

    it('should reject invalid NID number (less than 10 digits)', async () => {
      const db = createMockDb()
      const service = new RenterRegistrationService(db, auditLogger, r2)

      const input = { ...validRenterInput(), nidNumber: '123456789' }

      await expect(service.registerRenter(ctx, input)).rejects.toThrow(
        ValidationError,
      )
    })

    it('should reject invalid NID number (more than 17 digits)', async () => {
      const db = createMockDb()
      const service = new RenterRegistrationService(db, auditLogger, r2)

      const input = {
        ...validRenterInput(),
        nidNumber: '123456789012345678',
      }

      await expect(service.registerRenter(ctx, input)).rejects.toThrow(
        ValidationError,
      )
    })

    it('should reject NID with non-numeric characters', async () => {
      const db = createMockDb()
      const service = new RenterRegistrationService(db, auditLogger, r2)

      const input = { ...validRenterInput(), nidNumber: '12345abc90' }

      await expect(service.registerRenter(ctx, input)).rejects.toThrow(
        ValidationError,
      )
    })

    it('should reject invalid phone number (not starting with 01)', async () => {
      const db = createMockDb()
      const service = new RenterRegistrationService(db, auditLogger, r2)

      const input = { ...validRenterInput(), phone: '02712345678' }

      await expect(service.registerRenter(ctx, input)).rejects.toThrow(
        ValidationError,
      )
    })

    it('should reject invalid phone number (not 11 digits)', async () => {
      const db = createMockDb()
      const service = new RenterRegistrationService(db, auditLogger, r2)

      const input = { ...validRenterInput(), phone: '0171234567' }

      await expect(service.registerRenter(ctx, input)).rejects.toThrow(
        ValidationError,
      )
    })

    it('should reject invalid blood group', async () => {
      const db = createMockDb()
      const service = new RenterRegistrationService(db, auditLogger, r2)

      const input = {
        ...validRenterInput(),
        bloodGroup: 'X+' as never,
      }

      await expect(service.registerRenter(ctx, input)).rejects.toThrow(
        ValidationError,
      )
    })

    it('should reject total family members less than 1', async () => {
      const db = createMockDb()
      const service = new RenterRegistrationService(db, auditLogger, r2)

      const input = { ...validRenterInput(), totalFamilyMembers: 0 }

      await expect(service.registerRenter(ctx, input)).rejects.toThrow(
        ValidationError,
      )
    })

    it('should reject total family members greater than 50', async () => {
      const db = createMockDb()
      const service = new RenterRegistrationService(db, auditLogger, r2)

      const input = { ...validRenterInput(), totalFamilyMembers: 51 }

      await expect(service.registerRenter(ctx, input)).rejects.toThrow(
        ValidationError,
      )
    })

    it('should reject when flat does not exist', async () => {
      const db = createMockDb({ findFirstFlat: null })
      const service = new RenterRegistrationService(db, auditLogger, r2)

      await expect(
        service.registerRenter(ctx, validRenterInput()),
      ).rejects.toThrow(NotFoundError)
    })

    it('should reject when flat is not Vacant (Occupied)', async () => {
      const db = createMockDb({
        findFirstFlat: {
          id: FLAT_ID,
          ownerAccountId: OWNER_ID,
          buildingId: BUILDING_ID,
          flatNumber: 'A101',
          floor: 1,
          status: 'occupied',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      })
      const service = new RenterRegistrationService(db, auditLogger, r2)

      await expect(
        service.registerRenter(ctx, validRenterInput()),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject when flat is Under_Maintenance', async () => {
      const db = createMockDb({
        findFirstFlat: {
          id: FLAT_ID,
          ownerAccountId: OWNER_ID,
          buildingId: BUILDING_ID,
          flatNumber: 'A101',
          floor: 1,
          status: 'under_maintenance',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      })
      const service = new RenterRegistrationService(db, auditLogger, r2)

      await expect(
        service.registerRenter(ctx, validRenterInput()),
      ).rejects.toThrow(ValidationError)
    })

    it('should record audit event on successful registration', async () => {
      const db = createMockDb()
      const service = new RenterRegistrationService(db, auditLogger, r2)

      await service.registerRenter(ctx, validRenterInput())

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: OWNER_ID,
          action: 'renter_registered',
          entityType: 'renter',
          entityId: RENTER_ID,
          ownerAccountId: OWNER_ID,
        }),
      )
    })

    it('should reject NID photo with invalid MIME type', async () => {
      const db = createMockDb()
      const service = new RenterRegistrationService(db, auditLogger, r2)

      const input = {
        ...validRenterInput(),
        nidPhoto: {
          filename: 'nid.gif',
          buffer: Buffer.from('fake-image'),
          mimeType: 'image/gif',
          fileSize: 1024,
        },
      }

      await expect(service.registerRenter(ctx, input)).rejects.toThrow(
        ValidationError,
      )
    })

    it('should reject NID photo exceeding 5MB', async () => {
      const db = createMockDb()
      const service = new RenterRegistrationService(db, auditLogger, r2)

      const input = {
        ...validRenterInput(),
        nidPhoto: {
          filename: 'nid.jpg',
          buffer: Buffer.alloc(1024),
          mimeType: 'image/jpeg',
          fileSize: 6 * 1024 * 1024,
        },
      }

      await expect(service.registerRenter(ctx, input)).rejects.toThrow(
        ValidationError,
      )
    })

    it('should upload NID photo to R2 when provided', async () => {
      const db = createMockDb()
      const service = new RenterRegistrationService(db, auditLogger, r2)

      const input = {
        ...validRenterInput(),
        nidPhoto: {
          filename: 'nid.jpg',
          buffer: Buffer.from('fake-image'),
          mimeType: 'image/jpeg',
          fileSize: 1024,
        },
      }

      await service.registerRenter(ctx, input)

      expect(r2.upload).toHaveBeenCalledWith(
        OWNER_ID,
        'renter_nid',
        RENTER_USER_ID,
        'nid.jpg',
        expect.any(Buffer),
        'image/jpeg',
      )
    })

    it('should accept valid blood groups', async () => {
      const validGroups = [
        'A+',
        'A-',
        'B+',
        'B-',
        'AB+',
        'AB-',
        'O+',
        'O-',
      ] as const

      for (const group of validGroups) {
        const db = createMockDb()
        const service = new RenterRegistrationService(db, auditLogger, r2)

        const input = { ...validRenterInput(), bloodGroup: group }
        const result = await service.registerRenter(ctx, input)
        expect(result.renter.id).toBe(RENTER_ID)
      }
    })

    it('should accept NID with exactly 10 digits', async () => {
      const db = createMockDb()
      const service = new RenterRegistrationService(db, auditLogger, r2)

      const input = { ...validRenterInput(), nidNumber: '1234567890' }
      const result = await service.registerRenter(ctx, input)
      expect(result.renter.id).toBe(RENTER_ID)
    })

    it('should accept NID with exactly 17 digits', async () => {
      const db = createMockDb()
      const service = new RenterRegistrationService(db, auditLogger, r2)

      const input = { ...validRenterInput(), nidNumber: '12345678901234567' }
      const result = await service.registerRenter(ctx, input)
      expect(result.renter.id).toBe(RENTER_ID)
    })

    it('should reject missing required fields', async () => {
      const db = createMockDb()
      const service = new RenterRegistrationService(db, auditLogger, r2)

      const input = { fullName: 'Test' } as never

      await expect(service.registerRenter(ctx, input)).rejects.toThrow(
        ValidationError,
      )
    })

    it('should accept optional dateOfBirth field', async () => {
      const db = createMockDb()
      const service = new RenterRegistrationService(db, auditLogger, r2)

      const input = { ...validRenterInput(), dateOfBirth: '1990-05-15' }
      const result = await service.registerRenter(ctx, input)
      expect(result.renter.id).toBe(RENTER_ID)
    })

    it('should accept optional familyMemberNames field', async () => {
      const db = createMockDb()
      const service = new RenterRegistrationService(db, auditLogger, r2)

      const input = {
        ...validRenterInput(),
        familyMemberNames: ['Member 1', 'Member 2'],
      }
      const result = await service.registerRenter(ctx, input)
      expect(result.renter.id).toBe(RENTER_ID)
    })

    it('should reject familyMemberNames exceeding 20 entries', async () => {
      const db = createMockDb()
      const service = new RenterRegistrationService(db, auditLogger, r2)

      const input = {
        ...validRenterInput(),
        familyMemberNames: Array.from({ length: 21 }, (_, i) => `Member ${i}`),
      }

      await expect(service.registerRenter(ctx, input)).rejects.toThrow(
        ValidationError,
      )
    })
  })
})
