import type { Database } from '@repo/db'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuditLogger, type AuditLogInput } from '../../src/plugins/audit-logger'

// Mock database that tracks insert calls
function createMockDb(options?: { shouldFail?: boolean; failCount?: number }) {
  let callCount = 0
  let failsRemaining =
    options?.failCount ?? (options?.shouldFail ? Infinity : 0)
  const insertedRows: unknown[] = []

  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockImplementation((values: unknown) => {
        callCount++
        if (failsRemaining > 0) {
          failsRemaining--
          return Promise.reject(new Error('Database write failed'))
        }
        insertedRows.push(values)
        return Promise.resolve()
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    }),
    get callCount() {
      return callCount
    },
    get insertedRows() {
      return insertedRows
    },
  }

  return mockDb
}

function validEntry(overrides?: Partial<AuditLogInput>): AuditLogInput {
  return {
    actorId: '550e8400-e29b-41d4-a716-446655440000',
    action: 'login',
    entityType: 'user',
    entityId: '550e8400-e29b-41d4-a716-446655440001',
    ownerAccountId: '550e8400-e29b-41d4-a716-446655440002',
    ...overrides,
  }
}

describe('AuditLogger', () => {
  let logger: AuditLogger

  afterEach(() => {
    logger?.shutdown()
    vi.restoreAllMocks()
  })

  describe('fire-and-forget log', () => {
    it('should return void immediately without blocking', () => {
      const mockDb = createMockDb()
      logger = new AuditLogger(mockDb as unknown as Database)

      const entry = validEntry()
      const result = logger.log(entry)

      // log() returns void (not a Promise)
      expect(result).toBeUndefined()
    })

    it('should write entry to database asynchronously', async () => {
      const mockDb = createMockDb()
      logger = new AuditLogger(mockDb as unknown as Database)

      const entry = validEntry({
        oldValues: { name: 'old' },
        newValues: { name: 'new' },
      })
      logger.log(entry)

      // Wait for async write to complete
      await vi.waitFor(() => {
        expect(mockDb.insert).toHaveBeenCalled()
      })
    })

    it('should not throw when database write fails (fault tolerance)', async () => {
      const mockDb = createMockDb({ shouldFail: true })
      logger = new AuditLogger(mockDb as unknown as Database)

      const entry = validEntry()
      // Should not throw — log is fire-and-forget
      expect(() => logger.log(entry)).not.toThrow()

      // Wait for async write attempt
      await vi.waitFor(() => {
        expect(mockDb.callCount).toBe(1)
      })
    })

    it('should queue failed entries for retry', async () => {
      const mockDb = createMockDb({ shouldFail: true })
      logger = new AuditLogger(mockDb as unknown as Database)

      const entry = validEntry()
      logger.log(entry)

      // Wait for the initial write attempt to fail and be queued
      await vi.waitFor(() => {
        expect(logger.pendingRetries).toBe(1)
      })
    })
  })

  describe('truncation', () => {
    it('should truncate oldValues exceeding 10KB', async () => {
      const mockDb = createMockDb()
      logger = new AuditLogger(mockDb as unknown as Database)

      // Create a value that exceeds 10KB
      const largeValue: Record<string, unknown> = {
        data: 'x'.repeat(11 * 1024),
      }
      const entry = validEntry({ oldValues: largeValue })
      logger.log(entry)

      await vi.waitFor(() => {
        expect(mockDb.insertedRows.length).toBe(1)
      })

      const inserted = mockDb.insertedRows[0] as Record<string, unknown>
      const oldValues = inserted.oldValues as Record<string, unknown>
      expect(oldValues.__truncated).toBe(true)

      // Verify the truncated value is within 10KB
      const truncatedJson = JSON.stringify(oldValues)
      const byteLength = new TextEncoder().encode(truncatedJson).length
      expect(byteLength).toBeLessThanOrEqual(10 * 1024)
    })

    it('should truncate newValues exceeding 10KB', async () => {
      const mockDb = createMockDb()
      logger = new AuditLogger(mockDb as unknown as Database)

      const largeValue: Record<string, unknown> = {
        data: 'x'.repeat(11 * 1024),
      }
      const entry = validEntry({ newValues: largeValue })
      logger.log(entry)

      await vi.waitFor(() => {
        expect(mockDb.insertedRows.length).toBe(1)
      })

      const inserted = mockDb.insertedRows[0] as Record<string, unknown>
      const newValues = inserted.newValues as Record<string, unknown>
      expect(newValues.__truncated).toBe(true)
    })

    it('should not truncate values within 10KB', async () => {
      const mockDb = createMockDb()
      logger = new AuditLogger(mockDb as unknown as Database)

      const smallValue = { name: 'test', count: 42 }
      const entry = validEntry({ oldValues: smallValue, newValues: smallValue })
      logger.log(entry)

      await vi.waitFor(() => {
        expect(mockDb.insertedRows.length).toBe(1)
      })

      const inserted = mockDb.insertedRows[0] as Record<string, unknown>
      expect(inserted.oldValues).toEqual(smallValue)
      expect(inserted.newValues).toEqual(smallValue)
    })

    it('should store metadata as-is', async () => {
      const mockDb = createMockDb()
      logger = new AuditLogger(mockDb as unknown as Database)

      const metadata = { ip: '192.168.1.1', userAgent: 'Mozilla/5.0' }
      const entry = validEntry({ metadata })
      logger.log(entry)

      await vi.waitFor(() => {
        expect(mockDb.insertedRows.length).toBe(1)
      })

      const inserted = mockDb.insertedRows[0] as Record<string, unknown>
      expect(inserted.metadata).toEqual(metadata)
    })
  })

  describe('retry logic', () => {
    it('should retry failed entries with 30-second interval', async () => {
      vi.useFakeTimers()

      // First call fails, subsequent calls succeed
      const mockDb = createMockDb({ failCount: 1 })
      logger = new AuditLogger(mockDb as unknown as Database)

      const entry = validEntry()
      logger.log(entry)

      // Wait for initial write to fail
      await vi.advanceTimersByTimeAsync(10)
      expect(logger.pendingRetries).toBe(1)

      // Advance less than 30s — should not retry yet
      await vi.advanceTimersByTimeAsync(29_000)
      expect(logger.pendingRetries).toBe(1)

      // Advance past 30s — retry should succeed
      await vi.advanceTimersByTimeAsync(1_100)

      vi.useRealTimers()

      expect(logger.pendingRetries).toBe(0)
    })

    it('should drop entries after max 3 retry attempts', async () => {
      vi.useFakeTimers()

      const mockDb = createMockDb({ shouldFail: true })
      logger = new AuditLogger(mockDb as unknown as Database)

      const entry = validEntry()
      logger.log(entry)

      // Wait for initial write to fail
      await vi.advanceTimersByTimeAsync(10)
      expect(logger.pendingRetries).toBe(1)

      // Advance through all 3 retries (30s each)
      await vi.advanceTimersByTimeAsync(30_100) // retry 1
      await vi.advanceTimersByTimeAsync(30_100) // retry 2
      await vi.advanceTimersByTimeAsync(30_100) // retry 3

      vi.useRealTimers()

      // After 3 failed retries, entry should be dropped
      expect(logger.pendingRetries).toBe(0)
    })

    it('should clear queue on shutdown', async () => {
      const mockDb = createMockDb({ shouldFail: true })
      logger = new AuditLogger(mockDb as unknown as Database)

      const entry = validEntry()
      logger.log(entry)

      // Wait for initial write to fail
      await vi.waitFor(() => {
        expect(logger.pendingRetries).toBe(1)
      })

      logger.shutdown()
      expect(logger.pendingRetries).toBe(0)
    })
  })

  describe('ownerAccountId', () => {
    it('should include ownerAccountId in the written entry', async () => {
      const mockDb = createMockDb()
      logger = new AuditLogger(mockDb as unknown as Database)

      const entry = validEntry({
        ownerAccountId: '550e8400-e29b-41d4-a716-446655440099',
      })
      logger.log(entry)

      await vi.waitFor(() => {
        expect(mockDb.insertedRows.length).toBe(1)
      })

      const inserted = mockDb.insertedRows[0] as Record<string, unknown>
      expect(inserted.ownerAccountId).toBe(
        '550e8400-e29b-41d4-a716-446655440099',
      )
    })
  })
})
