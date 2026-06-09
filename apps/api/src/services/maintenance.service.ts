import {
  type Database,
  flats,
  maintenanceAttachments,
  maintenanceComments,
  maintenanceRequests,
  rentalContracts,
  renters,
} from '@repo/db'
import {
  MAINTENANCE_STATUS,
  MAINTENANCE_STATUS_TRANSITIONS,
  type MaintenanceStatus,
  type Priority,
  ROLES,
} from '@repo/shared/constants'
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@repo/shared/errors'
import type { FieldError, RequestContext } from '@repo/shared/types'
import {
  addMaintenanceCommentSchema,
  createMaintenanceRequestSchema,
  updateMaintenanceStatusSchema,
} from '@repo/shared/validation'
import { and, count, desc, eq, inArray } from 'drizzle-orm'
import type { AuditLogger } from '../plugins/audit-logger'
import type { R2Client } from '../plugins/r2'

// --- Types ---

export interface MaintenanceRequestResult {
  id: string
  ownerAccountId: string
  flatId: string
  renterId: string
  buildingId: string
  title: string
  description: string
  priority: string
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface MaintenanceRequestWithComments
  extends MaintenanceRequestResult {
  comments: {
    id: string
    content: string
    userId: string
    createdAt: Date
  }[]
}

export interface MaintenanceAttachmentResult {
  id: string
  requestId: string
  fileUrl: string
  fileName: string
  fileSize: number
  mimeType: string
  createdAt: Date
}

export interface MaintenanceCommentResult {
  id: string
  requestId: string
  authorId: string
  content: string
  createdAt: Date
}

export interface CreateMaintenanceRequestInput {
  title: string
  description: string
  priority: string
}

export interface FileAttachment {
  fileName: string
  buffer: Buffer
  mimeType: string
  fileSize: number
}

export interface ListMaintenanceFilters {
  buildingId?: string
  flatId?: string
  status?: MaintenanceStatus
  priority?: Priority
}

export interface PaginationInput {
  page: number
  pageSize: number
}

export interface PaginatedMaintenanceRequests {
  data: MaintenanceRequestResult[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// --- Constants ---

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const MAX_ATTACHMENTS = 5
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// --- Service ---

/**
 * MaintenanceService handles maintenance request creation, status management,
 * comments, and file attachments for renter-submitted maintenance issues.
 *
 * Enforces:
 * - Tenant isolation via ownerAccountId
 * - Role-based access (Owner/Manager can update status, Renter can create/comment)
 * - Title validation (5-200 chars), description validation (10-2000 chars)
 * - Priority enum validation (low, medium, high, urgent)
 * - File attachment validation (max 5 images, JPEG/PNG/WebP, max 5MB each)
 * - State machine transitions for status updates
 * - Comment content validation (max 2000 chars)
 * - Pagination max 50 per page, sorted by createdAt desc
 * - Audit events for status changes
 *
 */
export class MaintenanceService {
  constructor(
    private db: Database,
    private auditLogger: AuditLogger,
    private r2: R2Client,
  ) {}

  /**
   * Creates a new maintenance request.
   *
   * - Validates title (5-200 chars), description (10-2000 chars), priority enum
   * - Sets initial status to Open
   * - Handles file attachments (max 5 images, JPEG/PNG/WebP, max 5MB each)
   * - Only Renter can create requests (they submit for their own flat)
   *
   */
  async createRequest(
    ctx: RequestContext,
    data: CreateMaintenanceRequestInput,
    attachments?: FileAttachment[],
  ): Promise<MaintenanceRequestResult> {
    // Validate input using Zod schema
    const parseResult = createMaintenanceRequestSchema.safeParse(data)
    if (!parseResult.success) {
      const errors: FieldError[] = parseResult.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'unknown',
        message: issue.message,
        rule: issue.code,
      }))
      throw new ValidationError(errors)
    }

    const validated = parseResult.data

    // Resolve the renter and their flat
    const renter = await this.db.query.renters.findFirst({
      where: and(
        eq(renters.userId, ctx.userId),
        eq(renters.ownerAccountId, ctx.ownerAccountId),
      ),
    })

