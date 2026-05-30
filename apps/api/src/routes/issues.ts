import type { RequestContext } from '@repo/shared/types'
import {
  assignIssueSchema,
  createIssueSchema,
  updateIssueStatusSchema,
} from '@repo/shared/validation'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { dateTimeResponseSchema, errorResponseSchema } from '../app'
import { approvalGuard } from '../middleware/approval-guard'
import { authGuard } from '../middleware/auth-guard'
import { roleGuard } from '../middleware/role-guard'
import { tenantScope } from '../middleware/tenant-scope'
import { IssueService } from '../services/issue.service'

/**
 * Issue routes plugin.
 *
 * Provides:
 * - GET /api/issues — List building-level issues with filters and pagination
 * - POST /api/issues — Create a new issue (Owner/Manager only)
 * - GET /api/issues/:id — Get an issue by ID
 * - PUT /api/issues/:id/status — Update issue status (Owner/Manager only)
 * - PUT /api/issues/:id/assign — Assign an issue to a manager (Owner/Manager only)
 *
 * Access control:
 * - Owner/Manager: full access (create, view, update status, assign)
 * - Renter: denied access (403) per Requirement 11.5
 *
 * Requirements: 11.5, 11.6
 */
async function issueRoutes(fastify: FastifyInstance) {
  const issueService = new IssueService(fastify.db, fastify.auditLogger)

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
   * GET /api/issues
   * Lists building-level issues with filtering and pagination.
   * Owner/Manager only — Renter is denied access.
   *
   * Requirements: 11.5, 11.6
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
        tags: ['Issues'],
        summary: 'List issues',
        description:
          'Returns paginated building-level issues with optional filters by building, category, status, priority, and assignee.\n\n**Roles: owner, manager**',
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
                assigneeId: z.string().nullable(),
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
      const ctx = buildRequestContext(request as never)

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
   * Creates a new building-level issue. Owner/Manager only.
   *
   * Requirements: 11.1, 11.5
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
        tags: ['Issues'],
        summary: 'Create issue',
        description:
          'Creates a new building-level issue with category and priority.\n\n**Roles: owner, manager**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        body: createIssueSchema,
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
            assigneeId: z.string().nullable(),
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
      const data = request.body as {
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

      const result = await issueService.createIssue(ctx, data)

      return reply.status(201).send(result)
    },
  )

  /**
   * GET /api/issues/:id
   * Gets an issue by ID. Owner/Manager only.
   *
   * Requirements: 11.5
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
        tags: ['Issues'],
        summary: 'Get an issue',
        description:
          'Returns a building-level issue by ID.\n\n**Roles: owner, manager**',
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
            assigneeId: z.string().nullable(),
            ownerAccountId: z.string(),
            createdAt: dateTimeResponseSchema,
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

      const result = await issueService.getIssue(ctx, id)

      return reply.status(200).send(result)
    },
  )

  /**
   * PUT /api/issues/:id/status
   * Updates the status of an issue. Owner/Manager only.
   *
   * Requirements: 11.3, 11.4, 11.5, 11.8, 11.9
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
        tags: ['Issues'],
        summary: 'Update issue status',
        description:
          'Updates the status of a building-level issue (open → in_progress → resolved → closed).\n\n**Roles: owner, manager**',
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
            assigneeId: z.string().nullable(),
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
   *
   * Requirements: 11.2, 11.5, 11.10
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
            assigneeId: z.string().nullable(),
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
      const data = request.body as { assigneeId: string }

      const result = await issueService.assignIssue(ctx, id, data)

      return reply.status(200).send(result)
    },
  )
}

export default issueRoutes
