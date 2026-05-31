import type { Database } from '@repo/db'
import { ForbiddenError, ValidationError } from '@repo/shared/errors'
import fc from 'fast-check'
import type { FastifyInstance } from 'fastify'
import Fastify from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '../../src/middleware/auth-guard'
import type { TenantScope } from '../../src/middleware/tenant-scope'
import { tenantScope } from '../../src/middleware/tenant-scope'
import type { AuditLogger } from '../../src/plugins/audit-logger'
import { ManagerService } from '../../src/services/manager'

// Feature: role-based-user-management, Property 11: Manager scope enforcement
//
// For any manager with a set of assigned building IDs and for any requested building ID,
// the tenant scope middleware SHALL grant access if and only if the requested building ID
// is contained in the manager's assigned building IDs set.
//
// **Validates: Requirements 6.1, 6.2, 6.3**

// --- Generators ---

/** Generate a valid UUID v4 string */
const uuidArb = fc.uuid({ version: 4 })

/** Generate a non-empty set of assigned building IDs (1-10 unique UUIDs) */
const assignedBuildingIdsArb = fc.uniqueArray(fc.uuid({ version: 4 }), {
  minLength: 1,
  maxLength: 10,
})

/** Generate an empty set of assigned building IDs */
const _emptyBuildingIdsArb = fc.constant([] as string[])

/** Generate a random email */
const emailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{1,10}$/),
    fc.stringMatching(/^[a-z][a-z0-9]{1,6}$/),
    fc.constantFrom('.com', '.io', '.org', '.net'),
  )
  .map(([local, domain, tld]) => `${local}@${domain}${tld}`)

// --- Test Helpers ---

/**
 * Creates a mock db that returns the given building IDs for manager assignment queries.
 */
function createMockDb(buildingIds: string[]) {
  const mockWhere = vi
    .fn()
    .mockReturnValue(buildingIds.map((id) => ({ buildingId: id })))

  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

  return { select: mockSelect }
}

