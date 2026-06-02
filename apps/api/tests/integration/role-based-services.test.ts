/**
 * Service-level integration tests for role-based user management.
 *
 * Tests the actual service implementations with mocked database to verify
 * the complete business logic flows including:
 * - Owner approval workflow (OwnerApprovalService)
 * - User deactivation with session invalidation (AdminUserService)
 * - Manager creation with building assignments (ManagerService)
 *
 */

import type { Database } from '@repo/db'
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '@repo/shared/errors'
import { describe, expect, it, vi } from 'vitest'
import type { AuditLogger } from '../../src/plugins/audit-logger'
import { AdminUserService } from '../../src/services/admin-user'
import { ManagerService } from '../../src/services/manager'
import { OwnerApprovalService } from '../../src/services/owner-approval'

// --- Test Helpers ---

function createMockAuditLogger(): AuditLogger {
  return {
    log: vi.fn(),
    query: vi.fn(),
    pendingRetries: 0,
    shutdown: vi.fn(),
  } as unknown as AuditLogger
}

// --- Owner Approval Workflow Tests ---

describe('Integration: Owner Approval Workflow (OwnerApprovalService)', () => {
  /**
   *
   * Tests the complete approval lifecycle:
   * pending → approved, pending → rejected, rejected → approved, approved → rejected
   * Also tests invalid transitions and non-existent owners.
   */

  it('should approve a pending owner and log the action', async () => {
    const auditLogger = createMockAuditLogger()
    const mockDb = {
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'owner-1',
            role: 'owner',
            approvalStatus: 'pending',
            name: 'Test Owner',
            email: 'owner@test.com',
          }),
        },
      },
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    } as unknown as Database

    const service = new OwnerApprovalService(mockDb, auditLogger)

    await service.updateApprovalStatus('superadmin-1', 'owner-1', 'approved')

    // Verify DB update was called
    expect(mockDb.update).toHaveBeenCalled()

    // Verify audit log was written
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'superadmin-1',
        action: 'owner_approved',
        entityType: 'user',
        entityId: 'owner-1',
        oldValues: { approvalStatus: 'pending' },
        newValues: { approvalStatus: 'approved' },
      }),
    )
  })

  it('should reject a pending owner and log the action', async () => {
    const auditLogger = createMockAuditLogger()
    const mockDb = {
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'owner-1',
            role: 'owner',
            approvalStatus: 'pending',
          }),
        },
      },
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    } as unknown as Database

    const service = new OwnerApprovalService(mockDb, auditLogger)

    await service.updateApprovalStatus('superadmin-1', 'owner-1', 'rejected')

    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'owner_rejected',
        oldValues: { approvalStatus: 'pending' },
        newValues: { approvalStatus: 'rejected' },
      }),
    )
  })

  it('should allow re-approval of a rejected owner', async () => {
    const auditLogger = createMockAuditLogger()
    const mockDb = {
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'owner-1',
            role: 'owner',
            approvalStatus: 'rejected',
          }),
        },
      },
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    } as unknown as Database

    const service = new OwnerApprovalService(mockDb, auditLogger)

    await service.updateApprovalStatus('superadmin-1', 'owner-1', 'approved')

    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'owner_approved',
        oldValues: { approvalStatus: 'rejected' },
        newValues: { approvalStatus: 'approved' },
      }),
    )
  })

  it('should throw 400 for invalid transition (approved → pending)', async () => {
    const auditLogger = createMockAuditLogger()
    const mockDb = {
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'owner-1',
            role: 'owner',
            approvalStatus: 'approved',
          }),
        },
      },
    } as unknown as Database

    const service = new OwnerApprovalService(mockDb, auditLogger)

    await expect(
      service.updateApprovalStatus('superadmin-1', 'owner-1', 'pending'),
    ).rejects.toThrow()

    try {
      await service.updateApprovalStatus('superadmin-1', 'owner-1', 'pending')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).statusCode).toBe(400)
      expect((error as AppError).message).toContain('Invalid status transition')
    }
  })

  it('should throw 404 for non-existent owner', async () => {
    const auditLogger = createMockAuditLogger()
    const mockDb = {
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    } as unknown as Database

    const service = new OwnerApprovalService(mockDb, auditLogger)

    await expect(
      service.updateApprovalStatus('superadmin-1', 'nonexistent', 'approved'),
    ).rejects.toThrow(NotFoundError)
  })
})

// --- User Deactivation Tests ---

