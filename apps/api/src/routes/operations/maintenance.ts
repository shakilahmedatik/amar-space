import type { RequestContext, UserRole } from '@repo/shared/types'
import {
  addMaintenanceCommentSchema,
  updateMaintenanceStatusSchema,
} from '@repo/shared/validation'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { approvalGuard } from '../../middleware/approval-guard'
import { authGuard } from '../../middleware/auth-guard'
import { roleGuard } from '../../middleware/role-guard'
import { tenantScope } from '../../middleware/tenant-scope'
import {
  type FileAttachment,
  MaintenanceService,
} from '../../services/maintenance.service'
import {
  dateTimeResponseSchema,
  errorResponseSchema,
} from '../../utils/schemas'

/**
 * Maintenance routes plugin.
 *
 * Provides:
 * - GET /api/maintenance — List maintenance requests with filters and pagination
 * - POST /api/maintenance — Create a new maintenance request (Renter only)
 * - GET /api/maintenance/:id — Get a maintenance request by ID
 * - PUT /api/maintenance/:id/status — Update maintenance request status (Owner/Manager only)
 * - POST /api/maintenance/:id/comments — Add a comment to a maintenance request
 *
 * Access control:
 * - Renter: create requests, add comments, view own requests
 * - Owner/Manager: view all/assigned, update status, add comments
 */
