import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { errorResponseSchema } from '../../app'
import { authGuard } from '../../middleware/auth-guard'
import { roleGuard } from '../../middleware/role-guard'
import { AdminUserService } from '../../services/admin-user'

/**
 * Admin dashboard routes plugin.
 *
 * Provides:
 * - GET /api/admin/dashboard — Platform statistics (superadmin only)
 *
 * Access control:
 * - Superadmin only (enforced via roleGuard(['superadmin']))
 */
async function adminDashboardRoutes(fastify: FastifyInstance) {
  const adminUserService = new AdminUserService(fastify.db, fastify.auditLogger)

  /**
   * GET /api/admin/dashboard
   * Returns platform-level statistics including user counts by role,
   * pending approvals, and active sessions.
   * Superadmin only.
   */
  fastify.get(
    '/',
    {
      preHandler: [authGuard, roleGuard(['superadmin'])],
      schema: {
        tags: ['Admin'],
        summary: 'Platform dashboard statistics',
        description:
          'Returns platform-level statistics: user counts by role, pending approvals, and active sessions.\n\n**Roles: superadmin**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        response: {
          200: z.object({
            usersByRole: z.object({
              owner: z.number(),
              manager: z.number(),
              renter: z.number(),
            }),
            pendingApprovals: z.number(),
            activeSessions: z.number(),
          }),
          401: errorResponseSchema,
          403: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const stats = await adminUserService.getDashboardStats()
        return reply.status(200).send(stats)
      } catch (error) {
        request.log.error({ err: error }, 'Failed to fetch dashboard stats')
        return reply.status(500).send({
          requestId: request.id,
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Dashboard data is temporarily unavailable',
        })
      }
    },
  )
}

export default adminDashboardRoutes
