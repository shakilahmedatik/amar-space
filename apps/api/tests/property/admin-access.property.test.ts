// Feature: role-based-user-management, Property 6: Non-superadmin users cannot access admin endpoints

import fc from 'fast-check'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'
import type { AuthUser } from '../../src/middleware/auth-guard'
import { roleGuard } from '../../src/middleware/role-guard'

// --- Types ---
type Role = AuthUser['role']

const NON_SUPERADMIN_ROLES: Role[] = ['owner', 'manager', 'renter']

/**
 * Admin endpoint definitions representing the three categories of admin endpoints:
 * - Owner approval (GET /, PUT /:id/status)
 * - User management (GET /, PUT /:id/deactivate)
 * - Dashboard (GET /)
 */
interface AdminEndpoint {
  method: 'GET' | 'PUT'
  url: string
  label: string
}

const ADMIN_ENDPOINTS: AdminEndpoint[] = [
  { method: 'GET', url: '/api/admin/owners', label: 'List owners' },
  {
    method: 'PUT',
    url: '/api/admin/owners/some-id/status',
    label: 'Update owner approval status',
  },
  { method: 'GET', url: '/api/admin/users', label: 'List users' },
  {
    method: 'PUT',
    url: '/api/admin/users/some-id/deactivate',
    label: 'Deactivate user',
  },
  { method: 'GET', url: '/api/admin/dashboard', label: 'Dashboard stats' },
]

// --- Generators ---

/** Generate an arbitrary non-superadmin role */
const nonSuperadminRoleArb = fc.constantFrom<Role>(...NON_SUPERADMIN_ROLES)

/** Generate an arbitrary admin endpoint */
const adminEndpointArb = fc.constantFrom<AdminEndpoint>(...ADMIN_ENDPOINTS)

// --- Test Helpers ---

/** Create a mock AuthUser for a given role */
function userForRole(role: Role): AuthUser {
  return {
    id: `user-${role}-${Math.random().toString(36).slice(2)}`,
    role,
    ownerAccountId: role === 'owner' ? `user-${role}` : 'owner-account-1',
    email: `${role}@test.com`,
    approvalStatus: 'approved',
    isActive: true,
  }
}

/**
 * Creates a Fastify app with admin routes protected by roleGuard(['superadmin']).
 * The user is injected via a preHandler hook that runs before the roleGuard.
 * This simulates the actual admin route protection pattern used in the application.
 */
function createAdminApp(user: AuthUser): FastifyInstance {
  const app = Fastify({ logger: false })

  // Inject user into request (simulates authGuard)
  app.addHook('preHandler', async (request: FastifyRequest) => {
    request.user = user
  })

  // Register admin owner routes (superadmin only)
  app.get(
    '/api/admin/owners',
    { preHandler: [roleGuard(['superadmin'])] },
    async () => ({ data: [], total: 0 }),
  )

  app.put(
    '/api/admin/owners/:id/status',
    { preHandler: [roleGuard(['superadmin'])] },
    async () => ({ message: 'Status updated' }),
  )

  // Register admin user management routes (superadmin only)
  app.get(
    '/api/admin/users',
    { preHandler: [roleGuard(['superadmin'])] },
    async () => ({ data: [], total: 0 }),
  )

  app.put(
    '/api/admin/users/:id/deactivate',
    { preHandler: [roleGuard(['superadmin'])] },
    async () => ({ message: 'User deactivated' }),
  )

  // Register admin dashboard route (superadmin only)
  app.get(
    '/api/admin/dashboard',
    { preHandler: [roleGuard(['superadmin'])] },
    async () => ({ usersByRole: {}, pendingApprovals: 0, activeSessions: 0 }),
  )

  return app
}

// --- Property Tests ---

// Feature: role-based-user-management, Property 6: Non-superadmin users cannot access admin endpoints
describe('Feature: role-based-user-management, Property 6: Non-superadmin users cannot access admin endpoints', () => {
  /**
   * **Validates: Requirements 1.5, 2.7, 7.4**
   *
   * For any user with role `owner`, `manager`, or `renter`, accessing any admin endpoint
   * (owner approval, user management, dashboard) SHALL result in a 403 Forbidden response.
   */
  it('non-superadmin users always receive 403 Forbidden when accessing any admin endpoint', () => {
    return fc.assert(
      fc.asyncProperty(
        nonSuperadminRoleArb,
        adminEndpointArb,
        async (role, endpoint) => {
          const user = userForRole(role)
          const app = createAdminApp(user)

          await app.ready()

          const response = await app.inject({
            method: endpoint.method,
            url: endpoint.url,
          })

          // Property: Non-superadmin users MUST always receive 403 Forbidden
          expect(response.statusCode).toBe(403)
          const body = response.json()
          expect(body.statusCode).toBe(403)
          expect(body.error).toBe('Forbidden')
          expect(body.message).toBe('Insufficient permissions')

          await app.close()
        },
      ),
      { numRuns: 100 },
    )
  })
})
