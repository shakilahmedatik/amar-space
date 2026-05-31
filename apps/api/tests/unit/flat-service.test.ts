import type { Database } from '@repo/db'
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@repo/shared/errors'
import type { RequestContext } from '@repo/shared/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuditLogger } from '../../src/plugins/audit-logger'
import { FlatService } from '../../src/services/flat'

/**
 * Unit tests for the FlatService.
 *
 * Tests validate:
 * - Flat creation with field validation and uniqueness
 * - Flat update with ownership validation
 * - Flat deletion only when status is Vacant
 * - Listing with pagination (max 50) and filtering
 * - Status transition state machine
 * - Audit event recording
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7, 6.10, 6.11, 6.12, 6.13, 6.14
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

function createMockDb(
  overrides: {
    findFirstFlat?: unknown
    findFirstBuilding?: unknown
    insertResult?: unknown
    updateResult?: unknown
    selectResult?: unknown[]
    countResult?: number
  } = {},
) {
  const defaultFlat =
    overrides.findFirstFlat !== undefined ? overrides.findFirstFlat : null

  const defaultBuilding =
    overrides.findFirstBuilding !== undefined
      ? overrides.findFirstBuilding
      : {
          id: 'building-1',
          ownerAccountId: 'owner-1',
          name: 'Test Building',
        }

  const defaultInsertResult = overrides.insertResult ?? {
    id: 'flat-1',
    ownerAccountId: 'owner-1',
    buildingId: 'building-1',
    flatNumber: 'A101',
    floor: 1,
    status: 'vacant',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  const defaultUpdateResult = overrides.updateResult ?? {
    id: 'flat-1',
    ownerAccountId: 'owner-1',
    buildingId: 'building-1',
    flatNumber: 'A101',
    floor: 1,
    status: 'vacant',
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

  const mockDeleteFn = vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  })

  const mockSelect = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockResolvedValue(defaultSelectResult),
          }),
        }),
      }),
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          offset: vi.fn().mockResolvedValue(defaultSelectResult),
        }),
      }),
    }),
  })

  // For count queries
  const mockSelectCount = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count: defaultCount }]),
    }),
  })

  // Track call count to differentiate between data select and count select
  let selectCallCount = 0
  const selectFn = vi.fn().mockImplementation((...args: unknown[]) => {
    selectCallCount++
    // If called with { count } argument (count query), return count mock
    if (
      args.length > 0 &&
      typeof args[0] === 'object' &&
      args[0] !== null &&
      'count' in (args[0] as Record<string, unknown>)
    ) {
      return mockSelectCount(...args)
    }
    // Even calls are data, odd calls are count (in Promise.all pattern)
    if (selectCallCount % 2 === 0) {
      return mockSelectCount()
    }
    return mockSelect()
  })

  const dbMock = {
    query: {
      flats: {
        findFirst: vi.fn().mockResolvedValue(defaultFlat),
      },
      buildings: {
        findFirst: vi.fn().mockResolvedValue(defaultBuilding),
      },
    },
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDeleteFn,
    select: selectFn,
    transaction: vi.fn().mockImplementation(async (cb) => {
      return cb(dbMock)
    }),
  }

  return dbMock as unknown
}

function createOwnerContext(
  overrides: Partial<RequestContext> = {},
): RequestContext {
  return {
    userId: 'owner-1',
    role: 'owner',
    ownerAccountId: 'owner-1',
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    ...overrides,
  }
}

// --- Tests ---

describe('FlatService', () => {
  let auditLogger: ReturnType<typeof createMockAuditLogger>
  let ctx: RequestContext

  beforeEach(() => {
    auditLogger = createMockAuditLogger()
    ctx = createOwnerContext()
  })

  describe('createFlat', () => {
    it('should create a flat successfully with valid input', async () => {
      const db = createMockDb()
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.createFlat(ctx, {
        buildingId: 'building-1',
        flatNumber: 'A101',
        floor: 1,
      })

      expect(result.id).toBe('flat-1')
      expect(result.flatNumber).toBe('A101')
      expect(result.floor).toBe(1)
      expect(result.status).toBe('vacant')
    })

    it('should reject flat number longer than 20 characters', async () => {
      const db = createMockDb()
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.createFlat(ctx, {
          buildingId: 'building-1',
          flatNumber: 'A'.repeat(21),
          floor: 1,
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject non-alphanumeric flat number', async () => {
      const db = createMockDb()
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.createFlat(ctx, {
          buildingId: 'building-1',
          flatNumber: 'A 101!',
          floor: 1,
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject empty flat number', async () => {
      const db = createMockDb()
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.createFlat(ctx, {
          buildingId: 'building-1',
          flatNumber: '',
          floor: 1,
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject floor less than 1', async () => {
      const db = createMockDb()
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.createFlat(ctx, {
          buildingId: 'building-1',
          flatNumber: 'A101',
          floor: 0,
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject floor greater than 200', async () => {
      const db = createMockDb()
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.createFlat(ctx, {
          buildingId: 'building-1',
          flatNumber: 'A101',
          floor: 201,
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject when building does not exist', async () => {
      const db = createMockDb({ findFirstBuilding: null })
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.createFlat(ctx, {
          buildingId: 'nonexistent',
          flatNumber: 'A101',
          floor: 1,
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('should reject duplicate flat number within building', async () => {
      const db = createMockDb({
        findFirstFlat: {
          id: 'existing-flat',
          flatNumber: 'A101',
          buildingId: 'building-1',
        },
      })
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.createFlat(ctx, {
          buildingId: 'building-1',
          flatNumber: 'A101',
          floor: 1,
        }),
      ).rejects.toThrow(ConflictError)
    })

    it('should record audit event on creation', async () => {
      const db = createMockDb()
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await service.createFlat(ctx, {
        buildingId: 'building-1',
        flatNumber: 'A101',
        floor: 1,
      })

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'owner-1',
          action: 'flat_created',
          entityType: 'flat',
          entityId: 'flat-1',
          ownerAccountId: 'owner-1',
        }),
      )
    })

    it('should allow alphanumeric flat numbers with hyphens and underscores', async () => {
      const db = createMockDb()
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.createFlat(ctx, {
        buildingId: 'building-1',
        flatNumber: 'A-101_B',
        floor: 5,
      })

      expect(result.flatNumber).toBe('A101') // from mock
    })
  })

  describe('updateFlat', () => {
    it('should update flat properties successfully', async () => {
      const existingFlat = {
        id: 'flat-1',
        ownerAccountId: 'owner-1',
        buildingId: 'building-1',
        flatNumber: 'A101',
        floor: 1,
        status: 'vacant',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const updatedFlat = {
        ...existingFlat,
        flatNumber: 'B202',
        floor: 2,
        updatedAt: new Date('2024-01-02'),
      }
      const db = createMockDb({
        findFirstFlat: existingFlat,
        updateResult: updatedFlat,
      })
      // First findFirst returns the flat being updated, second returns null (no duplicate)
      ;(db as unknown as Database).query.flats.findFirst = vi
        .fn()
        .mockResolvedValueOnce(existingFlat)
        .mockResolvedValueOnce(null)
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.updateFlat(ctx, 'flat-1', {
        flatNumber: 'B202',
        floor: 2,
      })

      expect(result.flatNumber).toBe('B202')
      expect(result.floor).toBe(2)
    })

    it('should reject when flat does not exist (tenant isolation)', async () => {
      const db = createMockDb({ findFirstFlat: null })
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.updateFlat(ctx, 'nonexistent', { flatNumber: 'B202' }),
      ).rejects.toThrow(NotFoundError)
    })

    it('should reject duplicate flat number on update', async () => {
      const existingFlat = {
        id: 'flat-1',
        ownerAccountId: 'owner-1',
        buildingId: 'building-1',
        flatNumber: 'A101',
        floor: 1,
        status: 'vacant',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      // First findFirst returns the flat being updated, second returns a duplicate
      const db = createMockDb({ findFirstFlat: existingFlat })
      // Override the second findFirst call to return a duplicate
      const mockFindFirst = vi
        .fn()
        .mockResolvedValueOnce(existingFlat) // first call: find the flat
        .mockResolvedValueOnce({ id: 'flat-2', flatNumber: 'B202' }) // second call: duplicate check
      ;(db as unknown as Database).query.flats.findFirst = mockFindFirst

      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.updateFlat(ctx, 'flat-1', { flatNumber: 'B202' }),
      ).rejects.toThrow(ConflictError)
    })

    it('should record audit event on update', async () => {
      const existingFlat = {
        id: 'flat-1',
        ownerAccountId: 'owner-1',
        buildingId: 'building-1',
        flatNumber: 'A101',
        floor: 1,
        status: 'vacant',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb({
        findFirstFlat: existingFlat,
        updateResult: {
          ...existingFlat,
          floor: 3,
          updatedAt: new Date('2024-01-02'),
        },
      })
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await service.updateFlat(ctx, 'flat-1', { floor: 3 })

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'owner-1',
          action: 'flat_updated',
          entityType: 'flat',
          entityId: 'flat-1',
          oldValues: { floor: 1 },
          newValues: { floor: 3 },
        }),
      )
    })
  })

  describe('deleteFlat', () => {
    it('should delete a flat with Vacant status', async () => {
      const existingFlat = {
        id: 'flat-1',
        ownerAccountId: 'owner-1',
        buildingId: 'building-1',
        flatNumber: 'A101',
        floor: 1,
        status: 'vacant',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb({ findFirstFlat: existingFlat })
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(service.deleteFlat(ctx, 'flat-1')).resolves.toBeUndefined()
    })

    it('should reject deletion of Occupied flat', async () => {
      const existingFlat = {
        id: 'flat-1',
        ownerAccountId: 'owner-1',
        buildingId: 'building-1',
        flatNumber: 'A101',
        floor: 1,
        status: 'occupied',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb({ findFirstFlat: existingFlat })
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(service.deleteFlat(ctx, 'flat-1')).rejects.toThrow(
        ValidationError,
      )
    })

    it('should reject deletion of Under_Maintenance flat', async () => {
      const existingFlat = {
        id: 'flat-1',
        ownerAccountId: 'owner-1',
        buildingId: 'building-1',
        flatNumber: 'A101',
        floor: 1,
        status: 'under_maintenance',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb({ findFirstFlat: existingFlat })
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(service.deleteFlat(ctx, 'flat-1')).rejects.toThrow(
        ValidationError,
      )
    })

    it('should reject deletion when flat not found', async () => {
      const db = createMockDb({ findFirstFlat: null })
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(service.deleteFlat(ctx, 'nonexistent')).rejects.toThrow(
        NotFoundError,
      )
    })

    it('should record audit event on deletion', async () => {
      const existingFlat = {
        id: 'flat-1',
        ownerAccountId: 'owner-1',
        buildingId: 'building-1',
        flatNumber: 'A101',
        floor: 1,
        status: 'vacant',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb({ findFirstFlat: existingFlat })
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await service.deleteFlat(ctx, 'flat-1')

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'owner-1',
          action: 'flat_deleted',
          entityType: 'flat',
          entityId: 'flat-1',
          ownerAccountId: 'owner-1',
        }),
      )
    })
  })

  describe('transitionStatus', () => {
    it('should transition from Vacant to Occupied', async () => {
      const existingFlat = {
        id: 'flat-1',
        ownerAccountId: 'owner-1',
        buildingId: 'building-1',
        flatNumber: 'A101',
        floor: 1,
        status: 'vacant',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb({
        findFirstFlat: existingFlat,
        updateResult: {
          ...existingFlat,
          status: 'occupied',
          updatedAt: new Date('2024-01-02'),
        },
      })
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.transitionStatus(ctx, 'flat-1', 'occupied')

      expect(result.status).toBe('occupied')
    })

    it('should transition from Occupied to Vacant', async () => {
      const existingFlat = {
        id: 'flat-1',
        ownerAccountId: 'owner-1',
        buildingId: 'building-1',
        flatNumber: 'A101',
        floor: 1,
        status: 'occupied',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb({
        findFirstFlat: existingFlat,
        updateResult: {
          ...existingFlat,
          status: 'vacant',
          updatedAt: new Date('2024-01-02'),
        },
      })
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.transitionStatus(ctx, 'flat-1', 'vacant')

      expect(result.status).toBe('vacant')
    })

    it('should transition from Vacant to Under_Maintenance', async () => {
      const existingFlat = {
        id: 'flat-1',
        ownerAccountId: 'owner-1',
        buildingId: 'building-1',
        flatNumber: 'A101',
        floor: 1,
        status: 'vacant',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb({
        findFirstFlat: existingFlat,
        updateResult: {
          ...existingFlat,
          status: 'under_maintenance',
          updatedAt: new Date('2024-01-02'),
        },
      })
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.transitionStatus(
        ctx,
        'flat-1',
        'under_maintenance',
      )

      expect(result.status).toBe('under_maintenance')
    })

    it('should transition from Under_Maintenance to Vacant', async () => {
      const existingFlat = {
        id: 'flat-1',
        ownerAccountId: 'owner-1',
        buildingId: 'building-1',
        flatNumber: 'A101',
        floor: 1,
        status: 'under_maintenance',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb({
        findFirstFlat: existingFlat,
        updateResult: {
          ...existingFlat,
          status: 'vacant',
          updatedAt: new Date('2024-01-02'),
        },
      })
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.transitionStatus(ctx, 'flat-1', 'vacant')

      expect(result.status).toBe('vacant')
    })

    it('should reject invalid transition from Occupied to Under_Maintenance', async () => {
      const existingFlat = {
        id: 'flat-1',
        ownerAccountId: 'owner-1',
        buildingId: 'building-1',
        flatNumber: 'A101',
        floor: 1,
        status: 'occupied',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb({ findFirstFlat: existingFlat })
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.transitionStatus(ctx, 'flat-1', 'under_maintenance'),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject invalid transition from Under_Maintenance to Occupied', async () => {
      const existingFlat = {
        id: 'flat-1',
        ownerAccountId: 'owner-1',
        buildingId: 'building-1',
        flatNumber: 'A101',
        floor: 1,
        status: 'under_maintenance',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb({ findFirstFlat: existingFlat })
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.transitionStatus(ctx, 'flat-1', 'occupied'),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject when flat not found', async () => {
      const db = createMockDb({ findFirstFlat: null })
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await expect(
        service.transitionStatus(ctx, 'nonexistent', 'occupied'),
      ).rejects.toThrow(NotFoundError)
    })

    it('should record audit event on status transition', async () => {
      const existingFlat = {
        id: 'flat-1',
        ownerAccountId: 'owner-1',
        buildingId: 'building-1',
        flatNumber: 'A101',
        floor: 1,
        status: 'vacant',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      const db = createMockDb({
        findFirstFlat: existingFlat,
        updateResult: {
          ...existingFlat,
          status: 'occupied',
          updatedAt: new Date('2024-01-02'),
        },
      })
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      await service.transitionStatus(ctx, 'flat-1', 'occupied')

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'owner-1',
          action: 'flat_status_changed',
          entityType: 'flat',
          entityId: 'flat-1',
          oldValues: { status: 'vacant' },
          newValues: { status: 'occupied' },
        }),
      )
    })
  })

  describe('listFlats', () => {
    it('should cap page size at 50', async () => {
      const db = createMockDb({ selectResult: [], countResult: 0 })
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.listFlats(ctx, {
        page: 1,
        pageSize: 100,
      })

      expect(result.pageSize).toBeLessThanOrEqual(50)
    })

    it('should default page to 1 when less than 1', async () => {
      const db = createMockDb({ selectResult: [], countResult: 0 })
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.listFlats(ctx, {
        page: 0,
        pageSize: 10,
      })

      expect(result.page).toBe(1)
    })

    it('should return paginated results', async () => {
      const flatData = [
        {
          id: 'flat-1',
          ownerAccountId: 'owner-1',
          buildingId: 'building-1',
          flatNumber: 'A101',
          floor: 1,
          status: 'vacant',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ]
      const db = createMockDb({ selectResult: flatData, countResult: 1 })
      const service = new FlatService(
        db as unknown as Database,
        auditLogger as unknown as AuditLogger,
      )

      const result = await service.listFlats(ctx, {
        page: 1,
        pageSize: 10,
      })

      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.totalPages).toBe(1)
    })
  })
})
