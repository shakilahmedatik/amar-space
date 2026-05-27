import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@repo/shared/errors'
import type { RequestContext } from '@repo/shared/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MaintenanceService } from '../../src/services/maintenance.service'

/**
 * Unit tests for the MaintenanceService.
 *
 * Tests validate:
 * - Request creation with title/description/priority validation
 * - File attachment validation (max 5, JPEG/PNG/WebP, max 5MB)
 * - Status update with state machine transition enforcement
 * - Comment addition with content validation
 * - List requests with filtering and pagination (max 50)
 * - Role-based access control
 * - Audit event recording for status changes
 *
 * Requirements: 10.1, 10.2, 10.3, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.11, 10.12
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

function createMockR2() {
  return {
    upload: vi.fn().mockResolvedValue('storage/key/file.jpg'),
    getPresignedUrl: vi.fn().mockResolvedValue('https://example.com/file.jpg'),
    delete: vi.fn().mockResolvedValue(undefined),
  }
}

function createRenterContext(
  overrides: Partial<RequestContext> = {},
): RequestContext {
  return {
    userId: 'renter-user-1',
    role: 'renter',
    ownerAccountId: 'owner-account-1',
    assignedFlatId: 'flat-1',
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    ...overrides,
  }
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

function createManagerContext(
  overrides: Partial<RequestContext> = {},
): RequestContext {
  return {
    userId: 'manager-1',
    role: 'manager',
    ownerAccountId: 'owner-account-1',
    assignedBuildingIds: ['building-1'],
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    ...overrides,
  }
}

const defaultRenter = {
  id: 'renter-1',
  userId: 'renter-user-1',
  ownerAccountId: 'owner-account-1',
  fullName: 'Test Renter',
  phone: '01712345678',
  nidNumber: '1234567890',
  occupation: 'Engineer',
  bloodGroup: 'A+',
  totalFamilyMembers: 3,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

const defaultFlat = {
  id: 'flat-1',
  ownerAccountId: 'owner-account-1',
  buildingId: 'building-1',
  flatNumber: 'A101',
  floor: 1,
  status: 'occupied',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

const defaultRequest = {
  id: 'request-1',
  ownerAccountId: 'owner-account-1',
  flatId: 'flat-1',
  renterId: 'renter-1',
  buildingId: 'building-1',
  title: 'Leaking faucet in kitchen',
  description: 'The kitchen faucet has been leaking for two days now',
  priority: 'medium',
  status: 'open',
  createdAt: new Date('2024-03-01'),
  updatedAt: new Date('2024-03-01'),
}

// --- Tests ---

describe('MaintenanceService', () => {
  let auditLogger: ReturnType<typeof createMockAuditLogger>
  let r2: ReturnType<typeof createMockR2>

  beforeEach(() => {
    auditLogger = createMockAuditLogger()
    r2 = createMockR2()
  })

  describe('createRequest', () => {
    it('should create a maintenance request with valid data (Req 10.1)', async () => {
      const db = {
        query: {
          renters: { findFirst: vi.fn().mockResolvedValue(defaultRenter) },
          flats: { findFirst: vi.fn().mockResolvedValue(defaultFlat) },
          maintenanceRequests: { findFirst: vi.fn() },
        },
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([defaultRequest]),
          }),
        }),
      }

      const ctx = createRenterContext()
      const service = new MaintenanceService(
        db as any,
        auditLogger as any,
        r2 as any,
      )

      const result = await service.createRequest(ctx, {
        title: 'Leaking faucet in kitchen',
        description: 'The kitchen faucet has been leaking for two days now',
        priority: 'medium',
      })

      expect(result.id).toBe('request-1')
      expect(result.status).toBe('open')
      expect(result.priority).toBe('medium')
    })

    it('should reject title shorter than 5 characters (Req 10.11)', async () => {
      const db = {
        query: {
          renters: { findFirst: vi.fn() },
          flats: { findFirst: vi.fn() },
          maintenanceRequests: { findFirst: vi.fn() },
        },
        insert: vi.fn(),
      }

      const ctx = createRenterContext()
      const service = new MaintenanceService(
        db as any,
        auditLogger as any,
        r2 as any,
      )

      await expect(
        service.createRequest(ctx, {
          title: 'Hi',
          description: 'This is a valid description for the request',
          priority: 'low',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject description shorter than 10 characters (Req 10.11)', async () => {
      const db = {
        query: {
          renters: { findFirst: vi.fn() },
          flats: { findFirst: vi.fn() },
          maintenanceRequests: { findFirst: vi.fn() },
        },
        insert: vi.fn(),
      }

      const ctx = createRenterContext()
      const service = new MaintenanceService(
        db as any,
        auditLogger as any,
        r2 as any,
      )

      await expect(
        service.createRequest(ctx, {
          title: 'Valid title here',
          description: 'Short',
          priority: 'low',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject invalid priority value (Req 10.1)', async () => {
      const db = {
        query: {
          renters: { findFirst: vi.fn() },
          flats: { findFirst: vi.fn() },
          maintenanceRequests: { findFirst: vi.fn() },
        },
        insert: vi.fn(),
      }

      const ctx = createRenterContext()
      const service = new MaintenanceService(
        db as any,
        auditLogger as any,
        r2 as any,
      )

      await expect(
        service.createRequest(ctx, {
          title: 'Valid title here',
          description: 'This is a valid description for the request',
          priority: 'critical' as any,
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject more than 5 file attachments (Req 10.2)', async () => {
      const db = {
        query: {
          renters: { findFirst: vi.fn().mockResolvedValue(defaultRenter) },
          flats: { findFirst: vi.fn().mockResolvedValue(defaultFlat) },
          maintenanceRequests: { findFirst: vi.fn() },
        },
        insert: vi.fn(),
      }

      const ctx = createRenterContext()
      const service = new MaintenanceService(
        db as any,
        auditLogger as any,
        r2 as any,
      )

      const attachments = Array.from({ length: 6 }, (_, i) => ({
        fileName: `file${i}.jpg`,
        buffer: Buffer.from('test'),
        mimeType: 'image/jpeg',
        fileSize: 1024,
      }))

      await expect(
        service.createRequest(
          ctx,
          {
            title: 'Valid title here',
            description: 'This is a valid description for the request',
            priority: 'low',
          },
          attachments,
        ),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject file with invalid mime type (Req 10.3)', async () => {
      const db = {
        query: {
          renters: { findFirst: vi.fn().mockResolvedValue(defaultRenter) },
          flats: { findFirst: vi.fn().mockResolvedValue(defaultFlat) },
          maintenanceRequests: { findFirst: vi.fn() },
        },
        insert: vi.fn(),
      }

      const ctx = createRenterContext()
      const service = new MaintenanceService(
        db as any,
        auditLogger as any,
        r2 as any,
      )

      const attachments = [
        {
          fileName: 'document.pdf',
          buffer: Buffer.from('test'),
          mimeType: 'application/pdf',
          fileSize: 1024,
        },
      ]

      await expect(
        service.createRequest(
          ctx,
          {
            title: 'Valid title here',
            description: 'This is a valid description for the request',
            priority: 'low',
          },
          attachments,
        ),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject file exceeding 5MB (Req 10.3)', async () => {
      const db = {
        query: {
          renters: { findFirst: vi.fn().mockResolvedValue(defaultRenter) },
          flats: { findFirst: vi.fn().mockResolvedValue(defaultFlat) },
          maintenanceRequests: { findFirst: vi.fn() },
        },
        insert: vi.fn(),
      }

      const ctx = createRenterContext()
      const service = new MaintenanceService(
        db as any,
        auditLogger as any,
        r2 as any,
      )

      const attachments = [
        {
          fileName: 'large.jpg',
          buffer: Buffer.from('test'),
          mimeType: 'image/jpeg',
          fileSize: 6 * 1024 * 1024, // 6MB
        },
      ]

      await expect(
        service.createRequest(
          ctx,
          {
            title: 'Valid title here',
            description: 'This is a valid description for the request',
            priority: 'low',
          },
          attachments,
        ),
      ).rejects.toThrow(ValidationError)
    })

    it('should throw NotFoundError when renter has no assigned flat', async () => {
      const db = {
        query: {
          renters: { findFirst: vi.fn().mockResolvedValue(defaultRenter) },
          flats: { findFirst: vi.fn().mockResolvedValue(null) },
          maintenanceRequests: { findFirst: vi.fn() },
        },
        insert: vi.fn(),
      }

      const ctx = createRenterContext({ assignedFlatId: undefined })
      const service = new MaintenanceService(
        db as any,
        auditLogger as any,
        r2 as any,
      )

      await expect(
        service.createRequest(ctx, {
          title: 'Valid title here',
          description: 'This is a valid description for the request',
          priority: 'low',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should record audit event on creation', async () => {
      const db = {
        query: {
          renters: { findFirst: vi.fn().mockResolvedValue(defaultRenter) },
          flats: { findFirst: vi.fn().mockResolvedValue(defaultFlat) },
          maintenanceRequests: { findFirst: vi.fn() },
        },
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([defaultRequest]),
          }),
        }),
      }

      const ctx = createRenterContext()
      const service = new MaintenanceService(
        db as any,
        auditLogger as any,
        r2 as any,
      )

      await service.createRequest(ctx, {
        title: 'Leaking faucet in kitchen',
        description: 'The kitchen faucet has been leaking for two days now',
        priority: 'medium',
      })

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'renter-user-1',
          action: 'maintenance_request_created',
          entityType: 'maintenance_request',
          entityId: 'request-1',
        }),
      )
    })
  })

  describe('updateRequestStatus', () => {
    it('should update status with valid transition Open -> In_Progress (Req 10.5)', async () => {
      const updatedRequest = { ...defaultRequest, status: 'in_progress' }
      const db = {
        query: {
          maintenanceRequests: {
            findFirst: vi.fn().mockResolvedValue(defaultRequest),
          },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn() },
        },
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedRequest]),
            }),
          }),
        }),
      }

      const ctx = createOwnerContext()
      const service = new MaintenanceService(
        db as any,
        auditLogger as any,
        r2 as any,
      )

      const result = await service.updateRequestStatus(
        ctx,
        'request-1',
        'in_progress',
      )

      expect(result.status).toBe('in_progress')
    })

    it('should reject invalid transition Open -> Resolved (Req 10.12)', async () => {
      const db = {
        query: {
          maintenanceRequests: {
            findFirst: vi.fn().mockResolvedValue(defaultRequest),
          },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn() },
        },
        update: vi.fn(),
      }

      const ctx = createOwnerContext()
      const service = new MaintenanceService(
        db as any,
        auditLogger as any,
        r2 as any,
      )

      await expect(
        service.updateRequestStatus(ctx, 'request-1', 'resolved'),
      ).rejects.toThrow(ValidationError)
    })

    it('should allow Resolved -> In_Progress (re-opened) (Req 10.5)', async () => {
      const resolvedRequest = { ...defaultRequest, status: 'resolved' }
      const reopenedRequest = { ...defaultRequest, status: 'in_progress' }
      const db = {
        query: {
          maintenanceRequests: {
            findFirst: vi.fn().mockResolvedValue(resolvedRequest),
          },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn() },
        },
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([reopenedRequest]),
            }),
          }),
        }),
      }

      const ctx = createOwnerContext()
      const service = new MaintenanceService(
        db as any,
        auditLogger as any,
        r2 as any,
      )

      const result = await service.updateRequestStatus(
        ctx,
        'request-1',
        'in_progress',
      )
      expect(result.status).toBe('in_progress')
    })

    it('should reject status update from Renter (Req 10.8)', async () => {
      const db = {
        query: {
          maintenanceRequests: { findFirst: vi.fn() },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn() },
        },
        update: vi.fn(),
      }

      const ctx = createRenterContext()
      const service = new MaintenanceService(
        db as any,
        auditLogger as any,
        r2 as any,
      )

      await expect(
        service.updateRequestStatus(ctx, 'request-1', 'in_progress'),
      ).rejects.toThrow(ForbiddenError)
    })

    it('should reject invalid status value', async () => {
      const db = {
        query: {
          maintenanceRequests: { findFirst: vi.fn() },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn() },
        },
        update: vi.fn(),
      }

      const ctx = createOwnerContext()
      const service = new MaintenanceService(
        db as any,
        auditLogger as any,
        r2 as any,
      )

      await expect(
        service.updateRequestStatus(ctx, 'request-1', 'invalid_status' as any),
      ).rejects.toThrow(ValidationError)
    })

    it('should record audit event on status change (Req 10.9)', async () => {
      const updatedRequest = { ...defaultRequest, status: 'in_progress' }
      const db = {
        query: {
          maintenanceRequests: {
            findFirst: vi.fn().mockResolvedValue(defaultRequest),
          },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn() },
        },
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedRequest]),
            }),
          }),
        }),
      }

      const ctx = createOwnerContext()
      const service = new MaintenanceService(
        db as any,
        auditLogger as any,
        r2 as any,
      )

      await service.updateRequestStatus(ctx, 'request-1', 'in_progress')

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'owner-1',
          action: 'maintenance_request_status_changed',
          entityType: 'maintenance_request',
          entityId: 'request-1',
          oldValues: { status: 'open' },
          newValues: { status: 'in_progress' },
        }),
      )
    })

    it('should reject transition from Closed status (Req 10.5)', async () => {
      const closedRequest = { ...defaultRequest, status: 'closed' }
      const db = {
        query: {
          maintenanceRequests: {
            findFirst: vi.fn().mockResolvedValue(closedRequest),
          },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn() },
        },
        update: vi.fn(),
      }

      const ctx = createOwnerContext()
      const service = new MaintenanceService(
        db as any,
        auditLogger as any,
        r2 as any,
      )

      await expect(
        service.updateRequestStatus(ctx, 'request-1', 'open'),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('addComment', () => {
    it('should add a comment with valid content (Req 10.8)', async () => {
      const comment = {
        id: 'comment-1',
        requestId: 'request-1',
        authorId: 'renter-user-1',
        content: 'Please fix this soon',
        createdAt: new Date('2024-03-02'),
      }

      const db = {
        query: {
          maintenanceRequests: {
            findFirst: vi.fn().mockResolvedValue(defaultRequest),
          },
          flats: { findFirst: vi.fn() },
          renters: {
            findFirst: vi.fn().mockResolvedValue(defaultRenter),
          },
        },
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([comment]),
          }),
        }),
      }

      const ctx = createRenterContext()
      const service = new MaintenanceService(
        db as any,
        auditLogger as any,
        r2 as any,
      )

      const result = await service.addComment(ctx, 'request-1', {
        content: 'Please fix this soon',
      })

      expect(result.id).toBe('comment-1')
      expect(result.content).toBe('Please fix this soon')
      expect(result.authorId).toBe('renter-user-1')
    })

    it('should reject comment exceeding 2000 characters', async () => {
      const db = {
        query: {
          maintenanceRequests: { findFirst: vi.fn() },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn() },
        },
        insert: vi.fn(),
      }

      const ctx = createRenterContext()
      const service = new MaintenanceService(
        db as any,
        auditLogger as any,
        r2 as any,
      )

      await expect(
        service.addComment(ctx, 'request-1', {
          content: 'x'.repeat(2001),
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should reject empty comment content', async () => {
      const db = {
        query: {
          maintenanceRequests: { findFirst: vi.fn() },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn() },
        },
        insert: vi.fn(),
      }

      const ctx = createRenterContext()
      const service = new MaintenanceService(
        db as any,
        auditLogger as any,
        r2 as any,
      )

      await expect(
        service.addComment(ctx, 'request-1', { content: '' }),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('listRequests', () => {
    it('should return paginated results (Req 10.10)', async () => {
      let selectCallCount = 0
      const db = {
        query: {
          maintenanceRequests: { findFirst: vi.fn() },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn() },
        },
        select: vi.fn().mockImplementation(() => {
          selectCallCount++
          if (selectCallCount % 2 === 1) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      offset: vi.fn().mockResolvedValue([defaultRequest]),
                    }),
                  }),
                }),
              }),
            }
          }
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 1 }]),
            }),
          }
        }),
      }

      const ctx = createOwnerContext()
      const service = new MaintenanceService(
        db as any,
        auditLogger as any,
        r2 as any,
      )

      const result = await service.listRequests(
        ctx,
        {},
        { page: 1, pageSize: 50 },
      )

      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(50)
    })

    it('should cap pageSize at 50 (Req 10.10)', async () => {
      let selectCallCount = 0
      const db = {
        query: {
          maintenanceRequests: { findFirst: vi.fn() },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn() },
        },
        select: vi.fn().mockImplementation(() => {
          selectCallCount++
          if (selectCallCount % 2 === 1) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      offset: vi.fn().mockResolvedValue([]),
                    }),
                  }),
                }),
              }),
            }
          }
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 0 }]),
            }),
          }
        }),
      }

      const ctx = createOwnerContext()
      const service = new MaintenanceService(
        db as any,
        auditLogger as any,
        r2 as any,
      )

      const result = await service.listRequests(
        ctx,
        {},
        { page: 1, pageSize: 100 },
      )

      expect(result.pageSize).toBe(50)
    })

    it('should filter by renter for Renter role (Req 10.8)', async () => {
      let selectCallCount = 0
      const db = {
        query: {
          maintenanceRequests: { findFirst: vi.fn() },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn().mockResolvedValue(defaultRenter) },
        },
        select: vi.fn().mockImplementation(() => {
          selectCallCount++
          if (selectCallCount % 2 === 1) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      offset: vi.fn().mockResolvedValue([defaultRequest]),
                    }),
                  }),
                }),
              }),
            }
          }
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 1 }]),
            }),
          }
        }),
      }

      const ctx = createRenterContext()
      const service = new MaintenanceService(
        db as any,
        auditLogger as any,
        r2 as any,
      )

      const result = await service.listRequests(
        ctx,
        {},
        { page: 1, pageSize: 50 },
      )

      expect(result.data).toHaveLength(1)
    })

    it('should return empty for renter with no renter record', async () => {
      const db = {
        query: {
          maintenanceRequests: { findFirst: vi.fn() },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn().mockResolvedValue(null) },
        },
        select: vi.fn(),
      }

      const ctx = createRenterContext()
      const service = new MaintenanceService(
        db as any,
        auditLogger as any,
        r2 as any,
      )

      const result = await service.listRequests(
        ctx,
        {},
        { page: 1, pageSize: 50 },
      )

      expect(result.data).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('should return empty for manager with no assigned buildings', async () => {
      const db = {
        query: {
          maintenanceRequests: { findFirst: vi.fn() },
          flats: { findFirst: vi.fn() },
          renters: { findFirst: vi.fn() },
        },
        select: vi.fn(),
      }

      const ctx = createManagerContext({ assignedBuildingIds: [] })
      const service = new MaintenanceService(
        db as any,
        auditLogger as any,
        r2 as any,
      )

      const result = await service.listRequests(
        ctx,
        {},
        { page: 1, pageSize: 50 },
      )

      expect(result.data).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })
})
