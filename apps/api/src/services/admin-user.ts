import { type Database, sessions, users } from '@repo/db'
import { AppError, NotFoundError } from '@repo/shared/errors'
import { and, count, desc, eq, gt } from 'drizzle-orm'
import type { AuditLogger } from '../plugins/audit-logger'

// --- Types ---

export interface AdminUserListItem {
  id: string
  name: string
  email: string
  role: string
  approvalStatus: string | null
  createdAt: Date
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface DashboardStats {
  usersByRole: { owner: number; manager: number; renter: number }
  pendingApprovals: number
  activeSessions: number
}

// --- Service ---

/**
 * AdminUserService handles superadmin user management operations.
 *
 * Provides:
 * - Paginated listing of all users with optional role filter (max 50 per page)
 * - User deactivation with session invalidation and audit logging
 * - Platform dashboard statistics (user counts by role, pending approvals, active sessions)
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 7.1, 7.2, 7.3, 7.5
 */
export class AdminUserService {
  private db: Database
  private auditLogger: AuditLogger

  constructor(db: Database, auditLogger: AuditLogger) {
    this.db = db
    this.auditLogger = auditLogger
  }

  /**
   * Lists all users with pagination and optional role filter.
   *
   * - Max 50 users per page (Requirement 4.1)
   * - Optional role filter
   * - Sorted by creation date descending
   * - Returns id, name, email, role, approvalStatus, createdAt (Requirement 4.2)
   *
   * Requirements: 4.1, 4.2
   */
  async listUsers(params: {
    page: number
    pageSize: number
    role?: string
  }): Promise<PaginatedResult<AdminUserListItem>> {
    const pageSize = Math.min(Math.max(params.pageSize, 1), 50)
    const page = Math.max(params.page, 1)
    const offset = (page - 1) * pageSize

    const conditions = []

    if (params.role) {
      conditions.push(eq(users.role, params.role))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [data, totalResult] = await Promise.all([
      this.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          approvalStatus: users.approvalStatus,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: count() }).from(users).where(whereClause),
    ])

    const total = totalResult[0]?.count ?? 0

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  /**
   * Deactivates a user account.
   *
   * - Rejects if target is a superadmin (403) (Requirement 4.5)
   * - Sets isActive=false and deactivatedAt=now (Requirement 4.3)
   * - Invalidates all sessions for the user by deleting them from the sessions table (Requirement 4.4)
   * - Logs the action to audit (Requirement 4.6)
   *
   * Requirements: 4.3, 4.4, 4.5, 4.6
   */
  async deactivateUser(actorId: string, targetUserId: string): Promise<void> {
    // Step 1: Find the target user
    const targetUser = await this.db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    })

    if (!targetUser) {
      throw new NotFoundError('User')
    }

    // Step 2: Reject if target is superadmin (Requirement 4.5)
    if (targetUser.role === 'superadmin') {
      // Log the failed attempt (Requirement 4.6)
      this.auditLogger.log({
        actorId,
        action: 'user_deactivation_rejected',
        entityType: 'user',
        entityId: targetUserId,
        ownerAccountId: targetUser.ownerAccountId ?? targetUserId,
        metadata: { reason: 'Cannot deactivate a superadmin account' },
      })

      throw new AppError(
        403,
        'FORBIDDEN',
        'Cannot deactivate a superadmin account',
      )
    }

    // Step 3: Set isActive=false and deactivatedAt=now
    const now = new Date()
    await this.db
      .update(users)
      .set({
        isActive: false,
        deactivatedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, targetUserId))

    // Step 4: Invalidate all sessions for the user (delete from sessions table)
    await this.db.delete(sessions).where(eq(sessions.userId, targetUserId))

    // Step 5: Log the deactivation to audit (Requirement 4.6)
    this.auditLogger.log({
      actorId,
      action: 'user_deactivated',
      entityType: 'user',
      entityId: targetUserId,
      ownerAccountId: targetUser.ownerAccountId ?? targetUserId,
      oldValues: { isActive: true },
      newValues: { isActive: false, deactivatedAt: now.toISOString() },
    })
  }

  /**
   * Returns platform-level dashboard statistics.
   *
   * - Count of users grouped by role (owner, manager, renter) (Requirement 7.2)
   * - Count of pending approvals (Requirement 7.2)
   * - Count of active sessions (not expired per 7-day policy) (Requirement 7.2)
   *
   * Requirements: 7.1, 7.2, 7.3, 7.5
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const now = new Date()

    // Count users by role (owner, manager, renter)
    const [
      ownerCount,
      managerCount,
      renterCount,
      pendingCount,
      activeSessionCount,
    ] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, 'owner')),
      this.db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, 'manager')),
      this.db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, 'renter')),
      // Count pending approvals
      this.db
        .select({ count: count() })
        .from(users)
        .where(
          and(eq(users.role, 'owner'), eq(users.approvalStatus, 'pending')),
        ),
      // Count active sessions (expiresAt > now, per 7-day inactivity policy)
      this.db
        .select({ count: count() })
        .from(sessions)
        .where(gt(sessions.expiresAt, now)),
    ])

    return {
      usersByRole: {
        owner: ownerCount[0]?.count ?? 0,
        manager: managerCount[0]?.count ?? 0,
        renter: renterCount[0]?.count ?? 0,
      },
      pendingApprovals: pendingCount[0]?.count ?? 0,
      activeSessions: activeSessionCount[0]?.count ?? 0,
    }
  }
}
