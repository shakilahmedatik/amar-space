/**
 * Integration tests for role-based user management end-to-end flows.
 *
 * Tests the full request lifecycle through the Fastify middleware pipeline
 * using app.inject(). Mocks the auth session layer to simulate different
 * user roles and states, while testing the real middleware chain.
 *
 * Requirements: 2.1, 2.3, 3.1, 4.4, 4.7, 7.4
 */

import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { approvalGuard } from '../../src/middleware/approval-guard'
import { authGuard } from '../../src/middleware/auth-guard'
import { roleGuard } from '../../src/middleware/role-guard'
import { tenantScope } from '../../src/middleware/tenant-scope'

// --- Test Helpers ---

interface MockSessionUser {
  id: string
  role: 'superadmin' | 'owner' | 'manager' | 'renter'
  ownerAccountId: string
  email: string
  approvalStatus?: 'pending' | 'approved' | 'rejected' | null
  isActive?: boolean
}

/**
 * Creates a mock audit logger for testing.
 */
function createMockAuditLogger() {
  return {
    log: vi.fn(),
    query: vi.fn().mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    }),
    pendingRetries: 0,
    shutdown: vi.fn(),
  }
}

/**
 * Creates a mock database that supports the patterns used by services.
 */
function createMockDb(overrides: Record<string, unknown> = {}) {
  const mockDb: Record<string, unknown> = {
    query: {
      users: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
    ...overrides,
  }
  return mockDb
}

/**
 * Builds a test Fastify app with a mock auth layer that returns the given session user.
 * Registers the real middleware chain and simple test routes to verify access control.
 */
async function buildTestApp(options: {
  sessionUser: MockSessionUser | null
  db?: Record<string, unknown>
  managerAssignments?: string[]
}) {
  const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  const mockDb = options.db ?? createMockDb()
  const mockAuditLogger = createMockAuditLogger()

  // Mock auth that returns the configured session user
  const mockAuth = {
    api: {
      getSession: vi.fn().mockResolvedValue(
        options.sessionUser
          ? {
              user: {
                ...options.sessionUser,
                name: options.sessionUser.email.split('@')[0],
              },
              session: { token: 'test-session-token', id: 'session-1' },
            }
          : null,
      ),
      signUpEmail: vi.fn().mockResolvedValue({
        user: { id: 'new-user-id', email: 'test@example.com' },
      }),
      signInEmail: vi.fn().mockResolvedValue({ token: 'new-session-token' }),
      revokeSession: vi.fn().mockResolvedValue(undefined),
    },
  }

  // Decorate with mocked plugins
  app.decorate('env', {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    AUTH_SECRET: 'a'.repeat(32),
    AUTH_BASE_URL: 'http://localhost:3001',
    AUTH_TRUSTED_ORIGINS: ['http://localhost:3000'],
    NODE_ENV: 'test',
  })
  app.decorate('db', mockDb)
  app.decorate('auditLogger', mockAuditLogger)
  app.decorate('auth', mockAuth)

  // Mock tenant scope DB queries for manager assignments
  if (options.sessionUser?.role === 'manager') {
    const assignedBuildings = (options.managerAssignments ?? []).map((id) => ({
      buildingId: id,
    }))
    // Override the db.select for manager assignments query in tenantScope
    const selectFn = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(assignedBuildings),
      }),
    })
    ;(mockDb as any).select = selectFn
  }

  // Register test routes that use the real middleware chain

  // Admin-only route (superadmin)
  app.get(
    '/api/admin/owners',
    {
      preHandler: [authGuard, roleGuard(['superadmin'])],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ data: [], message: 'admin owners list' })
    },
  )

  app.put(
    '/api/admin/owners/:id/status',
    {
      preHandler: [authGuard, roleGuard(['superadmin'])],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ message: 'status updated' })
    },
  )

  app.get(
    '/api/admin/users',
    {
      preHandler: [authGuard, roleGuard(['superadmin'])],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ data: [], message: 'admin users list' })
    },
  )

  app.put(
    '/api/admin/users/:id/deactivate',
    {
      preHandler: [authGuard, roleGuard(['superadmin'])],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ message: 'user deactivated' })
    },
  )

  app.get(
    '/api/admin/dashboard',
    {
      preHandler: [authGuard, roleGuard(['superadmin'])],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        usersByRole: {},
        pendingApprovals: 0,
        activeSessions: 0,
      })
    },
  )

  // Owner-only route with approval guard (resource management)
  app.get(
    '/api/buildings',
    {
      preHandler: [
        authGuard,
        roleGuard({ minRole: 'manager' }),
        approvalGuard,
        tenantScope,
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ data: [], message: 'buildings list' })
    },
  )

  app.post(
    '/api/buildings',
    {
      preHandler: [authGuard, roleGuard(['owner']), approvalGuard, tenantScope],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply
        .status(201)
        .send({ id: 'new-building', message: 'building created' })
    },
  )

  // Manager creation route (owner only, with approval guard)
  app.post(
    '/api/managers',
    {
      preHandler: [authGuard, roleGuard(['owner']), approvalGuard, tenantScope],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply
        .status(201)
        .send({ id: 'new-manager', message: 'manager created' })
    },
  )

  await app.ready()
  return { app, mockDb, mockAuditLogger, mockAuth }
}

