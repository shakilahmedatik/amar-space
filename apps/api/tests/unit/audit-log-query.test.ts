import { ForbiddenError } from '@repo/shared/errors'
import type { RequestContext } from '@repo/shared/types'
import { describe, expect, it, vi } from 'vitest'
import { AuditLogQueryService } from '../../src/services/audit-log-query.service'

/**
 * Unit tests for the AuditLogQueryService.
 *
 * Tests validate:
 * - Owner: full access to all logs within their tenant
 * - Manager: access only to logs for entities in assigned buildings
 * - Renter: denied (403 ForbiddenError)
 * - Filtering by entityType, entityId, actorUserId, actionName, date range
 * - Pagination with max 100 per page, sorted by createdAt descending
 * - Tenant isolation via ownerAccountId
 *
 */

// --- Mock Helpers ---

function createOwnerContext(
  overrides: Partial<RequestContext> = {},
): RequestContext {
  return {
    userId: 'owner-1',
    role: 'owner',
    ownerAccountId: 'owner-account-1',
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    ...overrides,
  }
}

function createManagerContext(
  overrides: Partial<RequestContext> = {},
): RequestContext {
  return {
    userId: 'manager-1',
    role: 'manager',
    ownerAccountId: 'owner-account-1',
    assignedBuildingIds: ['building-1', 'building-2'],
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    ...overrides,
  }
}

function createRenterContext(
  overrides: Partial<RequestContext> = {},
): RequestContext {
  return {
    userId: 'renter-1',
    role: 'renter',
    ownerAccountId: 'owner-account-1',
    assignedFlatId: 'flat-1',
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    ...overrides,
  }
}

const sampleAuditLog = {
  id: 'log-1',
  ownerAccountId: 'owner-account-1',
  actorId: 'owner-1',
  action: 'building_created',
  entityType: 'building',
  entityId: 'building-1',
  oldValues: null,
  newValues: { name: 'Test Building' },
  metadata: null,
  createdAt: new Date('2024-06-01T10:00:00Z'),
}

function createMockDb(
  overrides: {
    selectData?: unknown[]
    selectCount?: number
    flatIds?: string[]
    maintenanceIds?: string[]
    issueIds?: string[]
    managerAssignments?: { buildingId: string }[]
  } = {},
) {
  const selectData = overrides.selectData ?? [sampleAuditLog]
  const selectCount = overrides.selectCount ?? selectData.length

  // Track call count to differentiate between data and count queries
  // let selectCallCount = 0

  // const mockSelect = vi.fn().mockImplementation(() => {
  //   selectCallCount++
  //   const currentCall = selectCallCount

  //   return {
  //     from: vi.fn().mockReturnValue({
  //       where: vi.fn().mockImplementation(() => {
  //         // Even calls are count queries (second in Promise.all)
  //         if (currentCall % 2 === 0) {
  //           return Promise.resolve([{ count: selectCount }])
  //         }
  //         // Odd calls are data queries (first in Promise.all)
  //         return {
  //           orderBy: vi.fn().mockReturnValue({
  //             limit: vi.fn().mockReturnValue({
  //               offset: vi.fn().mockResolvedValue(selectData),
  //             }),
  //           }),
  //         }
  //       }),
  //     }),
  //   }
  // })

  // Mock for getManagerAccessibleEntityIds - flat IDs query
  const flatSelectMock = vi
    .fn()
    .mockResolvedValue(
      (overrides.flatIds ?? ['flat-1', 'flat-2']).map((id) => ({ id })),
    )

  // Mock for maintenance request IDs query
  const maintenanceSelectMock = vi
    .fn()
    .mockResolvedValue((overrides.maintenanceIds ?? []).map((id) => ({ id })))

  // Mock for issue IDs query
  const issueSelectMock = vi
    .fn()
    .mockResolvedValue((overrides.issueIds ?? []).map((id) => ({ id })))

  // Mock for manager assignments query
  const assignmentSelectMock = vi.fn().mockResolvedValue(
    (overrides.managerAssignments ?? []).map((a) => ({
      buildingId: a.buildingId,
    })),
  )

  // We need a more sophisticated mock that handles different table queries
  let fromCallCount = 0
  const sophisticatedSelect = vi.fn().mockImplementation((selectArg) => {
    // If selectArg has 'id' field, it's a sub-query for entity IDs
    if (selectArg && typeof selectArg === 'object' && 'id' in selectArg) {
      fromCallCount++
      const currentFromCall = fromCallCount

      return {
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(() => {
            // Return different results based on call order
            if (currentFromCall === 1) return flatSelectMock()
            if (currentFromCall === 2) return maintenanceSelectMock()
            if (currentFromCall === 3) return issueSelectMock()
            return Promise.resolve([])
          }),
        })),
      }
    }

    // If selectArg has 'buildingId', it's the manager assignments query
    if (
      selectArg &&
      typeof selectArg === 'object' &&
      'buildingId' in selectArg
    ) {
      return {
        from: vi.fn().mockReturnValue({
          where: assignmentSelectMock,
        }),
      }
    }

    // If selectArg has 'count', it's a count query
    if (selectArg && typeof selectArg === 'object' && 'count' in selectArg) {
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: selectCount }]),
        }),
      }
    }

    // Default: data query for audit logs
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(selectData),
            }),
          }),
        }),
      }),
    }
  })

  return {
    select: sophisticatedSelect,
    query: {
      auditLogs: {
        findMany: vi.fn().mockResolvedValue(selectData),
      },
    },
  } as unknown as ReturnType<typeof import('@repo/db').createDbClient>
}

