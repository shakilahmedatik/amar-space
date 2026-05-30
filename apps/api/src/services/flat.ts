import { buildings, type Database, flatSlugs, flats } from '@repo/db'
import {
  FLAT_STATUS,
  FLAT_STATUS_TRANSITIONS,
  type FlatStatus,
} from '@repo/shared/constants'
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@repo/shared/errors'
import type { FieldError, RequestContext } from '@repo/shared/types'
import { and, count, eq } from 'drizzle-orm'
import type { AuditLogger } from '../plugins/audit-logger'

// --- Types ---

export interface CreateFlatInput {
  buildingId: string
  flatNumber: string
  floor: number
}

export interface UpdateFlatInput {
  flatNumber?: string
  floor?: number
}

export interface ListFlatsInput {
  buildingId?: string
  status?: FlatStatus
  page: number
  pageSize: number
}

export interface FlatResult {
  id: string
  ownerAccountId: string
  buildingId: string
  flatNumber: string
  floor: number
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface PaginatedFlats {
  data: FlatResult[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// --- Service ---

/**
 * FlatService handles flat CRUD operations with tenant isolation,
 * field validation, uniqueness enforcement, and state machine transitions.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7, 6.10, 6.11, 6.12, 6.13, 6.14
 */
export class FlatService {
  constructor(
    private db: Database,
    private auditLogger: AuditLogger,
  ) {}

  /**
   * Creates a flat within a building.
   * Validates:
   * - flatNumber is alphanumeric, max 20 chars (Requirement 6.2)
   * - floor is between 1-200 (Requirement 6.2)
   * - buildingId exists and belongs to the owner (Requirement 6.1)
   * - flatNumber is unique within the building (Requirement 6.12)
   *
   * Records audit event (Requirement 6.10)
   */
  async createFlat(
    ctx: RequestContext,
    input: CreateFlatInput,
  ): Promise<FlatResult> {
    // Validate field constraints
    this.validateFlatFields(input.flatNumber, input.floor)

    // Verify building exists and belongs to the owner
    const building = await this.db.query.buildings.findFirst({
      where: and(
        eq(buildings.id, input.buildingId),
        eq(buildings.ownerAccountId, ctx.ownerAccountId),
      ),
    })

    if (!building) {
      throw new NotFoundError('Building')
    }

    // Check flat number uniqueness within building (Requirement 6.12)
    const existingFlat = await this.db.query.flats.findFirst({
      where: and(
        eq(flats.buildingId, input.buildingId),
        eq(flats.flatNumber, input.flatNumber),
      ),
    })

    if (existingFlat) {
      throw new ConflictError(
        `Flat number '${input.flatNumber}' already exists in this building`,
      )
    }

    // Create the flat
    const [created] = await this.db
      .insert(flats)
      .values({
        ownerAccountId: ctx.ownerAccountId,
        buildingId: input.buildingId,
        flatNumber: input.flatNumber,
        floor: input.floor,
        status: FLAT_STATUS.VACANT,
      })
      .returning()

    if (!created) {
      throw new Error('Failed to create flat')
    }

    // Record audit event (Requirement 6.10)
    this.auditLogger.log({
      actorId: ctx.userId,
      action: 'flat_created',
      entityType: 'flat',
      entityId: created.id,
      ownerAccountId: ctx.ownerAccountId,
      newValues: {
        buildingId: input.buildingId,
        flatNumber: input.flatNumber,
        floor: input.floor,
        status: FLAT_STATUS.VACANT,
      },
    })

    return this.mapToResult(created)
  }

  /**
   * Updates a flat's properties.
   * Validates ownership via ownerAccountId (tenant isolation).
   * If flatNumber is changed, validates uniqueness within the building.
   *
   * Records audit event.
   */
  async updateFlat(
    ctx: RequestContext,
    flatId: string,
    input: UpdateFlatInput,
  ): Promise<FlatResult> {
    // Validate field constraints if provided
    if (input.flatNumber !== undefined) {
      this.validateFlatNumber(input.flatNumber)
    }
    if (input.floor !== undefined) {
      this.validateFloor(input.floor)
    }

    // Find the flat with tenant isolation
    const existing = await this.db.query.flats.findFirst({
      where: and(
        eq(flats.id, flatId),
        eq(flats.ownerAccountId, ctx.ownerAccountId),
      ),
    })

    if (!existing) {
      throw new NotFoundError('Flat')
    }

    // If flatNumber is being changed, check uniqueness within building
    if (input.flatNumber && input.flatNumber !== existing.flatNumber) {
      const duplicate = await this.db.query.flats.findFirst({
        where: and(
          eq(flats.buildingId, existing.buildingId),
          eq(flats.flatNumber, input.flatNumber),
        ),
      })

      if (duplicate) {
        throw new ConflictError(
          `Flat number '${input.flatNumber}' already exists in this building`,
        )
      }
    }

    // Build update values
    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
    }
    if (input.flatNumber !== undefined) {
      updateValues.flatNumber = input.flatNumber
    }
    if (input.floor !== undefined) {
      updateValues.floor = input.floor
    }

    const [updated] = await this.db
      .update(flats)
      .set(updateValues)
      .where(eq(flats.id, flatId))
      .returning()

    if (!updated) {
      throw new Error('Failed to update flat')
    }

    // Record audit event
    const oldValues: Record<string, unknown> = {}
    const newValues: Record<string, unknown> = {}
    if (
      input.flatNumber !== undefined &&
      input.flatNumber !== existing.flatNumber
    ) {
      oldValues.flatNumber = existing.flatNumber
      newValues.flatNumber = input.flatNumber
    }
    if (input.floor !== undefined && input.floor !== existing.floor) {
      oldValues.floor = existing.floor
      newValues.floor = input.floor
    }

    if (Object.keys(newValues).length > 0) {
      this.auditLogger.log({
        actorId: ctx.userId,
        action: 'flat_updated',
        entityType: 'flat',
        entityId: flatId,
        ownerAccountId: ctx.ownerAccountId,
        oldValues,
        newValues,
      })
    }

    return this.mapToResult(updated)
  }

  /**
   * Deletes a flat. Only allowed if status is Vacant (Requirement 6.13).
   *
   * Records audit event.
   */
  async deleteFlat(ctx: RequestContext, flatId: string): Promise<void> {
    // Find the flat with tenant isolation
    const existing = await this.db.query.flats.findFirst({
      where: and(
        eq(flats.id, flatId),
        eq(flats.ownerAccountId, ctx.ownerAccountId),
      ),
    })

    if (!existing) {
      throw new NotFoundError('Flat')
    }

    // Only allow deletion if status is Vacant (Requirement 6.13)
    if (existing.status !== FLAT_STATUS.VACANT) {
      throw new ValidationError([
        {
          field: 'status',
          message: 'Only flats with Vacant status can be deleted',
          rule: 'status_constraint',
        },
      ])
    }

    // Use a transaction to ensure atomicity of delete + audit
    await this.db.transaction(async (tx) => {
      // Delete related flat_slugs record (also handled by CASCADE after migration)
      await tx.delete(flatSlugs).where(eq(flatSlugs.flatId, flatId))
      await tx.delete(flats).where(eq(flats.id, flatId))
    })

    // Record audit event
    this.auditLogger.log({
      actorId: ctx.userId,
      action: 'flat_deleted',
      entityType: 'flat',
      entityId: flatId,
      ownerAccountId: ctx.ownerAccountId,
      oldValues: {
        buildingId: existing.buildingId,
        flatNumber: existing.flatNumber,
        floor: existing.floor,
        status: existing.status,
      },
    })
  }

  /**
   * Lists flats with optional filtering by buildingId and status.
   * Paginated with max 50 per page (Requirement 6.11).
   * Enforces tenant isolation via ownerAccountId.
   */
  async listFlats(
    ctx: RequestContext,
    input: ListFlatsInput,
  ): Promise<PaginatedFlats> {
    const pageSize = Math.min(Math.max(input.pageSize, 1), 50)
    const page = Math.max(input.page, 1)
    const offset = (page - 1) * pageSize

    const conditions = [eq(flats.ownerAccountId, ctx.ownerAccountId)]

    if (input.buildingId) {
      conditions.push(eq(flats.buildingId, input.buildingId))
    }

    if (input.status) {
      conditions.push(eq(flats.status, input.status))
    }

    const whereClause = and(...conditions)

    const [data, totalResult] = await Promise.all([
      this.db
        .select({
          id: flats.id,
          ownerAccountId: flats.ownerAccountId,
          buildingId: flats.buildingId,
          flatNumber: flats.flatNumber,
          floor: flats.floor,
          status: flats.status,
          createdAt: flats.createdAt,
          updatedAt: flats.updatedAt,
          buildingName: buildings.name,
        })
        .from(flats)
        .leftJoin(buildings, eq(flats.buildingId, buildings.id))
        .where(whereClause)
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: count() }).from(flats).where(whereClause),
    ])

    const total = totalResult[0]?.count ?? 0

    return {
      data: data.map((row) => ({
        id: row.id,
        ownerAccountId: row.ownerAccountId,
        buildingId: row.buildingId,
        flatNumber: row.flatNumber,
        floor: row.floor,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        buildingName: row.buildingName ?? null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  /**
   * Transitions flat status according to the state machine (Requirement 6.14).
   *
   * Valid transitions:
   * - Vacant → Occupied (renter assigned)
   * - Occupied → Vacant (contract ended)
   * - Vacant → Under_Maintenance (owner/manager sets)
   * - Under_Maintenance → Vacant (maintenance complete)
   *
   * Records audit event for status transitions.
   */
  async transitionStatus(
    ctx: RequestContext,
    flatId: string,
    newStatus: FlatStatus,
  ): Promise<FlatResult> {
    // Find the flat with tenant isolation
    const existing = await this.db.query.flats.findFirst({
      where: and(
        eq(flats.id, flatId),
        eq(flats.ownerAccountId, ctx.ownerAccountId),
      ),
    })

    if (!existing) {
      throw new NotFoundError('Flat')
    }

    const currentStatus = existing.status as FlatStatus

    // Validate state machine transition
    const allowedTransitions = FLAT_STATUS_TRANSITIONS[currentStatus]
    if (!allowedTransitions?.includes(newStatus)) {
      throw new ValidationError([
        {
          field: 'status',
          message: `Cannot transition from '${currentStatus}' to '${newStatus}'`,
          rule: 'invalid_transition',
        },
      ])
    }

    const [updated] = await this.db
      .update(flats)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(flats.id, flatId))
      .returning()

    if (!updated) {
      throw new Error('Failed to update flat status')
    }

    // Record audit event for status transition
    this.auditLogger.log({
      actorId: ctx.userId,
      action: 'flat_status_changed',
      entityType: 'flat',
      entityId: flatId,
      ownerAccountId: ctx.ownerAccountId,
      oldValues: { status: currentStatus },
      newValues: { status: newStatus },
    })

    return this.mapToResult(updated)
  }

  // --- Private Helpers ---

  private validateFlatFields(flatNumber: string, floor: number): void {
    const errors: FieldError[] = []

    const flatNumberError = this.getFlatNumberError(flatNumber)
    if (flatNumberError) {
      errors.push(flatNumberError)
    }

    const floorError = this.getFloorError(floor)
    if (floorError) {
      errors.push(floorError)
    }

    if (errors.length > 0) {
      throw new ValidationError(errors)
    }
  }

  private validateFlatNumber(flatNumber: string): void {
    const error = this.getFlatNumberError(flatNumber)
    if (error) {
      throw new ValidationError([error])
    }
  }

  private validateFloor(floor: number): void {
    const error = this.getFloorError(floor)
    if (error) {
      throw new ValidationError([error])
    }
  }

  private getFlatNumberError(flatNumber: string): FieldError | null {
    if (!flatNumber || flatNumber.length === 0) {
      return {
        field: 'flatNumber',
        message: 'Flat number is required',
        rule: 'required',
      }
    }
    if (flatNumber.length > 20) {
      return {
        field: 'flatNumber',
        message: 'Flat number must be at most 20 characters',
        rule: 'max_length',
      }
    }
    if (!/^[a-zA-Z0-9\-_]+$/.test(flatNumber)) {
      return {
        field: 'flatNumber',
        message: 'Flat number must be alphanumeric',
        rule: 'pattern',
      }
    }
    return null
  }

  private getFloorError(floor: number): FieldError | null {
    if (!Number.isInteger(floor) || floor < 1 || floor > 200) {
      return {
        field: 'floor',
        message: 'Floor must be an integer between 1 and 200',
        rule: 'range',
      }
    }
    return null
  }

  private mapToResult(row: typeof flats.$inferSelect): FlatResult {
    return {
      id: row.id,
      ownerAccountId: row.ownerAccountId,
      buildingId: row.buildingId,
      flatNumber: row.flatNumber,
      floor: row.floor,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }
}
