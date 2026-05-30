// Feature: role-based-user-management, Property 5: Only valid approval status transitions succeed

import type { Database } from '@repo/db'
import { AppError, NotFoundError } from '@repo/shared/errors'
import {
  type ApprovalStatus,
  VALID_APPROVAL_TRANSITIONS,
} from '@repo/shared/roles'
import fc from 'fast-check'
import { describe, expect, it, vi } from 'vitest'
import type { AuditLogger } from '../../src/plugins/audit-logger'
import { OwnerApprovalService } from '../../src/services/owner-approval'

/**
 * Property 5: Only valid approval status transitions succeed
 *
 * For any pair of (currentStatus, targetStatus) from the set {pending, approved, rejected},
 * the approval status update SHALL succeed if and only if the transition is in the valid
 * transitions map: pending→approved, pending→rejected, rejected→approved, approved→rejected.
 *
 * **Validates: Requirements 2.6, 2.8**
 */

// --- Constants ---

const ALL_STATUSES: ApprovalStatus[] = ['pending', 'approved', 'rejected']

// --- Generators ---

/** Generate any valid approval status */
const approvalStatusArb = fc.constantFrom<ApprovalStatus>(...ALL_STATUSES)

/** Generate a pair of (currentStatus, targetStatus) */
const statusTransitionArb = fc.tuple(approvalStatusArb, approvalStatusArb)

/** Generate a valid transition pair */
const validTransitionArb = fc.constantFrom<[ApprovalStatus, ApprovalStatus]>(
  ['pending', 'approved'],
  ['pending', 'rejected'],
  ['rejected', 'approved'],
  ['approved', 'rejected'],
)

/** Generate an invalid transition pair */
const invalidTransitionArb = fc.constantFrom<[ApprovalStatus, ApprovalStatus]>(
  ['approved', 'pending'],
  ['rejected', 'pending'],
  ['approved', 'approved'],
  ['rejected', 'rejected'],
  ['pending', 'pending'],
)

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
 * Creates a mock database that simulates an existing owner with the given approval status.
 */
function createMockDb(currentStatus: ApprovalStatus) {
  return {
    query: {
      users: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'owner-123',
          role: 'owner',
          approvalStatus: currentStatus,
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
}

/**
 * Creates a mock database that simulates a non-existent owner.
 */
function createMockDbNotFound() {
  return {
    query: {
      users: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
  } as unknown as Database
}

// --- Property Tests ---

describe('Feature: role-based-user-management, Property 5: Only valid approval status transitions succeed', () => {
  it('valid transitions (pending→approved, pending→rejected, rejected→approved, approved→rejected) SHALL succeed', () => {
    return fc.assert(
      fc.asyncProperty(
        validTransitionArb,
        async ([currentStatus, targetStatus]) => {
          const auditLogger = createMockAuditLogger()
          const db = createMockDb(currentStatus)
          const service = new OwnerApprovalService(db, auditLogger)

          // Property: Valid transitions MUST succeed without throwing
          await expect(
            service.updateApprovalStatus('actor-1', 'owner-123', targetStatus),
          ).resolves.toBeUndefined()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('invalid transitions SHALL be rejected with AppError(400, INVALID_TRANSITION)', () => {
    return fc.assert(
      fc.asyncProperty(
        invalidTransitionArb,
        async ([currentStatus, targetStatus]) => {
          const auditLogger = createMockAuditLogger()
          const db = createMockDb(currentStatus)
          const service = new OwnerApprovalService(db, auditLogger)

          // Property: Invalid transitions MUST throw AppError with status 400
          try {
            await service.updateApprovalStatus(
              'actor-1',
              'owner-123',
              targetStatus,
            )
            // If we reach here, the test should fail
            expect.fail('Expected AppError to be thrown for invalid transition')
          } catch (error) {
            expect(error).toBeInstanceOf(AppError)
            const appError = error as AppError
            expect(appError.statusCode).toBe(400)
            expect(appError.code).toBe('INVALID_TRANSITION')
            expect(appError.message).toContain(currentStatus)
            expect(appError.message).toContain(targetStatus)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('for any (currentStatus, targetStatus) pair, success iff transition is in VALID_APPROVAL_TRANSITIONS', () => {
    return fc.assert(
      fc.asyncProperty(
        statusTransitionArb,
        async ([currentStatus, targetStatus]) => {
          const auditLogger = createMockAuditLogger()
          const db = createMockDb(currentStatus)
          const service = new OwnerApprovalService(db, auditLogger)

          const isValidTransition =
            VALID_APPROVAL_TRANSITIONS[currentStatus]?.includes(targetStatus) ??
            false

          if (isValidTransition) {
            // Property: Valid transitions MUST succeed
            await expect(
              service.updateApprovalStatus(
                'actor-1',
                'owner-123',
                targetStatus,
              ),
            ).resolves.toBeUndefined()
          } else {
            // Property: Invalid transitions MUST throw AppError(400)
            await expect(
              service.updateApprovalStatus(
                'actor-1',
                'owner-123',
                targetStatus,
              ),
            ).rejects.toThrow(AppError)

            try {
              await service.updateApprovalStatus(
                'actor-1',
                'owner-123',
                targetStatus,
              )
            } catch (error) {
              const appError = error as AppError
              expect(appError.statusCode).toBe(400)
              expect(appError.code).toBe('INVALID_TRANSITION')
            }
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('non-existent owner throws NotFoundError regardless of target status', () => {
    return fc.assert(
      fc.asyncProperty(approvalStatusArb, async (targetStatus) => {
        const auditLogger = createMockAuditLogger()
        const db = createMockDbNotFound()
        const service = new OwnerApprovalService(db, auditLogger)

        // Property: Non-existent owner MUST throw NotFoundError
        await expect(
          service.updateApprovalStatus(
            'actor-1',
            'non-existent-id',
            targetStatus,
          ),
        ).rejects.toThrow(NotFoundError)
      }),
      { numRuns: 100 },
    )
  })
})