describe('Feature: role-based-user-management, Property 11: Manager scope enforcement', () => {
  let app: FastifyInstance

  beforeEach(() => {
    app = Fastify({ logger: false })
  })

  afterEach(async () => {
    await app.close()
    vi.restoreAllMocks()
  })

  function setupApp(user: AuthUser, assignedBuildingIds: string[]) {
    const mockDb = createMockDb(assignedBuildingIds)

    app.decorateRequest('user', null as unknown as AuthUser)
    app.decorateRequest('tenantScope', null as unknown as TenantScope)
    app.decorate('db', mockDb as unknown as Database)

    const fakeAuthGuard = async (request: { user: AuthUser }) => {
      request.user = user
    }

    app.get(
      '/test',
      { preHandler: [fakeAuthGuard, tenantScope] },
      async (request) => {
        return { tenantScope: request.tenantScope }
      },
    )

    return mockDb
  }

  describe('Manager scope grants access if and only if requested building ID is in assigned set', () => {
    it('for any manager with assigned buildings, access is granted iff requested building is in the assigned set', () => {
      return fc.assert(
        fc.asyncProperty(
          uuidArb, // userId
          uuidArb, // ownerAccountId
          emailArb, // email
          assignedBuildingIdsArb, // assigned building IDs
          uuidArb, // requested building ID
          async (
            userId,
            ownerAccountId,
            email,
            assignedBuildingIds,
            requestedBuildingId,
          ) => {
            await app.close()
            app = Fastify({ logger: false })

            const user: AuthUser = {
              id: userId,
              role: 'manager',
              ownerAccountId,
              email,
            }

            setupApp(user, assignedBuildingIds)
            await app.ready()

            const response = await app.inject({
              method: 'GET',
              url: '/test',
            })

            expect(response.statusCode).toBe(200)
            const body = response.json()

            // The tenant scope middleware sets assignedBuildingIds for managers
            const scopedBuildingIds: string[] =
              body.tenantScope.assignedBuildingIds

            // Property: assignedBuildingIds in the scope matches exactly what the DB returned
            expect(scopedBuildingIds).toEqual(assignedBuildingIds)

            // Property: access is granted (building is in scope) iff the requested building ID
            // is contained in the manager's assigned building IDs set
            const isInScope = scopedBuildingIds.includes(requestedBuildingId)
            const shouldBeInScope =
              assignedBuildingIds.includes(requestedBuildingId)

            expect(isInScope).toBe(shouldBeInScope)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe('Manager with assigned buildings: requested building in assigned set grants access', () => {
    it('for any manager, picking a building from their assigned set always results in that building being in scope', () => {
      return fc.assert(
        fc.asyncProperty(
          uuidArb, // userId
          uuidArb, // ownerAccountId
          emailArb, // email
          assignedBuildingIdsArb, // assigned building IDs (non-empty)
          async (userId, ownerAccountId, email, assignedBuildingIds) => {
            await app.close()
            app = Fastify({ logger: false })

            // Pick a random building from the assigned set
            const randomIndex = Math.floor(
              Math.random() * assignedBuildingIds.length,
            )
            const requestedBuildingId = assignedBuildingIds[randomIndex]

            const user: AuthUser = {
              id: userId,
              role: 'manager',
              ownerAccountId,
              email,
            }

            setupApp(user, assignedBuildingIds)
            await app.ready()

            const response = await app.inject({
              method: 'GET',
              url: '/test',
            })

            expect(response.statusCode).toBe(200)
            const body = response.json()

            const scopedBuildingIds: string[] =
              body.tenantScope.assignedBuildingIds

            // Property: A building from the assigned set MUST always be in scope
            expect(scopedBuildingIds).toContain(requestedBuildingId)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe('Manager with assigned buildings: building NOT in assigned set is denied access', () => {
    it('for any manager, a building ID not in their assigned set is never in scope', () => {
      return fc.assert(
        fc.asyncProperty(
          uuidArb, // userId
          uuidArb, // ownerAccountId
          emailArb, // email
          assignedBuildingIdsArb, // assigned building IDs
          uuidArb, // unassigned building ID
          async (
            userId,
            ownerAccountId,
            email,
            assignedBuildingIds,
            unassignedBuildingId,
          ) => {
            // Ensure the requested building is NOT in the assigned set
            fc.pre(!assignedBuildingIds.includes(unassignedBuildingId))

            await app.close()
            app = Fastify({ logger: false })

            const user: AuthUser = {
              id: userId,
              role: 'manager',
              ownerAccountId,
              email,
            }

            setupApp(user, assignedBuildingIds)
            await app.ready()

            const response = await app.inject({
              method: 'GET',
              url: '/test',
            })

            expect(response.statusCode).toBe(200)
            const body = response.json()

            const scopedBuildingIds: string[] =
              body.tenantScope.assignedBuildingIds

            // Property: A building NOT in the assigned set MUST NOT be in scope
            expect(scopedBuildingIds).not.toContain(unassignedBuildingId)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe('Manager with zero building assignments: empty result set', () => {
    it('for any manager with no building assignments, assignedBuildingIds is an empty array', () => {
      return fc.assert(
        fc.asyncProperty(
          uuidArb, // userId
          uuidArb, // ownerAccountId
          emailArb, // email
          uuidArb, // any requested building ID
          async (userId, ownerAccountId, email, requestedBuildingId) => {
            await app.close()
            app = Fastify({ logger: false })

            const user: AuthUser = {
              id: userId,
              role: 'manager',
              ownerAccountId,
              email,
            }

            // Manager has zero assignments
            setupApp(user, [])
            await app.ready()

            const response = await app.inject({
              method: 'GET',
              url: '/test',
            })

            expect(response.statusCode).toBe(200)
            const body = response.json()

            const scopedBuildingIds: string[] =
              body.tenantScope.assignedBuildingIds

            // Property: With zero assignments, the scope is an empty array
            expect(scopedBuildingIds).toEqual([])

            // Property: No building ID can be in scope when assignments are empty
            expect(scopedBuildingIds).not.toContain(requestedBuildingId)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe('Scope set membership is exact: no extra or missing building IDs', () => {
    it('for any manager, the scoped building IDs set is exactly equal to the assigned building IDs set', () => {
      return fc.assert(
        fc.asyncProperty(
          uuidArb, // userId
          uuidArb, // ownerAccountId
          emailArb, // email
          fc.uniqueArray(fc.uuid({ version: 4 }), {
            minLength: 0,
            maxLength: 10,
          }), // assigned building IDs
          async (userId, ownerAccountId, email, assignedBuildingIds) => {
            await app.close()
            app = Fastify({ logger: false })

            const user: AuthUser = {
              id: userId,
              role: 'manager',
              ownerAccountId,
              email,
            }

            setupApp(user, assignedBuildingIds)
            await app.ready()

            const response = await app.inject({
              method: 'GET',
              url: '/test',
            })

            expect(response.statusCode).toBe(200)
            const body = response.json()

            const scopedBuildingIds: string[] =
              body.tenantScope.assignedBuildingIds

            // Property: The scoped set is EXACTLY the assigned set (no additions, no removals)
            expect(new Set(scopedBuildingIds)).toEqual(
              new Set(assignedBuildingIds),
            )
            expect(scopedBuildingIds.length).toBe(assignedBuildingIds.length)
          },
        ),
        { numRuns: 100 },
      )
    })
  })
})

// Feature: role-based-user-management, Property 12: Building assignment update validation
//
// For any set of building IDs submitted as a manager assignment update, the system SHALL
// accept the update if and only if all IDs belong to the owner's account AND the set
// contains at least one ID.
//
// **Validates: Requirements 6.6, 6.7**

// --- Mock Helpers for Property 12 ---

interface MockDb12 {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  query: {
    users: {
      findFirst: ReturnType<typeof vi.fn>
    }
  }
}

function createMockAuditLogger(): AuditLogger {
  return {
    log: vi.fn(),
    query: vi.fn(),
  } as unknown as AuditLogger
}

function createMockDb12(): MockDb12 {
  const mockWhere = vi.fn().mockResolvedValue([])
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
  const mockValues = vi.fn().mockResolvedValue(undefined)
  const mockDeleteWhere = vi.fn().mockResolvedValue(undefined)

  return {
    select: vi.fn().mockReturnValue({ from: mockFrom }),
    insert: vi.fn().mockReturnValue({ values: mockValues }),
    delete: vi.fn().mockReturnValue({ where: mockDeleteWhere }),
    query: {
      users: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
  }
}

/**
 * Configure mock DB so that:
 * - The manager exists and belongs to the owner's account
 * - The specified ownedBuildingIds are returned as owned buildings
 */
function configureMockDbForUpdateAssignments(
  mockDb: MockDb12,
  ownedBuildingIds: string[],
  managerExists: boolean,
  managerId: string,
  ownerAccountId: string,
) {
  // Mock db.query.users.findFirst — returns manager if exists
  if (managerExists) {
    mockDb.query.users.findFirst.mockResolvedValue({
      id: managerId,
      role: 'manager',
      ownerAccountId,
    })
  } else {
    mockDb.query.users.findFirst.mockResolvedValue(null)
  }

  // Mock db.select().from(buildings).where(...) — returns owned buildings
  const ownedBuildings = ownedBuildingIds.map((id) => ({ id }))
  const mockWhere = vi.fn().mockResolvedValue(ownedBuildings)
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
  mockDb.select.mockReturnValue({ from: mockFrom })

  // Mock db.delete().where(...) — succeeds
  const mockDeleteWhere = vi.fn().mockResolvedValue(undefined)
  mockDb.delete.mockReturnValue({ where: mockDeleteWhere })

  // Mock db.insert().values(...) — succeeds
  const mockValues = vi.fn().mockResolvedValue(undefined)
  mockDb.insert.mockReturnValue({ values: mockValues })
}

describe('Feature: role-based-user-management, Property 12: Building assignment update validation', () => {
  let mockDb: MockDb12
  let mockAuditLogger: AuditLogger
  let service: ManagerService

  beforeEach(() => {
    mockDb = createMockDb12()
    mockAuditLogger = createMockAuditLogger()
    service = new ManagerService(mockDb as unknown as Database, mockAuditLogger)
  })

  /**
   * **Validates: Requirements 6.6, 6.7**
   *
   * For any set of building IDs submitted as a manager assignment update,
   * the system SHALL accept the update if and only if all IDs belong to the
   * owner's account AND the set contains at least one ID.
   */
  it('accepts update when all building IDs belong to owner and set is non-empty', () => {
    return fc.assert(
      fc.asyncProperty(
        uuidArb, // managerId
        uuidArb, // ownerAccountId
        uuidArb, // userId (actor)
        fc.uniqueArray(fc.uuid({ version: 4 }), {
          minLength: 1,
          maxLength: 20,
        }), // buildingIds (valid: 1-20)
        async (managerId, ownerAccountId, userId, buildingIds) => {
          // Reset mocks for each iteration
          mockDb = createMockDb12()
          mockAuditLogger = createMockAuditLogger()
          service = new ManagerService(
            mockDb as unknown as Database,
            mockAuditLogger,
          )

          // All building IDs belong to the owner
          configureMockDbForUpdateAssignments(
            mockDb,
            buildingIds,
            true,
            managerId,
            ownerAccountId,
          )

          const ctx = {
            userId,
            role: 'owner' as const,
            ownerAccountId,
            ipAddress: '127.0.0.1',
            userAgent: 'test',
          }

          // Property: Update MUST succeed (no error thrown)
          await expect(
            service.updateAssignments(ctx, managerId, buildingIds),
          ).resolves.toBeUndefined()

          // Property: Audit logger MUST be called
          expect(mockAuditLogger.log).toHaveBeenCalledTimes(1)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('rejects update when building IDs set is empty', () => {
    return fc.assert(
      fc.asyncProperty(
        uuidArb, // managerId
        uuidArb, // ownerAccountId
        uuidArb, // userId (actor)
        async (managerId, ownerAccountId, userId) => {
          // Reset mocks for each iteration
          mockDb = createMockDb12()
          mockAuditLogger = createMockAuditLogger()
          service = new ManagerService(
            mockDb as unknown as Database,
            mockAuditLogger,
          )

          configureMockDbForUpdateAssignments(
            mockDb,
            [],
            true,
            managerId,
            ownerAccountId,
          )

          const ctx = {
            userId,
            role: 'owner' as const,
            ownerAccountId,
            ipAddress: '127.0.0.1',
            userAgent: 'test',
          }

          // Property: Empty building IDs MUST be rejected with ValidationError
          await expect(
            service.updateAssignments(ctx, managerId, []),
          ).rejects.toThrow(ValidationError)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('rejects update when at least one building ID does not belong to the owner', () => {
    return fc.assert(
      fc.asyncProperty(
        uuidArb, // managerId
        uuidArb, // ownerAccountId
        uuidArb, // userId (actor)
        // Generate owned building IDs (0-9)
        fc.uniqueArray(fc.uuid({ version: 4 }), {
          minLength: 0,
          maxLength: 9,
        }),
        // Generate foreign building IDs (at least 1)
        fc.uniqueArray(fc.uuid({ version: 4 }), {
          minLength: 1,
          maxLength: 5,
        }),
        async (managerId, ownerAccountId, userId, ownedIds, foreignIds) => {
          // Ensure foreign IDs don't overlap with owned IDs
          const ownedSet = new Set(ownedIds)
          const actualForeignIds = foreignIds.filter((id) => !ownedSet.has(id))

          // Skip if no actual foreign IDs after dedup
          if (actualForeignIds.length === 0) return

          // Combine owned + foreign, ensuring total is 1-20
          const allBuildingIds = [...ownedIds, ...actualForeignIds].slice(0, 20)
          if (allBuildingIds.length === 0) return

          // Reset mocks for each iteration
          mockDb = createMockDb12()
          mockAuditLogger = createMockAuditLogger()
          service = new ManagerService(
            mockDb as unknown as Database,
            mockAuditLogger,
          )

          // Only owned IDs are returned by the DB query (foreign ones are not)
          configureMockDbForUpdateAssignments(
            mockDb,
            ownedIds,
            true,
            managerId,
            ownerAccountId,
          )

          const ctx = {
            userId,
            role: 'owner' as const,
            ownerAccountId,
            ipAddress: '127.0.0.1',
            userAgent: 'test',
          }

          // Property: Request with foreign building IDs MUST be rejected with ForbiddenError
          await expect(
            service.updateAssignments(ctx, managerId, allBuildingIds),
          ).rejects.toThrow(ForbiddenError)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('accepts update if and only if all IDs belong to owner AND set is non-empty (combined property)', () => {
    return fc.assert(
      fc.asyncProperty(
        uuidArb, // managerId
        uuidArb, // ownerAccountId
        uuidArb, // userId (actor)
        // Owner's buildings (1-10)
        fc.uniqueArray(fc.uuid({ version: 4 }), {
          minLength: 1,
          maxLength: 10,
        }),
        // Whether to include foreign buildings
        fc.boolean(),
        // Whether to submit empty set
        fc.boolean(),
        async (
          managerId,
          ownerAccountId,
          userId,
          ownerBuildings,
          includeForeign,
          submitEmpty,
        ) => {
          // Reset mocks for each iteration
          mockDb = createMockDb12()
          mockAuditLogger = createMockAuditLogger()
          service = new ManagerService(
            mockDb as unknown as Database,
            mockAuditLogger,
          )

          let buildingIds: string[]
          let shouldSucceed: boolean

          if (submitEmpty) {
            // Empty set — should fail
            buildingIds = []
            shouldSucceed = false
          } else if (includeForeign) {
            // Include a foreign building ID — should fail
            const foreignId = crypto.randomUUID()
            // Ensure foreign ID is not in owner's buildings
            if (ownerBuildings.includes(foreignId)) return
            buildingIds = [...ownerBuildings.slice(0, 19), foreignId]
            shouldSucceed = false
          } else {
            // All buildings belong to owner — should succeed
            buildingIds = ownerBuildings
            shouldSucceed = true
          }

          // Configure mock: only ownerBuildings are returned as owned
          configureMockDbForUpdateAssignments(
            mockDb,
            ownerBuildings,
            true,
            managerId,
            ownerAccountId,
          )

          const ctx = {
            userId,
            role: 'owner' as const,
            ownerAccountId,
            ipAddress: '127.0.0.1',
            userAgent: 'test',
          }

          if (shouldSucceed) {
            // Property: MUST succeed
            await expect(
              service.updateAssignments(ctx, managerId, buildingIds),
            ).resolves.toBeUndefined()
          } else {
            // Property: MUST throw (either ValidationError or ForbiddenError)
            await expect(
              service.updateAssignments(ctx, managerId, buildingIds),
            ).rejects.toThrow()
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
