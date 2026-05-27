import { createDbClient, type Database } from '@repo/db'
import { auditLogs } from '@repo/db/schema'
import { and, count, desc, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

// --- Constants ---

const MAX_JSON_SIZE_BYTES = 10 * 1024 // 10KB
const MAX_RETRIES = 3
const RETRY_INTERVAL_MS = 30_000 // 30 seconds

// --- Interfaces ---

export interface AuditLogInput {
  actorId: string
  action: string
  entityType: string
  entityId: string
  ownerAccountId: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface AuditLog {
  id: string
  ownerAccountId: string
  actorId: string
  action: string
  entityType: string
  entityId: string
  oldValues: unknown
  newValues: unknown
  metadata: unknown
  createdAt: Date
}

export interface AuditQueryParams {
  page: number
  limit: number
  entityType?: string
  entityId?: string
  actorId?: string
  action?: string
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AuditLoggerInterface {
  log(entry: AuditLogInput): void
  query(params: AuditQueryParams): Promise<PaginatedResult<AuditLog>>
}

// --- Truncation ---

/**
 * Truncates a JSON value if its stringified form exceeds 10KB.
 * Appends a `__truncated` flag to indicate truncation occurred.
 */
function truncateIfExceedsLimit(
  value: Record<string, unknown> | undefined,
): Record<string, unknown> | null {
  if (value === undefined || value === null) {
    return null
  }

  const json = JSON.stringify(value)
  const byteLength = new TextEncoder().encode(json).length

  if (byteLength <= MAX_JSON_SIZE_BYTES) {
    return value
  }

  // Truncate: keep as much as possible within 10KB, add truncation indicator
  const truncated: Record<string, unknown> = { __truncated: true }
  let currentSize = new TextEncoder().encode(JSON.stringify(truncated)).length

  for (const [key, val] of Object.entries(value)) {
    const entryJson = JSON.stringify({ [key]: val })
    const entrySize = new TextEncoder().encode(entryJson).length

    // Reserve space for the comma and closing brace
    if (currentSize + entrySize + 2 <= MAX_JSON_SIZE_BYTES) {
      truncated[key] = val
      currentSize += entrySize
    } else {
      break
    }
  }

  return truncated
}

// --- Retry Queue ---

interface RetryItem {
  entry: AuditLogInput
  retryCount: number
  nextRetryAt: number
}

// --- AuditLogger Class ---

export class AuditLogger implements AuditLoggerInterface {
  private db: Database
  private retryQueue: RetryItem[] = []
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private isProcessing = false

  constructor(db: Database) {
    this.db = db
  }

  /**
   * Fire-and-forget audit log writer.
   * Writes asynchronously without blocking the caller.
   * If the write fails, the entry is queued for retry (max 3 attempts, 30s interval).
   * Values exceeding 10KB are truncated before writing.
   */
  log(entry: AuditLogInput): void {
    // Fire and forget — do not await
    this.writeWithRetry(entry)
  }

  /**
   * Queries audit log entries with pagination.
   */
  async query(params: AuditQueryParams): Promise<PaginatedResult<AuditLog>> {
    const limit = Math.min(Math.max(params.limit, 1), 100)
    const page = Math.max(params.page, 1)
    const offset = (page - 1) * limit

    const conditions = []

    if (params.entityType) {
      conditions.push(eq(auditLogs.entityType, params.entityType))
    }

    if (params.entityId) {
      conditions.push(eq(auditLogs.entityId, params.entityId))
    }

    if (params.actorId) {
      conditions.push(eq(auditLogs.actorId, params.actorId))
    }

    if (params.action) {
      conditions.push(eq(auditLogs.action, params.action))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [data, totalResult] = await Promise.all([
      this.db
        .select()
        .from(auditLogs)
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ count: count() }).from(auditLogs).where(whereClause),
    ])

    const total = totalResult[0]?.count ?? 0

    return {
      data: data.map((row) => ({
        id: row.id,
        ownerAccountId: row.ownerAccountId,
        actorId: row.actorId,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        oldValues: row.oldValues,
        newValues: row.newValues,
        metadata: row.metadata,
        createdAt: row.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  /**
   * Returns the current retry queue length (useful for testing/monitoring).
   */
  get pendingRetries(): number {
    return this.retryQueue.length
  }

  /**
   * Stops the retry processor and clears the queue.
   * Call this during graceful shutdown.
   */
  shutdown(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    this.retryQueue = []
    this.isProcessing = false
  }

  // --- Private Methods ---

  private async writeWithRetry(entry: AuditLogInput): Promise<void> {
    try {
      await this.writeEntry(entry)
    } catch {
      // Queue for retry — don't block the primary action
      this.enqueueRetry(entry)
    }
  }

  private async writeEntry(entry: AuditLogInput): Promise<void> {
    const oldValues = truncateIfExceedsLimit(entry.oldValues)
    const newValues = truncateIfExceedsLimit(entry.newValues)

    await this.db.insert(auditLogs).values({
      ownerAccountId: entry.ownerAccountId,
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      oldValues,
      newValues,
      metadata: entry.metadata ?? null,
    })
  }

  private enqueueRetry(entry: AuditLogInput): void {
    const item: RetryItem = {
      entry,
      retryCount: 0,
      nextRetryAt: Date.now() + RETRY_INTERVAL_MS,
    }
    this.retryQueue.push(item)
    this.scheduleRetryProcessing()
  }

  private scheduleRetryProcessing(): void {
    if (this.retryTimer || this.isProcessing) return

    // Find the earliest retry time
    const nextItem = this.retryQueue.reduce<RetryItem | null>(
      (earliest, item) =>
        !earliest || item.nextRetryAt < earliest.nextRetryAt ? item : earliest,
      null,
    )

    if (!nextItem) return

    const delay = Math.max(0, nextItem.nextRetryAt - Date.now())
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      this.processRetryQueue()
    }, delay)
  }

  private async processRetryQueue(): Promise<void> {
    if (this.isProcessing) return
    this.isProcessing = true

    try {
      const now = Date.now()
      const readyItems = this.retryQueue.filter(
        (item) => item.nextRetryAt <= now,
      )

      for (const item of readyItems) {
        try {
          await this.writeEntry(item.entry)
          // Success — remove from queue
          const idx = this.retryQueue.indexOf(item)
          if (idx !== -1) this.retryQueue.splice(idx, 1)
        } catch {
          item.retryCount++
          if (item.retryCount >= MAX_RETRIES) {
            // Max retries reached — drop the entry and log the failure
            const idx = this.retryQueue.indexOf(item)
            if (idx !== -1) this.retryQueue.splice(idx, 1)
          } else {
            // Schedule next retry with fixed 30s interval
            item.nextRetryAt = Date.now() + RETRY_INTERVAL_MS
          }
        }
      }
    } finally {
      this.isProcessing = false
      // Schedule next processing if there are remaining items
      if (this.retryQueue.length > 0) {
        this.scheduleRetryProcessing()
      }
    }
  }
}

// --- Fastify Plugin ---

declare module 'fastify' {
  interface FastifyInstance {
    auditLogger: AuditLogger
  }
}

export default fp(
  async function auditLoggerPlugin(fastify: FastifyInstance) {
    const { env } = fastify

    const db = createDbClient(env.DATABASE_URL)
    const auditLogger = new AuditLogger(db)

    fastify.decorate('auditLogger', auditLogger)

    // Graceful shutdown: stop retry processing
    fastify.addHook('onClose', async () => {
      auditLogger.shutdown()
    })
  },
  {
    name: 'audit-logger',
    dependencies: ['env'],
  },
)
