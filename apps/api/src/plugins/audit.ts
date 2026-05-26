import { createDbClient, type Database } from '@repo/db'
import { auditLogs } from '@repo/db/schema'
import { and, count, desc, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

// --- Interfaces ---

export interface AuditLogEntry {
  actorUserId: string
  entityType: string // max 100 chars
  entityId: string
  action: string // max 100 chars
  oldValue?: unknown // JSON, max 10KB
  newValue?: unknown // JSON, max 10KB
  ipAddress: string
  userAgent: string
}

export interface AuditQueryParams {
  page: number
  limit: number // max 100
  entityType?: string
  actorUserId?: string
  propertyId?: string // for manager-scoped queries
}

export interface AuditLog {
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

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AuditLoggerInterface {
  log(entry: AuditLogEntry): Promise<void>
  query(params: AuditQueryParams): Promise<PaginatedResult<AuditLog>>
}

// --- Validation ---

const MAX_ENTITY_TYPE_LENGTH = 100
const MAX_ACTION_LENGTH = 100
const MAX_JSON_SIZE_BYTES = 10 * 1024 // 10KB

export class AuditValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuditValidationError'
  }
}

function validateEntry(entry: AuditLogEntry): void {
  if (entry.entityType.length > MAX_ENTITY_TYPE_LENGTH) {
    throw new AuditValidationError(
      `entityType exceeds maximum length of ${MAX_ENTITY_TYPE_LENGTH} characters`,
    )
  }

  if (entry.action.length > MAX_ACTION_LENGTH) {
    throw new AuditValidationError(
      `action exceeds maximum length of ${MAX_ACTION_LENGTH} characters`,
    )
  }

  if (entry.oldValue !== undefined) {
    const oldValueJson = JSON.stringify(entry.oldValue)
    if (new TextEncoder().encode(oldValueJson).length > MAX_JSON_SIZE_BYTES) {
      throw new AuditValidationError(
        `oldValue exceeds maximum size of ${MAX_JSON_SIZE_BYTES} bytes (10KB)`,
      )
    }
  }

  if (entry.newValue !== undefined) {
    const newValueJson = JSON.stringify(entry.newValue)
    if (new TextEncoder().encode(newValueJson).length > MAX_JSON_SIZE_BYTES) {
      throw new AuditValidationError(
        `newValue exceeds maximum size of ${MAX_JSON_SIZE_BYTES} bytes (10KB)`,
      )
    }
  }
}

// --- Retry Queue ---

interface RetryItem {
  entry: AuditLogEntry
  retryCount: number
  nextRetryAt: number
}

const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000 // 1 second base for exponential backoff

function getBackoffDelay(retryCount: number): number {
  // Exponential backoff: 1s, 2s, 4s
  return BASE_DELAY_MS * Math.pow(2, retryCount)
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
   * Logs an audit entry. Validates the entry first, then writes to the database.
   * If the write fails, the entry is queued for retry without blocking the caller.
   * Validation errors are thrown immediately (they won't succeed on retry).
   */
  async log(entry: AuditLogEntry): Promise<void> {
    // Validation errors are thrown immediately — they won't succeed on retry
    validateEntry(entry)

    try {
      await this.writeEntry(entry)
    } catch {
      // Queue for retry — don't block the primary action
      this.enqueueRetry(entry)
    }
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

    if (params.actorUserId) {
      conditions.push(eq(auditLogs.actorUserId, params.actorUserId))
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
        actorUserId: row.actorUserId,
        entityType: row.entityType,
        entityId: row.entityId,
        action: row.action,
        oldValue: row.oldValue,
        newValue: row.newValue,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
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

  private async writeEntry(entry: AuditLogEntry): Promise<void> {
    await this.db.insert(auditLogs).values({
      actorUserId: entry.actorUserId,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? null,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    })
  }

  private enqueueRetry(entry: AuditLogEntry): void {
    const item: RetryItem = {
      entry,
      retryCount: 0,
      nextRetryAt: Date.now() + getBackoffDelay(0),
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
            // Max retries reached — drop the entry
            const idx = this.retryQueue.indexOf(item)
            if (idx !== -1) this.retryQueue.splice(idx, 1)
          } else {
            // Schedule next retry with exponential backoff
            item.nextRetryAt = Date.now() + getBackoffDelay(item.retryCount)
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
  async function auditPlugin(fastify: FastifyInstance) {
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
    name: 'audit',
    dependencies: ['env'],
  },
)
