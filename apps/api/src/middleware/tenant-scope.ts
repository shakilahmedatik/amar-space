import { managerAssignments } from '@repo/db'
import { and, eq } from 'drizzle-orm'
import type { FastifyReply, FastifyRequest } from 'fastify'

/**
 * Tenant scope context injected into the request by the tenant scope middleware.
 */
export interface TenantScope {
  /** The owner account ID that scopes all data access */
  ownerAccountId: string
  /** For managers: the building IDs they are assigned to */
  assignedBuildingIds?: string[]
  /** Optional flat ID for renter-scoped access */
  assignedFlatId?: string
}

declare module 'fastify' {
  interface FastifyRequest {
    tenantScope: TenantScope
  }
}

/**
 * Tenant scope preHandler middleware.
 *
 * Resolves the tenant scope for the authenticated user:
 * - For ALL roles: sets ownerAccountId from request.user.ownerAccountId
 * - For managers: queries manager_assignments to resolve assigned building IDs
 *
 * Must run AFTER authGuard (requires request.user to be set).
 *
 * Usage:
 * ```typescript
 * import { authGuard } from '../middleware/auth-guard'
 * import { tenantScope } from '../middleware/tenant-scope'
 *
 * app.get('/buildings', {
 *   preHandler: [authGuard, tenantScope]
 * }, async (request) => {
 *   // request.tenantScope.ownerAccountId is always available
 *   // request.tenantScope.assignedBuildingIds is set for managers
 *   // request.tenantScope.assignedFlatId is set for renters
 * })
 * ```
 */
export async function tenantScope(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const { user } = request

  // Superadmin bypasses tenant scoping — access resources across all owner accounts
  if (user.role === 'superadmin') {
    request.tenantScope = { ownerAccountId: '__all__' }
    return
  }

  const db = request.server.db

  const scope: TenantScope = {
    ownerAccountId: user.ownerAccountId,
  }

  if (user.role === 'manager') {
    const assignments = await db
      .select({ buildingId: managerAssignments.buildingId })
      .from(managerAssignments)
      .where(
        and(
          eq(managerAssignments.managerId, user.id),
          eq(managerAssignments.ownerAccountId, user.ownerAccountId),
        ),
      )

    scope.assignedBuildingIds = assignments.map((a) => a.buildingId)
  }

  request.tenantScope = scope
}
