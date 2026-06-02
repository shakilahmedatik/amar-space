import {
  buildings,
  type Database,
  flats,
  managerAssignments,
  notices,
} from '@repo/db'
import { NOTICE_TARGETS, type NoticeTarget } from '@repo/shared/constants'
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@repo/shared/errors'
import type { FieldError, RequestContext } from '@repo/shared/types'
import {
  type CreateNoticeInput,
  createNoticeSchema,
  type UpdateNoticeInput,
  updateNoticeSchema,
} from '@repo/shared/validation'
import { and, count, desc, eq, inArray, or } from 'drizzle-orm'
import type { AuditLogger } from '../plugins/audit-logger'

// --- Types ---

export interface ListNoticesInput {
  targetAudience?: string
  isPinned?: boolean
  page: number
  pageSize: number
}

export interface NoticeResult {
  id: string
  ownerAccountId: string
  authorId: string
  title: string
  body: string
  targetAudience: string
  targetBuildingId: string | null
  targetFlatId: string | null
  isPinned: boolean
  pinnedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface PaginatedNotices {
  data: NoticeResult[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// --- Service ---

/**
 * NoticeService handles notice creation, distribution, and management with tenant isolation.
 *
 * Enforces:
 * - Title (max 200 chars), body (max 5000 chars) validation
 * - Target audience enum: all_renters, specific_building, specific_flat, managers_only
 * - Building/flat reference validation for specific targets
 * - Manager can only target assigned buildings
 * - Author or Owner can edit/delete notices
 * - Max 5 pinned notices per target audience scope
 * - Role-based visibility filtering
 * - Pagination with max 50 per page
 * - Audit events for create/update/delete/pin actions
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 12.11, 12.12, 12.13
 */
export class NoticeService {
  constructor(
    private db: Database,
    private auditLogger: AuditLogger,
  ) {}

  /**
   * Creates a new notice with target audience validation.
   *
   * Validates:
   * - Title (1-200 chars), body (1-5000 chars) are required
   * - Target audience must be a valid enum value
   * - Building reference required and valid for specific_building target
   * - Flat reference required and valid for specific_flat target
   * - Manager can only target buildings assigned to them
   * - Sets initial isPinned to false unless specified (and enforces max 5 pinned)
   *
   * Requirements: 12.1, 12.3, 12.4, 12.7, 12.11, 12.12, 12.13
   */
  async createNotice(
    ctx: RequestContext,
    input: CreateNoticeInput,
  ): Promise<NoticeResult> {
    // Step 1: Validate input using Zod schema
    const parseResult = createNoticeSchema.safeParse(input)
    if (!parseResult.success) {
      const errors: FieldError[] = parseResult.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'unknown',
        message: issue.message,
        rule: issue.code,
      }))
      throw new ValidationError(errors)
    }

    const validated = parseResult.data

    // Step 2: Validate building/flat references (Requirement 12.12)
    if (validated.targetAudience === NOTICE_TARGETS.SPECIFIC_BUILDING) {
      const building = await this.db.query.buildings.findFirst({
        where: and(
          eq(buildings.id, validated.targetBuildingId!),
          eq(buildings.ownerAccountId, ctx.ownerAccountId),
        ),
      })

      if (!building) {
        throw new ValidationError([
          {
            field: 'targetBuildingId',
            message: 'Referenced building was not found',
            rule: 'not_found',
          },
        ])
      }

      // Step 3: Manager can only target assigned buildings (Requirement 12.13)
      if (ctx.role === 'manager') {
        await this.validateManagerBuildingAccess(
          ctx.userId,
          validated.targetBuildingId!,
        )
      }
    }

    if (validated.targetAudience === NOTICE_TARGETS.SPECIFIC_FLAT) {
      const flat = await this.db.query.flats.findFirst({
        where: and(
          eq(flats.id, validated.targetFlatId!),
          eq(flats.ownerAccountId, ctx.ownerAccountId),
        ),
      })

      if (!flat) {
        throw new ValidationError([
          {
            field: 'targetFlatId',
            message: 'Referenced flat was not found',
            rule: 'not_found',
          },
        ])
      }

      // Manager can only target flats in assigned buildings
      if (ctx.role === 'manager') {
        await this.validateManagerBuildingAccess(ctx.userId, flat.buildingId)
      }
    }

    // Step 4: If isPinned is true, enforce max 5 pinned per scope (Requirement 12.2)
    if (validated.isPinned) {
      await this.enforcePinLimit(
        ctx.ownerAccountId,
        validated.targetAudience as NoticeTarget,
        validated.targetBuildingId ?? null,
        validated.targetFlatId ?? null,
      )
    }

    // Step 5: Insert the notice
    const [created] = await this.db
      .insert(notices)
      .values({
        ownerAccountId: ctx.ownerAccountId,
        authorId: ctx.userId,
        title: validated.title,
        body: validated.body,
        targetAudience: validated.targetAudience,
        targetBuildingId: validated.targetBuildingId ?? null,
        targetFlatId: validated.targetFlatId ?? null,
        isPinned: validated.isPinned,
        pinnedAt: validated.isPinned ? new Date() : null,
      })
      .returning()

    if (!created) {
      throw new Error('Failed to create notice')
    }

    // Step 6: Record audit event (Requirement 12.7)
    this.auditLogger.log({
      actorId: ctx.userId,
      action: 'notice_created',
      entityType: 'notice',
      entityId: created.id,
      ownerAccountId: ctx.ownerAccountId,
      newValues: {
        title: validated.title,
        targetAudience: validated.targetAudience,
        targetBuildingId: validated.targetBuildingId ?? null,
        targetFlatId: validated.targetFlatId ?? null,
        isPinned: validated.isPinned,
      },
    })

    return this.mapToResult(created)
  }

