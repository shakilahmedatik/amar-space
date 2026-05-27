import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@repo/shared/errors'
import type { RequestContext } from '@repo/shared/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NoticeService } from '../../src/services/notice.service'

/**
 * Unit tests for the NoticeService.
 *
 * Tests validate:
 * - Notice creation with field validation (title max 200, body max 5000)
 * - Target audience validation (building/flat reference required for specific targets)
 * - Manager can only target assigned buildings
 * - Author or Owner can edit/delete notices
 * - Pin/unpin with max 5 pinned per target audience scope
 * - Role-based visibility filtering
 * - Pagination with max 50 per page
 * - Audit event recording
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 12.11, 12.12, 12.13
 */

// --- Mock Helpers ---

function createMockAuditLogger() {
  return {
    log: vi.fn(),
    query: vi.fn(),
    pendingRetries: 0,
    shutdown: vi.fn(),
  }
}

// Valid UUIDs for testing
const OWNER_ID = '550e8400-e29b-41d4-a716-446655440000'
const BUILDING_ID = '550e8400-e29b-41d4-a716-446655440001'
const NOTICE_ID = '550e8400-e29b-41d4-a716-446655440002'
const MANAGER_ID = '550e8400-e29b-41d4-a716-446655440003'
const FLAT_ID = '550e8400-e29b-41d4-a716-446655440004'
const RENTER_ID = '550e8400-e29b-41d4-a716-446655440005'

function createDefaultNotice(overrides: Record<string, unknown> = {}) {
  return {
    id: NOTICE_ID,
    ownerAccountId: OWNER_ID,
    authorId: OWNER_ID,
    title: 'Test Notice',
    body: 'This is a test notice body',
    targetAudience: 'all_renters',
    targetBuildingId: null,
    targetFlatId: null,
    isPinned: false,
    pinnedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

function createMockDb(
  overrides: {
    findFirstNotice?: unknown
    findFirstBuilding?: unknown
    findFirstFlat?: unknown
    findFirstManagerAssignment?: unknown
    insertResult?: unknown
    updateResult?: unknown
    deleteResult?: unknown
    selectResult?: unknown[]
    countResult?: number
    pinnedCountResult?: number
  } = {},
) {
  const defaultNotice =
    overrides.findFirstNotice !== undefined ? overrides.findFirstNotice : null

  const defaultBuilding =
    overrides.findFirstBuilding !== undefined
      ? overrides.findFirstBuilding
      : {
          id: BUILDING_ID,
          ownerAccountId: OWNER_ID,
          name: 'Test Building',
        }

  const defaultFlat =
    overrides.findFirstFlat !== undefined
      ? overrides.findFirstFlat
      : {
          id: FLAT_ID,
          ownerAccountId: OWNER_ID,
          buildingId: BUILDING_ID,
          flatNumber: '101',
        }

  const defaultManagerAssignment =
    overrides.findFirstManagerAssignment !== undefined
      ? overrides.findFirstManagerAssignment
      : { id: 'assignment-1', managerId: MANAGER_ID, buildingId: BUILDING_ID }

  const defaultInsertResult = overrides.insertResult ?? createDefaultNotice()

  const defaultUpdateResult =
    overrides.updateResult ?? createDefaultNotice({ updatedAt: new Date() })

  const defaultSelectResult = overrides.selectResult ?? []
  const defaultCount = overrides.countResult ?? 0
  const pinnedCount = overrides.pinnedCountResult ?? 0

  const mockInsert = vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([defaultInsertResult]),
    }),
  })

  const mockUpdate = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([defaultUpdateResult]),
      }),
    }),
  })

  const mockDelete = vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  })

  const mockSelect = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockResolvedValue(defaultSelectResult),
          }),
        }),
      }),
    }),
  })

  // Track select calls to differentiate between data queries and count queries
  let countCallIndex = 0
  const selectFn = vi.fn().mockImplementation((...args: unknown[]) => {
    // Check if this is a count query (has count in args)
    if (
      args.length > 0 &&
      typeof args[0] === 'object' &&
      args[0] !== null &&
      'count' in (args[0] as Record<string, unknown>)
    ) {
      // First count call is for enforcePinLimit (if pinning), subsequent for list
      const countValue =
        countCallIndex === 0 && pinnedCount >= 0
          ? overrides.pinnedCountResult !== undefined
            ? pinnedCount
            : defaultCount
          : defaultCount
      countCallIndex++
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: countValue }]),
        }),
      }
    }
    return mockSelect()
  })

  return {
    query: {
      notices: {
        findFirst: vi.fn().mockResolvedValue(defaultNotice),
      },
      buildings: {
        findFirst: vi.fn().mockResolvedValue(defaultBuilding),
      },
      flats: {
        findFirst: vi.fn().mockResolvedValue(defaultFlat),
      },
      managerAssignments: {
        findFirst: vi.fn().mockResolvedValue(defaultManagerAssignment),
      },
    },
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    select: selectFn,
  } as unknown
}

