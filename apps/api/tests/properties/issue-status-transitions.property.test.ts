import type { Database } from '@repo/db'
import type { R2Client } from '../../src/plugins/r2'
import {
  ISSUE_STATUS,
  ISSUE_STATUS_TRANSITIONS,
  type IssueStatus,
} from '@repo/shared/constants'
import { ValidationError } from '@repo/shared/errors'
import type { RequestContext } from '@repo/shared/types'
import fc from 'fast-check'
import { describe, expect, it, vi } from 'vitest'
import type { AuditLogger } from '../../src/plugins/audit-logger'
import { IssueService } from '../../src/services/issue.service'

/**
 * Feature: amarspace-full-implementation
 * Property 16: Issue status transition validity
 *
 * The issue status state machine enforces valid transitions only:
 * - Open → In_Progress (valid)
 * - Open → Resolved (valid)
 * - Open → Closed (valid)
 * - In_Progress → Resolved (valid)
 * - In_Progress → Closed (valid)
 * - Resolved → Closed (valid)
 * - Closed → nothing (terminal state, all transitions invalid)
 * - All other transitions are INVALID and must be rejected
 *
 * Additionally, when transitioning to Resolved, resolution notes are REQUIRED
 * (max 2000 chars). Transitioning to Resolved without resolution notes SHALL
 * be rejected.
 *
 */

// --- Helpers ---

const mockR2 = {
  upload: vi.fn().mockResolvedValue('storage-key'),
  getPresignedUrl: vi.fn().mockResolvedValue('https://example.com/file'),
  delete: vi.fn().mockResolvedValue(undefined),
} as unknown as R2Client

function createMockAuditLogger() {
  return {
    log: vi.fn(),
    query: vi.fn(),
    pendingRetries: 0,
    shutdown: vi.fn(),
  } as unknown as AuditLogger
}

function createOwnerContext(ownerAccountId = 'owner-1'): RequestContext {
  return {
    userId: `user-${ownerAccountId}`,
    role: 'owner',
    ownerAccountId,
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
  }
}

// Fixed UUIDs for test data (valid UUID format required by Zod schema)
const ISSUE_ID = '550e8400-e29b-41d4-a716-446655440020'
const BUILDING_ID = '550e8400-e29b-41d4-a716-446655440021'
const OWNER_ACCOUNT_ID = 'owner-1'

// --- Generators ---

/** Generate an issue status from the defined constants */
const issueStatusArb = fc.constantFrom(
  ISSUE_STATUS.OPEN,
  ISSUE_STATUS.IN_PROGRESS,
  ISSUE_STATUS.RESOLVED,
  ISSUE_STATUS.CLOSED,
)

/** Generate a valid resolution notes string: 1-2000 characters */
const validResolutionNotesArb = fc
  .string({ minLength: 1, maxLength: 2000 })
  .filter((s) => s.trim().length > 0)

/** Generate an empty or whitespace-only resolution notes string */
const emptyResolutionNotesArb = fc.constantFrom('', '   ', '\t', '\n')

// --- Mock Helpers ---

function createMockDbForIssue(
  currentStatus: IssueStatus,
  newStatus: IssueStatus,
  resolutionNotes?: string,
) {
  const existingIssue = {
    id: ISSUE_ID,
    ownerAccountId: OWNER_ACCOUNT_ID,
    buildingId: BUILDING_ID,
    title: 'Test Issue',
    description: 'Test description for the issue',
    category: 'plumbing',
    priority: 'medium',
    status: currentStatus,
    assigneeId: null,
    resolutionNotes: null,
    resolvedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  const updatedIssue = {
    ...existingIssue,
    status: newStatus,
    resolutionNotes:
      newStatus === ISSUE_STATUS.RESOLVED ? (resolutionNotes ?? null) : null,
    resolvedAt: newStatus === ISSUE_STATUS.RESOLVED ? new Date() : null,
    updatedAt: new Date(),
  }

  return {
    query: {
      issues: {
        findFirst: vi.fn().mockResolvedValue(existingIssue),
      },
      buildings: {
        findFirst: vi.fn(),
      },
      users: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedIssue]),
        }),
      }),
    }),
    delete: vi.fn(),
    select: vi.fn(),
  } as unknown as Database
}

// --- Property 16: Issue status transition validity ---