  /**
   * Updates a notice. Only the author or an Owner can edit.
   *
   * Validates:
   * - Notice exists and belongs to the owner's account
   * - Only the author or an Owner can edit (Requirement 12.9, 12.10)
   * - If target audience changes, validates new building/flat references
   *
   * Requirements: 12.9, 12.10
   */
  async updateNotice(
    ctx: RequestContext,
    noticeId: string,
    input: UpdateNoticeInput,
  ): Promise<NoticeResult> {
    // Step 1: Validate input
    const parseResult = updateNoticeSchema.safeParse(input)
    if (!parseResult.success) {
      const errors: FieldError[] = parseResult.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'unknown',
        message: issue.message,
        rule: issue.code,
      }))
      throw new ValidationError(errors)
    }

    const validated = parseResult.data

    // Step 2: Verify notice exists and belongs to the owner's account
    const existing = await this.db.query.notices.findFirst({
      where: and(
        eq(notices.id, noticeId),
        eq(notices.ownerAccountId, ctx.ownerAccountId),
      ),
    })

    if (!existing) {
      throw new NotFoundError('Notice')
    }

    // Step 3: Check edit permission — author or Owner (Requirement 12.9, 12.10)
    if (ctx.role !== 'owner' && existing.authorId !== ctx.userId) {
      throw new ForbiddenError()
    }

    // Step 4: Determine the effective target audience after update
    const effectiveTargetAudience = (validated.targetAudience ??
      existing.targetAudience) as NoticeTarget
    const effectiveBuildingId =
      validated.targetBuildingId !== undefined
        ? validated.targetBuildingId
        : existing.targetBuildingId
    const effectiveFlatId =
      validated.targetFlatId !== undefined
        ? validated.targetFlatId
        : existing.targetFlatId

    // Step 5: Validate building/flat references if target audience requires them
    if (effectiveTargetAudience === NOTICE_TARGETS.SPECIFIC_BUILDING) {
      if (!effectiveBuildingId) {
        throw new ValidationError([
          {
            field: 'targetBuildingId',
            message:
              'Building ID is required when targeting a specific building',
            rule: 'required',
          },
        ])
      }

      const building = await this.db.query.buildings.findFirst({
        where: and(
          eq(buildings.id, effectiveBuildingId),
          eq(buildings.ownerAccountId, ctx.ownerAccountId),
        ),
      })

      if (!building) {
        throw new ValidationError([
          {
            field: 'targetBuildingId',
            message: 'Referenced building was not found',
            rule: 'not_found',
          },
        ])
      }

      if (ctx.role === 'manager') {
        await this.validateManagerBuildingAccess(
          ctx.userId,
          effectiveBuildingId,
        )
      }
    }

    if (effectiveTargetAudience === NOTICE_TARGETS.SPECIFIC_FLAT) {
      if (!effectiveFlatId) {
        throw new ValidationError([
          {
            field: 'targetFlatId',
            message: 'Flat ID is required when targeting a specific flat',
            rule: 'required',
          },
        ])
      }

      const flat = await this.db.query.flats.findFirst({
        where: and(
          eq(flats.id, effectiveFlatId),
          eq(flats.ownerAccountId, ctx.ownerAccountId),
        ),
      })

      if (!flat) {
        throw new ValidationError([
          {
            field: 'targetFlatId',
            message: 'Referenced flat was not found',
            rule: 'not_found',
          },
        ])
      }

      if (ctx.role === 'manager') {
        await this.validateManagerBuildingAccess(ctx.userId, flat.buildingId)
      }
    }

    // Step 6: Build update payload
    const updatePayload: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (validated.title !== undefined) {
      updatePayload.title = validated.title
    }
    if (validated.body !== undefined) {
      updatePayload.body = validated.body
    }
    if (validated.targetAudience !== undefined) {
      updatePayload.targetAudience = validated.targetAudience
    }
    if (validated.targetBuildingId !== undefined) {
      updatePayload.targetBuildingId = validated.targetBuildingId
    }
    if (validated.targetFlatId !== undefined) {
      updatePayload.targetFlatId = validated.targetFlatId
    }

    // Step 7: Perform the update
    const [updated] = await this.db
      .update(notices)
      .set(updatePayload)
      .where(eq(notices.id, noticeId))
      .returning()

    if (!updated) {
      throw new Error('Failed to update notice')
    }

    // Step 8: Record audit event
    this.auditLogger.log({
      actorId: ctx.userId,
      action: 'notice_updated',
      entityType: 'notice',
      entityId: noticeId,
      ownerAccountId: ctx.ownerAccountId,
      oldValues: {
        title: existing.title,
        body: existing.body,
        targetAudience: existing.targetAudience,
        targetBuildingId: existing.targetBuildingId,
        targetFlatId: existing.targetFlatId,
      },
      newValues: updatePayload,
    })

    return this.mapToResult(updated)
  }

  /**
   * Deletes a notice. Only the author or an Owner can delete.
   *
   * Requirements: 12.9, 12.10
   */
  async deleteNotice(ctx: RequestContext, noticeId: string): Promise<void> {
    // Step 1: Verify notice exists and belongs to the owner's account
    const existing = await this.db.query.notices.findFirst({
      where: and(
        eq(notices.id, noticeId),
        eq(notices.ownerAccountId, ctx.ownerAccountId),
      ),
    })

    if (!existing) {
      throw new NotFoundError('Notice')
    }

    // Step 2: Check delete permission — author or Owner (Requirement 12.9, 12.10)
    if (ctx.role !== 'owner' && existing.authorId !== ctx.userId) {
      throw new ForbiddenError()
    }

    // Step 3: Delete the notice
    await this.db.delete(notices).where(eq(notices.id, noticeId))

    // Step 4: Record audit event
    this.auditLogger.log({
      actorId: ctx.userId,
      action: 'notice_deleted',
      entityType: 'notice',
      entityId: noticeId,
      ownerAccountId: ctx.ownerAccountId,
      oldValues: {
        title: existing.title,
        body: existing.body,
        targetAudience: existing.targetAudience,
        targetBuildingId: existing.targetBuildingId,
        targetFlatId: existing.targetFlatId,
        isPinned: existing.isPinned,
      },
    })
  }

  /**
   * Toggles the pinned status of a notice.
   * Enforces max 5 pinned notices per target audience scope.
   *
   * Requirement: 12.2
   */
  async togglePin(
    ctx: RequestContext,
    noticeId: string,
  ): Promise<NoticeResult> {
    // Step 1: Verify notice exists and belongs to the owner's account
    const existing = await this.db.query.notices.findFirst({
      where: and(
        eq(notices.id, noticeId),
        eq(notices.ownerAccountId, ctx.ownerAccountId),
      ),
    })

    if (!existing) {
      throw new NotFoundError('Notice')
    }

    const newPinnedState = !existing.isPinned

    // Step 2: If pinning, enforce max 5 per scope (Requirement 12.2)
    if (newPinnedState) {
      await this.enforcePinLimit(
        ctx.ownerAccountId,
        existing.targetAudience as NoticeTarget,
        existing.targetBuildingId,
        existing.targetFlatId,
      )
    }

    // Step 3: Update the notice
    const [updated] = await this.db
      .update(notices)
      .set({
        isPinned: newPinnedState,
        pinnedAt: newPinnedState ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(notices.id, noticeId))
      .returning()

    if (!updated) {
      throw new Error('Failed to toggle pin status')
    }

    // Step 4: Record audit event
    this.auditLogger.log({
      actorId: ctx.userId,
      action: newPinnedState ? 'notice_pinned' : 'notice_unpinned',
      entityType: 'notice',
      entityId: noticeId,
      ownerAccountId: ctx.ownerAccountId,
      oldValues: { isPinned: existing.isPinned },
      newValues: { isPinned: newPinnedState },
    })

    return this.mapToResult(updated)
  }

  /**
   * Lists notices with role-based visibility filtering.
   *
   * Visibility rules:
   * - Owner: sees all notices in their account
   * - Manager: sees all_renters, managers_only, and notices for assigned buildings
   * - Renter: sees all_renters, notices for their building, and notices for their flat
   *
   * Paginated with max 50 per page, ordered by pinned status first then createdAt desc.
   *
   * Requirements: 12.5, 12.6, 12.8
   */
  async listNotices(
    ctx: RequestContext,
    input: ListNoticesInput,
  ): Promise<PaginatedNotices> {
    const pageSize = Math.min(Math.max(input.pageSize, 1), 50)
    const page = Math.max(input.page, 1)
    const offset = (page - 1) * pageSize

    // Build base conditions with tenant isolation
    const baseConditions = [eq(notices.ownerAccountId, ctx.ownerAccountId)]

    // Apply target audience filter if specified
    if (input.targetAudience) {
      baseConditions.push(eq(notices.targetAudience, input.targetAudience))
    }

    // Apply pinned filter if specified
    if (input.isPinned !== undefined) {
      baseConditions.push(eq(notices.isPinned, input.isPinned))
    }

    // Apply role-based visibility filtering
    const visibilityCondition = this.buildVisibilityCondition(ctx)

    const whereClause = visibilityCondition
      ? and(...baseConditions, visibilityCondition)
      : and(...baseConditions)

    const [data, totalResult] = await Promise.all([
      this.db
        .select()
        .from(notices)
        .where(whereClause)
        .orderBy(
          desc(notices.isPinned),
          desc(notices.pinnedAt),
          desc(notices.createdAt),
        )
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: count() }).from(notices).where(whereClause),
    ])

    const total = totalResult[0]?.count ?? 0

    return {
      data: data.map((row) => this.mapToResult(row)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  /**
   * Gets a single notice by ID, scoped to the owner's account and role-based visibility.
   */
  async getNotice(
    ctx: RequestContext,
    noticeId: string,
  ): Promise<NoticeResult> {
    const notice = await this.db.query.notices.findFirst({
      where: and(
        eq(notices.id, noticeId),
        eq(notices.ownerAccountId, ctx.ownerAccountId),
      ),
    })

    if (!notice) {
      throw new NotFoundError('Notice')
    }

    // Check role-based visibility
    if (!this.isVisibleToUser(ctx, notice)) {
      throw new NotFoundError('Notice')
    }

    return this.mapToResult(notice)
  }

  // --- Private Helpers ---

  /**
   * Validates that a manager has access to the specified building.
   * Throws ForbiddenError if the manager is not assigned to the building.
   *
   * Requirement: 12.13
   */
  private async validateManagerBuildingAccess(
    managerId: string,
    buildingId: string,
  ): Promise<void> {
    const assignment = await this.db.query.managerAssignments.findFirst({
      where: and(
        eq(managerAssignments.managerId, managerId),
        eq(managerAssignments.buildingId, buildingId),
      ),
    })

    if (!assignment) {
      throw new ForbiddenError()
    }
  }

  /**
   * Enforces the max 5 pinned notices per target audience scope.
   * Throws ValidationError if the limit would be exceeded.
   *
   * Requirement: 12.2
   */
  private async enforcePinLimit(
    ownerAccountId: string,
    targetAudience: NoticeTarget,
    targetBuildingId: string | null,
    targetFlatId: string | null,
  ): Promise<void> {
    // Build conditions for the scope
    const conditions = [
      eq(notices.ownerAccountId, ownerAccountId),
      eq(notices.targetAudience, targetAudience),
      eq(notices.isPinned, true),
    ]

    // Scope by building or flat if applicable
    if (
      targetAudience === NOTICE_TARGETS.SPECIFIC_BUILDING &&
      targetBuildingId
    ) {
      conditions.push(eq(notices.targetBuildingId, targetBuildingId))
    }

    if (targetAudience === NOTICE_TARGETS.SPECIFIC_FLAT && targetFlatId) {
      conditions.push(eq(notices.targetFlatId, targetFlatId))
    }

    const [result] = await this.db
      .select({ count: count() })
      .from(notices)
      .where(and(...conditions))

    const pinnedCount = result?.count ?? 0

    if (pinnedCount >= 5) {
      throw new ValidationError([
        {
          field: 'isPinned',
          message: `Maximum of 5 pinned notices per target audience scope reached`,
          rule: 'max_pinned',
        },
      ])
    }
  }

  /**
   * Builds a Drizzle ORM condition for role-based visibility filtering.
   *
   * - Owner: no additional filter (sees all)
   * - Manager: sees all_renters, managers_only, and notices for assigned buildings
   * - Renter: sees all_renters, notices for their building, and notices for their flat
   *
   * Requirements: 12.5, 12.6
   */
  private buildVisibilityCondition(ctx: RequestContext) {
    if (ctx.role === 'owner') {
      // Owner sees all notices in their account
      return undefined
    }

    if (ctx.role === 'manager') {
      const conditions = [
        eq(notices.targetAudience, NOTICE_TARGETS.ALL_RENTERS),
        eq(notices.targetAudience, NOTICE_TARGETS.MANAGERS_ONLY),
      ]

      // Manager can see notices for their assigned buildings
      if (ctx.assignedBuildingIds && ctx.assignedBuildingIds.length > 0) {
        conditions.push(
          and(
            eq(notices.targetAudience, NOTICE_TARGETS.SPECIFIC_BUILDING),
            inArray(notices.targetBuildingId, ctx.assignedBuildingIds),
          )!,
        )
      }

      return or(...conditions)
    }

    // Default: deny all (shouldn't reach here)
    return eq(notices.id, 'impossible-id')
  }

  /**
   * Checks if a notice is visible to the user based on their role.
   */
  private isVisibleToUser(
    ctx: RequestContext,
    notice: typeof notices.$inferSelect,
  ): boolean {
    if (ctx.role === 'owner') {
      return true
    }

    if (ctx.role === 'manager') {
      if (
        notice.targetAudience === NOTICE_TARGETS.ALL_RENTERS ||
        notice.targetAudience === NOTICE_TARGETS.MANAGERS_ONLY
      ) {
        return true
      }

      if (
        notice.targetAudience === NOTICE_TARGETS.SPECIFIC_BUILDING &&
        notice.targetBuildingId &&
        ctx.assignedBuildingIds?.includes(notice.targetBuildingId)
      ) {
        return true
      }

      return false
    }

    return false
  }

  private mapToResult(row: typeof notices.$inferSelect): NoticeResult {
    return {
      id: row.id,
      ownerAccountId: row.ownerAccountId,
      authorId: row.authorId,
      title: row.title,
      body: row.body,
      targetAudience: row.targetAudience,
      targetBuildingId: row.targetBuildingId,
      targetFlatId: row.targetFlatId,
      isPinned: row.isPinned,
      pinnedAt: row.pinnedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }
}
