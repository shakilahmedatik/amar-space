import {
  ConflictError,
  ForbiddenError,
  ValidationError,
} from '@repo/shared/errors'
import { createManagerSchema } from '@repo/shared/validation'
import fc from 'fast-check'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuditLogger } from '../../src/plugins/audit-logger'
import { ManagerService } from '../../src/services/manager'

// --- Types ---

interface MockDb {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  query: {
    users: {
      findFirst: ReturnType<typeof vi.fn>
    }
  }
}

// --- Generators ---

/** Generate a valid email (lowercase, max 254 chars) */
const validEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{0,49}$/),
    fc.stringMatching(/^[a-z][a-z0-9]{0,19}$/),
    fc.constantFrom('com', 'org', 'net', 'io'),
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`)
  .filter((email) => email.length <= 254 && email.length >= 5)

/** Generate a valid name (1-200 chars) */
const validNameArb = fc
  .string({ minLength: 1, maxLength: 200 })
  .filter((s) => s.trim().length > 0)

/** Generate a valid UUID */
const uuidArb = fc.uuid()

/** Generate a valid array of building IDs (1-20 unique UUIDs) */
const validBuildingIdsArb = fc.uniqueArray(uuidArb, {
  minLength: 1,
  maxLength: 20,
})

/** Generate an invalid building IDs array (0 items or >20 items) */
const invalidBuildingIdsCountArb = fc.oneof(
  fc.constant([] as string[]),
  fc.uniqueArray(uuidArb, { minLength: 21, maxLength: 30 }),
)

/** Generate a valid building IDs array of specific length */
const buildingIdsOfLengthArb = (min: number, max: number) =>
  fc.uniqueArray(uuidArb, { minLength: min, maxLength: max })

// --- Mock Helpers ---

function createMockAuditLogger(): AuditLogger {
  return {
    log: vi.fn(),
    query: vi.fn(),
  } as unknown as AuditLogger
}

function createMockDb(): MockDb {
  const mockFrom = vi.fn()
  const mockWhere = vi.fn()
  const mockValues = vi.fn()

  const selectChain = {
    from: mockFrom.mockReturnValue({
      where: mockWhere.mockResolvedValue([]),
    }),
  }

  const insertChain = {
    values: mockValues.mockResolvedValue(undefined),
  }

  return {
    select: vi.fn().mockReturnValue(selectChain),
    insert: vi.fn().mockReturnValue(insertChain),
    query: {
      users: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
  }
}

/**
 * Configure mock DB so that building ownership validation passes for given building IDs.
 * The mock returns the building IDs as owned by the owner.
 */
function configureMockDbForValidBuildings(
  mockDb: MockDb,
  buildingIds: string[],
) {
  const ownedBuildings = buildingIds.map((id) => ({ id }))

  const mockWhere = vi.fn().mockResolvedValue(ownedBuildings)
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
  mockDb.select.mockReturnValue({ from: mockFrom })

  const mockValues = vi.fn().mockResolvedValue(undefined)
  mockDb.insert.mockReturnValue({ values: mockValues })

  mockDb.query.users.findFirst.mockResolvedValue(null)
}

/**
 * Configure mock DB so that some building IDs are NOT owned by the owner.
 */
function configureMockDbForForeignBuildings(
  mockDb: MockDb,
  ownedIds: string[],
  _allRequestedIds: string[],
) {
  const ownedBuildings = ownedIds.map((id) => ({ id }))

  const mockWhere = vi.fn().mockResolvedValue(ownedBuildings)
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
  mockDb.select.mockReturnValue({ from: mockFrom })

  mockDb.query.users.findFirst.mockResolvedValue(null)
}

// --- Property Tests ---

// Feature: role-based-user-management, Property 7: Valid manager creation produces correct user and assignments
describe('Feature: role-based-user-management, Property 7: Valid manager creation produces correct user and assignments', () => {
  let mockDb: MockDb
  let mockAuditLogger: AuditLogger
  let service: ManagerService

  beforeEach(() => {
    mockDb = createMockDb()
    mockAuditLogger = createMockAuditLogger()
    service = new ManagerService(mockDb as any, mockAuditLogger)
  })

  /**
   * **Validates: Requirements 3.1, 3.4**
   *
   * For any valid CreateManagerInput (email ≤ 254 chars, name 1-200 chars, 1-20 valid
   * building IDs belonging to the owner), the system SHALL create a user with role
   * `manager` linked to the owner's account AND create one manager_assignment record
   * per building ID.
   */
  it('creates a user with role manager and one assignment per building ID', () => {
    return fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validNameArb,
        validBuildingIdsArb,
        uuidArb,
        uuidArb,
        async (email, name, buildingIds, ownerId, userId) => {
          // Reset mocks for each iteration
          mockDb = createMockDb()
          mockAuditLogger = createMockAuditLogger()
          service = new ManagerService(mockDb as any, mockAuditLogger)

          // Configure DB to accept all building IDs as owned
          configureMockDbForValidBuildings(mockDb, buildingIds)

          const ctx = {
            userId,
            role: 'owner' as const,
            ownerAccountId: ownerId,
            ipAddress: '127.0.0.1',
            userAgent: 'test',
          }

          const input = { email, name, buildingIds }

          const result = await service.createManager(ctx, input)

          // Property: Result MUST have role 'manager'
          expect(result.role).toBe('manager')

          // Property: Result MUST contain the same building IDs
          expect(result.buildingIds).toEqual(buildingIds)

          // Property: Result MUST have a non-empty id
          expect(result.id).toBeTruthy()
          expect(typeof result.id).toBe('string')

          // Property: Result email MUST be the normalized (lowercase) email
          expect(result.email).toBe(email.toLowerCase())

          // Property: Result name MUST match input name
          expect(result.name).toBe(name)

          // Property: A temporary password MUST be generated
          expect(result.temporaryPassword).toBeTruthy()
          expect(result.temporaryPassword.length).toBeGreaterThanOrEqual(12)

          // Property: db.insert MUST be called for user creation and assignments
          // First call creates the user, second call creates assignments
          expect(mockDb.insert).toHaveBeenCalledTimes(2)

          // Property: Audit logger MUST be called
          expect(mockAuditLogger.log).toHaveBeenCalledTimes(1)
        },
      ),
      { numRuns: 100 },
    )
  })
})

// Feature: role-based-user-management, Property 8: Building ID count validation
describe('Feature: role-based-user-management, Property 8: Building ID count validation', () => {
  /**
   * **Validates: Requirements 3.2**
   *
   * For any array of building IDs, the manager creation validation SHALL accept
   * the input if and only if the array length is between 1 and 20 inclusive.
   */
  it('accepts building IDs arrays with length between 1 and 20 inclusive', () => {
    return fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), (length) => {
        const buildingIds = Array.from({ length }, () => crypto.randomUUID())
        const input = {
          email: 'test@example.com',
          name: 'Test Manager',
          buildingIds,
        }

        const result = createManagerSchema.safeParse(input)

        // Property: Valid count (1-20) MUST be accepted
        expect(result.success).toBe(true)
      }),
      { numRuns: 100 },
    )
  })

  it('rejects building IDs arrays with length 0 or greater than 20', () => {
    return fc.assert(
      fc.property(
        fc.oneof(fc.constant(0), fc.integer({ min: 21, max: 50 })),
        (length) => {
          const buildingIds = Array.from({ length }, () => crypto.randomUUID())
          const input = {
            email: 'test@example.com',
            name: 'Test Manager',
            buildingIds,
          }

          const result = createManagerSchema.safeParse(input)

          // Property: Invalid count (0 or >20) MUST be rejected
          expect(result.success).toBe(false)
        },
      ),
      { numRuns: 100 },
    )
  })
})

// Feature: role-based-user-management, Property 9: Building ownership validation rejects foreign buildings
describe('Feature: role-based-user-management, Property 9: Building ownership validation rejects foreign buildings', () => {
  let mockDb: MockDb
  let mockAuditLogger: AuditLogger
  let service: ManagerService

  beforeEach(() => {
    mockDb = createMockDb()
    mockAuditLogger = createMockAuditLogger()
    service = new ManagerService(mockDb as any, mockAuditLogger)
  })

  /**
   * **Validates: Requirements 3.3**
   *
   * For any set of building IDs where at least one ID does not belong to the
   * requesting owner's account, the system SHALL reject the request with a
   * validation error identifying the invalid building ID.
   */
  it('rejects creation when at least one building ID does not belong to the owner', () => {
    return fc.assert(
      fc.asyncProperty(
        // Generate owned building IDs (0-19)
        fc.uniqueArray(uuidArb, { minLength: 0, maxLength: 19 }),
        // Generate foreign building IDs (at least 1)
        fc.uniqueArray(uuidArb, { minLength: 1, maxLength: 5 }),
        uuidArb,
        uuidArb,
        async (ownedIds, foreignIds, ownerId, userId) => {
          // Ensure foreign IDs don't overlap with owned IDs
          const ownedSet = new Set(ownedIds)
          const actualForeignIds = foreignIds.filter((id) => !ownedSet.has(id))

          // Skip if no actual foreign IDs after dedup
          if (actualForeignIds.length === 0) return

          // Combine owned + foreign, ensuring total is 1-20
          const allBuildingIds = [...ownedIds, ...actualForeignIds].slice(0, 20)
          if (allBuildingIds.length === 0) return

          // Reset mocks for each iteration
          mockDb = createMockDb()
          mockAuditLogger = createMockAuditLogger()
          service = new ManagerService(mockDb as any, mockAuditLogger)

          // Configure DB to only return owned buildings
          configureMockDbForForeignBuildings(mockDb, ownedIds, allBuildingIds)

          const ctx = {
            userId,
            role: 'owner' as const,
            ownerAccountId: ownerId,
            ipAddress: '127.0.0.1',
            userAgent: 'test',
          }

          const input = {
            email: 'manager@example.com',
            name: 'Test Manager',
            buildingIds: allBuildingIds,
          }

          // Property: The system MUST reject with ForbiddenError
          await expect(service.createManager(ctx, input)).rejects.toThrow(
            ForbiddenError,
          )
        },
      ),
      { numRuns: 100 },
    )
  })
})
