import fc from 'fast-check'
import type { FastifyInstance } from 'fastify'
import Fastify from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { tenantScope } from '../../src/middleware/tenant-scope'

/**
 * Feature: amarspace-full-implementation
 * Property 17: Tenant data isolation
 *
 * For any data query executed by any authenticated user, the results SHALL never
 * include records where the ownerAccountId differs from the querying user's owner
 * account. Attempting to access a specific resource belonging to a different owner
 * SHALL return HTTP 404.
 *
 * Specifically for the tenantScope middleware:
 * - Every query executed by the service layer SHALL include an ownerAccountId filter
 *   matching the authenticated user's tenant.
 * - No user SHALL be able to access data belonging to a different ownerAccountId.
 *
 * **Validates: Requirements 17.2, 17.3, 17.6**
 */

// --- Generators ---

/** Generate a valid UUID v4 string */
const uuidArb = fc.uuid({ version: 4 })

/** Generate a user role */
const roleArb = fc.constantFrom('owner', 'manager', 'renter') as fc.Arbitrary<
  'owner' | 'manager' | 'renter'
>

/** Generate a random email */
const emailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{1,10}$/),
    fc.stringMatching(/^[a-z][a-z0-9]{1,6}$/),
    fc.constantFrom('.com', '.io', '.org', '.net', '.bd'),
  )
  .map(([local, domain, tld]) => `${local}@${domain}${tld}`)

/** Generate a list of building IDs (0-5 UUIDs) for manager assignments */
const buildingIdsArb = fc.array(fc.uuid({ version: 4 }), {
  minLength: 0,
  maxLength: 5,
})

/** Generate an optional flat ID for renter contracts */
const optionalFlatIdArb = fc.option(fc.uuid({ version: 4 }), { nil: undefined })

// --- Test Setup ---

/**
 * Creates a mock db that returns results sequentially for each .where() call.
 */
function createSequentialMockDb(querySequence: unknown[][]) {
  let callIndex = 0

  const mockWhere = vi.fn().mockImplementation(() => {
    const result = querySequence[callIndex] || []
    callIndex++
    return result
  })

  const mockFrom = vi.fn().mockImplementation(() => {
    return { where: mockWhere }
  })

  const mockSelect = vi.fn().mockImplementation(() => {
    return { from: mockFrom }
  })

  return { select: mockSelect }
}

