import type { ApiErrorResponse } from '@repo/shared/types'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AuthUser } from './auth-guard'

type Role = AuthUser['role']

/**
 * Role guard middleware factory.
 *
 * Returns a Fastify preHandler hook that checks the authenticated user's role
 * against a list of allowed roles. If the user's role is not in the allowed
 * list, the request is rejected with a 403 Forbidden response.
 *
 * This middleware assumes `authGuard` has already run and populated `request.user`.
 *
 * Usage:
 * ```typescript
 * import { authGuard } from '../middleware/auth-guard'
 * import { roleGuard } from '../middleware/role-guard'
 *
 * app.post('/buildings', {
 *   preHandler: [authGuard, roleGuard(['owner'])]
 * }, handler)
 * ```
 *
 * Requirements: 3.2, 3.3, 3.4, 3.6, 3.9
 */
export function roleGuard(allowedRoles: Role[]) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const userRole = request.user.role

    if (!allowedRoles.includes(userRole)) {
      const response: ApiErrorResponse = {
        requestId: request.id,
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions',
      }
      reply.status(403).send(response)
      return
    }
  }
}
