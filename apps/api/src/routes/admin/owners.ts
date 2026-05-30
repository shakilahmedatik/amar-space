import { updateApprovalStatusSchema } from '@repo/shared/validation'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { dateTimeResponseSchema, errorResponseSchema } from '../../app'
import { authGuard } from '../../middleware/auth-guard'
import { roleGuard } from '../../middleware/role-guard'
import { OwnerApprovalService } from '../../services/owner-approval'

/**
 * Admin owner routes plugin.
 *
 * Provides:
 * - GET /api/admin/owners — List owners with pagination and status filter (superadmin only)
 * - PUT /api/admin/owners/:id/status — Update owner approval status (superadmin only)
 *
 * Access control:
 * - Superadmin only (enforced via roleGuard(['superadmin']))
 *
 * Requirements: 2.5, 2.6, 2.7
 */
async function adminOwnerRoutes(fastify: FastifyInstance) {
  const ownerApprovalService = new OwnerApprovalService(
    fastify.db,
    fastify.auditLogger,
  )

  /**
   * GET /api/admin/owners
   * Lists owner accounts with pagination and optional approval status filter.
   * Superadmin only.
   */
  fastify.get(
    '/',
    {
      preHandler: [authGuard, roleGuard(['superadmin'])],
      schema: {
        tags: ['Admin'],
        summary: 'List owners',
        description:
          'Returns a paginated list of owner accounts with optional approval status filter.\n\n**Roles: superadmin**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(20),
          status: z.enum(['pending', 'approved', 'rejected']).optional(),
        }),
        response: {
          200: z.object({
            data: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                email: z.string(),
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
      const { page, pageSize, status } = request.query as {
        page: number
        pageSize: number
        status?: 'pending' | 'approved' | 'rejected'
      }

      const result = await ownerApprovalService.listOwners({
        page,
        pageSize,
        status,
      })

      return reply.status(200).send(result)
    },
  )

  /**
   * PUT /api/admin/owners/:id/status
   * Updates the approval status of an owner account.
   * Superadmin only.
   */
  fastify.put(
    '/:id/status',
    {
      preHandler: [authGuard, roleGuard(['superadmin'])],
      schema: {
        tags: ['Admin'],
        summary: 'Update owner approval status',
        description:
          'Updates the approval status of an owner account. Valid transitions: pending→approved, pending→rejected, rejected→approved, approved→rejected.\n\n**Roles: superadmin**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid owner ID format'),
        }),
        body: updateApprovalStatusSchema,
        response: {
          200: z.object({
            message: z.string(),
          }),
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { newStatus } = request.body as {
        newStatus: 'pending' | 'approved' | 'rejected'
      }

      await ownerApprovalService.updateApprovalStatus(
        request.user.id,
        id,
        newStatus,
      )

      return reply.status(200).send({
        message: `Owner approval status updated to ${newStatus}`,
      })
    },
  )
}

export default adminOwnerRoutes
