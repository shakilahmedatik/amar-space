import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { dateTimeResponseSchema, errorResponseSchema } from '../../app'
import { authGuard } from '../../middleware/auth-guard'
import { roleGuard } from '../../middleware/role-guard'
import { AdminUserService } from '../../services/admin-user'

/**
 * Admin user management routes plugin.
 *
 * Provides:
 * - GET /api/admin/users — List all users with role filter and pagination (superadmin only)
 * - PUT /api/admin/users/:id/deactivate — Deactivate a user (superadmin only)
 *
 * Access control:
 * - Superadmin only (enforced via roleGuard(['superadmin']))
 *
 * Requirements: 4.1, 4.2, 4.3, 4.5, 4.6
 */
async function adminUserRoutes(fastify: FastifyInstance) {
  const adminUserService = new AdminUserService(fastify.db, fastify.auditLogger)

  /**
   * GET /api/admin/users
   * Lists all users with pagination and optional role filter.
   * Max 50 users per page, sorted by creation date descending.
   * Superadmin only.
   */
  fastify.get(
    '/',
    {
      preHandler: [authGuard, roleGuard(['superadmin'])],
      schema: {
        tags: ['Admin'],
        summary: 'List all users',
        description:
          'Returns a paginated list of all users with optional role filter. Max 50 per page, sorted by creation date descending.\n\n**Roles: superadmin**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(50).default(50),
          role: z.enum(['superadmin', 'owner', 'manager', 'renter']).optional(),
        }),
        response: {
          200: z.object({
            data: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                email: z.string(),
                role: z.string(),
                approvalStatus: z.string().nullable(),
                createdAt: dateTimeResponseSchema,
              }),
            ),
            total: z.number(),
            page: z.number(),
            pageSize: z.number(),
            totalPages: z.number(),
          }),
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { page, pageSize, role } = request.query as {
        page: number
        pageSize: number
        role?: string
      }

      const result = await adminUserService.listUsers({
        page,
        pageSize,
        role,
      })

      return reply.status(200).send(result)
    },
  )

  /**
   * PUT /api/admin/users/:id/deactivate
   * Deactivates a user account, invalidating all their sessions.
   * Cannot deactivate another superadmin.
   * Superadmin only.
   */
  fastify.put(
    '/:id/deactivate',
    {
      preHandler: [authGuard, roleGuard(['superadmin'])],
      schema: {
        tags: ['Admin'],
        summary: 'Deactivate a user',
        description:
          'Deactivates a user account and invalidates all their active sessions. Cannot deactivate another superadmin account.\n\n**Roles: superadmin**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid user ID format'),
        }),
        response: {
          200: z.object({
            message: z.string(),
          }),
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      await adminUserService.deactivateUser(request.user.id, id)

      return reply.status(200).send({
        message: 'User account has been deactivated',
      })
    },
  )
}

export default adminUserRoutes