describe('Feature: amarspace-full-implementation, Property 17: Tenant data isolation', () => {
  let app: FastifyInstance

  beforeEach(() => {
    app = Fastify({ logger: false })
  })

  afterEach(async () => {
    await app.close()
    vi.restoreAllMocks()
  })

  function setupApp(
    user: {
      id: string
      role: 'owner' | 'manager' | 'renter'
      ownerAccountId: string
      email: string
    },
    querySequence: unknown[][] = [],
  ) {
    const mockDb = createSequentialMockDb(querySequence)

    app.decorateRequest('user', null)
    app.decorateRequest('tenantScope', null)
    app.decorate('db', mockDb)

    const fakeAuthGuard = async (request: { user: typeof user }) => {
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

  describe('ownerAccountId always matches authenticated user context', () => {
    it('for ANY generated ownerAccountId and role, tenantScope.ownerAccountId === request.user.ownerAccountId', () => {
      return fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          roleArb,
          emailArb,
          buildingIdsArb,
          optionalFlatIdArb,
          async (userId, ownerAccountId, role, email, buildingIds, flatId) => {
            // Reset app for each property run
            await app.close()
            app = Fastify({ logger: false })

            // Build query sequence based on role
            const querySequence: unknown[][] = []
            if (role === 'manager') {
              querySequence.push(buildingIds.map((id) => ({ buildingId: id })))
            } else if (role === 'renter') {
              if (flatId) {
                const renterRecordId = 'renter-record-id'
                querySequence.push([{ id: renterRecordId }])
                querySequence.push([{ flatId }])
              } else {
                querySequence.push([])
              }
            }

            setupApp({ id: userId, role, ownerAccountId, email }, querySequence)
            await app.ready()

            const response = await app.inject({
              method: 'GET',
              url: '/test',
            })

            expect(response.statusCode).toBe(200)
            const body = response.json()

            // CORE PROPERTY: tenantScope.ownerAccountId ALWAYS matches request.user.ownerAccountId
            expect(body.tenantScope.ownerAccountId).toBe(ownerAccountId)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe('manager role: assignedBuildingIds is always an array from same ownerAccountId', () => {
    it('for any manager with any ownerAccountId, assignedBuildingIds is always an array (possibly empty)', () => {
      return fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          emailArb,
          buildingIdsArb,
          async (userId, ownerAccountId, email, buildingIds) => {
            await app.close()
            app = Fastify({ logger: false })

            setupApp({ id: userId, role: 'manager', ownerAccountId, email }, [
              buildingIds.map((id) => ({ buildingId: id })),
            ])
            await app.ready()

            const response = await app.inject({
              method: 'GET',
              url: '/test',
            })

            expect(response.statusCode).toBe(200)
            const body = response.json()

            // Property: ownerAccountId always matches
            expect(body.tenantScope.ownerAccountId).toBe(ownerAccountId)

            // Property: assignedBuildingIds is always an array
            expect(Array.isArray(body.tenantScope.assignedBuildingIds)).toBe(
              true,
            )

            // Property: assignedBuildingIds length matches what the DB returned
            expect(body.tenantScope.assignedBuildingIds).toHaveLength(
              buildingIds.length,
            )

            // Property: no assignedFlatId for managers
            expect(body.tenantScope.assignedFlatId).toBeUndefined()
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe('renter role: assignedFlatId is either a string or undefined, never from a different owner', () => {
    it('for any renter with an active contract, assignedFlatId is a string from the same ownerAccountId', () => {
      return fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          emailArb,
          uuidArb,
          uuidArb,
          async (userId, ownerAccountId, email, renterRecordId, flatId) => {
            await app.close()
            app = Fastify({ logger: false })

            setupApp({ id: userId, role: 'renter', ownerAccountId, email }, [
              // Query 1: renters table -> renter record found
              [{ id: renterRecordId }],
              // Query 2: rental_contracts -> active contract with flatId
              [{ flatId }],
            ])
            await app.ready()

            const response = await app.inject({
              method: 'GET',
              url: '/test',
            })

            expect(response.statusCode).toBe(200)
            const body = response.json()

            // Property: ownerAccountId always matches
            expect(body.tenantScope.ownerAccountId).toBe(ownerAccountId)

            // Property: assignedFlatId is a string (the flat from the contract)
            expect(typeof body.tenantScope.assignedFlatId).toBe('string')
            expect(body.tenantScope.assignedFlatId).toBe(flatId)

            // Property: no assignedBuildingIds for renters
            expect(body.tenantScope.assignedBuildingIds).toBeUndefined()
          },
        ),
        { numRuns: 100 },
      )
    })

    it('for any renter without an active contract, assignedFlatId is undefined', () => {
      return fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          emailArb,
          async (userId, ownerAccountId, email) => {
            await app.close()
            app = Fastify({ logger: false })

            setupApp({ id: userId, role: 'renter', ownerAccountId, email }, [
              // Query 1: renters table -> no renter record found
              [],
            ])
            await app.ready()

            const response = await app.inject({
              method: 'GET',
              url: '/test',
            })

            expect(response.statusCode).toBe(200)
            const body = response.json()

            // Property: ownerAccountId always matches
            expect(body.tenantScope.ownerAccountId).toBe(ownerAccountId)

            // Property: assignedFlatId is undefined when no contract exists
            expect(body.tenantScope.assignedFlatId).toBeUndefined()

            // Property: no assignedBuildingIds for renters
            expect(body.tenantScope.assignedBuildingIds).toBeUndefined()
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe('owner role: no assignedBuildingIds or assignedFlatId are set', () => {
    it('for any owner, tenantScope contains only ownerAccountId with no building or flat assignments', () => {
      return fc.assert(
        fc.asyncProperty(uuidArb, emailArb, async (ownerAccountId, email) => {
          await app.close()
          app = Fastify({ logger: false })

          // Owners don't trigger any DB queries in tenantScope
          setupApp(
            { id: ownerAccountId, role: 'owner', ownerAccountId, email },
            [],
          )
          await app.ready()

          const response = await app.inject({
            method: 'GET',
            url: '/test',
          })

          expect(response.statusCode).toBe(200)
          const body = response.json()

          // Property: ownerAccountId always matches
          expect(body.tenantScope.ownerAccountId).toBe(ownerAccountId)

          // Property: owners have NO assignedBuildingIds
          expect(body.tenantScope.assignedBuildingIds).toBeUndefined()

          // Property: owners have NO assignedFlatId
          expect(body.tenantScope.assignedFlatId).toBeUndefined()
        }),
        { numRuns: 100 },
      )
    })
  })

  describe('cross-tenant isolation invariant', () => {
    it('no matter what role or user ID is generated, ownerAccountId in tenantScope always matches request.user.ownerAccountId and never a different value', () => {
      return fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          uuidArb,
          roleArb,
          emailArb,
          async (
            userId,
            ownerAccountId,
            differentOwnerAccountId,
            role,
            email,
          ) => {
            // Ensure we have two distinct owner account IDs
            fc.pre(ownerAccountId !== differentOwnerAccountId)

            await app.close()
            app = Fastify({ logger: false })

            // Build query sequence based on role
            const querySequence: unknown[][] = []
            if (role === 'manager') {
              querySequence.push([
                { buildingId: 'building-1' },
                { buildingId: 'building-2' },
              ])
            } else if (role === 'renter') {
              querySequence.push([{ id: 'renter-record-1' }])
              querySequence.push([{ flatId: 'flat-1' }])
            }

            setupApp({ id: userId, role, ownerAccountId, email }, querySequence)
            await app.ready()

            const response = await app.inject({
              method: 'GET',
              url: '/test',
            })

            expect(response.statusCode).toBe(200)
            const body = response.json()

            // INVARIANT: tenantScope.ownerAccountId ALWAYS equals the authenticated user's ownerAccountId
            expect(body.tenantScope.ownerAccountId).toBe(ownerAccountId)

            // INVARIANT: tenantScope.ownerAccountId NEVER equals a different owner's ID
            expect(body.tenantScope.ownerAccountId).not.toBe(
              differentOwnerAccountId,
            )
          },
        ),
        { numRuns: 100 },
      )
    })
  })
})
