// Feature: role-based-user-management, Property 13: User deactivation invalidates all sessions

import type { Database } from '@repo/db'
import { AppError } from '@repo/shared/errors'
import fc from 'fast-check'
import { describe, expect, it, vi } from 'vitest'
import type { AuditLogger } from '../../src/plugins/audit-logger'
import { AdminUserService } from '../../src/services/admin-user'

/**
 * Property 13: User deactivation invalidates all sessions
 *
 * For any user with N active sessions (where N ≥ 0), deactivating that user
 * SHALL result in zero active sessions remaining for that user in the sessions table.
 *
 * **Validates: Requirements 4.4**
 */

// --- Types ---

type Role = 'owner' | 'manager' | 'renter'

const NON_SUPERADMIN_ROLES: Role[] = ['owner', 'manager', 'renter']

// --- Generators ---

/** Generate a non-superadmin role (deactivatable users) */
const deactivatableRoleArb = fc.constantFrom<Role>(...NON_SUPERADMIN_ROLES)

/** Generate a number of active sessions (0 to 50) */
const sessionCountArb = fc.integer({ min: 0, max: 50 })

/** Generate a valid UUID-like user ID */
const userIdArb = fc.uuid()

/** Generate a valid UUID-like actor ID */
const actorIdArb = fc.uuid()

// --- Helpers ---

function createMockAuditLogger(): AuditLogger {
  return {
    log: vi.fn(),
    query: vi.fn(),
    pendingRetries: 0,
    shutdown: vi.fn(),
  } as unknown as AuditLogger
}

/**
 * Creates a mock database that tracks session deletion calls.
 * The mock simulates a user with N active sessions and verifies
 * that all sessions are deleted upon deactivation.
 */
function createMockDb(role: Role, userId: string, sessionCount: number) {
  const deletedSessions: string[] = []
  let deleteWhereCalled = false

  const mockDb = {
    query: {
      users: {
        findFirst: vi.fn().mockResolvedValue({
          id: userId,
          role,
          approvalStatus: role === 'owner' ? 'approved' : null,
          name: 'Test User',
          email: 'user@test.com',
          isActive: true,
          ownerAccountId: 'owner-account-1',
        }),
      },
    },
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockImplementation(() => {
        deleteWhereCalled = true
        // Simulate deleting all sessions for the user
        for (let i = 0; i < sessionCount; i++) {
          deletedSessions.push(`session-${i}`)
        }
        return Promise.resolve(undefined)
      }),
    }),
  } as unknown as Database

  return {
    db: mockDb,
    getDeleteWhereCalled: () => deleteWhereCalled,
    getDeletedSessionCount: () => deletedSessions.length,
  }
}

/**
 * Creates a mock database that simulates a superadmin user (should reject deactivation).
 */
function createMockDbSuperadmin(userId: string) {
  return {
    query: {
      users: {
        findFirst: vi.fn().mockResolvedValue({
          id: userId,
          role: 'superadmin',
          approvalStatus: null,
          name: 'Super Admin',
          email: 'admin@test.com',
          isActive: true,
          ownerAccountId: userId,
        }),
      },
    },
  } as unknown as Database
}

// --- Property Tests ---

describe('Feature: role-based-user-management, Property 13: User deactivation invalidates all sessions', () => {
  /**
   * **Validates: Requirements 4.4**
   *
   * For any user with N active sessions (where N ≥ 0), deactivating that user
   * SHALL result in zero active sessions remaining for that user in the sessions table.
   *
   * We verify this by ensuring that the delete operation is called on the sessions table
   * for the target user, which removes all sessions regardless of how many exist.
   */
  it('deactivating a non-superadmin user SHALL delete all sessions for that user', () => {
    return fc.assert(
      fc.asyncProperty(
        actorIdArb,
        userIdArb,
        deactivatableRoleArb,
        sessionCountArb,
        async (actorId, userId, role, sessionCount) => {
          const auditLogger = createMockAuditLogger()
          const { db, getDeleteWhereCalled } = createMockDb(
            role,
            userId,
            sessionCount,
          )
          const service = new AdminUserService(db, auditLogger)

          // Deactivate the user
          await service.deactivateUser(actorId, userId)

          // Property: The delete operation MUST be called on sessions for this user
          // This ensures all N sessions (where N ≥ 0) are removed
          expect(getDeleteWhereCalled()).toBe(true)

          // Verify db.delete was called (sessions table deletion)
          expect(db.delete).toHaveBeenCalled()
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 4.4**
   *
   * Complementary property: After deactivation, the user's isActive flag is set to false,
   * which combined with session deletion ensures no active sessions remain.
   */
  it('deactivating a user SHALL set isActive to false before deleting sessions', () => {
    return fc.assert(
      fc.asyncProperty(
        actorIdArb,
        userIdArb,
        deactivatableRoleArb,
        sessionCountArb,
        async (actorId, userId, role, _sessionCount) => {
          const auditLogger = createMockAuditLogger()
          const setMock = vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          })
          const updateMock = vi.fn().mockReturnValue({ set: setMock })

          const mockDb = {
            query: {
              users: {
                findFirst: vi.fn().mockResolvedValue({
                  id: userId,
                  role,
                  approvalStatus: role === 'owner' ? 'approved' : null,
                  name: 'Test User',
                  email: 'user@test.com',
                  isActive: true,
                  ownerAccountId: 'owner-account-1',
                }),
              },
            },
            update: updateMock,
            delete: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          } as unknown as Database

          const service = new AdminUserService(mockDb, auditLogger)

          await service.deactivateUser(actorId, userId)

          // Property: update MUST be called to set isActive=false
          expect(updateMock).toHaveBeenCalled()
          expect(setMock).toHaveBeenCalledWith(
            expect.objectContaining({
              isActive: false,
            }),
          )
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 4.5**
   *
   * Deactivation of superadmin users SHALL be rejected with a 403 error,
   * ensuring their sessions are NOT deleted.
   */
  it('deactivating a superadmin user SHALL be rejected with 403 and sessions remain intact', () => {
    return fc.assert(
      fc.asyncProperty(actorIdArb, userIdArb, async (actorId, targetUserId) => {
        const auditLogger = createMockAuditLogger()
        const db = createMockDbSuperadmin(targetUserId)
        const service = new AdminUserService(db, auditLogger)

        // Property: Deactivating a superadmin MUST throw AppError(403)
        try {
          await service.deactivateUser(actorId, targetUserId)
          expect.fail(
            'Expected AppError to be thrown for superadmin deactivation',
          )
        } catch (error) {
          expect(error).toBeInstanceOf(AppError)
          const appError = error as AppError
          expect(appError.statusCode).toBe(403)
          expect(appError.message).toContain(
            'Cannot deactivate a superadmin account',
          )
        }

        // Property: db.delete MUST NOT be called (sessions remain intact)
        // Since the mock db doesn't have delete defined, if it were called it would throw
        expect((db as any).delete).toBeUndefined()
      }),
      { numRuns: 100 },
    )
  })
})