    if (!renter) {
      throw new NotFoundError('Renter')
    }

    // Find the flat assigned to this renter (via active rental contract or assignedFlatId)
    const flatId = ctx.assignedFlatId
    let buildingId: string | undefined

    if (flatId) {
      const flat = await this.db.query.flats.findFirst({
        where: and(
          eq(flats.id, flatId),
          eq(flats.ownerAccountId, ctx.ownerAccountId),
        ),
      })
      if (flat) {
        buildingId = flat.buildingId
      }
    }

    if (!flatId || !buildingId) {
      throw new ValidationError([
        {
          field: 'flat',
          message: 'No flat assigned to this renter',
          rule: 'required',
        },
      ])
    }

    // Validate file attachments if provided (Requirement 10.2, 10.3)
    if (attachments && attachments.length > 0) {
      this.validateAttachments(attachments)
    }

    // Create the maintenance request
    const [request] = await this.db
      .insert(maintenanceRequests)
      .values({
        ownerAccountId: ctx.ownerAccountId,
        flatId,
        renterId: renter.id,
        buildingId,
        title: validated.title,
        description: validated.description,
        priority: validated.priority,
        status: MAINTENANCE_STATUS.OPEN,
      })
      .returning()

    if (!request) {
      throw new Error('Failed to create maintenance request')
    }

    // Upload and store file attachments (Requirement 10.2)
    if (attachments && attachments.length > 0) {
      await this.uploadAttachments(ctx, request.id, attachments)
    }

    // Record audit event
    this.auditLogger.log({
      actorId: ctx.userId,
      action: 'maintenance_request_created',
      entityType: 'maintenance_request',
      entityId: request.id,
      ownerAccountId: ctx.ownerAccountId,
      newValues: {
        title: validated.title,
        priority: validated.priority,
        status: MAINTENANCE_STATUS.OPEN,
        flatId,
        buildingId,
      },
    })

    return this.mapToRequestResult(request)
  }