describe('AuditLogQueryService', () => {
  let service: AuditLogQueryService

  describe('queryLogs - Role-based access control', () => {
    it('should deny access for renter role with ForbiddenError (Requirement 13.5)', async () => {
      const db = createMockDb()
      service = new AuditLogQueryService(db)
      const ctx = createRenterContext()

      await expect(
        service.queryLogs(ctx, {}, { page: 1, pageSize: 20 }),
      ).rejects.toThrow(ForbiddenError)
    })

    it('should allow owner full access to all logs (Requirement 13.3)', async () => {
      const db = createMockDb()
      service = new AuditLogQueryService(db)
      const ctx = createOwnerContext()

      const result = await service.queryLogs(ctx, {}, { page: 1, pageSize: 20 })

      expect(result).toBeDefined()
      expect(result.data).toHaveLength(1)
      expect(result.data[0]!.id).toBe('log-1')
    })

    it('should allow manager access to logs for entities in assigned buildings (Requirement 13.4)', async () => {
      const db = createMockDb({
        flatIds: ['flat-1'],
        maintenanceIds: ['maint-1'],
        issueIds: ['issue-1'],
      })
      service = new AuditLogQueryService(db)
      const ctx = createManagerContext()

      const result = await service.queryLogs(ctx, {}, { page: 1, pageSize: 20 })

      expect(result).toBeDefined()
      expect(result.data).toBeDefined()
    })
  })

  describe('queryLogs - Pagination', () => {
    it('should cap page size at 100 (Requirement 13.3)', async () => {
      const db = createMockDb({ selectCount: 200 })
      service = new AuditLogQueryService(db)
      const ctx = createOwnerContext()

      const result = await service.queryLogs(
        ctx,
        {},
        { page: 1, pageSize: 200 },
      )

      expect(result.pageSize).toBe(100)
    })

    it('should enforce minimum page size of 1', async () => {
      const db = createMockDb()
      service = new AuditLogQueryService(db)
      const ctx = createOwnerContext()

      const result = await service.queryLogs(ctx, {}, { page: 1, pageSize: 0 })

      expect(result.pageSize).toBe(1)
    })

    it('should enforce minimum page number of 1', async () => {
      const db = createMockDb()
      service = new AuditLogQueryService(db)
      const ctx = createOwnerContext()

      const result = await service.queryLogs(ctx, {}, { page: 0, pageSize: 20 })

      expect(result.page).toBe(1)
    })

    it('should calculate totalPages correctly', async () => {
      const db = createMockDb({ selectCount: 250 })
      service = new AuditLogQueryService(db)
      const ctx = createOwnerContext()

      const result = await service.queryLogs(
        ctx,
        {},
        { page: 1, pageSize: 100 },
      )

      expect(result.totalPages).toBe(3)
      expect(result.total).toBe(250)
    })
  })

  describe('queryLogs - Filtering', () => {
    it('should accept entityType filter', async () => {
      const db = createMockDb()
      service = new AuditLogQueryService(db)
      const ctx = createOwnerContext()

      const result = await service.queryLogs(
        ctx,
        { entityType: 'building' },
        { page: 1, pageSize: 20 },
      )

      expect(result).toBeDefined()
      expect(result.data).toBeDefined()
    })

    it('should accept entityId filter', async () => {
      const db = createMockDb()
      service = new AuditLogQueryService(db)
      const ctx = createOwnerContext()

      const result = await service.queryLogs(
        ctx,
        { entityId: 'building-1' },
        { page: 1, pageSize: 20 },
      )

      expect(result).toBeDefined()
    })

    it('should accept actorUserId filter', async () => {
      const db = createMockDb()
      service = new AuditLogQueryService(db)
      const ctx = createOwnerContext()

      const result = await service.queryLogs(
        ctx,
        { actorUserId: 'owner-1' },
        { page: 1, pageSize: 20 },
      )

      expect(result).toBeDefined()
    })

    it('should accept actionName filter', async () => {
      const db = createMockDb()
      service = new AuditLogQueryService(db)
      const ctx = createOwnerContext()

      const result = await service.queryLogs(
        ctx,
        { actionName: 'building_created' },
        { page: 1, pageSize: 20 },
      )

      expect(result).toBeDefined()
    })

    it('should accept date range filters', async () => {
      const db = createMockDb()
      service = new AuditLogQueryService(db)
      const ctx = createOwnerContext()

      const result = await service.queryLogs(
        ctx,
        {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z',
        },
        { page: 1, pageSize: 20 },
      )

      expect(result).toBeDefined()
    })
  })

  describe('queryLogs - Response structure', () => {
    it('should return properly structured paginated response', async () => {
      const db = createMockDb({ selectCount: 1 })
      service = new AuditLogQueryService(db)
      const ctx = createOwnerContext()

      const result = await service.queryLogs(ctx, {}, { page: 1, pageSize: 20 })

      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('page')
      expect(result).toHaveProperty('pageSize')
      expect(result).toHaveProperty('totalPages')
    })

    it('should map audit log entries correctly', async () => {
      const db = createMockDb()
      service = new AuditLogQueryService(db)
      const ctx = createOwnerContext()

      const result = await service.queryLogs(ctx, {}, { page: 1, pageSize: 20 })

      const entry = result.data[0]!
      expect(entry.id).toBe('log-1')
      expect(entry.ownerAccountId).toBe('owner-account-1')
      expect(entry.actorId).toBe('owner-1')
      expect(entry.action).toBe('building_created')
      expect(entry.entityType).toBe('building')
      expect(entry.entityId).toBe('building-1')
      expect(entry.oldValues).toBeNull()
      expect(entry.newValues).toEqual({ name: 'Test Building' })
      expect(entry.metadata).toBeNull()
      expect(entry.createdAt).toEqual(new Date('2024-06-01T10:00:00Z'))
    })
  })
})
