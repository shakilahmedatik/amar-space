// Feature: role-based-user-management, Property 4: Unapproved owners are blocked from resource management

import fc from 'fast-check'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'
import { approvalGuard } from '../../src/middleware/approval-guard'
import type { AuthUser } from '../../src/middleware/auth-guard'

/**
 * Property 4: Unapproved owners are blocked from resource management
 *
 * For any owner with approval status `pending` or `rejected`, and for any
 * resource management endpoint, the approval guard SHALL deny access with
 * a 403 response.
 *
 * **Validates: Requirements 2.2, 5.4**
 */

// --- Types ---
type ApprovalStatus = 'pending' | 'approved' | 'rejected'
type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

// --- Generators ---

/** Generate an unapproved status (pending or rejected) */
const unapprovedStatusArb = fc.constantFrom<ApprovalStatus>(
  'pending',
  'rejected',
)

/** Generate any valid approval status */
const approvalStatusArb = fc.constantFrom<ApprovalStatus>(
  'pending',
  'approved',
  'rejected',
)

/** Generate a non-owner, non-superadmin role (manager or renter) */
const nonOwnerRoleArb = fc.constantFrom<'manager' | 'renter'>(
  'manager',
  'renter',
)

/** Generate resource management endpoint paths that the approval guard protects */
const resourceEndpointArb = fc.constantFrom(
  '/api/buildings',
  '/api/buildings/123',
  '/api/flats',
  '/api/flats/456',
  '/api/renters',
  '/api/renters/789',
  '/api/payments',
  '/api/payments/101',
  '/api/bills',
  '/api/bills/202',
  '/api/deposits',
  '/api/deposits/303',
  '/api/maintenance',
  '/api/maintenance/404',
  '/api/notices',
  '/api/notices/505',
  '/api/issues',
  '/api/issues/606',
)

/** Generate HTTP methods used for resource management */
const httpMethodArb = fc.constantFrom<HTTPMethod>(
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
)

// --- Test Helpers ---

/**
 * Creates a minimal Fastify app with a test route protected by approvalGuard.
 * The authGuard is simulated by injecting request.user via a preHandler hook.
 */
function createTestApp(
  user: AuthUser,
  path: string,
  method: HTTPMethod,
): FastifyInstance {
  const app = Fastify({ logger: false })

  // Simulate authGuard by injecting user into request
  app.addHook('preHandler', async (request: FastifyRequest) => {
    request.user = user
  })

  const handler = async () => ({ success: true })

  // Register route with the approval guard
  const routeMethod = method.toLowerCase() as
    | 'get'
    | 'post'
    | 'put'
    | 'delete'
    | 'patch'
  app[routeMethod](path, { preHandler: [approvalGuard] }, handler)

  return app
}

/** Create an AuthUser object for an owner with a given approval status */
function ownerWithStatus(status: ApprovalStatus): AuthUser {
  return {
    id: 'owner-123',
    role: 'owner',
    ownerAccountId: 'owner-123',
    email: 'owner@test.com',
    approvalStatus: status,
  }
}

/** Create an AuthUser object for a superadmin */
function superadminUser(): AuthUser {
  return {
    id: 'superadmin-1',
    role: 'superadmin',
    ownerAccountId: 'superadmin-1',
    email: 'admin@test.com',
    approvalStatus: undefined,
  }
}

/** Create an AuthUser object for a non-owner role */
function nonOwnerUser(role: 'manager' | 'renter'): AuthUser {
  return {
    id: `${role}-1`,
    role,
    ownerAccountId: 'owner-123',
    email: `${role}@test.com`,
    approvalStatus: undefined,
  }
}

// --- Property Tests ---

describe('Feature: role-based-user-management, Property 4: Unapproved owners are blocked from resource management', () => {
  it('for any owner with pending or rejected status and any resource endpoint, access is denied with 403', () => {
    return fc.assert(
      fc.asyncProperty(
        unapprovedStatusArb,
        resourceEndpointArb,
        httpMethodArb,
        async (status, endpoint, method) => {
          const user = ownerWithStatus(status)
          const app = createTestApp(user, endpoint, method)
          await app.ready()

          const response = await app.inject({
            method,
            url: endpoint,
          })

          // Property: Unapproved owners MUST be denied access with 403
          expect(response.statusCode).toBe(403)

          const body = response.json()
          expect(body.statusCode).toBe(403)
          expect(body.error).toBe('Forbidden')
          expect(body.message).toBe('Your account is pending approval')

          await app.close()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('for any owner with approved status and any resource endpoint, access is granted', () => {
    return fc.assert(
      fc.asyncProperty(
        resourceEndpointArb,
        httpMethodArb,
        async (endpoint, method) => {
          const user = ownerWithStatus('approved')
          const app = createTestApp(user, endpoint, method)
          await app.ready()

          const response = await app.inject({
            method,
            url: endpoint,
          })

          // Property: Approved owners MUST be granted access
          expect(response.statusCode).toBe(200)
          const body = response.json()
          expect(body.success).toBe(true)

          await app.close()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('superadmin always bypasses the approval guard regardless of any configuration', () => {
    return fc.assert(
      fc.asyncProperty(
        resourceEndpointArb,
        httpMethodArb,
        async (endpoint, method) => {
          const user = superadminUser()
          const app = createTestApp(user, endpoint, method)
          await app.ready()

          const response = await app.inject({
            method,
            url: endpoint,
          })

          // Property: Superadmin MUST always bypass the approval guard
          expect(response.statusCode).toBe(200)
          const body = response.json()
          expect(body.success).toBe(true)

          await app.close()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('non-owner roles (manager, renter) are never subject to approval status checks', () => {
    return fc.assert(
      fc.asyncProperty(
        nonOwnerRoleArb,
        approvalStatusArb,
        resourceEndpointArb,
        httpMethodArb,
        async (role, _status, endpoint, method) => {
          // Non-owner roles should pass through regardless of any approvalStatus value
          const user = nonOwnerUser(role)
          const app = createTestApp(user, endpoint, method)
          await app.ready()

          const response = await app.inject({
            method,
            url: endpoint,
          })

          // Property: Non-owner roles MUST NOT be subject to approval status checks
          expect(response.statusCode).toBe(200)
          const body = response.json()
          expect(body.success).toBe(true)

          await app.close()
        },
      ),
      { numRuns: 100 },
    )
  })
})
