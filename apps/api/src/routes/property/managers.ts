import type { RequestContext, UserRole } from '@repo/shared/types'
import { createManagerSchema } from '@repo/shared/validation'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { approvalGuard } from '../../middleware/approval-guard'
import { authGuard } from '../../middleware/auth-guard'
import { roleGuard } from '../../middleware/role-guard'
import { tenantScope } from '../../middleware/tenant-scope'
import { ManagerService } from '../../services/manager'
import {
  dateTimeResponseSchema,
  errorResponseSchema,
} from '../../utils/schemas'

/**
 * Manager routes plugin.
 *
 * Provides:
 * - POST /api/managers — Create a new manager (owner only)
 * - GET /api/managers — List managers for owner's account (owner only)
 * - PUT /api/managers/:id/assignments — Update building assignments (owner only)
 *
 * Access control:
 * - Owner only, with approval guard ensuring the owner account is approved
 * - Middleware order: authGuard → roleGuard(['owner']) → approvalGuard → tenantScope
 *
 * Requirements: 3.1, 3.6, 6.5, 6.6
 */
async function managerRoutes(fastify: FastifyInstance) {
  const managerService = new ManagerService(fastify.db, fastify.auditLogger)

  /**
   * Helper to build RequestContext from the Fastify request.
   */
  function buildRequestContext(request: {
    user: {
      id: string
      role: UserRole
      ownerAccountId: string
    }
    tenantScope: { ownerAccountId: string; assignedBuildingIds?: string[] }
    ip: string
    headers: Record<string, string | string[] | undefined>
  }): RequestContext {
    return {
      userId: request.user.id,
      role: request.user.role,
      ownerAccountId: request.tenantScope.ownerAccountId,
      assignedBuildingIds: request.tenantScope.assignedBuildingIds,
      ipAddress: request.ip,
      userAgent: (request.headers['user-agent'] as string) || '',
    }
  }

  /**
   * POST /api/managers
   * Creates a new manager user assigned to the owner's buildings.
   */
  fastify.post(
    '/',
    {
      preHandler: [authGuard, roleGuard(['owner']), approvalGuard, tenantScope],
      schema: {
        tags: ['Managers'],
        summary: 'Create a manager',
        description:
          'Creates a new manager user with building assignments.\n\n**Roles: owner**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        body: createManagerSchema,
        response: {
          201: z.object({
            id: z.string(),
            email: z.string(),
            name: z.string(),
            role: z.literal('manager'),
            buildingIds: z.array(z.string()),
            temporaryPassword: z.string(),
          }),
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const ctx = buildRequestContext(request as never)
      const input = request.body as {
        email: string
        name: string
        buildingIds: string[]
      }

      const result = await managerService.createManager(ctx, input)

      return reply.status(201).send(result)
    },
  )

  /**
   * GET /api/managers
   * Lists managers for the owner's account with pagination.
   */
  fastify.get(
    '/',
    {
      preHandler: [authGuard, roleGuard(['owner']), approvalGuard, tenantScope],
      schema: {
        tags: ['Managers'],
        summary: 'List managers',
        description:
          "Returns a paginated list of managers within the owner's account.\n\n**Roles: owner**",
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(20),
        }),
        response: {
          200: z.object({
            data: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                email: z.string(),
                buildingIds: z.array(z.string()),
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
      const { page, pageSize } = request.query as {
        page: number
        pageSize: number
      }
      const ctx = buildRequestContext(request as never)

      const result = await managerService.listManagers(ctx, { page, pageSize })

      return reply.status(200).send(result)
    },
  )

  /**
   * PUT /api/managers/:id/assignments
   * Updates a manager's building assignments.
   */
  fastify.put(
    '/:id/assignments',
    {
      preHandler: [authGuard, roleGuard(['owner']), approvalGuard, tenantScope],
      schema: {
        tags: ['Managers'],
        summary: 'Update manager building assignments',
        description:
          "Replaces a manager's building assignments with the provided list.\n\n**Roles: owner**",
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid manager ID format'),
        }),
        body: z.object({
          buildingIds: z.array(z.string().uuid()).min(1).max(20),
        }),
        response: {
          204: z.null().describe('Assignments updated successfully'),
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { buildingIds } = request.body as { buildingIds: string[] }
      const ctx = buildRequestContext(request as never)

      await managerService.updateAssignments(ctx, id, buildingIds)

      return reply.status(204).send(null)
    },
  )
}

export default managerRoutes
