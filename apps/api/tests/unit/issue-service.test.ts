import { NotFoundError, ValidationError } from '@repo/shared/errors'
import type { RequestContext } from '@repo/shared/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IssueService } from '../../src/services/issue.service'

/**
 * Unit tests for the IssueService.
 *
 * Tests validate:
 * - Issue creation with field validation
 * - Issue assignment requires Manager role
 * - Status transition state machine
 * - Resolution notes required for Resolved status
 * - Listing with pagination (max 50) and filtering
 * - Audit event recording for status changes
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10
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
const ISSUE_ID = '550e8400-e29b-41d4-a716-446655440002'
const MANAGER_ID = '550e8400-e29b-41d4-a716-446655440003'
const RENTER_ID = '550e8400-e29b-41d4-a716-446655440004'

function createMockDb(
  overrides: {
    findFirstIssue?: unknown
    findFirstBuilding?: unknown
    findFirstUser?: unknown
    insertResult?: unknown
    updateResult?: unknown
    selectResult?: unknown[]
    countResult?: number
  } = {},
) {
  const defaultIssue =
    overrides.findFirstIssue !== undefined ? overrides.findFirstIssue : null

  const defaultBuilding =
    overrides.findFirstBuilding !== undefined
      ? overrides.findFirstBuilding
      : {
          id: BUILDING_ID,
          ownerAccountId: OWNER_ID,
          name: 'Test Building',
        }

  const defaultUser =
    overrides.findFirstUser !== undefined
      ? overrides.findFirstUser
      : { id: MANAGER_ID, role: 'manager' }

  const defaultInsertResult = overrides.insertResult ?? {
    id: ISSUE_ID,
    ownerAccountId: OWNER_ID,
    buildingId: BUILDING_ID,
    title: 'Broken elevator',
    description: 'The elevator is not working properly',
    category: 'structural',
    priority: 'high',
    status: 'open',
    assigneeId: null,
    resolutionNotes: null,
    resolvedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  const defaultUpdateResult = overrides.updateResult ?? {
    id: ISSUE_ID,
    ownerAccountId: OWNER_ID,
    buildingId: BUILDING_ID,
    title: 'Broken elevator',
    description: 'The elevator is not working properly',
    category: 'structural',
    priority: 'high',
    status: 'in_progress',
    assigneeId: null,
    resolutionNotes: null,
    resolvedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  }

  const defaultSelectResult = overrides.selectResult ?? []
  const defaultCount = overrides.countResult ?? 0

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

  const mockSelectCount = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count: defaultCount }]),
    }),
  })

  let selectCallCount = 0
  const selectFn = vi.fn().mockImplementation((...args: unknown[]) => {
    selectCallCount++
    if (
      args.length > 0 &&
      typeof args[0] === 'object' &&
      args[0] !== null &&
      'count' in (args[0] as Record<string, unknown>)
    ) {
      return mockSelectCount(...args)
    }
    if (selectCallCount % 2 === 0) {
      return mockSelectCount()
    }
    return mockSelect()
  })

  return {
    query: {
      issues: {
        findFirst: vi.fn().mockResolvedValue(defaultIssue),
      },
      buildings: {
        findFirst: vi.fn().mockResolvedValue(defaultBuilding),
      },
      users: {
        findFirst: vi.fn().mockResolvedValue(defaultUser),
      },
    },
    insert: mockInsert,
    update: mockUpdate,
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

// --- Tests ---

describe('IssueService', () => {
  let auditLogger: ReturnType<typeof createMockAuditLogger>
  let ctx: RequestContext

  beforeEach(() => {
    auditLogger = createMockAuditLogger()
    ctx = createOwnerContext()
  })

  describe('createIssue', () => {
    it('should create an issue successfully with valid input', async () => {
      const db = createMockDb()
      const service = new IssueService(db as any, auditLogger as any)

      const result = await service.createIssue(ctx, {
        buildingId: BUILDING_ID,
        title: 'Broken elevator',
        description: 'The elevator is not working properly',
        category: 'structural',
        priority: 'high',
      })

      expect(result.id).toBe(ISSUE_ID)
      expect(result.title).toBe('Broken elevator')
      expect(result.status).toBe('open')
      expect(result.category).toBe('structural')
      expect(result.priority).toBe('high')
    })

    it('should reject title longer than 200 characters', async () => {
      const db = createMockDb()
      const service = new IssueService(db as any, auditLogger as any)

      await expect(
        service.createIssue(ctx, {
          buildingId: BUILDING_ID,
          title: 'A'.repeat(201),
          description: 'Valid description',
          category: 'plumbing',
          priority: 'low',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject description longer than 2000 characters', async () => {
      const db = createMockDb()
      const service = new IssueService(db as any, auditLogger as any)

      await expect(
        service.createIssue(ctx, {
          buildingId: BUILDING_ID,
          title: 'Valid title',
          description: 'A'.repeat(2001),
          category: 'plumbing',
          priority: 'low',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject invalid category', async () => {
      const db = createMockDb()
      const service = new IssueService(db as any, auditLogger as any)

      await expect(
        service.createIssue(ctx, {
          buildingId: BUILDING_ID,
          title: 'Valid title',
          description: 'Valid description',
          category: 'invalid_category' as any,
          priority: 'low',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject invalid priority', async () => {
      const db = createMockDb()
      const service = new IssueService(db as any, auditLogger as any)

      await expect(
        service.createIssue(ctx, {
          buildingId: BUILDING_ID,
          title: 'Valid title',
          description: 'Valid description',
          category: 'plumbing',
          priority: 'critical' as any,
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject when building does not exist', async () => {
      const db = createMockDb({ findFirstBuilding: null })
      const service = new IssueService(db as any, auditLogger as any)

      await expect(
        service.createIssue(ctx, {
          buildingId: '550e8400-e29b-41d4-a716-446655440099',
          title: 'Valid title',
          description: 'Valid description',
          category: 'plumbing',
          priority: 'low',
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('should record audit event on creation', async () => {
      const db = createMockDb()
      const service = new IssueService(db as any, auditLogger as any)

      await service.createIssue(ctx, {
        buildingId: BUILDING_ID,
        title: 'Broken elevator',
        description: 'The elevator is not working properly',
        category: 'structural',
        priority: 'high',
      })

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: OWNER_ID,
          action: 'issue_created',
          entityType: 'issue',
          entityId: ISSUE_ID,
          ownerAccountId: OWNER_ID,
        }),
      )
    })

    it('should reject empty title', async () => {
      const db = createMockDb()
      const service = new IssueService(db as any, auditLogger as any)

      await expect(
        service.createIssue(ctx, {
          buildingId: BUILDING_ID,
          title: '',
          description: 'Valid description',
          category: 'plumbing',
          priority: 'low',
        }),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('assignIssue', () => {
    it('should assign issue to a user with Manager role', async () => {
      const existingIssue = {
        id: ISSUE_ID,
        ownerAccountId: OWNER_ID,
        buildingId: BUILDING_ID,
        title: 'Broken elevator',
        description: 'The elevator is not working properly',
        category: 'structural',
        priority: 'high',
        status: 'open',
        assigneeId: null,
        resolutionNotes: null,
        resolvedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const updatedIssue = {
        ...existingIssue,
        assigneeId: MANAGER_ID,
        updatedAt: new Date('2024-01-02'),
      }
      const db = createMockDb({
        findFirstIssue: existingIssue,
        findFirstUser: { id: MANAGER_ID, role: 'manager' },
        updateResult: updatedIssue,
      })
      const service = new IssueService(db as any, auditLogger as any)

      const result = await service.assignIssue(ctx, ISSUE_ID, {
        assigneeId: MANAGER_ID,
      })

      expect(result.assigneeId).toBe(MANAGER_ID)
    })

    it('should reject assignment to non-Manager user', async () => {
      const existingIssue = {
        id: ISSUE_ID,
        ownerAccountId: OWNER_ID,
        buildingId: BUILDING_ID,
        title: 'Broken elevator',
        description: 'desc',
        category: 'structural',
        priority: 'high',
        status: 'open',
        assigneeId: null,
        resolutionNotes: null,
        resolvedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb({
        findFirstIssue: existingIssue,
        findFirstUser: { id: RENTER_ID, role: 'renter' },
      })
      const service = new IssueService(db as any, auditLogger as any)

      await expect(
        service.assignIssue(ctx, ISSUE_ID, { assigneeId: RENTER_ID }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject assignment when user does not exist', async () => {
      const existingIssue = {
        id: ISSUE_ID,
        ownerAccountId: OWNER_ID,
        buildingId: BUILDING_ID,
        title: 'Broken elevator',
        description: 'desc',
        category: 'structural',
        priority: 'high',
        status: 'open',
        assigneeId: null,
        resolutionNotes: null,
        resolvedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb({
        findFirstIssue: existingIssue,
        findFirstUser: null,
      })
      const service = new IssueService(db as any, auditLogger as any)

      await expect(
        service.assignIssue(ctx, ISSUE_ID, { assigneeId: '550e8400-e29b-41d4-a716-446655440099' }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject when issue does not exist', async () => {
      const db = createMockDb({ findFirstIssue: null })
      const service = new IssueService(db as any, auditLogger as any)

      await expect(
        service.assignIssue(ctx, '550e8400-e29b-41d4-a716-446655440099', { assigneeId: MANAGER_ID }),
      ).rejects.toThrow(NotFoundError)
    })

    it('should record audit event on assignment', async () => {
      const existingIssue = {
        id: ISSUE_ID,
        ownerAccountId: OWNER_ID,
        buildingId: BUILDING_ID,
        title: 'Broken elevator',
        description: 'desc',
        category: 'structural',
        priority: 'high',
        status: 'open',
        assigneeId: null,
        resolutionNotes: null,
        resolvedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb({
        findFirstIssue: existingIssue,
        findFirstUser: { id: MANAGER_ID, role: 'manager' },
        updateResult: { ...existingIssue, assigneeId: MANAGER_ID },
      })
      const service = new IssueService(db as any, auditLogger as any)

      await service.assignIssue(ctx, ISSUE_ID, { assigneeId: MANAGER_ID })

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: OWNER_ID,
          action: 'issue_assigned',
          entityType: 'issue',
          entityId: ISSUE_ID,
          oldValues: { assigneeId: null },
          newValues: { assigneeId: MANAGER_ID },
        }),
      )
    })
  })

  describe('updateIssueStatus', () => {
    it('should transition from Open to In_Progress', async () => {
      const existingIssue = {
        id: ISSUE_ID,
        ownerAccountId: OWNER_ID,
        buildingId: BUILDING_ID,
        title: 'Broken elevator',
        description: 'desc',
        category: 'structural',
        priority: 'high',
        status: 'open',
        assigneeId: null,
        resolutionNotes: null,
        resolvedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb({
        findFirstIssue: existingIssue,
        updateResult: { ...existingIssue, status: 'in_progress' },
      })
      const service = new IssueService(db as any, auditLogger as any)

      const result = await service.updateIssueStatus(ctx, ISSUE_ID, {
        status: 'in_progress',
      })

      expect(result.status).toBe('in_progress')
    })

    it('should transition from Open to Resolved with notes', async () => {
      const existingIssue = {
        id: ISSUE_ID,
        ownerAccountId: OWNER_ID,
        buildingId: BUILDING_ID,
        title: 'Broken elevator',
        description: 'desc',
        category: 'structural',
        priority: 'high',
        status: 'open',
        assigneeId: null,
        resolutionNotes: null,
        resolvedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb({
        findFirstIssue: existingIssue,
        updateResult: {
          ...existingIssue,
          status: 'resolved',
          resolutionNotes: 'Fixed the motor',
          resolvedAt: new Date(),
        },
      })
      const service = new IssueService(db as any, auditLogger as any)

      const result = await service.updateIssueStatus(ctx, ISSUE_ID, {
        status: 'resolved',
        resolutionNotes: 'Fixed the motor',
      })

      expect(result.status).toBe('resolved')
      expect(result.resolutionNotes).toBe('Fixed the motor')
    })

    it('should reject Resolved without resolution notes', async () => {
      const existingIssue = {
        id: ISSUE_ID,
        ownerAccountId: OWNER_ID,
        buildingId: BUILDING_ID,
        title: 'Broken elevator',
        description: 'desc',
        category: 'structural',
        priority: 'high',
        status: 'open',
        assigneeId: null,
        resolutionNotes: null,
        resolvedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb({ findFirstIssue: existingIssue })
      const service = new IssueService(db as any, auditLogger as any)

      await expect(
        service.updateIssueStatus(ctx, ISSUE_ID, { status: 'resolved' }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject Resolved with empty resolution notes', async () => {
      const existingIssue = {
        id: ISSUE_ID,
        ownerAccountId: OWNER_ID,
        buildingId: BUILDING_ID,
        title: 'Broken elevator',
        description: 'desc',
        category: 'structural',
        priority: 'high',
        status: 'open',
        assigneeId: null,
        resolutionNotes: null,
        resolvedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb({ findFirstIssue: existingIssue })
      const service = new IssueService(db as any, auditLogger as any)

      await expect(
        service.updateIssueStatus(ctx, ISSUE_ID, {
          status: 'resolved',
          resolutionNotes: '   ',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject invalid transition from Closed', async () => {
      const existingIssue = {
        id: ISSUE_ID,
        ownerAccountId: OWNER_ID,
        buildingId: BUILDING_ID,
        title: 'Broken elevator',
        description: 'desc',
        category: 'structural',
        priority: 'high',
        status: 'closed',
        assigneeId: null,
        resolutionNotes: null,
        resolvedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb({ findFirstIssue: existingIssue })
      const service = new IssueService(db as any, auditLogger as any)

      await expect(
        service.updateIssueStatus(ctx, ISSUE_ID, { status: 'open' }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject transition from Resolved to In_Progress', async () => {
      const existingIssue = {
        id: ISSUE_ID,
        ownerAccountId: OWNER_ID,
        buildingId: BUILDING_ID,
        title: 'Broken elevator',
        description: 'desc',
        category: 'structural',
        priority: 'high',
        status: 'resolved',
        assigneeId: null,
        resolutionNotes: 'Fixed',
        resolvedAt: new Date(),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb({ findFirstIssue: existingIssue })
      const service = new IssueService(db as any, auditLogger as any)

      await expect(
        service.updateIssueStatus(ctx, ISSUE_ID, { status: 'in_progress' }),
      ).rejects.toThrow(ValidationError)
    })

    it('should allow transition from Resolved to Closed', async () => {
      const existingIssue = {
        id: ISSUE_ID,
        ownerAccountId: OWNER_ID,
        buildingId: BUILDING_ID,
        title: 'Broken elevator',
        description: 'desc',
        category: 'structural',
        priority: 'high',
        status: 'resolved',
        assigneeId: null,
        resolutionNotes: 'Fixed',
        resolvedAt: new Date(),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb({
        findFirstIssue: existingIssue,
        updateResult: { ...existingIssue, status: 'closed' },
      })
      const service = new IssueService(db as any, auditLogger as any)

      const result = await service.updateIssueStatus(ctx, ISSUE_ID, {
        status: 'closed',
      })

      expect(result.status).toBe('closed')
    })

    it('should reject when issue does not exist', async () => {
      const db = createMockDb({ findFirstIssue: null })
      const service = new IssueService(db as any, auditLogger as any)

      await expect(
        service.updateIssueStatus(ctx, '550e8400-e29b-41d4-a716-446655440099', {
          status: 'in_progress',
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('should record audit event on status change', async () => {
      const existingIssue = {
        id: ISSUE_ID,
        ownerAccountId: OWNER_ID,
        buildingId: BUILDING_ID,
        title: 'Broken elevator',
        description: 'desc',
        category: 'structural',
        priority: 'high',
        status: 'open',
        assigneeId: null,
        resolutionNotes: null,
        resolvedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb({
        findFirstIssue: existingIssue,
        updateResult: { ...existingIssue, status: 'in_progress' },
      })
      const service = new IssueService(db as any, auditLogger as any)

      await service.updateIssueStatus(ctx, ISSUE_ID, {
        status: 'in_progress',
      })

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: OWNER_ID,
          action: 'issue_status_changed',
          entityType: 'issue',
          entityId: ISSUE_ID,
          oldValues: { status: 'open' },
          newValues: { status: 'in_progress' },
        }),
      )
    })
  })

  describe('listIssues', () => {
    it('should cap page size at 50', async () => {
      const db = createMockDb({ selectResult: [], countResult: 0 })
      const service = new IssueService(db as any, auditLogger as any)

      const result = await service.listIssues(ctx, {
        page: 1,
        pageSize: 100,
      })

      expect(result.pageSize).toBeLessThanOrEqual(50)
    })

    it('should default page to 1 when less than 1', async () => {
      const db = createMockDb({ selectResult: [], countResult: 0 })
      const service = new IssueService(db as any, auditLogger as any)

      const result = await service.listIssues(ctx, {
        page: 0,
        pageSize: 10,
      })

      expect(result.page).toBe(1)
    })

    it('should return paginated results', async () => {
      const issueData = [
        {
          id: ISSUE_ID,
          ownerAccountId: OWNER_ID,
          buildingId: BUILDING_ID,
          title: 'Broken elevator',
          description: 'desc',
          category: 'structural',
          priority: 'high',
          status: 'open',
          assigneeId: null,
          resolutionNotes: null,
          resolvedAt: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ]
      const db = createMockDb({ selectResult: issueData, countResult: 1 })
      const service = new IssueService(db as any, auditLogger as any)

      const result = await service.listIssues(ctx, {
        page: 1,
        pageSize: 10,
      })

      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.totalPages).toBe(1)
    })
  })
})
