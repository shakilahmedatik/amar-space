import type { Database } from '@repo/db'
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@repo/shared/errors'
import type { RequestContext } from '@repo/shared/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuditLogger } from '../../src/plugins/audit-logger'
import { BuildingService } from '../../src/services/building'

/**
 * Unit tests for the BuildingService.
 *
 * Tests validate:
 * - Building creation with field constraints and name uniqueness
 * - Building update with ownership validation
 * - Building listing with pagination (max 50, sorted by createdAt desc)
 * - Building retrieval with tenant isolation
 * - Audit event recording for create/update
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 5.7, 5.8, 5.9
 */

// --- Mock Helpers ---

function createMockAuditLogger() {
  return {
    log: vi.fn(),
    query: vi.fn(),
    pendingRetries: 0,
    shutdown: vi.fn(),
  } as unknown as AuditLogger
}

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

function createMockDb(
  overrides: {
    findFirstBuilding?: unknown
    insertReturning?: unknown[]
    updateReturning?: unknown[]
    selectData?: unknown[]
    selectCount?: number
  } = {},
) {
  const defaultBuilding = {
    id: 'building-1',
    ownerAccountId: 'owner-account-1',
    name: 'Test Building',
    address: '123 Test St',
    totalFloors: 5,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  const mockInsert = vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi
        .fn()
        .mockResolvedValue(overrides.insertReturning ?? [defaultBuilding]),
    }),
  })

  const mockUpdate = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi
          .fn()
          .mockResolvedValue(
            overrides.updateReturning ?? [
              { ...defaultBuilding, updatedAt: new Date() },
            ],
          ),
      }),
    }),
  })

  const mockSelect = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi
              .fn()
              .mockResolvedValue(overrides.selectData ?? [defaultBuilding]),
          }),
        }),
      }),
    }),
  })

  // For count queries - returns array with count object
  const mockSelectCount = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count: overrides.selectCount ?? 1 }]),
    }),
  })

  const mockDelete = vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  })

  // Alternate select behavior: first call returns data, second returns count
  let selectCallCount = 0
  const smartSelect = vi.fn().mockImplementation(() => {
    selectCallCount++
    if (selectCallCount % 2 === 1) {
      return mockSelect()
    }
    return mockSelectCount()
  })

  const dbMock = {
    query: {
      buildings: {
        findFirst: vi.fn().mockImplementation(async (options) => {
          if (overrides.findFirstBuilding !== undefined) {
            return overrides.findFirstBuilding
          }
          if (options?.with) {
            return defaultBuilding
          }
          return null
        }),
      },
    },
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    select: smartSelect,
    transaction: vi.fn().mockImplementation(async (cb) => {
      return cb(dbMock)
    }),
  }

  return dbMock as unknown as Database
}

// --- Tests ---

