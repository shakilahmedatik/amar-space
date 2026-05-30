import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { errorResponseSchema } from '../app'
import { authGuard } from '../middleware/auth-guard'
import { roleGuard } from '../middleware/role-guard'
import { assignRole, type Role } from '../services/role-assignment'

/**
 * Role assignment routes plugin.
 *
 * Provides:
 * - PUT /api/users/:id/role — Assign or change a user's role (Owner only)
 *
 * Requirements: 3.5, 3.7, 3.8
 */
async function roleRoutes(fastify: FastifyInstance) {
  /**
   * PUT /api/users/:id/role
   *
   * Assigns or changes a user's role.
   * Only Owners can perform this action.
   *
   * Request body:
   * - role: 'owner' | 'manager' | 'renter'
   * - buildingIds?: string[] (required for manager role)
   *
   * Returns the updated user with new role.
   */
  fastify.put(
    '/:id/role',
    {
      preHandler: [authGuard, roleGuard(['owner'])],
      schema: {
        tags: ['Users'],
        summary: 'Assign user role',
        description:
          "Assigns or changes a user's role. When assigning the manager role, buildingIds must be provided to specify which buildings the manager can access.\n\n**Roles: owner**",
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid user ID format'),
        }),
        body: z.object({
          role: z.enum(['owner', 'manager', 'renter']),
          buildingIds: z
            .array(z.string().uuid('Invalid building ID format'))
            .optional(),
        }),
        response: {
          200: z.object({
            id: z.string(),
            email: z.string(),
            role: z.enum(['owner', 'manager', 'renter']),
            ownerAccountId: z.string(),
            buildingIds: z.array(z.string()).nullable(),
          }),
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { role, buildingIds } = request.body as {
        role: 'owner' | 'manager' | 'renter'
        buildingIds?: string[]
      }

      const result = await assignRole(
        fastify.db,
        fastify.auditLogger,
        {
          userId: request.user.id,
          role: request.user.role as Role,
          ownerAccountId: request.user.ownerAccountId,
        },
        {
          userId: id,
          role,
          buildingIds,
        },
      )

      return reply.status(200).send(result)
    },
  )
}

export default roleRoutes