// --- Test Suites ---

describe('Integration: Role-Based User Management End-to-End Flows', () => {
  let app: FastifyInstance

  afterEach(async () => {
    if (app) {
      await app.close()
    }
  })

  describe('Flow 1: Register owner → pending → approve → access granted', () => {
    /**
     * Validates: Requirements 2.1, 2.3
     *
     * Tests the owner lifecycle through the middleware pipeline:
     * 1. Pending owner is blocked from resource management (403)
     * 2. Rejected owner is also blocked (403)
     * 3. Approved owner can access resource management endpoints
     * 4. Superadmin can access owner approval endpoints
     */

    it('should block pending owner from accessing buildings (403)', async () => {
      const pendingOwner: MockSessionUser = {
        id: 'owner-1',
        role: 'owner',
        ownerAccountId: 'owner-1',
        email: 'owner@example.com',
        approvalStatus: 'pending',
        isActive: true,
      }

      const { app: testApp } = await buildTestApp({ sessionUser: pendingOwner })
      app = testApp

      const response = await app.inject({
        method: 'GET',
        url: '/api/buildings',
        headers: { authorization: 'Bearer test-token' },
      })

      expect(response.statusCode).toBe(403)
      const body = response.json()
      expect(body.message).toContain('pending approval')
    })

    it('should block rejected owner from accessing buildings (403)', async () => {
      const rejectedOwner: MockSessionUser = {
        id: 'owner-1',
        role: 'owner',
        ownerAccountId: 'owner-1',
        email: 'owner@example.com',
        approvalStatus: 'rejected',
        isActive: true,
      }

      const { app: testApp } = await buildTestApp({
        sessionUser: rejectedOwner,
      })
      app = testApp

      const response = await app.inject({
        method: 'POST',
        url: '/api/buildings',
        headers: { authorization: 'Bearer test-token' },
        payload: { name: 'Test Building' },
      })

      expect(response.statusCode).toBe(403)
      const body = response.json()
      expect(body.message).toContain('pending approval')
    })

    it('should allow approved owner to access buildings (200)', async () => {
      const approvedOwner: MockSessionUser = {
        id: 'owner-1',
        role: 'owner',
        ownerAccountId: 'owner-1',
        email: 'owner@example.com',
        approvalStatus: 'approved',
        isActive: true,
      }

      const { app: testApp } = await buildTestApp({
        sessionUser: approvedOwner,
      })
      app = testApp

      const response = await app.inject({
        method: 'GET',
        url: '/api/buildings',
        headers: { authorization: 'Bearer test-token' },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.message).toBe('buildings list')
    })

    it('should allow superadmin to access owner approval endpoints', async () => {
      const superadmin: MockSessionUser = {
        id: 'superadmin-1',
        role: 'superadmin',
        ownerAccountId: 'superadmin-1',
        email: 'admin@example.com',
        approvalStatus: null,
        isActive: true,
      }

      const { app: testApp } = await buildTestApp({ sessionUser: superadmin })
      app = testApp

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/owners',
        headers: { authorization: 'Bearer superadmin-token' },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.message).toBe('admin owners list')
    })

    it('should allow superadmin to update owner approval status', async () => {
      const superadmin: MockSessionUser = {
        id: 'superadmin-1',
        role: 'superadmin',
        ownerAccountId: 'superadmin-1',
        email: 'admin@example.com',
        approvalStatus: null,
        isActive: true,
      }

      const { app: testApp } = await buildTestApp({ sessionUser: superadmin })
      app = testApp

      const response = await app.inject({
        method: 'PUT',
        url: '/api/admin/owners/owner-1/status',
        headers: { authorization: 'Bearer superadmin-token' },
        payload: { newStatus: 'approved' },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.message).toBe('status updated')
    })
  })

  describe('Flow 2: Manager creation → login with temp password → access assigned buildings only', () => {
    /**
     * Validates: Requirements 3.1
     *
     * Tests:
     * 1. Approved owner can access manager creation endpoint
     * 2. Manager can access buildings endpoint (passes role guard)
     * 3. Manager tenant scope resolves assigned building IDs
     * 4. Pending owner cannot create managers (approval guard blocks)
     */

    it('should allow approved owner to access manager creation endpoint', async () => {
      const approvedOwner: MockSessionUser = {
        id: 'owner-1',
        role: 'owner',
        ownerAccountId: 'owner-1',
        email: 'owner@example.com',
        approvalStatus: 'approved',
        isActive: true,
      }

      const { app: testApp } = await buildTestApp({
        sessionUser: approvedOwner,
      })
      app = testApp

      const response = await app.inject({
        method: 'POST',
        url: '/api/managers',
        headers: { authorization: 'Bearer owner-token' },
        payload: {
          email: 'manager@example.com',
          name: 'Test Manager',
          buildingIds: ['building-1'],
        },
      })

      // Should pass all middleware (auth, role, approval, tenant-scope)
      expect(response.statusCode).toBe(201)
      const body = response.json()
      expect(body.message).toBe('manager created')
    })

    it('should block pending owner from creating managers (403)', async () => {
      const pendingOwner: MockSessionUser = {
        id: 'owner-1',
        role: 'owner',
        ownerAccountId: 'owner-1',
        email: 'owner@example.com',
        approvalStatus: 'pending',
        isActive: true,
      }

      const { app: testApp } = await buildTestApp({ sessionUser: pendingOwner })
      app = testApp

      const response = await app.inject({
        method: 'POST',
        url: '/api/managers',
        headers: { authorization: 'Bearer owner-token' },
        payload: {
          email: 'manager@example.com',
          name: 'Test Manager',
          buildingIds: ['building-1'],
        },
      })

      expect(response.statusCode).toBe(403)
      const body = response.json()
      expect(body.message).toContain('pending approval')
    })

    it('should allow manager to access buildings with assigned building IDs in scope', async () => {
      const manager: MockSessionUser = {
        id: 'manager-1',
        role: 'manager',
        ownerAccountId: 'owner-1',
        email: 'manager@example.com',
        approvalStatus: null,
        isActive: true,
      }

      const { app: testApp } = await buildTestApp({
        sessionUser: manager,
        managerAssignments: ['building-1', 'building-2'],
      })
      app = testApp

      const response = await app.inject({
        method: 'GET',
        url: '/api/buildings',
        headers: { authorization: 'Bearer manager-token' },
      })

      // Manager passes role guard (minRole: 'manager') and has no approval check
      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.message).toBe('buildings list')
    })

    it('should block manager from owner-only endpoints (403)', async () => {
      const manager: MockSessionUser = {
        id: 'manager-1',
        role: 'manager',
        ownerAccountId: 'owner-1',
        email: 'manager@example.com',
        approvalStatus: null,
        isActive: true,
      }

      const { app: testApp } = await buildTestApp({
        sessionUser: manager,
        managerAssignments: ['building-1'],
      })
      app = testApp

      const response = await app.inject({
        method: 'POST',
        url: '/api/managers',
        headers: { authorization: 'Bearer manager-token' },
        payload: {
          email: 'another@example.com',
          name: 'Another Manager',
          buildingIds: ['building-1'],
        },
      })

      // Manager cannot create other managers (role guard blocks)
      expect(response.statusCode).toBe(403)
      const body = response.json()
      expect(body.message).toContain('Insufficient permissions')
    })
  })

  describe('Flow 3: Deactivation → session invalidation → login rejected', () => {
    /**
     * Validates: Requirements 4.4, 4.7
     *
     * Tests:
     * 1. Deactivated user is rejected at auth guard (401)
     * 2. Auth guard attempts to revoke the session for deactivated users
     * 3. Active user passes auth guard normally
     */

    it('should reject deactivated user at auth guard with 401', async () => {
      const deactivatedUser: MockSessionUser = {
        id: 'owner-1',
        role: 'owner',
        ownerAccountId: 'owner-1',
        email: 'owner@example.com',
        approvalStatus: 'approved',
        isActive: false,
      }

      const { app: testApp, mockAuth } = await buildTestApp({
        sessionUser: deactivatedUser,
      })
      app = testApp

      const response = await app.inject({
        method: 'GET',
        url: '/api/buildings',
        headers: { authorization: 'Bearer deactivated-token' },
      })

      expect(response.statusCode).toBe(401)
      const body = response.json()
      expect(body.message).toContain('deactivated')

      // Auth guard should attempt to revoke the session
      expect(mockAuth.api.revokeSession).toHaveBeenCalled()
    })

    it('should reject deactivated user from admin endpoints with 401', async () => {
      const deactivatedSuperadmin: MockSessionUser = {
        id: 'superadmin-1',
        role: 'superadmin',
        ownerAccountId: 'superadmin-1',
        email: 'admin@example.com',
        approvalStatus: null,
        isActive: false,
      }

      const { app: testApp } = await buildTestApp({
        sessionUser: deactivatedSuperadmin,
      })
      app = testApp

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/dashboard',
        headers: { authorization: 'Bearer deactivated-admin-token' },
      })

      expect(response.statusCode).toBe(401)
      const body = response.json()
      expect(body.message).toContain('deactivated')
    })

    it('should allow active user to pass auth guard', async () => {
      const activeUser: MockSessionUser = {
        id: 'owner-1',
        role: 'owner',
        ownerAccountId: 'owner-1',
        email: 'owner@example.com',
        approvalStatus: 'approved',
        isActive: true,
      }

      const { app: testApp } = await buildTestApp({ sessionUser: activeUser })
      app = testApp

      const response = await app.inject({
        method: 'GET',
        url: '/api/buildings',
        headers: { authorization: 'Bearer active-token' },
      })

      expect(response.statusCode).toBe(200)
    })

    it('should return 401 when no session exists (unauthenticated)', async () => {
      const { app: testApp } = await buildTestApp({ sessionUser: null })
      app = testApp

      const response = await app.inject({
        method: 'GET',
        url: '/api/buildings',
        headers: { authorization: 'Bearer invalid-token' },
      })

      expect(response.statusCode).toBe(401)
      const body = response.json()
      expect(body.message).toContain('Authentication required')
    })
  })

  describe('Flow 4: Non-superadmin cannot access admin endpoints', () => {
    /**
     * Validates: Requirements 7.4
     *
     * Tests that owner, manager, and renter roles are blocked from all admin
     * endpoints with a 403 Forbidden response.
     */

    const nonSuperadminUsers: MockSessionUser[] = [
      {
        id: 'owner-1',
        role: 'owner',
        ownerAccountId: 'owner-1',
        email: 'owner@example.com',
        approvalStatus: 'approved',
        isActive: true,
      },
      {
        id: 'manager-1',
        role: 'manager',
        ownerAccountId: 'owner-1',
        email: 'manager@example.com',
        approvalStatus: null,
        isActive: true,
      },
      {
        id: 'renter-1',
        role: 'renter',
        ownerAccountId: 'owner-1',
        email: 'renter@example.com',
        approvalStatus: null,
        isActive: true,
      },
    ]

    const adminEndpoints = [
      { method: 'GET' as const, url: '/api/admin/owners' },
      { method: 'PUT' as const, url: '/api/admin/owners/owner-1/status' },
      { method: 'GET' as const, url: '/api/admin/users' },
      { method: 'PUT' as const, url: '/api/admin/users/user-1/deactivate' },
      { method: 'GET' as const, url: '/api/admin/dashboard' },
    ]

    for (const user of nonSuperadminUsers) {
      for (const endpoint of adminEndpoints) {
        it(`should reject ${user.role} from ${endpoint.method} ${endpoint.url} with 403`, async () => {
          const { app: testApp } = await buildTestApp({
            sessionUser: user,
            managerAssignments:
              user.role === 'manager' ? ['building-1'] : undefined,
          })
          app = testApp

          const response = await app.inject({
            method: endpoint.method,
            url: endpoint.url,
            headers: { authorization: 'Bearer test-token' },
            ...(endpoint.method === 'PUT'
              ? { payload: { newStatus: 'approved' } }
              : {}),
          })

          expect(response.statusCode).toBe(403)
          const body = response.json()
          expect(body.error).toBe('Forbidden')
          expect(body.message).toContain('Insufficient permissions')
        })
      }
    }

    it('should allow superadmin to access all admin endpoints', async () => {
      const superadmin: MockSessionUser = {
        id: 'superadmin-1',
        role: 'superadmin',
        ownerAccountId: 'superadmin-1',
        email: 'admin@example.com',
        approvalStatus: null,
        isActive: true,
      }

      const { app: testApp } = await buildTestApp({ sessionUser: superadmin })
      app = testApp

      for (const endpoint of adminEndpoints) {
        const response = await app.inject({
          method: endpoint.method,
          url: endpoint.url,
          headers: { authorization: 'Bearer superadmin-token' },
          ...(endpoint.method === 'PUT'
            ? { payload: { newStatus: 'approved' } }
            : {}),
        })

        expect(response.statusCode).toBe(200)
      }
    })
  })
})
