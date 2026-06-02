import type { ApiErrorResponse } from '@repo/shared/types'
import type { FastifyReply, FastifyRequest } from 'fastify'

/**
 * Approval guard preHandler middleware.
 *
 * Blocks owners with `approvalStatus` of `pending` or `rejected` from
 * resource-management endpoints. Superadmin bypasses this check.
 *
 * Must run AFTER authGuard (requires request.user to be set).
 *
 * Usage:
 * ```typescript
 * import { authGuard } from '../middleware/auth-guard'
 * import { roleGuard } from '../middleware/role-guard'
 * import { approvalGuard } from '../middleware/approval-guard'
 *
 * app.post('/buildings', {
 *   preHandler: [authGuard, roleGuard(['owner']), approvalGuard, tenantScope]
 * }, handler)
 * ```
 */
export async function approvalGuard(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply | undefined> {
  const { user } = request

  // Superadmin always bypasses the approval check
  if (user.role === 'superadmin') {
    return
  }

  // Only owners are subject to approval status checks
  if (user.role === 'owner') {
    const status = user.approvalStatus
    if (status === 'pending' || status === 'rejected') {
      const response: ApiErrorResponse = {
        requestId: request.id,
        statusCode: 403,
        error: 'Forbidden',
        message: 'Your account is pending approval',
      }
      return reply.status(403).send(response)
    }
  }
}
