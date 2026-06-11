import type { RequestContext } from '@repo/shared/types'
import {
  assignIssueSchema,
  updateIssueStatusSchema,
} from '@repo/shared/validation'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { approvalGuard } from '../../middleware/approval-guard'
import { authGuard } from '../../middleware/auth-guard'
import { roleGuard } from '../../middleware/role-guard'
import { tenantScope } from '../../middleware/tenant-scope'
import { type FileAttachment, IssueService } from '../../services/issue.service'
import {
  dateTimeResponseSchema,
  errorResponseSchema,
} from '../../utils/schemas'

/**
 * Issue routes plugin.
 *
 * Provides:
 * - GET /api/issues — List building-level issues with filters and pagination
 * - POST /api/issues — Create a new issue (Renter, Owner, Manager)
 * - GET /api/issues/:id — Get an issue by ID
 * - PUT /api/issues/:id/status — Update issue status (Staff only)
 * - PUT /api/issues/:id/assign — Assign an issue to a manager (Owner/Manager only)
 * - DELETE /api/issues/:id — Delete an issue (Owner only)
 *
 * Access control:
 * - Renter: create issues only
 * - Owner/Manager/SecurityGuard/CareTaker: view, update status, add comments
 * - Owner: full access including delete
 */
async function issueRoutes(fastify: FastifyInstance) {
  const issueService = new IssueService(
    fastify.db,
    fastify.auditLogger,
    fastify.r2,
  )
  const r2BaseUrl = fastify.env.R2_PUBLIC_BASE_URL.replace(/\/$/, '')
  const formatR2Url = (key: string) => {
    if (key.startsWith('http://') || key.startsWith('https://')) return key
    return `${r2BaseUrl}/${key}`
  }

  /**
   * Helper to build RequestContext from the Fastify request.
   */
  function buildRequestContext(request: FastifyRequest): RequestContext {
    const userAgentHeader = request.headers['user-agent']
    const userAgent =
      typeof userAgentHeader === 'string'
        ? userAgentHeader
        : Array.isArray(userAgentHeader)
          ? (userAgentHeader[0] ?? '')
          : ''
    return {
      userId: request.user.id,
      role: request.user.role,
      ownerAccountId: request.tenantScope.ownerAccountId,
      assignedBuildingIds: request.tenantScope.assignedBuildingIds,
      assignedFlatId: request.tenantScope.assignedFlatId,
      ipAddress: request.ip,
      userAgent,
    }
  }

  /**
   * GET /api/issues
   * Lists building-level issues with filtering and pagination.
   */
  fastify.get(
    '/',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager', 'security_guard', 'care_taker']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Issues'],
        summary: 'List issues',
        description:
          'Returns paginated building-level issues with optional filters by building, category, status, priority, and assignee.\n\n**Roles: owner, manager, security_guard, care_taker**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(20),
          buildingId: z.string().uuid().optional(),
          category: z
            .enum([
              'plumbing',
              'electrical',
              'structural',
              'cleaning',
              'security',
              'other',
            ])
            .optional(),
          status: z
            .enum(['open', 'in_progress', 'resolved', 'closed'])
            .optional(),
          priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
          assigneeId: z.string().uuid().optional(),
        }),
        response: {
          200: z.object({
            data: z.array(
              z.object({
                id: z.string(),
                title: z.string(),
                description: z.string(),
                category: z.enum([
                  'plumbing',
                  'electrical',
                  'structural',
                  'cleaning',
                  'security',
                  'other',
                ]),
                priority: z.enum(['low', 'medium', 'high', 'urgent']),
                status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
                buildingId: z.string(),
                buildingName: z.string(),
                assigneeId: z.string().nullable(),
                assigneeName: z.string().nullable(),
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
      const {
        page,
        pageSize,
        buildingId,
        category,
        status,
        priority,
        assigneeId,
      } = request.query as {
        page: number
        pageSize: number
        buildingId?: string
        category?: string
        status?: string
        priority?: string
        assigneeId?: string
      }
      const ctx = buildRequestContext(request)

      const result = await issueService.listIssues(ctx, {
        buildingId,
        category,
        status,
        priority,
        assigneeId,
        page,
        pageSize,
      })

      return reply.status(200).send(result)
    },
  )

  /**
   * POST /api/issues
   * Creates a new building-level issue. Renter only.
   */
  fastify.post(
    '/',
    {
      preHandler: [
        authGuard,
        roleGuard(['renter']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Issues'],
        summary: 'Create issue',
        description:
          'Creates a new building-level issue with category and priority. Only renters can create issues via the renter portal.\n\n**Roles: renter**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        consumes: ['multipart/form-data'],
        body: z
          .object({
            buildingId: z.string(),
            title: z.string(),
            description: z.string(),
            category: z.enum([
              'plumbing',
              'electrical',
              'structural',
              'cleaning',
              'security',
              'other',
            ]),
            priority: z.enum(['low', 'medium', 'high', 'urgent']),
          })
          .nullable()
          .optional(),
        response: {
          201: z.object({
            id: z.string(),
            title: z.string(),
            description: z.string(),
            category: z.enum([
              'plumbing',
              'electrical',
              'structural',
              'cleaning',
              'security',
              'other',
            ]),
            priority: z.enum(['low', 'medium', 'high', 'urgent']),
            status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
            buildingId: z.string(),
            buildingName: z.string(),
            assigneeId: z.string().nullable(),
            assigneeName: z.string().nullable(),
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
      const ctx = buildRequestContext(request)

      let data: {
        buildingId: string
        title: string
        description: string
        category:
          | 'plumbing'
          | 'electrical'
          | 'structural'
          | 'cleaning'
          | 'security'
          | 'other'
        priority: 'low' | 'medium' | 'high' | 'urgent'
      }
      let attachments: FileAttachment[] | undefined

      const contentType = request.headers['content-type'] ?? ''
      if (contentType.startsWith('multipart/')) {
        const fields: Record<string, string> = {}
        const fileAttachments: FileAttachment[] = []

        const parts = request.parts()
        for await (const part of parts) {
          if (part.type === 'file') {
            const buffer = await part.toBuffer()
            fileAttachments.push({
              fileName: part.filename,
              buffer,
              mimeType: part.mimetype,
              fileSize: buffer.length,
            })
          } else {
            fields[part.fieldname] = part.value as string
          }
        }

        data = {
          buildingId: fields.buildingId ?? '',
          title: fields.title ?? '',
          description: fields.description ?? '',
          category: (fields.category ?? 'other') as
            | 'plumbing'
            | 'electrical'
            | 'structural'
            | 'cleaning'
            | 'security'
            | 'other',
          priority: (fields.priority ?? 'medium') as
            | 'low'
            | 'medium'
            | 'high'
            | 'urgent',
        }
        attachments = fileAttachments.length > 0 ? fileAttachments : undefined
      } else {
        const body = request.body as {
          buildingId: string
          title: string
          description: string
          category:
            | 'plumbing'
            | 'electrical'
            | 'structural'
            | 'cleaning'
            | 'security'
            | 'other'
          priority: 'low' | 'medium' | 'high' | 'urgent'
        }
        data = body
        attachments = undefined
      }

      const result = await issueService.createIssue(ctx, data, attachments)

      return reply.status(201).send(result)
    },
  )

  /**
   * GET /api/issues/:id
   * Gets an issue by ID.
   */
  fastify.get(
    '/:id',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager', 'security_guard', 'care_taker']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Issues'],
        summary: 'Get an issue',
        description:
          'Returns a building-level issue by ID.\n\n**Roles: owner, manager, security_guard, care_taker**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid issue ID format'),
        }),
        response: {
          200: z.object({
            id: z.string(),
            title: z.string(),
            description: z.string(),
            category: z.enum([
              'plumbing',
              'electrical',
              'structural',
              'cleaning',
              'security',
              'other',
            ]),
            priority: z.enum(['low', 'medium', 'high', 'urgent']),
            status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
            buildingId: z.string(),
            buildingName: z.string(),
            assigneeId: z.string().nullable(),
            assigneeName: z.string().nullable(),
            ownerAccountId: z.string(),
            createdAt: dateTimeResponseSchema,
            attachments: z.array(
              z.object({
                id: z.string(),
                fileName: z.string(),
                fileUrl: z.string(),
                fileSize: z.number(),
                mimeType: z.string(),
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
      const ctx = buildRequestContext(request)

      const result = await issueService.getIssue(ctx, id)

      result.attachments = result.attachments.map((a) => ({
        ...a,
        fileUrl: formatR2Url(a.fileUrl),
      }))

      return reply.status(200).send(result)
    },
  )

  /**
   * PUT /api/issues/:id/status
   * Updates the status of an issue. Staff only.
   */
  fastify.put(
    '/:id/status',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager', 'security_guard', 'care_taker']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Issues'],
        summary: 'Update issue status',
        description:
          'Updates the status of a building-level issue (open → in_progress → resolved → closed).\n\n**Roles: owner, manager, security_guard, care_taker**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid issue ID format'),
        }),
        body: updateIssueStatusSchema,
        response: {
          200: z.object({
            id: z.string(),
            title: z.string(),
            description: z.string(),
            category: z.enum([
              'plumbing',
              'electrical',
              'structural',
              'cleaning',
              'security',
              'other',
            ]),
            priority: z.enum(['low', 'medium', 'high', 'urgent']),
            status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
            buildingId: z.string(),
            buildingName: z.string(),
            assigneeId: z.string().nullable(),
            assigneeName: z.string().nullable(),
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
      const ctx = buildRequestContext(request)
      const data = request.body as {
        status: 'open' | 'in_progress' | 'resolved' | 'closed'
        resolutionNotes?: string
      }

      const result = await issueService.updateIssueStatus(ctx, id, data)

      return reply.status(200).send(result)
    },
  )

  /**
   * PUT /api/issues/:id/assign
   * Assigns an issue to a manager. Owner/Manager only.
   */
  fastify.put(
    '/:id/assign',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Issues'],
        summary: 'Assign issue',
        description:
          'Assigns a building-level issue to a manager.\n\n**Roles: owner, manager**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid issue ID format'),
        }),
        body: assignIssueSchema,
        response: {
          200: z.object({
            id: z.string(),
            title: z.string(),
            description: z.string(),
            category: z.enum([
              'plumbing',
              'electrical',
              'structural',
              'cleaning',
              'security',
              'other',
            ]),
            priority: z.enum(['low', 'medium', 'high', 'urgent']),
            status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
            buildingId: z.string(),
            buildingName: z.string(),
            assigneeId: z.string().nullable(),
            assigneeName: z.string().nullable(),
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
      const ctx = buildRequestContext(request)
      const data = request.body as { assigneeId: string }

      const result = await issueService.assignIssue(ctx, id, data)

      return reply.status(200).send(result)
    },
  )
  /**
   * DELETE /api/issues/:id
   * Deletes an issue. Owner only.
   */
  fastify.delete(
    '/:id',
    {
      preHandler: [authGuard, roleGuard(['owner']), approvalGuard, tenantScope],
      schema: {
        tags: ['Issues'],
        summary: 'Delete issue',
        description:
          'Permanently deletes a building-level issue.\n\n**Roles: owner**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid issue ID format'),
        }),
        response: {
          204: z.null().describe('Issue deleted successfully'),
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const ctx = buildRequestContext(request)

      await issueService.deleteIssue(ctx, id)

      return reply.status(204).send()
    },
  )
}

export default issueRoutes
