import fc from 'fast-check'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'
import type { AuthUser } from '../../src/middleware/auth-guard'
import { roleGuard } from '../../src/middleware/role-guard'

/**
 * Feature: amarspace-full-implementation
 * Property 4: Role-based access control enforcement
 *
 * For any user with a given role and any resource/action combination, the system
 * SHALL grant access if and only if the role's permission set includes that
 * resource/action. Specifically: Owner has full access, Manager has access only
 * to assigned buildings' operational features, and Renter has access only to
 * their own flat's data.
 *
 */

// --- Types ---
type Role = AuthUser['role']

// --- Generators ---

/** Generate an arbitrary role */
const roleArb = fc.constantFrom<Role>('owner', 'manager', 'renter')

/** Generate an arbitrary non-empty subset of roles (route permission configuration) */
const allowedRolesArb = fc.subarray<Role>(['owner', 'manager', 'renter'], {
  minLength: 1,
})

/** Generate a full user context for a given role */
const userForRole = (role: Role): AuthUser => ({
  id: `user-${role}`,
  role,
  ownerAccountId: role === 'owner' ? 'user-owner' : 'owner-account-1',
  email: `${role}@test.com`,
})

// --- Test Helpers ---

/**
 * Creates a minimal Fastify app with a test route protected by roleGuard.
 * The authGuard is simulated by injecting request.user via a preHandler hook.
 */
function createTestApp(allowedRoles: Role[]): FastifyInstance {
  const app = Fastify({ logger: false })

  // Register a test route with the roleGuard middleware
  app.get(
    '/test-route',
    {
      preHandler: [roleGuard(allowedRoles)],
    },
    async (request: FastifyRequest) => {
      return { success: true, role: request.user.role }
    },
  )

  return app
}

// --- Property Tests ---

