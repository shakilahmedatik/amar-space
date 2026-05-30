import { ROLE_ORDINALS } from '@repo/shared/roles'
import fc from 'fast-check'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'
import type { AuthUser } from '../../src/middleware/auth-guard'
import type { RoleGuardConfig } from '../../src/middleware/role-guard'
import { roleGuard } from '../../src/middleware/role-guard'

// --- Types ---
type Role = AuthUser['role']

const ALL_ROLES: Role[] = ['superadmin', 'owner', 'manager', 'renter']
const NON_SUPERADMIN_ROLES: Role[] = ['owner', 'manager', 'renter']

// --- Generators ---

/** Generate an arbitrary non-superadmin role */
const nonSuperadminRoleArb = fc.constantFrom<Role>(...NON_SUPERADMIN_ROLES)

/** Generate an arbitrary non-empty subset of all roles for explicit list config */
const allowedRolesArb = fc.subarray<Role>(ALL_ROLES, { minLength: 1 })

/** Generate an arbitrary role as a minRole for hierarchical config */
const minRoleArb = fc.constantFrom<Role>(...ALL_ROLES)

/** Generate a role guard config — either explicit list or hierarchical */
const roleGuardConfigArb: fc.Arbitrary<RoleGuardConfig> = fc.oneof(
  allowedRolesArb,
  minRoleArb.map((minRole) => ({ minRole })),
)

// --- Test Helpers ---

/** Create a mock AuthUser for a given role */
function userForRole(role: Role): AuthUser {
  return {
    id: `user-${role}`,
    role,
    ownerAccountId: role === 'owner' ? `user-${role}` : 'owner-account-1',
    email: `${role}@test.com`,
    approvalStatus: 'approved',
    isActive: true,
  }
}

/**
 * Creates a minimal Fastify app with a test route protected by roleGuard.
 * The user is injected via a preHandler hook that runs before the roleGuard.
 */
function createTestApp(
  config: RoleGuardConfig,
  user: AuthUser,
): FastifyInstance {
  const app = Fastify({ logger: false })

  app.addHook('preHandler', async (request: FastifyRequest) => {
    request.user = user
  })

  app.get(
    '/test-route',
    {
      preHandler: [roleGuard(config)],
    },
    async (request: FastifyRequest) => {
      return { success: true, role: request.user.role }
    },
  )

  return app
}

// --- Property Tests ---

// Feature: role-based-user-management, Property 1: Superadmin bypasses all role guards
describe('Feature: role-based-user-management, Property 1: Superadmin bypasses all role guards', () => {
  /**
   * **Validates: Requirements 1.3, 5.3**
   *
   * For any role guard configuration (whether explicit role list or hierarchical minimum),
   * a user with the `superadmin` role SHALL always be granted access.
   */
  it('superadmin is always granted access regardless of role guard configuration', () => {
    return fc.assert(
      fc.asyncProperty(roleGuardConfigArb, async (config) => {
        const superadminUser = userForRole('superadmin')
        const app = createTestApp(config, superadminUser)

        await app.ready()

        const response = await app.inject({
          method: 'GET',
          url: '/test-route',
        })

        // Property: Superadmin MUST always be granted access
        expect(response.statusCode).toBe(200)
        const body = response.json()
        expect(body.success).toBe(true)
        expect(body.role).toBe('superadmin')

        await app.close()
      }),
      { numRuns: 100 },
    )
  })
})

// Feature: role-based-user-management, Property 2: Explicit role list grants access only to listed roles
describe('Feature: role-based-user-management, Property 2: Explicit role list grants access only to listed roles', () => {
  /**
   * **Validates: Requirements 5.3**
   *
   * For any non-superadmin user role and any explicit allowed-roles list,
   * the role guard SHALL grant access if and only if the user's role is
   * contained in the allowed-roles list.
   */
  it('non-superadmin user is granted access iff their role is in the explicit allowed list', () => {
    return fc.assert(
      fc.asyncProperty(
        nonSuperadminRoleArb,
        allowedRolesArb,
        async (userRole, allowedRoles) => {
          const user = userForRole(userRole)
          const app = createTestApp(allowedRoles, user)

          await app.ready()

          const response = await app.inject({
            method: 'GET',
            url: '/test-route',
          })

          const shouldBeAllowed = allowedRoles.includes(userRole)

          if (shouldBeAllowed) {
            // Property: Access MUST be granted when role is in allowed list
            expect(response.statusCode).toBe(200)
            const body = response.json()
            expect(body.success).toBe(true)
            expect(body.role).toBe(userRole)
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
      { numRuns: 100 },
    )
  })
})

// Feature: role-based-user-management, Property 3: Hierarchical role access respects ordinal ranking
describe('Feature: role-based-user-management, Property 3: Hierarchical role access respects ordinal ranking', () => {
  /**
   * **Validates: Requirements 5.1, 5.2**
   *
   * For any non-superadmin user role and any minimum required role,
   * the role guard in hierarchical mode SHALL grant access if and only if
   * `ROLE_ORDINALS[userRole] >= ROLE_ORDINALS[minRole]`.
   */
  it('non-superadmin user is granted access iff their role ordinal >= minRole ordinal', () => {
    return fc.assert(
      fc.asyncProperty(
        nonSuperadminRoleArb,
        minRoleArb,
        async (userRole, minRole) => {
          const user = userForRole(userRole)
          const config: RoleGuardConfig = { minRole }
          const app = createTestApp(config, user)

          await app.ready()

          const response = await app.inject({
            method: 'GET',
            url: '/test-route',
          })

          const shouldBeAllowed =
            ROLE_ORDINALS[userRole] >= ROLE_ORDINALS[minRole]

          if (shouldBeAllowed) {
            // Property: Access MUST be granted when user ordinal >= minRole ordinal
            expect(response.statusCode).toBe(200)
            const body = response.json()
            expect(body.success).toBe(true)
            expect(body.role).toBe(userRole)
          } else {
            // Property: Access MUST be denied when user ordinal < minRole ordinal
            expect(response.statusCode).toBe(403)
            const body = response.json()
            expect(body.statusCode).toBe(403)
            expect(body.error).toBe('Forbidden')
            expect(body.message).toBe('Insufficient permissions')
          }

          await app.close()
        },
      ),
      { numRuns: 100 },
    )
  })
})