function createOwnerContext(
  overrides: Partial<RequestContext> = {},
): RequestContext {
  return {
    userId: OWNER_ID,
    role: 'owner',
    ownerAccountId: OWNER_ID,
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    ...overrides,
  }
}

function createManagerContext(
  overrides: Partial<RequestContext> = {},
): RequestContext {
  return {
    userId: MANAGER_ID,
    role: 'manager',
    ownerAccountId: OWNER_ID,
    assignedBuildingIds: [BUILDING_ID],
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    ...overrides,
  }
}

function createRenterContext(
  overrides: Partial<RequestContext> = {},
): RequestContext {
  return {
    userId: RENTER_ID,
    role: 'renter',
    ownerAccountId: OWNER_ID,
    assignedBuildingIds: [BUILDING_ID],
    assignedFlatId: FLAT_ID,
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    ...overrides,
  }
}

// --- Tests ---

describe('NoticeService', () => {
  let auditLogger: ReturnType<typeof createMockAuditLogger>
  let ctx: RequestContext

  beforeEach(() => {
    auditLogger = createMockAuditLogger()
    ctx = createOwnerContext()
  })

  describe('createNotice', () => {
    it('should create a notice successfully with valid input for all_renters', async () => {
      const db = createMockDb()
      const service = new NoticeService(db as any, auditLogger as any)

      const result = await service.createNotice(ctx, {
        title: 'Important Notice',
        body: 'This is an important notice for all renters.',
        targetAudience: 'all_renters',
      })

      expect(result.id).toBe(NOTICE_ID)
      expect(result.title).toBe('Test Notice')
      expect(result.targetAudience).toBe('all_renters')
    })

    it('should reject title longer than 200 characters', async () => {
      const db = createMockDb()
      const service = new NoticeService(db as any, auditLogger as any)

      await expect(
        service.createNotice(ctx, {
          title: 'A'.repeat(201),
          body: 'Valid body',
          targetAudience: 'all_renters',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject body longer than 5000 characters', async () => {
      const db = createMockDb()
      const service = new NoticeService(db as any, auditLogger as any)

      await expect(
        service.createNotice(ctx, {
          title: 'Valid title',
          body: 'A'.repeat(5001),
          targetAudience: 'all_renters',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject empty title', async () => {
      const db = createMockDb()
      const service = new NoticeService(db as any, auditLogger as any)

      await expect(
        service.createNotice(ctx, {
          title: '',
          body: 'Valid body',
          targetAudience: 'all_renters',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject empty body', async () => {
      const db = createMockDb()
      const service = new NoticeService(db as any, auditLogger as any)

      await expect(
        service.createNotice(ctx, {
          title: 'Valid title',
          body: '',
          targetAudience: 'all_renters',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject invalid target audience', async () => {
      const db = createMockDb()
      const service = new NoticeService(db as any, auditLogger as any)

      await expect(
        service.createNotice(ctx, {
          title: 'Valid title',
          body: 'Valid body',
          targetAudience: 'invalid_target' as any,
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should require buildingId for specific_building target', async () => {
      const db = createMockDb()
      const service = new NoticeService(db as any, auditLogger as any)

      await expect(
        service.createNotice(ctx, {
          title: 'Building Notice',
          body: 'Notice for specific building',
          targetAudience: 'specific_building',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should require flatId for specific_flat target', async () => {
      const db = createMockDb()
      const service = new NoticeService(db as any, auditLogger as any)

      await expect(
        service.createNotice(ctx, {
          title: 'Flat Notice',
          body: 'Notice for specific flat',
          targetAudience: 'specific_flat',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject when referenced building does not exist', async () => {
      const db = createMockDb({ findFirstBuilding: null })
      const service = new NoticeService(db as any, auditLogger as any)

      await expect(
        service.createNotice(ctx, {
          title: 'Building Notice',
          body: 'Notice for specific building',
          targetAudience: 'specific_building',
          targetBuildingId: '550e8400-e29b-41d4-a716-446655440099',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject when referenced flat does not exist', async () => {
      const db = createMockDb({ findFirstFlat: null })
      const service = new NoticeService(db as any, auditLogger as any)

      await expect(
        service.createNotice(ctx, {
          title: 'Flat Notice',
          body: 'Notice for specific flat',
          targetAudience: 'specific_flat',
          targetFlatId: '550e8400-e29b-41d4-a716-446655440099',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject when manager targets unassigned building', async () => {
      const managerCtx = createManagerContext()
      const db = createMockDb({ findFirstManagerAssignment: null })
      const service = new NoticeService(db as any, auditLogger as any)

      await expect(
        service.createNotice(managerCtx, {
          title: 'Building Notice',
          body: 'Notice for specific building',
          targetAudience: 'specific_building',
          targetBuildingId: BUILDING_ID,
        }),
      ).rejects.toThrow(ForbiddenError)
    })

    it('should allow manager to target assigned building', async () => {
      const managerCtx = createManagerContext()
      const insertResult = createDefaultNotice({
        authorId: MANAGER_ID,
        targetAudience: 'specific_building',
        targetBuildingId: BUILDING_ID,
      })
      const db = createMockDb({ insertResult })
      const service = new NoticeService(db as any, auditLogger as any)

      const result = await service.createNotice(managerCtx, {
        title: 'Building Notice',
        body: 'Notice for specific building',
        targetAudience: 'specific_building',
        targetBuildingId: BUILDING_ID,
      })

      expect(result.targetAudience).toBe('specific_building')
      expect(result.targetBuildingId).toBe(BUILDING_ID)
    })

    it('should record audit event on creation', async () => {
      const db = createMockDb()
      const service = new NoticeService(db as any, auditLogger as any)

      await service.createNotice(ctx, {
        title: 'Important Notice',
        body: 'This is an important notice.',
        targetAudience: 'all_renters',
      })

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: OWNER_ID,
          action: 'notice_created',
          entityType: 'notice',
          entityId: NOTICE_ID,
          ownerAccountId: OWNER_ID,
        }),
      )
    })
  })

  describe('updateNotice', () => {
    it('should allow owner to update any notice', async () => {
      const existing = createDefaultNotice({ authorId: MANAGER_ID })
      const updated = {
        ...existing,
        title: 'Updated Title',
        updatedAt: new Date(),
      }
      const db = createMockDb({
        findFirstNotice: existing,
        updateResult: updated,
      })
      const service = new NoticeService(db as any, auditLogger as any)

      const result = await service.updateNotice(ctx, NOTICE_ID, {
        title: 'Updated Title',
      })

      expect(result.title).toBe('Updated Title')
    })

    it('should allow author to update their own notice', async () => {
      const managerCtx = createManagerContext()
      const existing = createDefaultNotice({ authorId: MANAGER_ID })
      const updated = {
        ...existing,
        title: 'Updated Title',
        updatedAt: new Date(),
      }
      const db = createMockDb({
        findFirstNotice: existing,
        updateResult: updated,
      })
      const service = new NoticeService(db as any, auditLogger as any)

      const result = await service.updateNotice(managerCtx, NOTICE_ID, {
        title: 'Updated Title',
      })

      expect(result.title).toBe('Updated Title')
    })

    it('should reject non-author manager from editing another managers notice', async () => {
      const managerCtx = createManagerContext()
      const existing = createDefaultNotice({ authorId: OWNER_ID })
      const db = createMockDb({ findFirstNotice: existing })
      const service = new NoticeService(db as any, auditLogger as any)

      await expect(
        service.updateNotice(managerCtx, NOTICE_ID, { title: 'New Title' }),
      ).rejects.toThrow(ForbiddenError)
    })

    it('should reject when notice does not exist', async () => {
      const db = createMockDb({ findFirstNotice: null })
      const service = new NoticeService(db as any, auditLogger as any)

      await expect(
        service.updateNotice(ctx, '550e8400-e29b-41d4-a716-446655440099', {
          title: 'New Title',
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('should record audit event on update', async () => {
      const existing = createDefaultNotice()
      const updated = { ...existing, title: 'Updated', updatedAt: new Date() }
      const db = createMockDb({
        findFirstNotice: existing,
        updateResult: updated,
      })
      const service = new NoticeService(db as any, auditLogger as any)

      await service.updateNotice(ctx, NOTICE_ID, { title: 'Updated' })

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: OWNER_ID,
          action: 'notice_updated',
          entityType: 'notice',
          entityId: NOTICE_ID,
        }),
      )
    })
  })

  describe('deleteNotice', () => {
    it('should allow owner to delete any notice', async () => {
      const existing = createDefaultNotice({ authorId: MANAGER_ID })
      const db = createMockDb({ findFirstNotice: existing })
      const service = new NoticeService(db as any, auditLogger as any)

      await expect(
        service.deleteNotice(ctx, NOTICE_ID),
      ).resolves.toBeUndefined()
    })

    it('should allow author to delete their own notice', async () => {
      const managerCtx = createManagerContext()
      const existing = createDefaultNotice({ authorId: MANAGER_ID })
      const db = createMockDb({ findFirstNotice: existing })
      const service = new NoticeService(db as any, auditLogger as any)

      await expect(
        service.deleteNotice(managerCtx, NOTICE_ID),
      ).resolves.toBeUndefined()
    })

    it('should reject non-author manager from deleting another managers notice', async () => {
      const managerCtx = createManagerContext()
      const existing = createDefaultNotice({ authorId: OWNER_ID })
      const db = createMockDb({ findFirstNotice: existing })
      const service = new NoticeService(db as any, auditLogger as any)

      await expect(service.deleteNotice(managerCtx, NOTICE_ID)).rejects.toThrow(
        ForbiddenError,
      )
    })

    it('should reject when notice does not exist', async () => {
      const db = createMockDb({ findFirstNotice: null })
      const service = new NoticeService(db as any, auditLogger as any)

      await expect(
        service.deleteNotice(ctx, '550e8400-e29b-41d4-a716-446655440099'),
      ).rejects.toThrow(NotFoundError)
    })

    it('should record audit event on deletion', async () => {
      const existing = createDefaultNotice()
      const db = createMockDb({ findFirstNotice: existing })
      const service = new NoticeService(db as any, auditLogger as any)

      await service.deleteNotice(ctx, NOTICE_ID)

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: OWNER_ID,
          action: 'notice_deleted',
          entityType: 'notice',
          entityId: NOTICE_ID,
        }),
      )
    })
  })

  describe('togglePin', () => {
    it('should pin an unpinned notice', async () => {
      const existing = createDefaultNotice({ isPinned: false })
      const updated = { ...existing, isPinned: true, pinnedAt: new Date() }
      const db = createMockDb({
        findFirstNotice: existing,
        updateResult: updated,
        pinnedCountResult: 3,
      })
      const service = new NoticeService(db as any, auditLogger as any)

      const result = await service.togglePin(ctx, NOTICE_ID)

      expect(result.isPinned).toBe(true)
    })

    it('should unpin a pinned notice', async () => {
      const existing = createDefaultNotice({
        isPinned: true,
        pinnedAt: new Date(),
      })
      const updated = { ...existing, isPinned: false, pinnedAt: null }
      const db = createMockDb({
        findFirstNotice: existing,
        updateResult: updated,
      })
      const service = new NoticeService(db as any, auditLogger as any)

      const result = await service.togglePin(ctx, NOTICE_ID)

      expect(result.isPinned).toBe(false)
    })

    it('should reject pinning when max 5 pinned per scope is reached', async () => {
      const existing = createDefaultNotice({ isPinned: false })
      const db = createMockDb({
        findFirstNotice: existing,
        pinnedCountResult: 5,
      })
      const service = new NoticeService(db as any, auditLogger as any)

      await expect(service.togglePin(ctx, NOTICE_ID)).rejects.toThrow(
        ValidationError,
      )
    })

    it('should reject when notice does not exist', async () => {
      const db = createMockDb({ findFirstNotice: null })
      const service = new NoticeService(db as any, auditLogger as any)

      await expect(
        service.togglePin(ctx, '550e8400-e29b-41d4-a716-446655440099'),
      ).rejects.toThrow(NotFoundError)
    })

    it('should record audit event on pin toggle', async () => {
      const existing = createDefaultNotice({ isPinned: false })
      const updated = { ...existing, isPinned: true, pinnedAt: new Date() }
      const db = createMockDb({
        findFirstNotice: existing,
        updateResult: updated,
        pinnedCountResult: 2,
      })
      const service = new NoticeService(db as any, auditLogger as any)

      await service.togglePin(ctx, NOTICE_ID)

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: OWNER_ID,
          action: 'notice_pinned',
          entityType: 'notice',
          entityId: NOTICE_ID,
          oldValues: { isPinned: false },
          newValues: { isPinned: true },
        }),
      )
    })
  })

  describe('listNotices', () => {
    it('should cap page size at 50', async () => {
      const db = createMockDb({ selectResult: [], countResult: 0 })
      const service = new NoticeService(db as any, auditLogger as any)

      const result = await service.listNotices(ctx, {
        page: 1,
        pageSize: 100,
      })

      expect(result.pageSize).toBeLessThanOrEqual(50)
    })

    it('should default page to 1 when less than 1', async () => {
      const db = createMockDb({ selectResult: [], countResult: 0 })
      const service = new NoticeService(db as any, auditLogger as any)

      const result = await service.listNotices(ctx, {
        page: 0,
        pageSize: 10,
      })

      expect(result.page).toBe(1)
    })

    it('should return paginated results', async () => {
      const noticeData = [createDefaultNotice()]
      const db = createMockDb({ selectResult: noticeData, countResult: 1 })
      const service = new NoticeService(db as any, auditLogger as any)

      const result = await service.listNotices(ctx, {
        page: 1,
        pageSize: 10,
      })

      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.totalPages).toBe(1)
    })
  })

  describe('getNotice', () => {
    it('should return a notice for owner', async () => {
      const existing = createDefaultNotice()
      const db = createMockDb({ findFirstNotice: existing })
      const service = new NoticeService(db as any, auditLogger as any)

      const result = await service.getNotice(ctx, NOTICE_ID)

      expect(result.id).toBe(NOTICE_ID)
      expect(result.title).toBe('Test Notice')
    })

    it('should reject when notice does not exist', async () => {
      const db = createMockDb({ findFirstNotice: null })
      const service = new NoticeService(db as any, auditLogger as any)

      await expect(
        service.getNotice(ctx, '550e8400-e29b-41d4-a716-446655440099'),
      ).rejects.toThrow(NotFoundError)
    })

    it('should reject when renter cannot see managers_only notice', async () => {
      const renterCtx = createRenterContext()
      const existing = createDefaultNotice({ targetAudience: 'managers_only' })
      const db = createMockDb({ findFirstNotice: existing })
      const service = new NoticeService(db as any, auditLogger as any)

      await expect(service.getNotice(renterCtx, NOTICE_ID)).rejects.toThrow(
        NotFoundError,
      )
    })

    it('should allow renter to see all_renters notice', async () => {
      const renterCtx = createRenterContext()
      const existing = createDefaultNotice({ targetAudience: 'all_renters' })
      const db = createMockDb({ findFirstNotice: existing })
      const service = new NoticeService(db as any, auditLogger as any)

      const result = await service.getNotice(renterCtx, NOTICE_ID)

      expect(result.id).toBe(NOTICE_ID)
    })

    it('should allow renter to see notice for their building', async () => {
      const renterCtx = createRenterContext()
      const existing = createDefaultNotice({
        targetAudience: 'specific_building',
        targetBuildingId: BUILDING_ID,
      })
      const db = createMockDb({ findFirstNotice: existing })
      const service = new NoticeService(db as any, auditLogger as any)

      const result = await service.getNotice(renterCtx, NOTICE_ID)

      expect(result.id).toBe(NOTICE_ID)
    })

    it('should allow renter to see notice for their flat', async () => {
      const renterCtx = createRenterContext()
      const existing = createDefaultNotice({
        targetAudience: 'specific_flat',
        targetFlatId: FLAT_ID,
      })
      const db = createMockDb({ findFirstNotice: existing })
      const service = new NoticeService(db as any, auditLogger as any)

      const result = await service.getNotice(renterCtx, NOTICE_ID)

      expect(result.id).toBe(NOTICE_ID)
    })

    it('should reject renter from seeing notice for another flat', async () => {
      const renterCtx = createRenterContext()
      const existing = createDefaultNotice({
        targetAudience: 'specific_flat',
        targetFlatId: '550e8400-e29b-41d4-a716-446655440099',
      })
      const db = createMockDb({ findFirstNotice: existing })
      const service = new NoticeService(db as any, auditLogger as any)

      await expect(service.getNotice(renterCtx, NOTICE_ID)).rejects.toThrow(
        NotFoundError,
      )
    })

    it('should allow manager to see managers_only notice', async () => {
      const managerCtx = createManagerContext()
      const existing = createDefaultNotice({ targetAudience: 'managers_only' })
      const db = createMockDb({ findFirstNotice: existing })
      const service = new NoticeService(db as any, auditLogger as any)

      const result = await service.getNotice(managerCtx, NOTICE_ID)

      expect(result.id).toBe(NOTICE_ID)
    })

    it('should allow manager to see notice for assigned building', async () => {
      const managerCtx = createManagerContext()
      const existing = createDefaultNotice({
        targetAudience: 'specific_building',
        targetBuildingId: BUILDING_ID,
      })
      const db = createMockDb({ findFirstNotice: existing })
      const service = new NoticeService(db as any, auditLogger as any)

      const result = await service.getNotice(managerCtx, NOTICE_ID)

      expect(result.id).toBe(NOTICE_ID)
    })

    it('should reject manager from seeing notice for unassigned building', async () => {
      const managerCtx = createManagerContext()
      const existing = createDefaultNotice({
        targetAudience: 'specific_building',
        targetBuildingId: '550e8400-e29b-41d4-a716-446655440099',
      })
      const db = createMockDb({ findFirstNotice: existing })
      const service = new NoticeService(db as any, auditLogger as any)

      await expect(service.getNotice(managerCtx, NOTICE_ID)).rejects.toThrow(
        NotFoundError,
      )
    })
  })
})