async function maintenanceRoutes(fastify: FastifyInstance) {
  const maintenanceService = new MaintenanceService(
    fastify.db,
    fastify.auditLogger,
    fastify.r2,
  )

  /**
   * Helper to build RequestContext from the Fastify request.
   */
  function buildRequestContext(request: {
    user: {
      id: string
      role: UserRole
      ownerAccountId: string
    }
    tenantScope: {
      ownerAccountId: string
      assignedBuildingIds?: string[]
      assignedFlatId?: string
    }
    ip: string
    headers: Record<string, string | string[] | undefined>
  }): RequestContext {
    return {
      userId: request.user.id,
      role: request.user.role,
      ownerAccountId: request.tenantScope.ownerAccountId,
      assignedBuildingIds: request.tenantScope.assignedBuildingIds,
      assignedFlatId: request.tenantScope.assignedFlatId,
      ipAddress: request.ip,
      userAgent: (request.headers['user-agent'] as string) || '',
    }
  }

  /**
   * GET /api/maintenance
   * Lists maintenance requests with filtering and pagination.
   * All authenticated users can list (scoped by role).
   */
  fastify.get(
    '/',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Maintenance'],
        summary: 'List maintenance requests',
        description:
          'Returns paginated maintenance requests with optional filters by building, flat, status, and priority.\n\n**Roles: owner, manager, renter**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(20),
          buildingId: z.string().uuid().optional(),
          flatId: z.string().uuid().optional(),
          status: z
            .enum(['open', 'in_progress', 'resolved', 'closed'])
            .optional(),
          priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        }),
        response: {
          200: z.object({
            data: z.array(
              z.object({
                id: z.string(),
                title: z.string(),
                description: z.string(),
                priority: z.enum(['low', 'medium', 'high', 'urgent']),
                status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
                flatId: z.string(),
                buildingId: z.string(),
                ownerAccountId: z.string(),
                createdAt: dateTimeResponseSchema,
              }),
            ),
            total: z.number(),
            page: z.number(),
            pageSize: z.number(),
          }),
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { page, pageSize, buildingId, flatId, status, priority } =
        request.query as {
          page: number
          pageSize: number
          buildingId?: string
          flatId?: string
          status?: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
        }
      const ctx = buildRequestContext(request as never)

      const result = await maintenanceService.listRequests(
        ctx,
        { buildingId, flatId, status, priority },
        { page, pageSize },
      )

      return reply.status(200).send(result)
    },
  )

  /**
   * POST /api/maintenance
   * Creates a new maintenance request. Renter only.
   */
  fastify.post(
    '/',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Maintenance'],
        summary: 'Create maintenance request',
        description:
          'Creates a new maintenance request.\n\n**Roles: owner, manager**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        consumes: ['multipart/form-data'],
        body: z
          .object({
            title: z.string().describe('Title of the maintenance request'),
            description: z.string().describe('Description details'),
            priority: z.enum(['low', 'medium', 'high', 'urgent']),
            attachments: z.any().optional(),
          })
          .nullable()
          .optional(),
        response: {
          201: z.object({
            id: z.string(),
            title: z.string(),
            description: z.string(),
            priority: z.enum(['low', 'medium', 'high', 'urgent']),
            status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
            flatId: z.string(),
            buildingId: z.string(),
            ownerAccountId: z.string(),
            createdAt: dateTimeResponseSchema,
          }),
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const ctx = buildRequestContext(request as never)

      // Parse multipart form data
      const parts = request.parts()
      const fields: Record<string, string> = {}
      const attachments: FileAttachment[] = []

      for await (const part of parts) {
        if (part.type === 'file') {
          const buffer = await part.toBuffer()
          attachments.push({
            fileName: part.filename,
            buffer,
            mimeType: part.mimetype,
            fileSize: buffer.length,
          })
        } else {
          fields[part.fieldname] = part.value as string
        }
      }

      const data = {
        title: fields.title ?? '',
        description: fields.description ?? '',
        priority: fields.priority ?? '',
      }

      const result = await maintenanceService.createRequest(
        ctx,
        data,
        attachments,
      )

      return reply.status(201).send(result)
    },
  )

  /**
   * GET /api/maintenance/:id
   * Gets a maintenance request by ID.
   * All authenticated users can view (scoped by role).
   */
  fastify.get(
    '/:id',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Maintenance'],
        summary: 'Get a maintenance request',
        description:
          'Returns a maintenance request by ID with its comments.\n\n**Roles: owner, manager, renter**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid maintenance request ID format'),
        }),
        response: {
          200: z.object({
            id: z.string(),
            title: z.string(),
            description: z.string(),
            priority: z.enum(['low', 'medium', 'high', 'urgent']),
            status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
            flatId: z.string(),
            buildingId: z.string(),
            ownerAccountId: z.string(),
            createdAt: dateTimeResponseSchema,
            comments: z.array(
              z.object({
                id: z.string(),
                content: z.string(),
                userId: z.string(),
                createdAt: dateTimeResponseSchema,
              }),
            ),
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

      const result = await maintenanceService.getRequest(ctx, id)

      return reply.status(200).send(result)
    },
  )

  /**
   * PUT /api/maintenance/:id/status
   * Updates the status of a maintenance request. Owner/Manager only.
   */
  fastify.put(
    '/:id/status',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Maintenance'],
        summary: 'Update maintenance status',
        description:
          'Updates the status of a maintenance request (open → in_progress → resolved → closed).\n\n**Roles: owner, manager**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid maintenance request ID format'),
        }),
        body: updateMaintenanceStatusSchema,
        response: {
          200: z.object({
            id: z.string(),
            title: z.string(),
            description: z.string(),
            priority: z.enum(['low', 'medium', 'high', 'urgent']),
            status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
            flatId: z.string(),
            buildingId: z.string(),
            ownerAccountId: z.string(),
            createdAt: dateTimeResponseSchema,
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
      const ctx = buildRequestContext(request as never)
      const { status } = request.body as { status: string }

      const result = await maintenanceService.updateRequestStatus(
        ctx,
        id,
        status,
      )

      return reply.status(200).send(result)
    },
  )

  /**
   * POST /api/maintenance/:id/comments
   * Adds a comment to a maintenance request.
   * All authenticated users can comment (Renter on own, Owner/Manager on any accessible).
   */
  fastify.post(
    '/:id/comments',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Maintenance'],
        summary: 'Add comment',
        description:
          'Adds a comment to a maintenance request. All authenticated users can comment on requests they can access.\n\n**Roles: owner, manager, renter**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid maintenance request ID format'),
        }),
        body: addMaintenanceCommentSchema,
        response: {
          201: z.object({
            id: z.string(),
            content: z.string(),
            userId: z.string(),
            maintenanceRequestId: z.string(),
            createdAt: dateTimeResponseSchema,
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
      const ctx = buildRequestContext(request as never)
      const data = request.body as { content: string }

      const result = await maintenanceService.addComment(ctx, id, data)

      return reply.status(201).send({
        id: result.id,
        content: result.content,
        userId: result.authorId,
        maintenanceRequestId: result.requestId,
        createdAt: result.createdAt,
      })
    },
  )
}

export default maintenanceRoutes