describe('Integration: Deactivation → Session Invalidation (AdminUserService)', () => {
  /**
   *
   * Tests:
   * - Deactivating a user sets isActive=false
   * - All sessions are deleted for the deactivated user
   * - Superadmin cannot be deactivated (403)
   * - Audit log is written for both success and rejection
   */

  it('should deactivate user, invalidate sessions, and log the action', async () => {
    const auditLogger = createMockAuditLogger()
    const updateSetWhere = vi.fn().mockResolvedValue(undefined)
    const updateSet = vi.fn().mockReturnValue({ where: updateSetWhere })
    const deleteWhere = vi.fn().mockResolvedValue(undefined)

    const mockDb = {
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'owner-1',
            role: 'owner',
            approvalStatus: 'approved',
            name: 'Owner User',
            email: 'owner@test.com',
            isActive: true,
            ownerAccountId: 'owner-1',
          }),
        },
      },
      update: vi.fn().mockReturnValue({ set: updateSet }),
      delete: vi.fn().mockReturnValue({ where: deleteWhere }),
    } as unknown as Database

    const service = new AdminUserService(mockDb, auditLogger)

    await service.deactivateUser('superadmin-1', 'owner-1')

    // Verify isActive was set to false
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false }),
    )

    // Verify sessions were deleted
    expect(mockDb.delete).toHaveBeenCalled()
    expect(deleteWhere).toHaveBeenCalled()

    // Verify audit log
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'superadmin-1',
        action: 'user_deactivated',
        entityId: 'owner-1',
        newValues: expect.objectContaining({ isActive: false }),
      }),
    )
  })

  it('should reject deactivation of superadmin with 403 and log the rejection', async () => {
    const auditLogger = createMockAuditLogger()
    const mockDb = {
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'superadmin-2',
            role: 'superadmin',
            approvalStatus: null,
            name: 'Other Admin',
            email: 'admin2@test.com',
            isActive: true,
            ownerAccountId: 'superadmin-2',
          }),
        },
      },
    } as unknown as Database

    const service = new AdminUserService(mockDb, auditLogger)

    await expect(
      service.deactivateUser('superadmin-1', 'superadmin-2'),
    ).rejects.toThrow()

    try {
      await service.deactivateUser('superadmin-1', 'superadmin-2')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).statusCode).toBe(403)
      expect((error as AppError).message).toContain(
        'Cannot deactivate a superadmin',
      )
    }

    // Verify the rejection was logged to audit
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'user_deactivation_rejected',
        entityId: 'superadmin-2',
      }),
    )
  })

  it('should throw 404 for non-existent user', async () => {
    const auditLogger = createMockAuditLogger()
    const mockDb = {
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    } as unknown as Database

    const service = new AdminUserService(mockDb, auditLogger)

    await expect(
      service.deactivateUser('superadmin-1', 'nonexistent'),
    ).rejects.toThrow(NotFoundError)
  })
})

// --- Manager Creation Tests ---

describe('Integration: Manager Creation (ManagerService)', () => {
  /**
   *
   * Tests:
   * - Successful manager creation with valid input
   * - Building ownership validation
   * - Email uniqueness check (409)
   * - Temporary password generation
   * - Audit logging
   */

  const BUILDING_UUID_1 = '550e8400-e29b-41d4-a716-446655440001'
  const BUILDING_UUID_2 = '550e8400-e29b-41d4-a716-446655440002'
  const FOREIGN_BUILDING_UUID = '550e8400-e29b-41d4-a716-446655440099'

  it('should create manager with valid input and return temp password', async () => {
    const auditLogger = createMockAuditLogger()
    const insertValues = vi.fn().mockResolvedValue(undefined)

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi
            .fn()
            .mockResolvedValue([
              { id: BUILDING_UUID_1 },
              { id: BUILDING_UUID_2 },
            ]),
        }),
      }),
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue(null), // no duplicate email
        },
      },
      insert: vi.fn().mockReturnValue({ values: insertValues }),
    } as unknown as Database

    const service = new ManagerService(mockDb, auditLogger)

    const result = await service.createManager(
      {
        userId: 'owner-1',
        role: 'owner',
        ownerAccountId: 'owner-1',
        ipAddress: '127.0.0.1',
        userAgent: 'test',
      },
      {
        email: 'manager@example.com',
        name: 'Test Manager',
        buildingIds: [BUILDING_UUID_1, BUILDING_UUID_2],
      },
    )

    // Verify result shape
    expect(result.email).toBe('manager@example.com')
    expect(result.name).toBe('Test Manager')
    expect(result.role).toBe('manager')
    expect(result.buildingIds).toEqual([BUILDING_UUID_1, BUILDING_UUID_2])
    expect(result.id).toBeDefined()

    // Verify temporary password meets requirements
    expect(result.temporaryPassword.length).toBeGreaterThanOrEqual(12)
    expect(result.temporaryPassword).toMatch(/[A-Z]/) // uppercase
    expect(result.temporaryPassword).toMatch(/[a-z]/) // lowercase
    expect(result.temporaryPassword).toMatch(/[0-9]/) // digit
    expect(result.temporaryPassword).toMatch(/[!@#$%^&*]/) // special

    // Verify insert was called (user + assignments)
    expect(mockDb.insert).toHaveBeenCalledTimes(2)

    // Verify audit log
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'owner-1',
        action: 'manager_created',
        entityType: 'user',
      }),
    )
  })

  it('should reject manager creation with duplicate email (409)', async () => {
    const auditLogger = createMockAuditLogger()

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: BUILDING_UUID_1 }]),
        }),
      }),
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'existing-user',
            email: 'manager@example.com',
          }),
        },
      },
    } as unknown as Database

    const service = new ManagerService(mockDb, auditLogger)

    await expect(
      service.createManager(
        {
          userId: 'owner-1',
          role: 'owner',
          ownerAccountId: 'owner-1',
          ipAddress: '127.0.0.1',
          userAgent: 'test',
        },
        {
          email: 'manager@example.com',
          name: 'Test Manager',
          buildingIds: [BUILDING_UUID_1],
        },
      ),
    ).rejects.toThrow(ConflictError)
  })

  it('should reject manager creation when buildings do not belong to owner (403)', async () => {
    const auditLogger = createMockAuditLogger()

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          // Returns empty array — no buildings belong to this owner
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    } as unknown as Database

    const service = new ManagerService(mockDb, auditLogger)

    await expect(
      service.createManager(
        {
          userId: 'owner-1',
          role: 'owner',
          ownerAccountId: 'owner-1',
          ipAddress: '127.0.0.1',
          userAgent: 'test',
        },
        {
          email: 'manager@example.com',
          name: 'Test Manager',
          buildingIds: [FOREIGN_BUILDING_UUID],
        },
      ),
    ).rejects.toThrow(ForbiddenError)
  })
})
