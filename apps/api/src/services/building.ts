import type { Database } from '@repo/db'
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@repo/shared/errors'
import type { FieldError, RequestContext } from '@repo/shared/types'
import {
  type CreateBuildingInput,
  createBuildingSchema,
  type UpdateBuildingInput,
  updateBuildingSchema,
} from '@repo/shared/validation'
import type { AuditLogger } from '../plugins/audit-logger'
import { BuildingRepository } from '../repositories/building.repository'

// --- Types ---

export interface PaginationInput {
  page: number
  pageSize: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface Building {
  id: string
  ownerAccountId: string
  name: string
  address: string
  totalFloors: number | null
  createdAt: Date
  updatedAt: Date
}

// --- Service ---

/**
 * BuildingService handles building CRUD operations with tenant isolation.
 *
 * All operations are scoped to the owner's account via ownerAccountId.
 * Enforces:
 * - Building name uniqueness per owner (unique constraint on ownerAccountId + name)
 * - Field constraints: name (1-200 chars), address (1-500 chars), totalFloors (optional, 1-200)
 * - Pagination with max 50 per page, sorted by createdAt desc
 * - Audit events for create and update operations
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 5.7, 5.8, 5.9
 */
export class BuildingService {
  private auditLogger: AuditLogger
  private buildingRepository: BuildingRepository

  constructor(db: Database, auditLogger: AuditLogger) {
    this.auditLogger = auditLogger
    this.buildingRepository = new BuildingRepository(db)
  }

  /**
   * Creates a new building associated with the owner's account.
   *
   * Validates:
   * - Name (1-200 chars) and address (1-500 chars) are required
   * - totalFloors is optional (1-200 if provided)
   * - Building name must be unique within the owner's account
   *
   * Requirements: 5.1, 5.2, 5.3, 5.7, 5.9
   */
  async createBuilding(
    ctx: RequestContext,
    input: CreateBuildingInput,
  ): Promise<Building> {
    // Step 1: Validate input using Zod schema
    const parseResult = createBuildingSchema.safeParse(input)
    if (!parseResult.success) {
      const errors: FieldError[] = parseResult.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'unknown',
        message: issue.message,
        rule: issue.code,
      }))
      throw new ValidationError(errors)
    }

    const validated = parseResult.data

    // Step 2: Check name uniqueness per owner (Requirement 5.9)
    const existing = await this.buildingRepository.findByNameAndOwner(
      validated.name,
      ctx.ownerAccountId,
    )

    if (existing) {
      throw new ConflictError(
        'A building with this name already exists in your account',
      )
    }

    // Step 3: Insert the building
    const created = await this.buildingRepository.create({
      ownerAccountId: ctx.ownerAccountId,
      name: validated.name,
      address: validated.address,
      totalFloors: validated.totalFloors ?? null,
    })

    // Step 4: Record audit event (Requirement 5.6)
    this.auditLogger.log({
      actorId: ctx.userId,
      action: 'building_created',
      entityType: 'building',
      entityId: created.id,
      ownerAccountId: ctx.ownerAccountId,
      newValues: {
        name: created.name,
        address: created.address,
        totalFloors: created.totalFloors,
      },
    })

    return created
  }

  /**
   * Updates an existing building's properties.
   *
   * Validates:
   * - Building exists and belongs to the owner's account
   * - Same field constraints as creation
   * - If name is being changed, validates uniqueness
   *
   * Requirements: 5.4, 5.9
   */
  async updateBuilding(
    ctx: RequestContext,
    buildingId: string,
    input: UpdateBuildingInput,
  ): Promise<Building> {
    // Step 1: Validate input using Zod schema
    const parseResult = updateBuildingSchema.safeParse(input)
    if (!parseResult.success) {
      const errors: FieldError[] = parseResult.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'unknown',
        message: issue.message,
        rule: issue.code,
      }))
      throw new ValidationError(errors)
    }

    const validated = parseResult.data

    // Step 2: Verify building exists and belongs to the owner
    const existing = await this.buildingRepository.findById(
      buildingId,
      ctx.ownerAccountId,
    )

    if (!existing) {
      throw new NotFoundError('Building')
    }

    // Step 3: If name is being changed, check uniqueness (Requirement 5.9)
    if (validated.name && validated.name !== existing.name) {
      const duplicate = await this.buildingRepository.findByNameAndOwner(
        validated.name,
        ctx.ownerAccountId,
      )

      if (duplicate) {
        throw new ConflictError(
          'A building with this name already exists in your account',
        )
      }
    }

    // Step 4: Build update payload (only include provided fields)
    const updatePayload: Record<string, unknown> = {}

    if (validated.name !== undefined) {
      updatePayload.name = validated.name
    }
    if (validated.address !== undefined) {
      updatePayload.address = validated.address
    }
    if (validated.totalFloors !== undefined) {
      updatePayload.totalFloors = validated.totalFloors
    }

    // Step 5: Perform the update
    const updated = await this.buildingRepository.update(
      buildingId,
      ctx.ownerAccountId,
      updatePayload,
    )

    if (!updated) {
      throw new NotFoundError('Building')
    }

    // Step 6: Record audit event
    const oldValues: Record<string, unknown> = {}
    const newValues: Record<string, unknown> = {}

    if (validated.name !== undefined && validated.name !== existing.name) {
      oldValues.name = existing.name
      newValues.name = validated.name
    }
    if (
      validated.address !== undefined &&
      validated.address !== existing.address
    ) {
      oldValues.address = existing.address
      newValues.address = validated.address
    }
    if (
      validated.totalFloors !== undefined &&
      validated.totalFloors !== existing.totalFloors
    ) {
      oldValues.totalFloors = existing.totalFloors
      newValues.totalFloors = validated.totalFloors
    }

    if (Object.keys(newValues).length > 0) {
      this.auditLogger.log({
        actorId: ctx.userId,
        action: 'building_updated',
        entityType: 'building',
        entityId: buildingId,
        ownerAccountId: ctx.ownerAccountId,
        oldValues,
        newValues,
      })
    }

    return updated
  }

  /**
   * Lists buildings for the owner's account with pagination.
   *
   * - Tenant-scoped via ownerAccountId
   * - Max 50 per page
   * - Sorted by createdAt descending
   *
   * Requirement: 5.8
   */
  async listBuildings(
    ctx: RequestContext,
    pagination: PaginationInput,
  ): Promise<PaginatedResult<Building>> {
    const pageSize = Math.min(Math.max(pagination.pageSize, 1), 50)
    const page = Math.max(pagination.page, 1)

    const [data, total] = await Promise.all([
      this.buildingRepository.list(ctx.ownerAccountId, page, pageSize),
      this.buildingRepository.count(ctx.ownerAccountId),
    ])

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  /**
   * Gets a single building by ID, scoped to the owner's account.
   *
   * Returns NotFoundError if the building doesn't exist or belongs to another account.
   */
  async getBuilding(
    ctx: RequestContext,
    buildingId: string,
  ): Promise<Building> {
    const building = await this.buildingRepository.findById(
      buildingId,
      ctx.ownerAccountId,
    )

    if (!building) {
      throw new NotFoundError('Building')
    }

    return building
  }
}