describe('Feature: amarspace-full-implementation, Property 16: Issue status transition validity', () => {
  it('valid transitions SHALL succeed and invalid transitions SHALL be rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        issueStatusArb,
        issueStatusArb,
        validResolutionNotesArb,
        async (currentStatus, newStatus, resolutionNotes) => {
          // Skip self-transitions (same status → same status)
          fc.pre(currentStatus !== newStatus)

          const allowedTransitions = ISSUE_STATUS_TRANSITIONS[currentStatus]
          const isValidTransition = allowedTransitions.includes(newStatus)

          const ctx = createOwnerContext(OWNER_ACCOUNT_ID)
          const auditLogger = createMockAuditLogger()
          const db = createMockDbForIssue(
            currentStatus,
            newStatus,
            resolutionNotes,
          )
          const service = new IssueService(db, auditLogger, mockR2)

          // For Resolved transitions, always provide resolution notes
          const input =
            newStatus === ISSUE_STATUS.RESOLVED
              ? { status: newStatus, resolutionNotes }
              : { status: newStatus }

          if (isValidTransition) {
            // Property: Valid transitions succeed
            const result = await service.updateIssueStatus(ctx, ISSUE_ID, input)
            expect(result).toBeDefined()
            expect(result.status).toBe(newStatus)
          } else {
            // Property: Invalid transitions are rejected with ValidationError
            await expect(
              service.updateIssueStatus(ctx, ISSUE_ID, input),
            ).rejects.toThrow(ValidationError)
          }
        },
      ),
      { numRuns: 200 },
    )
  })

  it('the valid transition set matches exactly the spec: Open→{In_Progress,Resolved,Closed}, In_Progress→{Resolved,Closed}, Resolved→{Closed}, Closed→{}', () => {
    // Exhaustively verify the transition map matches the spec
    const expectedValidTransitions: [IssueStatus, IssueStatus][] = [
      [ISSUE_STATUS.OPEN, ISSUE_STATUS.IN_PROGRESS],
      [ISSUE_STATUS.OPEN, ISSUE_STATUS.RESOLVED],
      [ISSUE_STATUS.OPEN, ISSUE_STATUS.CLOSED],
      [ISSUE_STATUS.IN_PROGRESS, ISSUE_STATUS.RESOLVED],
      [ISSUE_STATUS.IN_PROGRESS, ISSUE_STATUS.CLOSED],
      [ISSUE_STATUS.RESOLVED, ISSUE_STATUS.CLOSED],
    ]

    fc.assert(
      fc.property(issueStatusArb, issueStatusArb, (from, to) => {
        fc.pre(from !== to)

        const isExpectedValid = expectedValidTransitions.some(
          ([f, t]) => f === from && t === to,
        )
        const isActuallyValid =
          ISSUE_STATUS_TRANSITIONS[from]?.includes(to) ?? false

        // Property: The transition map matches exactly the expected valid transitions
        expect(isActuallyValid).toBe(isExpectedValid)
      }),
      { numRuns: 200 },
    )
  })

  it('Closed is a terminal state: all transitions FROM Closed SHALL be rejected', async () => {
    await fc.assert(
      fc.asyncProperty(issueStatusArb, async (targetStatus) => {
        // Closed → anything is always invalid
        fc.pre(targetStatus !== ISSUE_STATUS.CLOSED) // skip self-transition

        const ctx = createOwnerContext(OWNER_ACCOUNT_ID)
        const auditLogger = createMockAuditLogger()
        const db = createMockDbForIssue(
          ISSUE_STATUS.CLOSED,
          targetStatus,
          'some notes',
        )
        const service = new IssueService(db, auditLogger, mockR2)

        const input =
          targetStatus === ISSUE_STATUS.RESOLVED
            ? { status: targetStatus, resolutionNotes: 'Resolution notes' }
            : { status: targetStatus }

        // Property: No transition from Closed is allowed
        await expect(
          service.updateIssueStatus(ctx, ISSUE_ID, input),
        ).rejects.toThrow(ValidationError)
      }),
      { numRuns: 100 },
    )
  })

  it('transitioning to Resolved WITHOUT resolution notes SHALL be rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Only statuses that can validly transition to Resolved
        fc.constantFrom(ISSUE_STATUS.OPEN, ISSUE_STATUS.IN_PROGRESS),
        emptyResolutionNotesArb,
        async (currentStatus, emptyNotes) => {
          const ctx = createOwnerContext(OWNER_ACCOUNT_ID)
          const auditLogger = createMockAuditLogger()
          const db = createMockDbForIssue(
            currentStatus,
            ISSUE_STATUS.RESOLVED,
            emptyNotes,
          )
          const service = new IssueService(db, auditLogger, mockR2)

          // Property: Transitioning to Resolved without resolution notes is rejected
          await expect(
            service.updateIssueStatus(ctx, ISSUE_ID, {
              status: ISSUE_STATUS.RESOLVED,
              resolutionNotes: emptyNotes,
            }),
          ).rejects.toThrow(ValidationError)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('transitioning to Resolved WITH valid resolution notes (1-2000 chars) SHALL succeed', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Only statuses that can validly transition to Resolved
        fc.constantFrom(ISSUE_STATUS.OPEN, ISSUE_STATUS.IN_PROGRESS),
        validResolutionNotesArb,
        async (currentStatus, resolutionNotes) => {
          const ctx = createOwnerContext(OWNER_ACCOUNT_ID)
          const auditLogger = createMockAuditLogger()
          const db = createMockDbForIssue(
            currentStatus,
            ISSUE_STATUS.RESOLVED,
            resolutionNotes,
          )
          const service = new IssueService(db, auditLogger, mockR2)

          // Property: Transitioning to Resolved with valid notes succeeds
          const result = await service.updateIssueStatus(ctx, ISSUE_ID, {
            status: ISSUE_STATUS.RESOLVED,
            resolutionNotes,
          })

          expect(result).toBeDefined()
          expect(result.status).toBe(ISSUE_STATUS.RESOLVED)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('resolution notes exceeding 2000 characters SHALL be rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(ISSUE_STATUS.OPEN, ISSUE_STATUS.IN_PROGRESS),
        // Generate strings longer than 2000 chars
        fc.string({ minLength: 2001, maxLength: 3000 }),
        async (currentStatus, tooLongNotes) => {
          const ctx = createOwnerContext(OWNER_ACCOUNT_ID)
          const auditLogger = createMockAuditLogger()
          const db = createMockDbForIssue(
            currentStatus,
            ISSUE_STATUS.RESOLVED,
            tooLongNotes,
          )
          const service = new IssueService(db, auditLogger, mockR2)

          // Property: Resolution notes exceeding 2000 chars are rejected
          await expect(
            service.updateIssueStatus(ctx, ISSUE_ID, {
              status: ISSUE_STATUS.RESOLVED,
              resolutionNotes: tooLongNotes,
            }),
          ).rejects.toThrow(ValidationError)
        },
      ),
      { numRuns: 100 },
    )
  })
})
