import type { RequestContext } from '@repo/shared/types'
import {
  type CreateNoticeInput,
  createNoticeSchema,
  type UpdateNoticeInput,
  updateNoticeSchema,
} from '@repo/shared/validation'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { approvalGuard } from '../../middleware/approval-guard'
import { authGuard } from '../../middleware/auth-guard'
import { roleGuard } from '../../middleware/role-guard'
import { tenantScope } from '../../middleware/tenant-scope'
import { NoticeService } from '../../services/notice.service'
import {
  dateTimeResponseSchema,
  errorResponseSchema,
} from '../../utils/schemas'

/**
 * Notice routes plugin.
 *
 * Provides:
 * - GET /api/notices — List notices with filters and pagination (all authenticated users)
 * - POST /api/notices — Create a new notice (Owner/Manager only)
 * - GET /api/notices/:id — Get a notice by ID (all authenticated users)
 * - PUT /api/notices/:id — Update a notice (Owner/Manager only; service enforces author/owner check)
 * - DELETE /api/notices/:id — Delete a notice (Owner/Manager only; service enforces author/owner check)
 * - PUT /api/notices/:id/pin — Toggle pin status (Owner/Manager only)
 *
 * Access control:
 * - Owner/Manager: full access (create, edit, delete, pin)
 * - Renter: read-only access (list, get) with role-based visibility
 *
 * Requirements: 12.5, 12.6, 12.9, 12.10
 */
async function noticeRoutes(fastify: FastifyInstance) {
  const noticeService = new NoticeService(fastify.db, fastify.auditLogger)

  /**
   * Helper to build RequestContext from the Fastify request.
   */
  function buildRequestContext(request: {
    user: {
      id: string
      role: 'owner' | 'manager' | 'renter'
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
   * GET /api/notices
   * Lists notices with filtering and pagination.
   * All authenticated users can list (visibility scoped by role in service layer).
   *
   * Requirements: 12.5, 12.6
   */
  fastify.get(
    '/',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager', 'renter']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Notices'],
        summary: 'List notices',
        description:
          'Returns a paginated list of notices with optional filters for audience and pin status. Visibility is scoped by role in the service layer.\n\n**Roles: owner, manager, renter**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(20),
          targetAudience: z
            .enum([
              'all_renters',
              'specific_building',
              'specific_flat',
              'managers_only',
            ])
            .optional(),
          isPinned: z
            .enum(['true', 'false'])
            .transform((v) => v === 'true')
            .optional(),
        }),
        response: {
          200: z.object({
            data: z.array(
              z.object({
                id: z.string(),
                title: z.string(),
                body: z.string(),
                targetAudience: z.string(),
                isPinned: z.boolean(),
                createdAt: dateTimeResponseSchema,
                updatedAt: dateTimeResponseSchema,
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
      const { page, pageSize, targetAudience, isPinned } = request.query as {
        page: number
        pageSize: number
        targetAudience?: string
        isPinned?: boolean
      }
      const ctx = buildRequestContext(request as never)

      const result = await noticeService.listNotices(ctx, {
        targetAudience,
        isPinned,
        page,
        pageSize,
      })

      return reply.status(200).send(result)
    },
  )

  /**
   * POST /api/notices
   * Creates a new notice. Owner/Manager only.
   *
   * Requirements: 12.1, 12.5
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
        tags: ['Notices'],
        summary: 'Create a notice',
        description:
          'Creates a new notice with audience targeting. Supports targeting all renters, a specific building, a specific flat, or managers only.\n\n**Roles: owner, manager**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        body: createNoticeSchema,
        response: {
          201: z.object({
            id: z.string(),
            title: z.string(),
            body: z.string(),
            targetAudience: z.string(),
            targetBuildingId: z.string().nullable(),
            targetFlatId: z.string().nullable(),
            isPinned: z.boolean(),
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
      const data = request.body as CreateNoticeInput

      const result = await noticeService.createNotice(ctx, data)

      return reply.status(201).send(result)
    },
  )

  /**
   * GET /api/notices/:id
   * Gets a notice by ID.
   * All authenticated users can view (visibility enforced by service layer).
   *
   * Requirements: 12.5, 12.6
   */
  fastify.get(
    '/:id',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager', 'renter']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Notices'],
        summary: 'Get notice by ID',
        description:
          'Returns a single notice by its ID. Visibility is enforced by the service layer based on role.\n\n**Roles: owner, manager, renter**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid notice ID format'),
        }),
        response: {
          200: z.object({
            id: z.string(),
            title: z.string(),
            body: z.string(),
            targetAudience: z.string(),
            targetBuildingId: z.string().nullable(),
            targetFlatId: z.string().nullable(),
            isPinned: z.boolean(),
            authorId: z.string(),
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

      const result = await noticeService.getNotice(ctx, id)

      return reply.status(200).send(result)
    },
  )

  /**
   * PUT /api/notices/:id
   * Updates a notice. Owner/Manager only.
   * Service layer enforces that only the author or an Owner can edit.
   *
   * Requirements: 12.9, 12.10
   */
  fastify.put(
    '/:id',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Notices'],
        summary: 'Update a notice',
        description:
          'Updates an existing notice. Only the author or an owner can edit a notice.\n\n**Roles: owner, manager**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid notice ID format'),
        }),
        body: updateNoticeSchema,
        response: {
          200: z.object({
            id: z.string(),
            title: z.string(),
            body: z.string(),
            targetAudience: z.string(),
            targetBuildingId: z.string().nullable(),
            targetFlatId: z.string().nullable(),
            isPinned: z.boolean(),
            updatedAt: dateTimeResponseSchema,
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
      const data = request.body as UpdateNoticeInput

      const result = await noticeService.updateNotice(ctx, id, data)

      return reply.status(200).send(result)
    },
  )

  /**
   * DELETE /api/notices/:id
   * Deletes a notice. Owner/Manager only.
   * Service layer enforces that only the author or an Owner can delete.
   *
   * Requirements: 12.9, 12.10
   */
  fastify.delete(
    '/:id',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Notices'],
        summary: 'Delete a notice',
        description:
          'Deletes a notice by ID. Only the author or an owner can delete a notice.\n\n**Roles: owner, manager**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid notice ID format'),
        }),
        response: {
          204: z.null(),
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const ctx = buildRequestContext(request as never)

      await noticeService.deleteNotice(ctx, id)

      return reply.status(204).send()
    },
  )

  /**
   * PUT /api/notices/:id/pin
   * Toggles the pinned status of a notice. Owner/Manager only.
   * Enforces max 5 pinned notices per target audience scope.
   *
   * Requirements: 12.2
   */
  fastify.put(
    '/:id/pin',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Notices'],
        summary: 'Toggle notice pin status',
        description:
          'Toggles the pinned status of a notice. Enforces a maximum of 5 pinned notices per target audience scope.\n\n**Roles: owner, manager**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid notice ID format'),
        }),
        response: {
          200: z.object({
            id: z.string(),
            isPinned: z.boolean(),
            updatedAt: dateTimeResponseSchema,
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

      const result = await noticeService.togglePin(ctx, id)

      return reply.status(200).send(result)
    },
  )
}

export default noticeRoutes
