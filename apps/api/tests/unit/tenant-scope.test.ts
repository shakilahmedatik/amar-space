import type { Database } from '@repo/db'
import type { FastifyInstance } from 'fastify'
import Fastify from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '../../src/middleware/auth-guard'
import type { TenantScope } from '../../src/middleware/tenant-scope'
import { tenantScope } from '../../src/middleware/tenant-scope'

/**
 * Unit tests for the tenant scope middleware.
 *
 * Tests validate:
 * - Owner gets ownerAccountId set (no building/flat IDs)
 * - Manager gets ownerAccountId and assignedBuildingIds resolved
 * - Renter gets ownerAccountId and assignedFlatId resolved
 * - Manager with no assignments gets empty array
 * - Renter with no active contract gets undefined flatId
 *
 */
describe('Tenant Scope Middleware', () => {
  let app: FastifyInstance

  const ownerId = '550e8400-e29b-41d4-a716-446655440000'
  const managerId = '660e8400-e29b-41d4-a716-446655440001'
  const renterId = '770e8400-e29b-41d4-a716-446655440002'
  const buildingId1 = '880e8400-e29b-41d4-a716-446655440003'
  const buildingId2 = '990e8400-e29b-41d4-a716-446655440004'
  const flatId = 'aa0e8400-e29b-41d4-a716-446655440005'
  const renterRecordId = 'bb0e8400-e29b-41d4-a716-446655440006'

  /**
   * Creates a mock db that returns results sequentially for each .where() call.
   * Each entry in querySequence is returned for the corresponding .where() invocation.
   */
  function createSequentialMockDb(querySequence: unknown[][]) {
    let callIndex = 0

    /**
     * Returns the next value from the query sequence.
     */
    function nextResult(): unknown[] {
      const result = querySequence[callIndex] || []
      callIndex++
      return result
    }

    // Creates a thenable query result that supports .limit()
    function createQueryResult(): {
      limit: ReturnType<typeof vi.fn>
      then: <T>(onfulfilled: (value: unknown[]) => T) => Promise<T>
    } {
      const result = nextResult()
      return {
        // .limit(n) — returns another query result (same array for simplicity)
        limit: vi.fn().mockReturnValue(result),
        // biome-ignore lint/suspicious/noThenProperty: intentionally thenable for query result mock
        then: <T>(onfulfilled: (value: unknown[]) => T) =>
          Promise.resolve(onfulfilled(result)) as Promise<T>,
      }
    }

    // Mock for .where(condition)
    const mockWhere = vi.fn().mockImplementation(createQueryResult)

    // Mock for .from(table)
    const mockFrom = vi.fn().mockImplementation(() => ({
      where: mockWhere,
    }))

    // Mock for .select(fields)
    const mockSelect = vi.fn().mockImplementation(() => ({
      from: mockFrom,
    }))

    return { select: mockSelect }
  }

  function setupApp(
    userOverride: {
      id: string
      role: 'superadmin' | 'owner' | 'manager' | 'renter'
      ownerAccountId: string
      email: string
    },
    querySequence: unknown[][] = [],
  ) {
    const mockDb = createSequentialMockDb(querySequence)

    app.decorateRequest('user', null as unknown as AuthUser)
    app.decorateRequest('tenantScope', null as unknown as TenantScope)
    app.decorate('db', mockDb as unknown as Database)

    // Pre-handler that simulates authGuard by setting request.user
    const fakeAuthGuard = async (request: { user: typeof userOverride }) => {
      request.user = userOverride
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

  beforeEach(() => {
    app = Fastify({ logger: false })
  })

  afterEach(async () => {
    await app.close()
    vi.restoreAllMocks()
  })

  describe('superadmin role', () => {
    it('should bypass tenant scoping and set ownerAccountId to __all__', async () => {
      // Superadmin should not trigger any DB queries
      setupApp(
        {
          id: '110e8400-e29b-41d4-a716-446655440099',
          role: 'superadmin',
          ownerAccountId: ownerId,
          email: 'superadmin@example.com',
        },
        [],
      )

      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.tenantScope).toEqual({
        ownerAccountId: '__all__',
      })
      expect(body.tenantScope.assignedBuildingIds).toBeUndefined()
      expect(body.tenantScope.assignedFlatId).toBeUndefined()
    })
  })

  describe('owner role', () => {
    it('should set ownerAccountId and no building/flat IDs for owner', async () => {
      setupApp({
        id: ownerId,
        role: 'owner',
        ownerAccountId: ownerId,
        email: 'owner@example.com',
      })

      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.tenantScope).toEqual({
        ownerAccountId: ownerId,
      })
      // No assignedBuildingIds or assignedFlatId for owners
      expect(body.tenantScope.assignedBuildingIds).toBeUndefined()
      expect(body.tenantScope.assignedFlatId).toBeUndefined()
    })
  })

  describe('manager role', () => {
    it('should set ownerAccountId and resolve assignedBuildingIds', async () => {
      // Manager makes 1 query: manager_assignments
      setupApp(
        {
          id: managerId,
          role: 'manager',
          ownerAccountId: ownerId,
          email: 'manager@example.com',
        },
        [
          // Query 1: manager_assignments -> returns building IDs
          [{ buildingId: buildingId1 }, { buildingId: buildingId2 }],
        ],
      )

      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.tenantScope.ownerAccountId).toBe(ownerId)
      expect(body.tenantScope.assignedBuildingIds).toEqual([
        buildingId1,
        buildingId2,
      ])
      expect(body.tenantScope.assignedFlatId).toBeUndefined()
    })

    it('should return empty array when manager has no assignments', async () => {
      setupApp(
        {
          id: managerId,
          role: 'manager',
          ownerAccountId: ownerId,
          email: 'manager@example.com',
        },
        [
          // Query 1: manager_assignments -> empty
          [],
        ],
      )

      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.tenantScope.ownerAccountId).toBe(ownerId)
      expect(body.tenantScope.assignedBuildingIds).toEqual([])
      expect(body.tenantScope.assignedFlatId).toBeUndefined()
    })
  })

  describe('renter role', () => {
    it('should set ownerAccountId and resolve assignedFlatId from active contract', async () => {
      // Renter makes 2 queries:
      // 1. renters table -> find renter record by userId
      // 2. rental_contracts table -> find active contract
      setupApp(
        {
          id: renterId,
          role: 'renter',
          ownerAccountId: ownerId,
          email: 'renter@example.com',
        },
        [
          // Query 1: renters -> renter record found
          [{ id: renterRecordId }],
          // Query 2: rental_contracts -> active contract with flatId
          [{ flatId }],
        ],
      )

      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.tenantScope.ownerAccountId).toBe(ownerId)
      expect(body.tenantScope.assignedFlatId).toBe(flatId)
      expect(body.tenantScope.assignedBuildingIds).toBeUndefined()
    })

    it('should set assignedFlatId to undefined when renter has no active contract', async () => {
      setupApp(
        {
          id: renterId,
          role: 'renter',
          ownerAccountId: ownerId,
          email: 'renter@example.com',
        },
        [
          // Query 1: renters -> renter record found
          [{ id: renterRecordId }],
          // Query 2: rental_contracts -> no active contract
          [],
        ],
      )

      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.tenantScope.ownerAccountId).toBe(ownerId)
      expect(body.tenantScope.assignedFlatId).toBeUndefined()
    })

    it('should set assignedFlatId to undefined when renter record does not exist', async () => {
      setupApp(
        {
          id: renterId,
          role: 'renter',
          ownerAccountId: ownerId,
          email: 'renter@example.com',
        },
        [
          // Query 1: renters -> no renter record found
          [],
        ],
      )

      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.tenantScope.ownerAccountId).toBe(ownerId)
      expect(body.tenantScope.assignedFlatId).toBeUndefined()
    })
  })
})
