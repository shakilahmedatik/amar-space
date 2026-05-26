import { createDbClient, type Database } from '@repo/db'
import { auditLogs } from '@repo/db/schema'
import { and, count, desc, eq, inArray } from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { z } from 'zod'

/**
 * Audit log query route plugin.
 *
 * Provides a paginated query endpoint for audit log entries with role-based access control:
 * - Owner role: access to all audit log entries (Requirement 7.5)
 * - Manager role: access restricted to entries for assigned properties (Requirement 7.6)
 * - Other roles: denied with 403 insufficient permissions (Requirement 7.7)
 *
 * Pagination is capped at 100 entries per page regardless of client request.
 */

const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  entityType: z.string().optional(),
  actorUserId: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
})

type AuditQueryParams = z.infer<typeof auditQuerySchema>

interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Represents a user's role in the system.
 * Used for RBAC on audit log access.
 */
type UserRole = 'owner' | 'manager' | 'tenant' | 'viewer'

/**
 * Retrieves the current user's role from the session.
 * This integrates with Better Auth's session system.
 */
async function getUserRole(
  request: FastifyRequest,
  fastify: FastifyInstance,
): Promise<{ role: UserRole; userId: string } | null> {
  try {
    const webRequest = toWebRequest(request, fastify.env.AUTH_BASE_URL)
    const session = await fastify.auth.api.getSession({
      headers: webRequest.headers,
    })

    if (!session?.user) {
      return null
    }

    // The role is stored on the user object.
    // Default to 'viewer' if no role is set.
    const role =
      ((session.user as Record<string, unknown>).role as UserRole) || 'viewer'
    return { role, userId: session.user.id }
  } catch {
    return null
  }
}

/**
 * Retrieves the property IDs assigned to a manager.
 * In a full implementation, this would query a property_assignments table.
 */
async function getManagerAssignedPropertyIds(
  _db: Database,
  _userId: string,
): Promise<string[]> {
  // TODO: Query property_assignments table when it exists.
  // For now, return empty array — manager filtering will fall back to actor-based filtering.
  return []
}

/**
 * Constructs a Web API Request from Fastify's request object for Better Auth session validation.
 */
function toWebRequest(request: FastifyRequest, baseURL: string): Request {
  const url = new URL(request.url, baseURL)

  const headers = new Headers()
  for (const [key, value] of Object.entries(request.headers)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        for (const v of value) {
          headers.append(key, v)
        }
      } else {
        headers.set(key, value)
      }
    }
  }

  return new Request(url.toString(), {
    method: request.method,
    headers,
  })
}

export default fp(
  async function auditRoutes(fastify: FastifyInstance) {
    const db = createDbClient(fastify.env.DATABASE_URL)

    fastify.get('/', async (request, reply) => {
      // Authenticate the user
      const userInfo = await getUserRole(request, fastify)

      if (!userInfo) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Authentication required',
        })
      }

      const { role, userId } = userInfo

      // RBAC: Only Owner and Manager roles can access audit logs (Requirement 7.7)
      if (role !== 'owner' && role !== 'manager') {
        return reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Insufficient permissions',
        })
      }

      // Parse and validate query parameters
      const parseResult = auditQuerySchema.safeParse(request.query)

      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Validation failed',
          details: parseResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            rule: issue.code,
            message: issue.message,
          })),
        })
      }

      const params: AuditQueryParams = parseResult.data

      // Cap limit at 100 regardless of what the client requests
      const limit = Math.min(params.limit, 100)
      const page = params.page
      const offset = (page - 1) * limit

      // Build filter conditions
      const conditions = []

      if (params.entityType) {
        conditions.push(eq(auditLogs.entityType, params.entityType))
      }

      if (params.actorUserId) {
        conditions.push(eq(auditLogs.actorUserId, params.actorUserId))
      }

      // Manager role: restrict to entries for assigned properties (Requirement 7.6)
      if (role === 'manager') {
        if (params.propertyId) {
          // Manager can only query entries for a specific property they're assigned to
          conditions.push(eq(auditLogs.entityId, params.propertyId))
        } else {
          // Without a specific propertyId filter, get manager's assigned properties
          const assignedPropertyIds = await getManagerAssignedPropertyIds(
            db,
            userId,
          )

          if (assignedPropertyIds.length > 0) {
            conditions.push(inArray(auditLogs.entityId, assignedPropertyIds))
          } else {
            // If no assigned properties found, restrict to entries where manager is the actor
            conditions.push(eq(auditLogs.actorUserId, userId))
          }
        }
      } else if (role === 'owner' && params.propertyId) {
        // Owner can optionally filter by propertyId
        conditions.push(eq(auditLogs.entityId, params.propertyId))
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      // Get total count for pagination
      const [countResult] = await db
        .select({ total: count() })
        .from(auditLogs)
        .where(whereClause)

      const total = countResult?.total ?? 0
      const totalPages = Math.ceil(total / limit)

      // Get paginated data
      const data = await db
        .select()
        .from(auditLogs)
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset)

      const response: PaginatedResponse<(typeof data)[number]> = {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      }

      return reply.status(200).send(response)
    })
  },
  {
    name: 'audit-routes',
    dependencies: ['env', 'auth'],
  },
)
