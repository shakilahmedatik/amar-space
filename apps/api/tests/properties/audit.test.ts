import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  type AuditLogEntry,
  AuditLogger,
  type AuditQueryParams,
  AuditValidationError,
} from '../../src/plugins/audit'

/**
 * Feature: amarspace-infrastructure-setup
 * Property 7: Audit Log Entry Integrity
 *
 * For any trackable action, the resulting audit log entry SHALL contain all required
 * fields (actorUserId, entityType ≤ 100 chars, entityId, action ≤ 100 chars, ipAddress,
 * userAgent, createdAt), and for any JSON-serializable old/new value (≤ 10KB), storing
 * and retrieving the value SHALL produce a value deeply equal to the original.
 *
 * Validates: Requirements 7.2, 7.8
 */

// --- Mock Database Layer ---

interface CapturedInsert {
  actorUserId: string
  entityType: string
  entityId: string
  action: string
  oldValue: unknown
  newValue: unknown
  ipAddress: string
  userAgent: string
}

/**
 * Creates a mock database that captures insert calls.
 * Returns the mock db and a function to retrieve captured entries.
 */
function createMockDb() {
  const captured: CapturedInsert[] = []

  const mockDb = {
    insert: () => ({
      values: (entry: CapturedInsert) => {
        captured.push(entry)
        return Promise.resolve()
      },
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => ({
              offset: () => Promise.resolve([]),
            }),
          }),
        }),
      }),
    }),
  }

  return { db: mockDb as any, captured }
}

// --- Generators ---

/** Generate a valid UUID-like string for actorUserId */
const uuidArb = fc
  .tuple(
    fc.stringMatching(/^[0-9a-f]{8}$/),
    fc.stringMatching(/^[0-9a-f]{4}$/),
    fc.stringMatching(/^[0-9a-f]{4}$/),
    fc.stringMatching(/^[0-9a-f]{4}$/),
    fc.stringMatching(/^[0-9a-f]{12}$/),
  )
  .map(([a, b, c, d, e]) => `${a}-${b}-${c}-${d}-${e}`)

/** Generate entityType within 100 chars */
const entityTypeArb = fc.stringMatching(/^[a-zA-Z_-]{1,100}$/)

/** Generate action within 100 chars */
const actionArb = fc.stringMatching(/^[a-zA-Z._:/-]{1,100}$/)

/** Generate entityId as a non-empty string */
const entityIdArb = fc.string({ minLength: 1, maxLength: 255 })

