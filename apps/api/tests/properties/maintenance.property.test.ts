import type { Database } from '@repo/db'
import {
  MAINTENANCE_STATUS,
  MAINTENANCE_STATUS_TRANSITIONS,
  type MaintenanceStatus,
  ROLES,
} from '@repo/shared/constants'
import { ValidationError } from '@repo/shared/errors'
import type { RequestContext } from '@repo/shared/types'
import fc from 'fast-check'
import { describe, expect, it, vi } from 'vitest'
import type { AuditLogger } from '../../src/plugins/audit-logger'
import type { R2Client } from '../../src/plugins/r2'
import { MaintenanceService } from '../../src/services/maintenance.service'

/**
 * Feature: amarspace-full-implementation
 * Property 15: Maintenance request status transition validity
 *
 * For any maintenance request in any status, the only valid transitions are:
 * Open → In_Progress, Open → Closed,
 * In_Progress → Resolved, In_Progress → Closed,
 * Resolved → Closed, Resolved → In_Progress (re-open).
 * All other transitions (e.g. Open → Resolved, Closed → anything) SHALL be rejected.
 *
 * **Validates: Requirements 10.5, 10.12**
 */

// --- Helpers ---

function createMockAuditLogger() {
  return {
    log: vi.fn(),
    query: vi.fn(),
    pendingRetries: 0,
    shutdown: vi.fn(),
  } as unknown as AuditLogger
}

function createMockR2Client() {
  return {
    upload: vi.fn(),
    getPresignedUrl: vi.fn(),
    delete: vi.fn(),
  } as unknown as R2Client
}

function createOwnerContext(ownerAccountId = 'owner-1'): RequestContext {
  return {
    userId: `user-${ownerAccountId}`,
    role: ROLES.OWNER,
    ownerAccountId,
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
  }
}

// --- Generators ---

/** Generate a maintenance status from the defined constants */
const maintenanceStatusArb = fc.constantFrom(
  MAINTENANCE_STATUS.OPEN,
  MAINTENANCE_STATUS.IN_PROGRESS,
  MAINTENANCE_STATUS.RESOLVED,
  MAINTENANCE_STATUS.CLOSED,
)

// --- Property 15: Maintenance request status transition validity ---

