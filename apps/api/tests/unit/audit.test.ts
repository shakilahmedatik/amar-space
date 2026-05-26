import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type AuditLogEntry,
  AuditLogger,
  AuditValidationError,
} from '../../src/plugins/audit'

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

function validEntry(overrides?: Partial<AuditLogEntry>): AuditLogEntry {
  return {
    actorUserId: '550e8400-e29b-41d4-a716-446655440000',
    entityType: 'user',
    entityId: '550e8400-e29b-41d4-a716-446655440001',
    action: 'login',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    ...overrides,
  }
}

describe('AuditLogger', () => {
  let logger: AuditLogger

  afterEach(() => {
    logger?.shutdown()
    vi.restoreAllMocks()
  })

  describe('validation', () => {
    beforeEach(() => {
      const mockDb = createMockDb()
      logger = new AuditLogger(mockDb as unknown as any)
    })

    it('should reject entityType exceeding 100 characters', async () => {
      const entry = validEntry({ entityType: 'a'.repeat(101) })
      await expect(logger.log(entry)).rejects.toThrow(AuditValidationError)
      await expect(logger.log(entry)).rejects.toThrow(
        'entityType exceeds maximum length of 100 characters',
      )
    })

    it('should accept entityType at exactly 100 characters', async () => {
      const entry = validEntry({ entityType: 'a'.repeat(100) })
      await expect(logger.log(entry)).resolves.toBeUndefined()
    })

    it('should reject action exceeding 100 characters', async () => {
      const entry = validEntry({ action: 'a'.repeat(101) })
      await expect(logger.log(entry)).rejects.toThrow(AuditValidationError)
      await expect(logger.log(entry)).rejects.toThrow(
        'action exceeds maximum length of 100 characters',
      )
    })

    it('should accept action at exactly 100 characters', async () => {
      const entry = validEntry({ action: 'a'.repeat(100) })
      await expect(logger.log(entry)).resolves.toBeUndefined()
    })

    it('should reject oldValue exceeding 10KB', async () => {
      // Create a JSON value that exceeds 10KB
      const largeValue = { data: 'x'.repeat(11 * 1024) }
      const entry = validEntry({ oldValue: largeValue })
      await expect(logger.log(entry)).rejects.toThrow(AuditValidationError)
      await expect(logger.log(entry)).rejects.toThrow(
        'oldValue exceeds maximum size',
      )
    })

    it('should reject newValue exceeding 10KB', async () => {
      const largeValue = { data: 'x'.repeat(11 * 1024) }
      const entry = validEntry({ newValue: largeValue })
      await expect(logger.log(entry)).rejects.toThrow(AuditValidationError)
      await expect(logger.log(entry)).rejects.toThrow(
        'newValue exceeds maximum size',
      )
    })

    it('should accept oldValue at exactly 10KB', async () => {
      // Create a value that is just under 10KB when serialized
      const value = { d: 'x'.repeat(10 * 1024 - 10) }
      const serialized = JSON.stringify(value)
      const byteLength = new TextEncoder().encode(serialized).length
      // Only test if it's within bounds
      if (byteLength <= 10 * 1024) {
        const entry = validEntry({ oldValue: value })
        await expect(logger.log(entry)).resolves.toBeUndefined()
      }
    })

    it('should accept entries without oldValue and newValue', async () => {
      const entry = validEntry()
      await expect(logger.log(entry)).resolves.toBeUndefined()
    })
  })

  describe('log writing', () => {
    it('should write entry to database on success', async () => {
      const mockDb = createMockDb()
      logger = new AuditLogger(mockDb as unknown as any)

      const entry = validEntry({
        oldValue: { name: 'old' },
        newValue: { name: 'new' },
      })
      await logger.log(entry)

      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should not throw when database write fails (fault tolerance)', async () => {
      const mockDb = createMockDb({ shouldFail: true })
      logger = new AuditLogger(mockDb as unknown as any)

      const entry = validEntry()
      // Should not throw — failure is queued for retry
      await expect(logger.log(entry)).resolves.toBeUndefined()
    })

    it('should queue failed entries for retry', async () => {
      const mockDb = createMockDb({ shouldFail: true })
      logger = new AuditLogger(mockDb as unknown as any)

      const entry = validEntry()
      await logger.log(entry)

      expect(logger.pendingRetries).toBe(1)
    })
  })

  describe('retry queue', () => {
    it('should retry failed entries with exponential backoff', async () => {
      vi.useFakeTimers()

      // First call fails, subsequent calls succeed
      const mockDb = createMockDb({ failCount: 1 })
      logger = new AuditLogger(mockDb as unknown as any)

      const entry = validEntry()
      await logger.log(entry)

      // Entry should be in retry queue
      expect(logger.pendingRetries).toBe(1)

      // Wait for retry (base delay is 1s)
      await vi.advanceTimersByTimeAsync(1100)

      vi.useRealTimers()

      // After retry succeeds, queue should be empty
      expect(logger.pendingRetries).toBe(0)
    })

    it('should drop entries after max retries (3)', async () => {
      vi.useFakeTimers()

      const mockDb = createMockDb({ shouldFail: true })
      logger = new AuditLogger(mockDb as unknown as any)

      const entry = validEntry()
      await logger.log(entry)

      expect(logger.pendingRetries).toBe(1)

      // Advance through all retries: 1s + 2s + 4s
      await vi.advanceTimersByTimeAsync(1100) // retry 1
      await vi.advanceTimersByTimeAsync(2100) // retry 2
      await vi.advanceTimersByTimeAsync(4100) // retry 3

      vi.useRealTimers()

      // After 3 failed retries, entry should be dropped
      expect(logger.pendingRetries).toBe(0)
    })

    it('should clear queue on shutdown', async () => {
      const mockDb = createMockDb({ shouldFail: true })
      logger = new AuditLogger(mockDb as unknown as any)

      const entry = validEntry()
      await logger.log(entry)
      expect(logger.pendingRetries).toBe(1)

      logger.shutdown()
      expect(logger.pendingRetries).toBe(0)
    })
  })
})
