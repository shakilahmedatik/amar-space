import type { RequestContext, UserRole } from '@repo/shared/types'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authGuard } from '../../middleware/auth-guard'
import { roleGuard } from '../../middleware/role-guard'
import { tenantScope } from '../../middleware/tenant-scope'
import { AuditLogQueryService } from '../../services/audit-log-query.service'
import {
  dateTimeResponseSchema,
  errorResponseSchema,
} from '../../utils/schemas'

/**
 * Audit log routes plugin.
 *
 * Provides:
 * - GET /api/audit — Query audit logs with filtering and pagination
 *
 * Access control:
 * - Owner: full access to all audit logs within their tenant
 * - Manager: access restricted to logs for entities in assigned buildings
 * - Renter: denied (403 via role guard)
 *
 */
async function auditRoutes(fastify: FastifyInstance) {
  const auditLogQueryService = new AuditLogQueryService(fastify.db)

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
   * GET /api/audit
   * Queries audit logs with filtering and pagination.
   * Owner and Manager can access (Renter denied by role guard).
   *
   * Query parameters:
   * - entityType (optional): Filter by entity type
   * - entityId (optional): Filter by entity ID (UUID)
   * - actorUserId (optional): Filter by actor user ID (UUID)
   * - actionName (optional): Filter by action name
   * - startDate (optional): Filter logs from this ISO date
   * - endDate (optional): Filter logs until this ISO date
   * - page (optional): Page number, default 1
   * - pageSize (optional): Items per page, default 20, max 100
   *
   */
  fastify.get(
    '/',
    {
      preHandler: [authGuard, roleGuard(['owner', 'manager']), tenantScope],
      schema: {
        tags: ['Audit'],
        summary: 'Query audit logs',
        description:
          'Returns a paginated list of audit logs with optional filtering by entity type, entity ID, actor, action name, and date range. Immutable audit log query interface.\n\n**Roles: owner, manager**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        querystring: z.object({
          entityType: z.string().optional(),
          entityId: z.string().uuid().optional(),
          actorUserId: z.string().uuid().optional(),
          actionName: z.string().optional(),
          startDate: z.string().datetime({ offset: true }).optional(),
          endDate: z.string().datetime({ offset: true }).optional(),
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(20),
        }),
        response: {
          200: z.object({
            data: z.array(
              z.object({
                id: z.string(),
                entityType: z.string(),
                entityId: z.string(),
                action: z.string(),
                actorId: z.string(),
                ownerAccountId: z.string(),
                oldValues: z.unknown().nullable(),
                newValues: z.unknown().nullable(),
                metadata: z.unknown().nullable(),
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
      const {
        entityType,
        entityId,
        actorUserId,
        actionName,
        startDate,
        endDate,
        page,
        pageSize,
      } = request.query as {
        entityType?: string
        entityId?: string
        actorUserId?: string
        actionName?: string
        startDate?: string
        endDate?: string
        page: number
        pageSize: number
      }

      const ctx = buildRequestContext(request as never)

      const result = await auditLogQueryService.queryLogs(
        ctx,
        {
          entityType,
          entityId,
          actorUserId,
          actionName,
          startDate,
          endDate,
        },
        { page, pageSize },
      )

      return reply.status(200).send(result)
    },
  )
}

export default auditRoutes
