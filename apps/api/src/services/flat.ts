import type { Database } from '@repo/db'
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
import type { AuditLogger } from '../plugins/audit-logger'
import { BuildingRepository } from '../repositories/building.repository'
import { FlatRepository } from '../repositories/flat.repository'

// --- Types ---

export interface CreateFlatInput {
  buildingId: string
  flatNumber: string
  floor: number
}

export interface UpdateFlatInput {
  flatNumber?: string
  floor?: number
  status?: FlatStatus
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
  buildingName?: string | null
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
 */
export class FlatService {
  private buildingRepository: BuildingRepository
  private flatRepository: FlatRepository

  constructor(
    private db: Database,
    private auditLogger: AuditLogger,
  ) {
    this.buildingRepository = new BuildingRepository(db)
    this.flatRepository = new FlatRepository(db)
  }

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
    const building = await this.buildingRepository.findById(
      input.buildingId,
      ctx.ownerAccountId,
    )

    if (!building) {
      throw new NotFoundError('Building')
    }

    // Check flat number uniqueness within building (Requirement 6.12)
    const existingFlat = await this.flatRepository.findByNumberAndBuilding(
      input.flatNumber,
      input.buildingId,
    )

    if (existingFlat) {
      throw new ConflictError(
        `Flat number '${input.flatNumber}' already exists in this building`,
      )
    }

    // Create the flat
    const created = await this.flatRepository.create({
      ownerAccountId: ctx.ownerAccountId,
      buildingId: input.buildingId,
      flatNumber: input.flatNumber,
      floor: input.floor,
      status: FLAT_STATUS.VACANT,
    })

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
    const existing = await this.flatRepository.findById(
      flatId,
      ctx.ownerAccountId,
    )

    if (!existing) {
      throw new NotFoundError('Flat')
    }

    // If flatNumber is being changed, check uniqueness within building
    if (input.flatNumber && input.flatNumber !== existing.flatNumber) {
      const duplicate = await this.flatRepository.findByNumberAndBuilding(
        input.flatNumber,
        existing.buildingId,
      )

      if (duplicate) {
        throw new ConflictError(
          `Flat number '${input.flatNumber}' already exists in this building`,
        )
      }
    }

    // Build update values
    const updateValues: Record<string, unknown> = {}
    if (input.flatNumber !== undefined) {
      updateValues.flatNumber = input.flatNumber
    }
    if (input.floor !== undefined) {
      updateValues.floor = input.floor
    }

    const updated = await this.flatRepository.update(flatId, updateValues)

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

    // If a status transition was requested, delegate to transitionStatus after
    // persisting any flatNumber/floor changes, so we get full state machine
    // validation and a separate audit event for the status change.
    if (input.status !== undefined) {
      return this.transitionStatus(ctx, flatId, input.status)
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
    const existing = await this.flatRepository.findById(
      flatId,
      ctx.ownerAccountId,
    )

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
      await this.flatRepository.delete(flatId, tx as unknown as Database)
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

    const filters = {
      buildingId: input.buildingId,
      status: input.status,
    }

    const [data, total] = await Promise.all([
      this.flatRepository.list(ctx.ownerAccountId, filters, page, pageSize),
      this.flatRepository.count(ctx.ownerAccountId, filters),
    ])

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
    const existing = await this.flatRepository.findById(
      flatId,
      ctx.ownerAccountId,
    )

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

    const updated = await this.flatRepository.update(flatId, {
      status: newStatus,
    })

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

  private mapToResult(row: {
    id: string
    ownerAccountId: string
    buildingId: string
    flatNumber: string
    floor: number
    status: string
    createdAt: Date
    updatedAt: Date
  }): FlatResult {
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