describe('Feature: amarspace-full-implementation, Property 15: Maintenance request status transition validity', () => {
  it('only valid transitions are allowed according to the state machine', async () => {
    await fc.assert(
      fc.asyncProperty(
        maintenanceStatusArb,
        maintenanceStatusArb,
        async (currentStatus, targetStatus) => {
          // Skip self-transitions (same status)
          fc.pre(currentStatus !== targetStatus)

          const allowedTransitions =
            MAINTENANCE_STATUS_TRANSITIONS[currentStatus]
          const isValidTransition = allowedTransitions.includes(targetStatus)

          const ownerAccountId = 'owner-1'
          const requestId = 'request-1'
          const ctx = createOwnerContext(ownerAccountId)
          const auditLogger = createMockAuditLogger()
          const r2 = createMockR2Client()

          const existingRequest = {
            id: requestId,
            ownerAccountId,
            flatId: 'flat-1',
            renterId: 'renter-1',
            buildingId: 'building-1',
            title: 'Test maintenance request',
            description: 'Test description for maintenance',
            priority: 'medium',
            status: currentStatus,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          }

          const db = {
            query: {
              maintenanceRequests: {
                findFirst: vi.fn().mockResolvedValue(existingRequest),
              },
              renters: {
                findFirst: vi.fn().mockResolvedValue(null),
              },
            },
            update: vi.fn().mockReturnValue({
              set: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([
                    {
                      ...existingRequest,
                      status: targetStatus,
                      updatedAt: new Date(),
                    },
                  ]),
                }),
              }),
            }),
            insert: vi.fn(),
            delete: vi.fn(),
            select: vi.fn(),
          } as unknown as Database

          const service = new MaintenanceService(db, auditLogger, r2)

          if (isValidTransition) {
            // Property: Valid transitions succeed and return updated request
            const result = await service.updateRequestStatus(
              ctx,
              requestId,
              targetStatus,
            )
            expect(result).toBeDefined()
            expect(result.status).toBe(targetStatus)
          } else {
            // Property: Invalid transitions are rejected with ValidationError
            await expect(
              service.updateRequestStatus(ctx, requestId, targetStatus),
            ).rejects.toThrow(ValidationError)
          }
        },
      ),
      { numRuns: 200 },
    )
  })

  it('all valid transitions are exactly: Open→In_Progress, Open→Closed, In_Progress→Resolved, In_Progress→Closed, Resolved→Closed, Resolved→In_Progress', () => {
    // Exhaustively verify the transition map matches the spec
    const expectedValidTransitions: [MaintenanceStatus, MaintenanceStatus][] = [
      [MAINTENANCE_STATUS.OPEN, MAINTENANCE_STATUS.IN_PROGRESS],
      [MAINTENANCE_STATUS.OPEN, MAINTENANCE_STATUS.CLOSED],
      [MAINTENANCE_STATUS.IN_PROGRESS, MAINTENANCE_STATUS.RESOLVED],
      [MAINTENANCE_STATUS.IN_PROGRESS, MAINTENANCE_STATUS.CLOSED],
      [MAINTENANCE_STATUS.RESOLVED, MAINTENANCE_STATUS.CLOSED],
      [MAINTENANCE_STATUS.RESOLVED, MAINTENANCE_STATUS.IN_PROGRESS],
    ]

    return fc.assert(
      fc.property(maintenanceStatusArb, maintenanceStatusArb, (from, to) => {
        fc.pre(from !== to)

        const isExpectedValid = expectedValidTransitions.some(
          ([f, t]) => f === from && t === to,
        )
        const isActuallyValid =
          MAINTENANCE_STATUS_TRANSITIONS[from]?.includes(to) ?? false

        // Property: The transition map matches exactly the expected valid transitions
        expect(isActuallyValid).toBe(isExpectedValid)
      }),
      { numRuns: 200 },
    )
  })

  it('Closed status has no valid outgoing transitions (terminal state)', async () => {
    await fc.assert(
      fc.asyncProperty(maintenanceStatusArb, async (targetStatus) => {
        // Closed is a terminal state — no transitions out of it
        fc.pre(targetStatus !== MAINTENANCE_STATUS.CLOSED)

        const ownerAccountId = 'owner-1'
        const requestId = 'request-1'
        const ctx = createOwnerContext(ownerAccountId)
        const auditLogger = createMockAuditLogger()
        const r2 = createMockR2Client()

        const closedRequest = {
          id: requestId,
          ownerAccountId,
          flatId: 'flat-1',
          renterId: 'renter-1',
          buildingId: 'building-1',
          title: 'Test maintenance request',
          description: 'Test description for maintenance',
          priority: 'medium',
          status: MAINTENANCE_STATUS.CLOSED,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        }

        const db = {
          query: {
            maintenanceRequests: {
              findFirst: vi.fn().mockResolvedValue(closedRequest),
            },
            renters: {
              findFirst: vi.fn().mockResolvedValue(null),
            },
          },
          update: vi.fn(),
          insert: vi.fn(),
          delete: vi.fn(),
          select: vi.fn(),
        } as unknown as Database

        const service = new MaintenanceService(db, auditLogger, r2)

        // Property: Any transition from Closed is rejected
        await expect(
          service.updateRequestStatus(ctx, requestId, targetStatus),
        ).rejects.toThrow(ValidationError)
      }),
      { numRuns: 200 },
    )
  })

  it('Open status cannot transition directly to Resolved (must go through In_Progress first)', async () => {
    const ownerAccountId = 'owner-1'
    const requestId = 'request-1'
    const ctx = createOwnerContext(ownerAccountId)
    const auditLogger = createMockAuditLogger()
    const r2 = createMockR2Client()

    const openRequest = {
      id: requestId,
      ownerAccountId,
      flatId: 'flat-1',
      renterId: 'renter-1',
      buildingId: 'building-1',
      title: 'Test maintenance request',
      description: 'Test description for maintenance',
      priority: 'medium',
      status: MAINTENANCE_STATUS.OPEN,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    }

    const db = {
      query: {
        maintenanceRequests: {
          findFirst: vi.fn().mockResolvedValue(openRequest),
        },
        renters: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
      update: vi.fn(),
      insert: vi.fn(),
      delete: vi.fn(),
      select: vi.fn(),
    } as unknown as Database

    const service = new MaintenanceService(db, auditLogger, r2)

    // Property: Open → Resolved is an invalid transition
    await expect(
      service.updateRequestStatus(ctx, requestId, MAINTENANCE_STATUS.RESOLVED),
    ).rejects.toThrow(ValidationError)
  })

  it('Resolved status can transition back to In_Progress (re-open workflow)', async () => {
    const ownerAccountId = 'owner-1'
    const requestId = 'request-1'
    const ctx = createOwnerContext(ownerAccountId)
    const auditLogger = createMockAuditLogger()
    const r2 = createMockR2Client()

    const resolvedRequest = {
      id: requestId,
      ownerAccountId,
      flatId: 'flat-1',
      renterId: 'renter-1',
      buildingId: 'building-1',
      title: 'Test maintenance request',
      description: 'Test description for maintenance',
      priority: 'medium',
      status: MAINTENANCE_STATUS.RESOLVED,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    }

    const db = {
      query: {
        maintenanceRequests: {
          findFirst: vi.fn().mockResolvedValue(resolvedRequest),
        },
        renters: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                ...resolvedRequest,
                status: MAINTENANCE_STATUS.IN_PROGRESS,
                updatedAt: new Date(),
              },
            ]),
          }),
        }),
      }),
      insert: vi.fn(),
      delete: vi.fn(),
      select: vi.fn(),
    } as unknown as Database

    const service = new MaintenanceService(db, auditLogger, r2)

    // Property: Resolved → In_Progress is a valid transition (re-open)
    const result = await service.updateRequestStatus(
      ctx,
      requestId,
      MAINTENANCE_STATUS.IN_PROGRESS,
    )
    expect(result).toBeDefined()
    expect(result.status).toBe(MAINTENANCE_STATUS.IN_PROGRESS)
  })
})
