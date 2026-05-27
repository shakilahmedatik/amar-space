import { managerAssignments, rentalContracts, renters } from '@repo/db'
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
  /** For renters: the flat ID from their active rental contract */
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
 * - For renters: queries renters + rental_contracts to resolve the active contract's flat ID
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
 *
 * Requirements: 17.2, 17.5, 17.7
 */
export async function tenantScope(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const { user } = request
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

  if (user.role === 'renter') {
    // First find the renter record by userId
    const renterRecords = await db
      .select({ id: renters.id })
      .from(renters)
      .where(
        and(
          eq(renters.userId, user.id),
          eq(renters.ownerAccountId, user.ownerAccountId),
        ),
      )

    const renterRecord = renterRecords[0]
    if (renterRecord) {
      // Then find the active rental contract for this renter
      const contracts = await db
        .select({ flatId: rentalContracts.flatId })
        .from(rentalContracts)
        .where(
          and(
            eq(rentalContracts.renterId, renterRecord.id),
            eq(rentalContracts.ownerAccountId, user.ownerAccountId),
            eq(rentalContracts.status, 'active'),
          ),
        )

      const activeContract = contracts[0]
      if (activeContract) {
        scope.assignedFlatId = activeContract.flatId
      }
    }
  }

  request.tenantScope = scope
}