describe('Feature: amarspace-full-implementation, Property 4: Role-based access control enforcement', () => {
  describe('roleGuard grants access if and only if the user role is in the allowed roles list', () => {
    it('for any role and any allowed roles configuration, access is granted iff role is in allowed list', () => {
      return fc.assert(
        fc.asyncProperty(
          roleArb,
          allowedRolesArb,
          async (role, allowedRoles) => {
            const app = createTestApp(allowedRoles)

            // Simulate authGuard by decorating request.user before roleGuard runs
            app.addHook('preHandler', async (request: FastifyRequest) => {
              request.user = userForRole(role)
            })

            await app.ready()

            const response = await app.inject({
              method: 'GET',
              url: '/test-route',
            })

            const shouldBeAllowed = allowedRoles.includes(role)

            if (shouldBeAllowed) {
              // Property: Access MUST be granted when role is in allowed list
              expect(response.statusCode).toBe(200)
              const body = response.json()
              expect(body.success).toBe(true)
              expect(body.role).toBe(role)
            } else {
              // Property: Access MUST be denied when role is NOT in allowed list
              expect(response.statusCode).toBe(403)
              const body = response.json()
              expect(body.statusCode).toBe(403)
              expect(body.error).toBe('Forbidden')
              expect(body.message).toBe('Insufficient permissions')
            }

            await app.close()
          },
        ),
        { numRuns: 200 },
      )
    })
  })

  describe('Owner role: granted access when owner is in allowed roles', () => {
    it('owner is always granted access to routes that include owner in allowed roles', () => {
      return fc.assert(
        fc.asyncProperty(allowedRolesArb, async (allowedRoles) => {
          // Only test configurations where 'owner' is in allowed roles
          fc.pre(allowedRoles.includes('owner'))

          const app = createTestApp(allowedRoles)
          app.addHook('preHandler', async (request: FastifyRequest) => {
            request.user = userForRole('owner')
          })
          await app.ready()

          const response = await app.inject({
            method: 'GET',
            url: '/test-route',
          })

          // Property: Owner MUST always be granted access when 'owner' is in allowed roles
          expect(response.statusCode).toBe(200)
          const body = response.json()
          expect(body.success).toBe(true)
          expect(body.role).toBe('owner')

          await app.close()
        }),
        { numRuns: 100 },
      )
    })
  })

  describe('Manager role: granted access only when manager is in allowed roles', () => {
    it('manager is granted access only when manager is in allowed roles', () => {
      return fc.assert(
        fc.asyncProperty(allowedRolesArb, async (allowedRoles) => {
          const app = createTestApp(allowedRoles)
          app.addHook('preHandler', async (request: FastifyRequest) => {
            request.user = userForRole('manager')
          })
          await app.ready()

          const response = await app.inject({
            method: 'GET',
            url: '/test-route',
          })

          if (allowedRoles.includes('manager')) {
            // Property: Manager MUST be granted access when 'manager' is in allowed roles
            expect(response.statusCode).toBe(200)
            const body = response.json()
            expect(body.success).toBe(true)
            expect(body.role).toBe('manager')
          } else {
            // Property: Manager MUST be denied access when 'manager' is NOT in allowed roles
            expect(response.statusCode).toBe(403)
          }

          await app.close()
        }),
        { numRuns: 100 },
      )
    })
  })

  describe('Renter role: granted access only when renter is in allowed roles', () => {
    it('renter is granted access only when renter is in allowed roles', () => {
      return fc.assert(
        fc.asyncProperty(allowedRolesArb, async (allowedRoles) => {
          const app = createTestApp(allowedRoles)
          app.addHook('preHandler', async (request: FastifyRequest) => {
            request.user = userForRole('renter')
          })
          await app.ready()

          const response = await app.inject({
            method: 'GET',
            url: '/test-route',
          })

          if (allowedRoles.includes('renter')) {
            // Property: Renter MUST be granted access when 'renter' is in allowed roles
            expect(response.statusCode).toBe(200)
            const body = response.json()
            expect(body.success).toBe(true)
            expect(body.role).toBe('renter')
          } else {
            // Property: Renter MUST be denied access when 'renter' is NOT in allowed roles
            expect(response.statusCode).toBe(403)
          }

          await app.close()
        }),
        { numRuns: 100 },
      )
    })
  })

  describe('Access denied response structure', () => {
    it('when access is denied, the response is always 403 with correct error structure', () => {
      return fc.assert(
        fc.asyncProperty(
          roleArb,
          allowedRolesArb,
          async (role, allowedRoles) => {
            // Only test cases where access should be denied
            fc.pre(!allowedRoles.includes(role))

            const app = createTestApp(allowedRoles)
            app.addHook('preHandler', async (request: FastifyRequest) => {
              request.user = userForRole(role)
            })
            await app.ready()

            const response = await app.inject({
              method: 'GET',
              url: '/test-route',
            })

            // Property: Denied access MUST always return 403
            expect(response.statusCode).toBe(403)

            const body = response.json()

            // Property: Response MUST have the correct error structure
            expect(body).toHaveProperty('requestId')
            expect(body).toHaveProperty('statusCode', 403)
            expect(body).toHaveProperty('error', 'Forbidden')
            expect(body).toHaveProperty('message', 'Insufficient permissions')

            // Property: Response MUST NOT contain any resource data
            expect(body).not.toHaveProperty('success')
            expect(body).not.toHaveProperty('data')

            await app.close()
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe('Role changes take immediate effect', () => {
    it('if a user role changes, the next request reflects the new permissions', () => {
      return fc.assert(
        fc.asyncProperty(
          roleArb,
          roleArb,
          allowedRolesArb,
          async (originalRole, newRole, allowedRoles) => {
            // Ensure the roles are different to test a real change
            fc.pre(originalRole !== newRole)

            const app = createTestApp(allowedRoles)

            // Mutable role reference to simulate role change between requests
            let currentRole: Role = originalRole

            app.addHook('preHandler', async (request: FastifyRequest) => {
              request.user = userForRole(currentRole)
            })
            await app.ready()

            // First request with original role
            const firstResponse = await app.inject({
              method: 'GET',
              url: '/test-route',
            })

            const firstAllowed = allowedRoles.includes(originalRole)
            if (firstAllowed) {
              expect(firstResponse.statusCode).toBe(200)
            } else {
              expect(firstResponse.statusCode).toBe(403)
            }

            // Simulate role change
            currentRole = newRole

            // Second request with new role — should immediately reflect new permissions
            const secondResponse = await app.inject({
              method: 'GET',
              url: '/test-route',
            })

            const secondAllowed = allowedRoles.includes(newRole)
            if (secondAllowed) {
              // Property: After role change, access MUST be granted if new role is allowed
              expect(secondResponse.statusCode).toBe(200)
              const body = secondResponse.json()
              expect(body.role).toBe(newRole)
            } else {
              // Property: After role change, access MUST be denied if new role is not allowed
              expect(secondResponse.statusCode).toBe(403)
              const body = secondResponse.json()
              expect(body.statusCode).toBe(403)
              expect(body.error).toBe('Forbidden')
            }

            await app.close()
          },
        ),
        { numRuns: 100 },
      )
    })
  })
})