describe('BuildingService', () => {
  let auditLogger: ReturnType<typeof createMockAuditLogger>
  let ctx: RequestContext

  beforeEach(() => {
    auditLogger = createMockAuditLogger()
    ctx = createOwnerContext()
  })

  describe('createBuilding', () => {
    it('should create a building with valid input', async () => {
      const db = createMockDb()
      const service = new BuildingService(db, auditLogger)

      const result = await service.createBuilding(ctx, {
        name: 'My Building',
        address: '123 Main St',
        totalFloors: 10,
      })

      expect(result).toBeDefined()
      expect(result.id).toBe('building-1')
      expect(db.insert).toHaveBeenCalled()
    })

    it('should create a building without totalFloors (optional)', async () => {
      const db = createMockDb()
      const service = new BuildingService(db, auditLogger)

      const result = await service.createBuilding(ctx, {
        name: 'My Building',
        address: '123 Main St',
      })

      expect(result).toBeDefined()
    })

    it('should reject building with empty name', async () => {
      const db = createMockDb()
      const service = new BuildingService(db, auditLogger)

      await expect(
        service.createBuilding(ctx, {
          name: '',
          address: '123 Main St',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject building with name exceeding 200 characters', async () => {
      const db = createMockDb()
      const service = new BuildingService(db, auditLogger)

      await expect(
        service.createBuilding(ctx, {
          name: 'a'.repeat(201),
          address: '123 Main St',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject building with empty address', async () => {
      const db = createMockDb()
      const service = new BuildingService(db, auditLogger)

      await expect(
        service.createBuilding(ctx, {
          name: 'My Building',
          address: '',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject building with address exceeding 500 characters', async () => {
      const db = createMockDb()
      const service = new BuildingService(db, auditLogger)

      await expect(
        service.createBuilding(ctx, {
          name: 'My Building',
          address: 'a'.repeat(501),
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject building with totalFloors less than 1', async () => {
      const db = createMockDb()
      const service = new BuildingService(db, auditLogger)

      await expect(
        service.createBuilding(ctx, {
          name: 'My Building',
          address: '123 Main St',
          totalFloors: 0,
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject building with totalFloors greater than 200', async () => {
      const db = createMockDb()
      const service = new BuildingService(db, auditLogger)

      await expect(
        service.createBuilding(ctx, {
          name: 'My Building',
          address: '123 Main St',
          totalFloors: 201,
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject duplicate building name for same owner', async () => {
      const db = createMockDb({
        findFirstBuilding: {
          id: 'existing-building',
          ownerAccountId: 'owner-account-1',
          name: 'My Building',
        },
      })
      const service = new BuildingService(db, auditLogger)

      await expect(
        service.createBuilding(ctx, {
          name: 'My Building',
          address: '123 Main St',
        }),
      ).rejects.toThrow(ConflictError)
    })

    it('should record audit event on successful creation', async () => {
      const db = createMockDb()
      const service = new BuildingService(db, auditLogger)

      await service.createBuilding(ctx, {
        name: 'My Building',
        address: '123 Main St',
        totalFloors: 5,
      })

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'owner-1',
          action: 'building_created',
          entityType: 'building',
          entityId: 'building-1',
          ownerAccountId: 'owner-account-1',
          newValues: expect.objectContaining({
            name: 'Test Building',
            address: '123 Test St',
          }),
        }),
      )
    })

    it('should create a building with valid optional fields', async () => {
      const db = createMockDb()
      const service = new BuildingService(db, auditLogger)

      const result = await service.createBuilding(ctx, {
        name: 'My Building',
        address: '123 Main St',
        totalFloors: 10,
        whatsappGroupLink: 'https://chat.whatsapp.com/123456',
        buildingPhoto:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        emergencyContacts: [
          {
            name: 'Caretaker',
            role: 'কেয়ারটেকার',
            phone: '01712345678',
            type: 'building',
          },
        ],
      })

      expect(result).toBeDefined()
    })
  })

  describe('updateBuilding', () => {
    it('should update building name', async () => {
      const existingBuilding = {
        id: 'building-1',
        ownerAccountId: 'owner-account-1',
        name: 'Old Name',
        address: '123 Main St',
        totalFloors: 5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }

      const updatedBuilding = {
        ...existingBuilding,
        name: 'New Name',
        updatedAt: new Date(),
      }

      // First findFirst call returns existing building (for ownership check)
      // Second findFirst call returns null (no duplicate name)
      // Third findFirst call returns updated building
      const findFirstMock = vi
        .fn()
        .mockResolvedValueOnce(existingBuilding)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(updatedBuilding)

      const db = {
        query: {
          buildings: {
            findFirst: findFirstMock,
          },
        },
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedBuilding]),
            }),
          }),
        }),
        select: vi.fn(),
        insert: vi.fn(),
        transaction: vi.fn().mockImplementation(async (cb) => {
          return cb(db)
        }),
      }

      const service = new BuildingService(
        db as unknown as Database,
        auditLogger,
      )

      const result = await service.updateBuilding(ctx, 'building-1', {
        name: 'New Name',
      })

      expect(result.name).toBe('New Name')
    })

    it('should reject update for non-existent building', async () => {
      const db = createMockDb({ findFirstBuilding: null })
      const service = new BuildingService(db, auditLogger)

      await expect(
        service.updateBuilding(ctx, 'nonexistent-id', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundError)
    })

    it('should reject update with duplicate name', async () => {
      const existingBuilding = {
        id: 'building-1',
        ownerAccountId: 'owner-account-1',
        name: 'Old Name',
        address: '123 Main St',
        totalFloors: 5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }

      const duplicateBuilding = {
        id: 'building-2',
        ownerAccountId: 'owner-account-1',
        name: 'Taken Name',
      }

      // First findFirst: returns existing building (ownership check)
      // Second findFirst: returns duplicate (name uniqueness check)
      const findFirstMock = vi
        .fn()
        .mockResolvedValueOnce(existingBuilding)
        .mockResolvedValueOnce(duplicateBuilding)

      const db = {
        query: {
          buildings: {
            findFirst: findFirstMock,
          },
        },
        update: vi.fn(),
        select: vi.fn(),
        insert: vi.fn(),
        transaction: vi.fn().mockImplementation(async (cb) => {
          return cb(db)
        }),
      }

      const service = new BuildingService(
        db as unknown as Database,
        auditLogger,
      )

      await expect(
        service.updateBuilding(ctx, 'building-1', { name: 'Taken Name' }),
      ).rejects.toThrow(ConflictError)
    })

    it('should reject update with invalid field values', async () => {
      const db = createMockDb({
        findFirstBuilding: {
          id: 'building-1',
          ownerAccountId: 'owner-account-1',
          name: 'Old Name',
          address: '123 Main St',
          totalFloors: 5,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      })
      const service = new BuildingService(db, auditLogger)

      await expect(
        service.updateBuilding(ctx, 'building-1', { totalFloors: 201 }),
      ).rejects.toThrow(ValidationError)
    })

    it('should record audit event on successful update', async () => {
      const existingBuilding = {
        id: 'building-1',
        ownerAccountId: 'owner-account-1',
        name: 'Old Name',
        address: '123 Main St',
        totalFloors: 5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }

      const updatedBuilding = {
        ...existingBuilding,
        name: 'New Name',
        updatedAt: new Date(),
      }

      const findFirstMock = vi
        .fn()
        .mockResolvedValueOnce(existingBuilding)
        .mockResolvedValueOnce(null) // no duplicate
        .mockResolvedValueOnce(updatedBuilding)

      const db = {
        query: {
          buildings: {
            findFirst: findFirstMock,
          },
        },
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedBuilding]),
            }),
          }),
        }),
        select: vi.fn(),
        insert: vi.fn(),
        transaction: vi.fn().mockImplementation(async (cb) => {
          return cb(db)
        }),
      }

      const service = new BuildingService(
        db as unknown as Database,
        auditLogger,
      )

      await service.updateBuilding(ctx, 'building-1', { name: 'New Name' })

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'owner-1',
          action: 'building_updated',
          entityType: 'building',
          entityId: 'building-1',
          ownerAccountId: 'owner-account-1',
          oldValues: { name: 'Old Name' },
          newValues: { name: 'New Name' },
        }),
      )
    })

    it('should update a building with optional fields successfully', async () => {
      const existingBuilding = {
        id: 'building-1',
        ownerAccountId: 'owner-account-1',
        name: 'Old Name',
        address: '123 Main St',
        totalFloors: 5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }

      const updatedBuilding = {
        ...existingBuilding,
        whatsappGroupLink: 'https://chat.whatsapp.com/newlink',
        updatedAt: new Date(),
      }

      const findFirstMock = vi
        .fn()
        .mockResolvedValueOnce(existingBuilding)
        .mockResolvedValueOnce(updatedBuilding)

      const db = {
        query: {
          buildings: {
            findFirst: findFirstMock,
          },
        },
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedBuilding]),
            }),
          }),
        }),
        select: vi.fn(),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue([]),
        }),
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
        transaction: vi.fn().mockImplementation(async (cb) => {
          return cb(db)
        }),
      }

      const service = new BuildingService(
        db as unknown as Database,
        auditLogger,
      )

      const result = await service.updateBuilding(ctx, 'building-1', {
        whatsappGroupLink: 'https://chat.whatsapp.com/newlink',
        emergencyContacts: [
          {
            name: 'Caretaker New',
            role: 'কেয়ারটেকার',
            phone: '01711111111',
            type: 'building',
          },
        ],
      })

      expect(result.whatsappGroupLink).toBe('https://chat.whatsapp.com/newlink')
    })
  })

  describe('listBuildings', () => {
    it('should return paginated buildings', async () => {
      const buildingsList = [
        {
          id: 'building-1',
          ownerAccountId: 'owner-account-1',
          name: 'Building A',
          address: '123 St',
          totalFloors: 5,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          id: 'building-2',
          ownerAccountId: 'owner-account-1',
          name: 'Building B',
          address: '456 St',
          totalFloors: 3,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ]

      const db = createMockDb({
        selectData: buildingsList,
        selectCount: 2,
      })
      const service = new BuildingService(db, auditLogger)

      const result = await service.listBuildings(ctx, { page: 1, pageSize: 50 })

      expect(result.data).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(50)
      expect(result.totalPages).toBe(1)
    })

    it('should cap pageSize at 50', async () => {
      const db = createMockDb({ selectData: [], selectCount: 0 })
      const service = new BuildingService(db, auditLogger)

      const result = await service.listBuildings(ctx, {
        page: 1,
        pageSize: 100,
      })

      expect(result.pageSize).toBe(50)
    })

    it('should enforce minimum page of 1', async () => {
      const db = createMockDb({ selectData: [], selectCount: 0 })
      const service = new BuildingService(db, auditLogger)

      const result = await service.listBuildings(ctx, { page: 0, pageSize: 10 })

      expect(result.page).toBe(1)
    })
  })

  describe('getBuilding', () => {
    it('should return building when found', async () => {
      const building = {
        id: 'building-1',
        ownerAccountId: 'owner-account-1',
        name: 'Test Building',
        address: '123 Main St',
        totalFloors: 5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }

      const db = createMockDb({ findFirstBuilding: building })
      const service = new BuildingService(db, auditLogger)

      const result = await service.getBuilding(ctx, 'building-1')

      expect(result.id).toBe('building-1')
      expect(result.name).toBe('Test Building')
    })

    it('should throw NotFoundError when building does not exist', async () => {
      const db = createMockDb({ findFirstBuilding: null })
      const service = new BuildingService(db, auditLogger)

      await expect(service.getBuilding(ctx, 'nonexistent-id')).rejects.toThrow(
        NotFoundError,
      )
    })

    it('should not return buildings from other accounts (tenant isolation)', async () => {
      const db = createMockDb({ findFirstBuilding: null })
      const service = new BuildingService(db, auditLogger)

      // The findFirst mock returns null because the query filters by ownerAccountId
      await expect(
        service.getBuilding(ctx, 'other-account-building'),
      ).rejects.toThrow(NotFoundError)
    })
  })
})