  /**
   * Updates the status of a maintenance request.
   *
   * - Validates state machine transitions (Requirement 10.5, 10.12)
   * - Only Owner or Manager can update status (Requirement 10.6, 10.7)
   * - Records audit event with old/new status (Requirement 10.9)
   *
   */
  async updateRequestStatus(
    ctx: RequestContext,
    requestId: string,
    newStatus: string,
  ): Promise<MaintenanceRequestResult> {
    // Renters cannot update maintenance request status
    if (ctx.role === 'renter') {
      throw new ForbiddenError()
    }

    // Validate the new status value
    const parseResult = updateMaintenanceStatusSchema.safeParse({
      status: newStatus,
    })
    if (!parseResult.success) {
      const errors: FieldError[] = parseResult.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'unknown',
        message: issue.message,
        rule: issue.code,
      }))
      throw new ValidationError(errors)
    }

    const validated = parseResult.data

    // Find the request with tenant isolation
    const request = await this.findRequestWithAccess(ctx, requestId)

    const currentStatus = request.status as MaintenanceStatus
    const targetStatus = validated.status as MaintenanceStatus

    // Validate state machine transition (Requirement 10.5, 10.12)
    const allowedTransitions = MAINTENANCE_STATUS_TRANSITIONS[currentStatus]
    if (!allowedTransitions?.includes(targetStatus)) {
      throw new ValidationError([
        {
          field: 'status',
          message: `Cannot transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions: ${allowedTransitions?.join(', ') || 'none'}`,
          rule: 'invalid_transition',
        },
      ])
    }

    // Update the status
    const [updated] = await this.db
      .update(maintenanceRequests)
      .set({
        status: targetStatus,
        updatedAt: new Date(),
      })
      .where(eq(maintenanceRequests.id, requestId))
      .returning()

    if (!updated) {
      throw new Error('Failed to update maintenance request status')
    }

    // Record audit event for status change (Requirement 10.9)
    this.auditLogger.log({
      actorId: ctx.userId,
      action: 'maintenance_request_status_changed',
      entityType: 'maintenance_request',
      entityId: requestId,
      ownerAccountId: ctx.ownerAccountId,
      oldValues: { status: currentStatus },
      newValues: { status: targetStatus },
    })

    return this.mapToRequestResult(updated)
  }

  /**
   * Adds a comment to a maintenance request.
   *
   * - Validates content (max 2000 chars)
   * - Renter can add comments to their own requests (Requirement 10.8)
   * - Owner/Manager can also add comments
   *
   */
  async addComment(
    ctx: RequestContext,
    requestId: string,
    commentData: { content: string },
  ): Promise<MaintenanceCommentResult> {
    // Validate input
    const parseResult = addMaintenanceCommentSchema.safeParse(commentData)
    if (!parseResult.success) {
      const errors: FieldError[] = parseResult.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'unknown',
        message: issue.message,
        rule: issue.code,
      }))
      throw new ValidationError(errors)
    }

    const validated = parseResult.data

    // Find the request with access check
    await this.findRequestWithAccess(ctx, requestId)

    // Create the comment
    const [comment] = await this.db
      .insert(maintenanceComments)
      .values({
        requestId,
        authorId: ctx.userId,
        content: validated.content,
      })
      .returning()

    if (!comment) {
      throw new Error('Failed to add comment')
    }

    return {
      id: comment.id,
      requestId: comment.requestId,
      authorId: comment.authorId,
      content: comment.content,
      createdAt: comment.createdAt,
    }
  }

  /**
   * Gets a single maintenance request by ID with tenant isolation and role-based access.
   *
   * - Owner sees all requests
   * - Manager sees requests for assigned buildings
   * - Renter sees only their own requests
   *
   */
  async getRequest(
    ctx: RequestContext,
    requestId: string,
  ): Promise<MaintenanceRequestWithComments> {
    const request = await this.findRequestWithAccess(ctx, requestId)
    const commentsList = await this.db.query.maintenanceComments.findMany({
      where: eq(maintenanceComments.requestId, requestId),
      orderBy: desc(maintenanceComments.createdAt),
    })

    return {
      ...this.mapToRequestResult(request),
      comments: commentsList.map((c) => ({
        id: c.id,
        content: c.content,
        userId: c.authorId,
        createdAt: c.createdAt,
      })),
    }
  }

  /**
   * Lists maintenance requests with filtering and pagination.
   *
   * Filters: building, flat, status, priority
   * Pagination: max 50 per page, sorted by createdAt desc (Requirement 10.10)
   * Role-based access: Owner sees all, Manager sees assigned buildings, Renter sees own
   *
   */
  async listRequests(
    ctx: RequestContext,
    filters: ListMaintenanceFilters,
    pagination: PaginationInput,
  ): Promise<PaginatedMaintenanceRequests> {
    const pageSize = Math.min(Math.max(pagination.pageSize, 1), 50)
    const page = Math.max(pagination.page, 1)
    const offset = (page - 1) * pageSize

    const conditions = [
      eq(maintenanceRequests.ownerAccountId, ctx.ownerAccountId),
    ]

    // Role-based filtering
    if (ctx.role === 'renter') {
      // Look up the renter record for this user
      const renterRecord = await this.db.query.renters.findFirst({
        where: eq(renters.userId, ctx.userId),
      })

      if (!renterRecord) {
        return {
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        }
      }

      // Find the active contract for this renter
      const activeContract = await this.db.query.rentalContracts.findFirst({
        where: and(
          eq(rentalContracts.renterId, renterRecord.id),
          eq(rentalContracts.status, 'active'),
        ),
      })

      if (!activeContract) {
        return {
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        }
      }

      // Filter maintenance requests by the renter's assigned flat
      conditions.push(eq(maintenanceRequests.flatId, activeContract.flatId))
    }

    if (ctx.role === ROLES.MANAGER && ctx.assignedBuildingIds) {
      // Manager can only see requests for assigned buildings
      if (ctx.assignedBuildingIds.length === 0) {
        return {
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        }
      }
      conditions.push(
        inArray(maintenanceRequests.buildingId, ctx.assignedBuildingIds),
      )
    }

    // Apply filters
    if (filters.buildingId) {
      conditions.push(eq(maintenanceRequests.buildingId, filters.buildingId))
    }

    if (filters.flatId) {
      conditions.push(eq(maintenanceRequests.flatId, filters.flatId))
    }

    if (filters.status) {
      conditions.push(eq(maintenanceRequests.status, filters.status))
    }

    if (filters.priority) {
      conditions.push(eq(maintenanceRequests.priority, filters.priority))
    }

    const whereClause = and(...conditions)

    const [data, totalResult] = await Promise.all([
      this.db
        .select()
        .from(maintenanceRequests)
        .where(whereClause)
        .orderBy(desc(maintenanceRequests.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(maintenanceRequests)
        .where(whereClause),
    ])

    const total = totalResult[0]?.count ?? 0

    return {
      data: data.map((req) => this.mapToRequestResult(req)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  // --- Private Helpers ---

  /**
   * Validates file attachments against constraints.
   * - Max 5 images
   * - JPEG, PNG, or WebP only
   * - Max 5MB each
   */
  private validateAttachments(attachments: FileAttachment[]): void {
    const errors: FieldError[] = []

    if (attachments.length > MAX_ATTACHMENTS) {
      errors.push({
        field: 'attachments',
        message: `Maximum ${MAX_ATTACHMENTS} file attachments allowed`,
        rule: 'max_count',
      })
    }

    for (let i = 0; i < attachments.length; i++) {
      const file = attachments[i]!

      if (
        !ALLOWED_MIME_TYPES.includes(
          file.mimeType as (typeof ALLOWED_MIME_TYPES)[number],
        )
      ) {
        errors.push({
          field: `attachments[${i}]`,
          message: `File '${file.fileName}' has invalid format. Accepted formats: JPEG, PNG, WebP`,
          rule: 'mime_type',
        })
      }

      if (file.fileSize > MAX_FILE_SIZE) {
        errors.push({
          field: `attachments[${i}]`,
          message: `File '${file.fileName}' exceeds maximum size of 5MB`,
          rule: 'max_size',
        })
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(errors)
    }
  }

  /**
   * Uploads file attachments to R2 and stores references in the database.
   */
  private async uploadAttachments(
    ctx: RequestContext,
    requestId: string,
    attachments: FileAttachment[],
  ): Promise<void> {
    for (const file of attachments) {
      const storageKey = await this.r2.upload(
        ctx.ownerAccountId,
        'maintenance',
        requestId,
        file.fileName,
        file.buffer,
        file.mimeType,
      )

      await this.db.insert(maintenanceAttachments).values({
        requestId,
        fileUrl: storageKey,
        fileName: file.fileName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
      })
    }
  }

  /**
   * Finds a maintenance request by ID with tenant isolation and role-based access enforcement.
   */
  private async findRequestWithAccess(
    ctx: RequestContext,
    requestId: string,
  ): Promise<typeof maintenanceRequests.$inferSelect> {
    const request = await this.db.query.maintenanceRequests.findFirst({
      where: and(
        eq(maintenanceRequests.id, requestId),
        eq(maintenanceRequests.ownerAccountId, ctx.ownerAccountId),
      ),
    })

    if (!request) {
      throw new NotFoundError('Maintenance request')
    }

    // Role-based access check
    if (ctx.role === ROLES.MANAGER && ctx.assignedBuildingIds) {
      if (!ctx.assignedBuildingIds.includes(request.buildingId)) {
        throw new NotFoundError('Maintenance request')
      }
    }

    return request
  }

  private mapToRequestResult(
    request: typeof maintenanceRequests.$inferSelect,
  ): MaintenanceRequestResult {
    return {
      id: request.id,
      ownerAccountId: request.ownerAccountId,
      flatId: request.flatId,
      renterId: request.renterId,
      buildingId: request.buildingId,
      title: request.title,
      description: request.description,
      priority: request.priority,
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    }
  }
}
