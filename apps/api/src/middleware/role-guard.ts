import { ROLE_ORDINALS } from '@repo/shared/roles'
import type { ApiErrorResponse } from '@repo/shared/types'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AuthUser } from './auth-guard'

type Role = AuthUser['role']

/**
 * Role guard configuration.
 *
 * Supports two modes:
 * 1. **Explicit list** — an array of allowed roles (existing behavior).
 *    Access is granted only if the user's role is in the list.
 * 2. **Hierarchical** — an object with `minRole`.
 *    Access is granted if the user's role ordinal is >= the minRole ordinal.
 *
 * In both modes, users with the `superadmin` role always pass.
 */
export type RoleGuardConfig = Role[] | { minRole: Role }

/**
 * Role guard middleware factory.
 *
 * Returns a Fastify preHandler hook that checks the authenticated user's role
 * against the provided configuration. Superadmin users always pass regardless
 * of the configuration.
 *
 * This middleware assumes `authGuard` has already run and populated `request.user`.
 *
 * Usage:
 * ```typescript
 * import { authGuard } from '../middleware/auth-guard'
 * import { roleGuard } from '../middleware/role-guard'
 *
 * // Explicit list mode (existing behavior):
 * app.post('/buildings', {
 *   preHandler: [authGuard, roleGuard(['owner'])]
 * }, handler)
 *
 * // Hierarchical mode:
 * app.get('/reports', {
 *   preHandler: [authGuard, roleGuard({ minRole: 'manager' })]
 * }, handler)
 * ```
 */
export function roleGuard(config: RoleGuardConfig) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const userRole = request.user.role

    // Superadmin always passes regardless of configuration
    if (userRole === 'superadmin') {
      return
    }

    let hasAccess: boolean

    if (Array.isArray(config)) {
      // Explicit list mode: check if user role is in the allowed list
      hasAccess = config.includes(userRole)
    } else {
      // Hierarchical mode: check if user role ordinal >= minRole ordinal
      hasAccess = ROLE_ORDINALS[userRole] >= ROLE_ORDINALS[config.minRole]
    }

    if (!hasAccess) {
      const response: ApiErrorResponse = {
        requestId: request.id,
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions',
      }
      await reply.status(403).send(response)
      return
    }
  }
}