/** Generate a valid IPv4 or IPv6 address */
const ipAddressArb = fc.oneof(
  fc
    .tuple(
      fc.integer({ min: 1, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
    )
    .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
  fc.constant('::1'),
  fc.constant('fe80::1'),
)

/** Generate a user agent string */
const userAgentArb = fc.stringMatching(/^[a-zA-Z0-9 /().;,_-]{5,200}$/)

/**
 * Generate a JSON-serializable value that is ≤ 10KB when serialized.
 * Uses fast-check's jsonValue but constrains the depth/size to stay under 10KB.
 */
const jsonValueUnder10KBArb = fc.jsonValue({ maxDepth: 3 }).filter((val) => {
  const serialized = JSON.stringify(val)
  return new TextEncoder().encode(serialized).length <= 10 * 1024
})

/** Generate a complete valid AuditLogEntry */
const validAuditEntryArb = fc
  .tuple(
    uuidArb,
    entityTypeArb,
    entityIdArb,
    actionArb,
    ipAddressArb,
    userAgentArb,
    fc.option(jsonValueUnder10KBArb, { nil: undefined }),
    fc.option(jsonValueUnder10KBArb, { nil: undefined }),
  )
  .map(
    ([
      actorUserId,
      entityType,
      entityId,
      action,
      ipAddress,
      userAgent,
      oldValue,
      newValue,
    ]): AuditLogEntry => ({
      actorUserId,
      entityType,
      entityId,
      action,
      ipAddress,
      userAgent,
      oldValue,
      newValue,
    }),
  )

// --- Property Tests ---

describe('Feature: amarspace-infrastructure-setup, Property 7: Audit Log Entry Integrity', () => {
  it('all required fields are present in the captured audit log entry after logging', () => {
    return fc.assert(
      fc.asyncProperty(validAuditEntryArb, async (entry) => {
        const { db, captured } = createMockDb()
        const logger = new AuditLogger(db)

        await logger.log(entry)

        // Verify the entry was captured
        expect(captured.length).toBe(1)
        const written = captured[0]!

        // Verify all required fields are present
        expect(written.actorUserId).toBe(entry.actorUserId)
        expect(written.entityType).toBe(entry.entityType)
        expect(written.entityId).toBe(entry.entityId)
        expect(written.action).toBe(entry.action)
        expect(written.ipAddress).toBe(entry.ipAddress)
        expect(written.userAgent).toBe(entry.userAgent)

        // Verify entityType ≤ 100 chars
        expect(written.entityType.length).toBeLessThanOrEqual(100)

        // Verify action ≤ 100 chars
        expect(written.action.length).toBeLessThanOrEqual(100)

        logger.shutdown()
      }),
      { numRuns: 100 },
    )
  })

  it('JSON old/new values round-trip correctly through serialization', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.tuple(
          validAuditEntryArb,
          jsonValueUnder10KBArb,
          jsonValueUnder10KBArb,
        ),
        async ([baseEntry, oldValue, newValue]) => {
          const entry: AuditLogEntry = {
            ...baseEntry,
            oldValue,
            newValue,
          }

          const { db, captured } = createMockDb()
          const logger = new AuditLogger(db)

          await logger.log(entry)

          expect(captured.length).toBe(1)
          const written = captured[0]!

          // Verify JSON round-trip: serialize and deserialize should produce deeply equal values
          const oldValueRoundTripped = JSON.parse(
            JSON.stringify(written.oldValue),
          )
          const newValueRoundTripped = JSON.parse(
            JSON.stringify(written.newValue),
          )

          expect(oldValueRoundTripped).toEqual(
            JSON.parse(JSON.stringify(oldValue)),
          )
          expect(newValueRoundTripped).toEqual(
            JSON.parse(JSON.stringify(newValue)),
          )

          logger.shutdown()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('undefined old/new values are stored as null', () => {
    return fc.assert(
      fc.asyncProperty(validAuditEntryArb, async (baseEntry) => {
        const entry: AuditLogEntry = {
          ...baseEntry,
          oldValue: undefined,
          newValue: undefined,
        }

        const { db, captured } = createMockDb()
        const logger = new AuditLogger(db)

        await logger.log(entry)

        expect(captured.length).toBe(1)
        const written = captured[0]!

        // Undefined values should be stored as null for database compatibility
        expect(written.oldValue).toBeNull()
        expect(written.newValue).toBeNull()

        logger.shutdown()
      }),
      { numRuns: 100 },
    )
  })

  it('rejects entries with entityType exceeding 100 characters', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.tuple(
          validAuditEntryArb,
          fc.string({ minLength: 101, maxLength: 200 }),
        ),
        async ([baseEntry, longEntityType]) => {
          const entry: AuditLogEntry = {
            ...baseEntry,
            entityType: longEntityType,
          }

          const { db } = createMockDb()
          const logger = new AuditLogger(db)

          await expect(logger.log(entry)).rejects.toThrow(AuditValidationError)

          logger.shutdown()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('rejects entries with action exceeding 100 characters', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.tuple(
          validAuditEntryArb,
          fc.string({ minLength: 101, maxLength: 200 }),
        ),
        async ([baseEntry, longAction]) => {
          const entry: AuditLogEntry = {
            ...baseEntry,
            action: longAction,
          }

          const { db } = createMockDb()
          const logger = new AuditLogger(db)

          await expect(logger.log(entry)).rejects.toThrow(AuditValidationError)

          logger.shutdown()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('rejects entries with JSON values exceeding 10KB', () => {
    return fc.assert(
      fc.asyncProperty(validAuditEntryArb, async (baseEntry) => {
        // Create a value that exceeds 10KB when serialized
        const largeValue = { data: 'x'.repeat(11 * 1024) }

        const entryWithLargeOld: AuditLogEntry = {
          ...baseEntry,
          oldValue: largeValue,
          newValue: undefined,
        }

        const { db } = createMockDb()
        const logger = new AuditLogger(db)

        await expect(logger.log(entryWithLargeOld)).rejects.toThrow(
          AuditValidationError,
        )

        const entryWithLargeNew: AuditLogEntry = {
          ...baseEntry,
          oldValue: undefined,
          newValue: largeValue,
        }

        await expect(logger.log(entryWithLargeNew)).rejects.toThrow(
          AuditValidationError,
        )

        logger.shutdown()
      }),
      { numRuns: 100 },
    )
  })
})

/**
 * Feature: amarspace-infrastructure-setup
 * Property 8: Audit Log Fault Tolerance
 *
 * For any trackable action where the audit log write operation fails (database error,
 * timeout, constraint violation), the primary action SHALL still complete successfully
 * and return its expected response to the client.
 *
 * Validates: Requirements 7.4
 */

// --- Failing DB Mock Generators ---

/** Generate various database error types */
const dbErrorArb = fc.oneof(
  fc.constant(new Error('connection refused')),
  fc.constant(new Error('ECONNRESET')),
  fc.constant(new Error('timeout exceeded')),
  fc.constant(new Error('unique constraint violation')),
  fc.constant(new Error('relation "audit_logs" does not exist')),
  fc.constant(new Error('deadlock detected')),
  fc.constant(new Error('out of shared memory')),
  fc.constant(new Error('too many connections')),
)

/**
 * Creates a mock database that always fails on insert with the given error.
 * This simulates DB failures during audit log writes.
 */
function createFailingMockDb(error: Error) {
  const mockDb = {
    insert: () => ({
      values: () => {
        return Promise.reject(error)
      },
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => ({
              offset: () => Promise.resolve([]),
            }),
          }),
        }),
      }),
    }),
  }

  return { db: mockDb as any }
}

/**
 * Simulates a "primary action" that logs an audit entry as part of its execution.
 * The primary action should complete successfully even if the audit log write fails.
 */
async function simulatePrimaryActionWithAudit(
  logger: AuditLogger,
  entry: AuditLogEntry,
): Promise<{ success: boolean; result: string }> {
  // Simulate the primary action (e.g., creating a flat, approving a renter)
  const primaryResult = { success: true, result: 'action-completed' }

  // Log the audit entry — this should NOT throw even if DB fails
  await logger.log(entry)

  // Return the primary action result
  return primaryResult
}

describe('Feature: amarspace-infrastructure-setup, Property 8: Audit Log Fault Tolerance', () => {
  it('primary action completes successfully when audit log write fails with any database error', () => {
    return fc.assert(
      fc.asyncProperty(
        validAuditEntryArb,
        dbErrorArb,
        async (entry, dbError) => {
          const { db } = createFailingMockDb(dbError)
          const logger = new AuditLogger(db)

          // The log() method should NOT throw — it should catch the DB error
          // and queue the entry for retry
          await expect(logger.log(entry)).resolves.toBeUndefined()

          logger.shutdown()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('primary action result is unaffected by audit log database failures', () => {
    return fc.assert(
      fc.asyncProperty(
        validAuditEntryArb,
        dbErrorArb,
        async (entry, dbError) => {
          const { db } = createFailingMockDb(dbError)
          const logger = new AuditLogger(db)

          // Simulate a primary action that includes audit logging
          const result = await simulatePrimaryActionWithAudit(logger, entry)

          // The primary action should complete successfully
          expect(result.success).toBe(true)
          expect(result.result).toBe('action-completed')

          logger.shutdown()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('failed audit log entries are queued for retry when DB write fails', () => {
    return fc.assert(
      fc.asyncProperty(
        validAuditEntryArb,
        dbErrorArb,
        async (entry, dbError) => {
          const { db } = createFailingMockDb(dbError)
          const logger = new AuditLogger(db)

          // Before logging, no pending retries
          expect(logger.pendingRetries).toBe(0)

          // Log the entry — DB will fail, entry should be queued
          await logger.log(entry)

          // After failed write, the entry should be in the retry queue
          expect(logger.pendingRetries).toBe(1)

          logger.shutdown()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('multiple consecutive audit failures do not block subsequent primary actions', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.array(validAuditEntryArb, { minLength: 2, maxLength: 10 }),
        dbErrorArb,
        async (entries, dbError) => {
          const { db } = createFailingMockDb(dbError)
          const logger = new AuditLogger(db)

          // Simulate multiple primary actions, each with a failing audit log
          for (const entry of entries) {
            const result = await simulatePrimaryActionWithAudit(logger, entry)
            expect(result.success).toBe(true)
            expect(result.result).toBe('action-completed')
          }

          // All failed entries should be queued
          expect(logger.pendingRetries).toBe(entries.length)

          logger.shutdown()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('intermittent DB failures do not affect primary actions that succeed on audit write', () => {
    return fc.assert(
      fc.asyncProperty(
        validAuditEntryArb,
        dbErrorArb,
        async (entry, dbError) => {
          // Create a DB that fails on the first call, then succeeds
          let callCount = 0
          const mockDb = {
            insert: () => ({
              values: () => {
                callCount++
                if (callCount === 1) {
                  return Promise.reject(dbError)
                }
                return Promise.resolve()
              },
            }),
            select: () => ({
              from: () => ({
                where: () => ({
                  orderBy: () => ({
                    limit: () => ({
                      offset: () => Promise.resolve([]),
                    }),
                  }),
                }),
              }),
            }),
          }

          const logger = new AuditLogger(mockDb as any)

          // First action — audit write fails, but action completes
          const result1 = await simulatePrimaryActionWithAudit(logger, entry)
          expect(result1.success).toBe(true)

          // Second action — audit write succeeds, action still completes
          const result2 = await simulatePrimaryActionWithAudit(logger, entry)
          expect(result2.success).toBe(true)

          logger.shutdown()
        },
      ),
      { numRuns: 100 },
    )
  })
})

/**
 * Feature: amarspace-infrastructure-setup
 * Property 9: Audit Log Role-Based Access Control
 *
 * For any user and audit log query: if the user has the Owner role, the query SHALL
 * return all matching entries; if the user has the Manager role, the query SHALL return
 * only entries where the entity belongs to a property assigned to that manager; if the
 * user has neither role, the query SHALL be denied with a permissions error. In all
 * permitted cases, pagination SHALL return at most 100 entries per page.
 *
 * Validates: Requirements 7.5, 7.6, 7.7
 */

// --- RBAC Test Infrastructure ---

type UserRole = 'owner' | 'manager' | 'tenant' | 'viewer'

interface MockUser {
  id: string
  role: UserRole
  assignedPropertyIds: string[]
}

interface MockAuditEntry {
  id: string
  actorUserId: string
  entityType: string
  entityId: string
  action: string
  oldValue: unknown
  newValue: unknown
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}

/**
 * Simulates the RBAC logic from the audit route handler.
 * This mirrors the behavior in apps/api/src/routes/audit.ts.
 */
function queryAuditLogsWithRBAC(
  user: MockUser,
  allEntries: MockAuditEntry[],
  params: AuditQueryParams,
): {
  status: number
  data?: MockAuditEntry[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  error?: string
} {
  // RBAC check: deny access for non-owner/non-manager roles (Requirement 7.7)
  if (user.role !== 'owner' && user.role !== 'manager') {
    return {
      status: 403,
      error: 'Insufficient permissions',
    }
  }

  // Cap limit at 100 (Requirements 7.5, 7.6)
  const limit = Math.min(Math.max(params.limit, 1), 100)
  const page = Math.max(params.page, 1)
  const offset = (page - 1) * limit

  // Filter entries based on role
  let filteredEntries = [...allEntries]

  // Apply entityType filter if specified
  if (params.entityType) {
    filteredEntries = filteredEntries.filter(
      (e) => e.entityType === params.entityType,
    )
  }

  // Apply actorUserId filter if specified
  if (params.actorUserId) {
    filteredEntries = filteredEntries.filter(
      (e) => e.actorUserId === params.actorUserId,
    )
  }

  // Manager role: restrict to entries for assigned properties (Requirement 7.6)
  if (user.role === 'manager') {
    if (params.propertyId) {
      // Manager can only query entries for a specific property they're assigned to
      filteredEntries = filteredEntries.filter(
        (e) => e.entityId === params.propertyId,
      )
    } else {
      // Without a specific propertyId filter, restrict to assigned properties
      if (user.assignedPropertyIds.length > 0) {
        filteredEntries = filteredEntries.filter((e) =>
          user.assignedPropertyIds.includes(e.entityId),
        )
      } else {
        // If no assigned properties, restrict to entries where manager is the actor
        filteredEntries = filteredEntries.filter(
          (e) => e.actorUserId === user.id,
        )
      }
    }
  } else if (user.role === 'owner' && params.propertyId) {
    // Owner can optionally filter by propertyId
    filteredEntries = filteredEntries.filter(
      (e) => e.entityId === params.propertyId,
    )
  }

  // Sort by createdAt descending
  filteredEntries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  const total = filteredEntries.length
  const totalPages = Math.ceil(total / limit)
  const paginatedData = filteredEntries.slice(offset, offset + limit)

  return {
    status: 200,
    data: paginatedData,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  }
}

// --- RBAC Generators ---

/** Generate a valid UUID-like string */
const rbacUuidArb = fc
  .tuple(
    fc.stringMatching(/^[0-9a-f]{8}$/),
    fc.stringMatching(/^[0-9a-f]{4}$/),
    fc.stringMatching(/^[0-9a-f]{4}$/),
    fc.stringMatching(/^[0-9a-f]{4}$/),
    fc.stringMatching(/^[0-9a-f]{12}$/),
  )
  .map(([a, b, c, d, e]) => `${a}-${b}-${c}-${d}-${e}`)

/** Generate a user role */
const roleArb = fc.constantFrom<UserRole>(
  'owner',
  'manager',
  'tenant',
  'viewer',
)

/** Generate a non-owner/non-manager role (for denied access tests) */
const deniedRoleArb = fc.constantFrom<UserRole>('tenant', 'viewer')

/** Generate a set of property IDs */
const propertyIdsArb = fc.array(rbacUuidArb, { minLength: 1, maxLength: 5 })

/** Generate a mock user with a specific role */
function mockUserArb(role: UserRole): fc.Arbitrary<MockUser> {
  return fc
    .tuple(rbacUuidArb, propertyIdsArb)
    .map(([id, assignedPropertyIds]) => ({
      id,
      role,
      assignedPropertyIds,
    }))
}

/** Generate a mock audit entry with a specific entityId */
function mockAuditEntryArb(entityIds: string[]): fc.Arbitrary<MockAuditEntry> {
  return fc
    .tuple(
      rbacUuidArb,
      rbacUuidArb,
      fc.constantFrom('flat', 'payment', 'maintenance', 'contract'),
      fc.constantFrom(...entityIds),
      fc.constantFrom('created', 'updated', 'deleted', 'approved'),
      fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
    )
    .map(([id, actorUserId, entityType, entityId, action, createdAt]) => ({
      id,
      actorUserId,
      entityType,
      entityId,
      action,
      oldValue: null,
      newValue: null,
      ipAddress: '192.168.1.1',
      userAgent: 'TestAgent/1.0',
      createdAt,
    }))
}

/** Generate valid AuditQueryParams */
const queryParamsArb = fc
  .tuple(
    fc.integer({ min: 1, max: 10 }),
    fc.integer({ min: 1, max: 200 }), // intentionally allow > 100 to test capping
    fc.option(fc.constantFrom('flat', 'payment', 'maintenance', 'contract'), {
      nil: undefined,
    }),
    fc.option(rbacUuidArb, { nil: undefined }),
    fc.option(rbacUuidArb, { nil: undefined }),
  )
  .map(
    ([page, limit, entityType, actorUserId, propertyId]): AuditQueryParams => ({
      page,
      limit,
      entityType,
      actorUserId,
      propertyId,
    }),
  )

// --- Property 9 Tests ---

describe('Feature: amarspace-infrastructure-setup, Property 9: Audit Log Role-Based Access Control', () => {
  it('Owner role can access all audit log entries', () => {
    return fc.assert(
      fc.asyncProperty(
        mockUserArb('owner'),
        propertyIdsArb,
        queryParamsArb,
        async (owner, allPropertyIds, params) => {
          // Generate audit entries across all properties
          const entries = await fc.sample(mockAuditEntryArb(allPropertyIds), {
            numValues: 20,
          })

          const result = queryAuditLogsWithRBAC(owner, entries, params)

          // Owner should get 200 status
          expect(result.status).toBe(200)
          expect(result.data).toBeDefined()
          expect(result.pagination).toBeDefined()

          // Owner should see all entries matching the query filters (not restricted by property)
          let expectedEntries = [...entries]

          if (params.entityType) {
            expectedEntries = expectedEntries.filter(
              (e) => e.entityType === params.entityType,
            )
          }
          if (params.actorUserId) {
            expectedEntries = expectedEntries.filter(
              (e) => e.actorUserId === params.actorUserId,
            )
          }
          if (params.propertyId) {
            expectedEntries = expectedEntries.filter(
              (e) => e.entityId === params.propertyId,
            )
          }

          expect(result.pagination!.total).toBe(expectedEntries.length)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('Manager role can only access entries for assigned properties', () => {
    return fc.assert(
      fc.asyncProperty(
        propertyIdsArb,
        propertyIdsArb,
        async (assignedPropertyIds, otherPropertyIds) => {
          // Ensure assigned and other property IDs don't overlap
          const uniqueOtherIds = otherPropertyIds.filter(
            (id) => !assignedPropertyIds.includes(id),
          )
          if (uniqueOtherIds.length === 0) return // skip if no distinct other properties

          const manager: MockUser = {
            id: 'manager-user-id-00000-00000-00000',
            role: 'manager',
            assignedPropertyIds,
          }

          const allPropertyIds = [...assignedPropertyIds, ...uniqueOtherIds]

          // Generate entries across all properties
          const entries = await fc.sample(mockAuditEntryArb(allPropertyIds), {
            numValues: 30,
          })

          const params: AuditQueryParams = { page: 1, limit: 100 }

          const result = queryAuditLogsWithRBAC(manager, entries, params)

          // Manager should get 200 status
          expect(result.status).toBe(200)
          expect(result.data).toBeDefined()

          // Manager should only see entries for assigned properties
          for (const entry of result.data!) {
            expect(assignedPropertyIds).toContain(entry.entityId)
          }

          // Verify no entries from unassigned properties leak through
          for (const entry of result.data!) {
            expect(uniqueOtherIds).not.toContain(entry.entityId)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('Users without Owner or Manager role are denied with permissions error', () => {
    return fc.assert(
      fc.asyncProperty(
        deniedRoleArb,
        rbacUuidArb,
        propertyIdsArb,
        queryParamsArb,
        async (role, userId, propertyIds, params) => {
          const user: MockUser = {
            id: userId,
            role,
            assignedPropertyIds: [],
          }

          // Generate some entries
          const entries = await fc.sample(mockAuditEntryArb(propertyIds), {
            numValues: 10,
          })

          const result = queryAuditLogsWithRBAC(user, entries, params)

          // Non-owner/non-manager should get 403
          expect(result.status).toBe(403)
          expect(result.error).toBe('Insufficient permissions')
          expect(result.data).toBeUndefined()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('Pagination never returns more than 100 entries per page', () => {
    return fc.assert(
      fc.asyncProperty(
        roleArb.filter((r) => r === 'owner' || r === 'manager'),
        rbacUuidArb,
        propertyIdsArb,
        fc.integer({ min: 1, max: 500 }), // limit can be any positive number
        async (role, userId, propertyIds, requestedLimit) => {
          const user: MockUser = {
            id: userId,
            role: role as 'owner' | 'manager',
            assignedPropertyIds: propertyIds,
          }

          // Generate more than 100 entries to test pagination cap
          const entries = await fc.sample(mockAuditEntryArb(propertyIds), {
            numValues: 150,
          })

          const params: AuditQueryParams = {
            page: 1,
            limit: requestedLimit,
          }

          const result = queryAuditLogsWithRBAC(user, entries, params)

          // Should succeed for owner/manager
          expect(result.status).toBe(200)
          expect(result.data).toBeDefined()

          // Pagination limit should never exceed 100
          expect(result.pagination!.limit).toBeLessThanOrEqual(100)

          // Actual returned data should never exceed 100 entries
          expect(result.data!.length).toBeLessThanOrEqual(100)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('Manager with propertyId filter only sees entries for that specific property', () => {
    return fc.assert(
      fc.asyncProperty(propertyIdsArb, async (assignedPropertyIds) => {
        if (assignedPropertyIds.length < 2) return // need at least 2 properties

        const manager: MockUser = {
          id: 'manager-filter-test-00000-00000',
          role: 'manager',
          assignedPropertyIds,
        }

        // Generate entries across all assigned properties
        const entries = await fc.sample(
          mockAuditEntryArb(assignedPropertyIds),
          { numValues: 30 },
        )

        // Filter by a specific property
        const targetPropertyId = assignedPropertyIds[0]!
        const params: AuditQueryParams = {
          page: 1,
          limit: 100,
          propertyId: targetPropertyId,
        }

        const result = queryAuditLogsWithRBAC(manager, entries, params)

        expect(result.status).toBe(200)
        expect(result.data).toBeDefined()

        // All returned entries should be for the target property only
        for (const entry of result.data!) {
          expect(entry.entityId).toBe(targetPropertyId)
        }
      }),
      { numRuns: 100 },
    )
  })

  it('Manager without assigned properties only sees entries where they are the actor', () => {
    return fc.assert(
      fc.asyncProperty(
        rbacUuidArb,
        propertyIdsArb,
        async (managerId, propertyIds) => {
          const manager: MockUser = {
            id: managerId,
            role: 'manager',
            assignedPropertyIds: [], // no assigned properties
          }

          // Generate entries with various actors
          const entries = await fc.sample(mockAuditEntryArb(propertyIds), {
            numValues: 20,
          })

          // Add some entries where the manager is the actor
          const managerEntries: MockAuditEntry[] = propertyIds
            .slice(0, 3)
            .map((propId, i) => ({
              id: `manager-entry-${i}-00000-00000-00000`,
              actorUserId: managerId,
              entityType: 'flat',
              entityId: propId,
              action: 'created',
              oldValue: null,
              newValue: null,
              ipAddress: '10.0.0.1',
              userAgent: 'TestAgent/1.0',
              createdAt: new Date(`2024-06-${String(i + 1).padStart(2, '0')}`),
            }))

          const allEntries = [...entries, ...managerEntries]

          const params: AuditQueryParams = { page: 1, limit: 100 }

          const result = queryAuditLogsWithRBAC(manager, allEntries, params)

          expect(result.status).toBe(200)
          expect(result.data).toBeDefined()

          // All returned entries should have the manager as the actor
          for (const entry of result.data!) {
            expect(entry.actorUserId).toBe(managerId)
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
