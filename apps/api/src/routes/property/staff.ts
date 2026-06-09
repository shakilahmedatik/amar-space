import type { RequestContext, UserRole } from '@repo/shared/types'
import {
  createStaffSchema,
  updateStaffPermissionsSchema,
  updateStaffSchema,
} from '@repo/shared/validation'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { approvalGuard } from '../../middleware/approval-guard'
import { authGuard } from '../../middleware/auth-guard'
import { roleGuard } from '../../middleware/role-guard'
import { tenantScope } from '../../middleware/tenant-scope'
import { StaffService } from '../../services/staff'
import {
  dateTimeResponseSchema,
  errorResponseSchema,
} from '../../utils/schemas'

const staffRoleEnum = z.enum(['manager', 'security_guard', 'care_taker'])

async function staffRoutes(fastify: FastifyInstance) {
  const staffService = new StaffService(fastify.db, fastify.auditLogger)

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

  fastify.get(
    '/roles',
    {
      preHandler: [authGuard, roleGuard(['owner']), approvalGuard, tenantScope],
      schema: {
        tags: ['Staff'],
        summary: 'List available staff roles',
        description:
          'Returns all available staff roles with their default permissions.\n\n**Roles: owner**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        response: {
          200: z.array(
            z.object({
              slug: z.string(),
              name: z.string(),
              description: z.string().nullable(),
              permissions: z.array(z.string()),
            }),
          ),
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const ctx = buildRequestContext(request as never)
      const roles = await staffService.listRoles(ctx)
      return reply.status(200).send(roles)
    },
  )

  fastify.post(
    '/',
    {
      preHandler: [authGuard, roleGuard(['owner']), approvalGuard, tenantScope],
      schema: {
        tags: ['Staff'],
        summary: 'Create a staff member',
        description:
          'Creates a new staff user with a role and building assignments.\n\n**Roles: owner**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        body: createStaffSchema,
        response: {
          201: z.object({
            id: z.string(),
            email: z.string(),
            name: z.string(),
            phone: z.string().nullable(),
            role: staffRoleEnum,
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
        password: string
        name: string
        phone?: string | null
        role: 'manager' | 'security_guard' | 'care_taker'
        buildingIds: string[]
      }

      const result = await staffService.createStaff(ctx, input)

      return reply.status(201).send(result)
    },
  )

  fastify.get(
    '/',
    {
      preHandler: [authGuard, roleGuard(['owner', 'manager']), approvalGuard, tenantScope],
      schema: {
        tags: ['Staff'],
        summary: 'List staff members',
        description:
          "Returns a paginated list of staff members within the owner's account.\n\n**Roles: owner, manager**",
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(20),
          role: staffRoleEnum.optional(),
        }),
        response: {
          200: z.object({
            data: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                email: z.string(),
                role: z.string(),
                isActive: z.boolean(),
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
      const { page, pageSize, role } = request.query as {
        page: number
        pageSize: number
        role?: 'manager' | 'security_guard' | 'care_taker'
      }
      const ctx = buildRequestContext(request as never)

      const result = await staffService.listStaff(ctx, { page, pageSize }, role)

      return reply.status(200).send(result)
    },
  )

  fastify.get(
    '/:id',
    {
      preHandler: [authGuard, roleGuard(['owner']), approvalGuard, tenantScope],
      schema: {
        tags: ['Staff'],
        summary: 'Get staff member details',
        description:
          'Returns details of a single staff member including permissions and building assignments.\n\n**Roles: owner**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid staff ID format'),
        }),
        response: {
          200: z.object({
            id: z.string(),
            name: z.string(),
            email: z.string(),
            role: z.string(),
            isActive: z.boolean(),
            phone: z.string().nullable(),
            buildingIds: z.array(z.string()),
            permissions: z.array(z.string()),
            permissionOverrides: z.array(
              z.object({
                permissionKey: z.string(),
                effect: z.string(),
              }),
            ),
            createdAt: dateTimeResponseSchema,
            updatedAt: dateTimeResponseSchema,
          }),
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const ctx = buildRequestContext(request as never)

      const result = await staffService.getStaff(ctx, id)

      return reply.status(200).send(result)
    },
  )

  fastify.put(
    '/:id',
    {
      preHandler: [authGuard, roleGuard(['owner']), approvalGuard, tenantScope],
      schema: {
        tags: ['Staff'],
        summary: 'Update staff member',
        description:
          "Updates a staff member's name, role, building assignments, or active status.\n\n**Roles: owner**",
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid staff ID format'),
        }),
        body: updateStaffSchema,
        response: {
          204: z.null().describe('Staff member updated successfully'),
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = request.body as {
        name?: string
        phone?: string | null
        role?: 'manager' | 'security_guard' | 'care_taker'
        buildingIds?: string[]
        isActive?: boolean
      }
      const ctx = buildRequestContext(request as never)

      await staffService.updateStaff(ctx, id, body)

      return reply.status(204).send(null)
    },
  )

  fastify.put(
    '/:id/deactivate',
    {
      preHandler: [authGuard, roleGuard(['owner']), approvalGuard, tenantScope],
      schema: {
        tags: ['Staff'],
        summary: 'Deactivate staff member',
        description:
          'Soft-deactivates a staff member. They will no longer be able to log in.\n\n**Roles: owner**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid staff ID format'),
        }),
        response: {
          204: z.null().describe('Staff member deactivated'),
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const ctx = buildRequestContext(request as never)

      await staffService.deactivateStaff(ctx, id)

      return reply.status(204).send(null)
    },
  )

  fastify.put(
    '/:id/reactivate',
    {
      preHandler: [authGuard, roleGuard(['owner']), approvalGuard, tenantScope],
      schema: {
        tags: ['Staff'],
        summary: 'Reactivate staff member',
        description:
          'Reactivates a previously deactivated staff member.\n\n**Roles: owner**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid staff ID format'),
        }),
        response: {
          204: z.null().describe('Staff member reactivated'),
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const ctx = buildRequestContext(request as never)

      await staffService.reactivateStaff(ctx, id)

      return reply.status(204).send(null)
    },
  )

  fastify.delete(
    '/:id',
    {
      preHandler: [authGuard, roleGuard(['owner']), approvalGuard, tenantScope],
      schema: {
        tags: ['Staff'],
        summary: 'Permanently delete staff member',
        description:
          'Permanently deletes a staff member and all associated records. This cannot be undone. Use deactivate instead for reversible deactivation.\n\n**Roles: owner**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid staff ID format'),
        }),
        response: {
          204: z.null().describe('Staff member permanently deleted'),
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const ctx = buildRequestContext(request as never)

      await staffService.deleteStaff(ctx, id)

      return reply.status(204).send(null)
    },
  )

  fastify.put(
    '/:id/permissions',
    {
      preHandler: [authGuard, roleGuard(['owner']), approvalGuard, tenantScope],
      schema: {
        tags: ['Staff'],
        summary: 'Update staff permissions',
        description:
          'Updates permission overrides for a staff member. Overrides add or remove specific permissions beyond their role defaults.\n\n**Roles: owner**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid staff ID format'),
        }),
        body: updateStaffPermissionsSchema,
        response: {
          204: z.null().describe('Permissions updated successfully'),
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = request.body as {
        overrides: Array<{
          permissionKey: string
          effect: 'grant' | 'deny'
        }>
      }
      const ctx = buildRequestContext(request as never)

      await staffService.updatePermissions(ctx, id, body)

      return reply.status(204).send(null)
    },
  )
}

export default staffRoutes
