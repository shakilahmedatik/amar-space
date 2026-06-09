import { randomUUID } from 'node:crypto'
import { type Database, emergencyContacts } from '@repo/db'
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
import { eq } from 'drizzle-orm'
import type { AuditLogger } from '../plugins/audit-logger'
import type { R2Client } from '../plugins/r2'
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

export interface EmergencyContact {
  id: string
  buildingId: string
  ownerAccountId: string
  name: string
  role: string
  phone: string | null
  type: 'building' | 'nearby'
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface Building {
  id: string
  ownerAccountId: string
  name: string
  address: string
  totalFloors: number | null
  whatsappGroupLink: string | null
  coverImageUrl: string | null
  logoUrl?: string | null
  createdAt: Date
  updatedAt: Date
  emergencyContacts?: EmergencyContact[]
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
 */
export class BuildingService {
  private db: Database
  private auditLogger: AuditLogger
  private buildingRepository: BuildingRepository
  private r2?: R2Client

  constructor(db: Database, auditLogger: AuditLogger, r2?: R2Client) {
    this.db = db
    this.auditLogger = auditLogger
    this.buildingRepository = new BuildingRepository(db)
    this.r2 = r2
  }

  /**
   * Creates a new building associated with the owner's account.
   *
   * Validates:
   * - Name (1-200 chars) and address (1-500 chars) are required
   * - totalFloors is optional (1-200 if provided)
   * - Building name must be unique within the owner's account
   *
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

    const buildingId = randomUUID()
    let coverImageUrl: string | null = null
    let logoUrl: string | null = null

    if (validated.buildingPhoto && this.r2) {
      const base64Data = validated.buildingPhoto.includes(',')
        ? validated.buildingPhoto.split(',')[1]!
        : validated.buildingPhoto
      const buffer = Buffer.from(base64Data, 'base64')
      const mimeMatch = validated.buildingPhoto.match(
        /^data:(image\/[a-zA-Z+]+);base64,/,
      )
      const mimeType = mimeMatch ? mimeMatch[1]! : 'image/png'
      const ext = mimeType.split('/')[1] || 'png'
      const filename = `photo-${Date.now()}.${ext}`

      coverImageUrl = await this.r2.upload(
        ctx.ownerAccountId,
        'building',
        buildingId,
        filename,
        buffer,
        mimeType,
      )
    }

    if (validated.logoPhoto && this.r2) {
      const base64Data = validated.logoPhoto.includes(',')
        ? validated.logoPhoto.split(',')[1]!
        : validated.logoPhoto
      const buffer = Buffer.from(base64Data, 'base64')
      const mimeMatch = validated.logoPhoto.match(
        /^data:(image\/[a-zA-Z+]+);base64,/,
      )
      const mimeType = mimeMatch ? mimeMatch[1]! : 'image/png'
      const ext = mimeType.split('/')[1] || 'png'
      const filename = `logo-${Date.now()}.${ext}`

      logoUrl = await this.r2.upload(
        ctx.ownerAccountId,
        'building',
        buildingId,
        filename,
        buffer,
        mimeType,
      )
    }

    // Step 3: Insert the building
    return await this.db.transaction(async (tx) => {
      const created = await this.buildingRepository.create(
        {
          id: buildingId,
          ownerAccountId: ctx.ownerAccountId,
          name: validated.name,
          address: validated.address,
          totalFloors: validated.totalFloors ?? null,
          whatsappGroupLink: validated.whatsappGroupLink ?? null,
          managerPhone: validated.managerPhone ?? null,
          coverImageUrl,
          logoUrl,
          rules: validated.rules ?? null,
        },
        tx as unknown as Database,
      )

      if (
        validated.emergencyContacts &&
        validated.emergencyContacts.length > 0
      ) {
        const contactsToInsert = validated.emergencyContacts.map(
          (contact, index) => ({
            buildingId,
            ownerAccountId: ctx.ownerAccountId,
            name: contact.name,
            role: contact.role,
            phone: contact.phone ?? null,
            type: contact.type,
            sortOrder: index,
          }),
        )
        await tx.insert(emergencyContacts).values(contactsToInsert)
      }

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
          whatsappGroupLink: created.whatsappGroupLink,
          coverImageUrl: created.coverImageUrl,
        },
      })

      const fullBuilding = await this.buildingRepository.findById(
        buildingId,
        ctx.ownerAccountId,
        tx as unknown as Database,
      )
      return fullBuilding as unknown as Building
    })
  }

  /**
   * Updates an existing building's properties.
   *
   * Validates:
   * - Building exists and belongs to the owner's account
   * - Same field constraints as creation
   * - If name is being changed, validates uniqueness
   *
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

    // Step 4: Handle building photo upload if provided
    let coverImageUrl: string | null | undefined
    let logoUrl: string | null | undefined

    if (validated.buildingPhoto !== undefined) {
      if (validated.buildingPhoto === null) {
        coverImageUrl = null
        if (existing.coverImageUrl && this.r2) {
          try {
            await this.r2.delete(existing.coverImageUrl)
          } catch (_e) {
            // Ignore delete errors
          }
        }
      } else if (validated.buildingPhoto && this.r2) {
        const base64Data = validated.buildingPhoto.includes(',')
          ? validated.buildingPhoto.split(',')[1]!
          : validated.buildingPhoto
        const buffer = Buffer.from(base64Data, 'base64')
        const mimeMatch = validated.buildingPhoto.match(
          /^data:(image\/[a-zA-Z+]+);base64,/,
        )
        const mimeType = mimeMatch ? mimeMatch[1]! : 'image/png'
        const ext = mimeType.split('/')[1] || 'png'
        const filename = `photo-${Date.now()}.${ext}`

        coverImageUrl = await this.r2.upload(
          ctx.ownerAccountId,
          'building',
          buildingId,
          filename,
          buffer,
          mimeType,
        )

        // Delete old photo
        if (existing.coverImageUrl && this.r2) {
          try {
            await this.r2.delete(existing.coverImageUrl)
          } catch (_e) {
            // Ignore delete errors
          }
        }
      }
    }

    if (validated.logoPhoto !== undefined) {
      if (validated.logoPhoto === null) {
        logoUrl = null
        if (existing.logoUrl && this.r2) {
          try {
            await this.r2.delete(existing.logoUrl)
          } catch (_e) {
            // Ignore delete errors
          }
        }
      } else if (validated.logoPhoto && this.r2) {
        const base64Data = validated.logoPhoto.includes(',')
          ? validated.logoPhoto.split(',')[1]!
          : validated.logoPhoto
        const buffer = Buffer.from(base64Data, 'base64')
        const mimeMatch = validated.logoPhoto.match(
          /^data:(image\/[a-zA-Z+]+);base64,/,
        )
        const mimeType = mimeMatch ? mimeMatch[1]! : 'image/png'
        const ext = mimeType.split('/')[1] || 'png'
        const filename = `logo-${Date.now()}.${ext}`

        logoUrl = await this.r2.upload(
          ctx.ownerAccountId,
          'building',
          buildingId,
          filename,
          buffer,
          mimeType,
        )

        if (existing.logoUrl && this.r2) {
          try {
            await this.r2.delete(existing.logoUrl)
          } catch (_e) {
            // Ignore delete errors
          }
        }
      }
    }

    // Step 5: Build update payload (only include provided fields)
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
    if (validated.whatsappGroupLink !== undefined) {
      updatePayload.whatsappGroupLink = validated.whatsappGroupLink
    }
    if (validated.managerPhone !== undefined) {
      updatePayload.managerPhone = validated.managerPhone
    }
    if (validated.rules !== undefined) {
      updatePayload.rules = validated.rules
    }
    if (coverImageUrl !== undefined) {
      updatePayload.coverImageUrl = coverImageUrl
    }
    if (logoUrl !== undefined) {
      updatePayload.logoUrl = logoUrl
    }

    // Step 6: Perform update inside transaction
    return await this.db.transaction(async (tx) => {
      const updated = await this.buildingRepository.update(
        buildingId,
        ctx.ownerAccountId,
        updatePayload,
        tx as unknown as Database,
      )

      if (!updated) {
        throw new NotFoundError('Building')
      }

      if (validated.emergencyContacts !== undefined) {
        // Delete existing emergency contacts
        await tx
          .delete(emergencyContacts)
          .where(eq(emergencyContacts.buildingId, buildingId))

        if (validated.emergencyContacts.length > 0) {
          const contactsToInsert = validated.emergencyContacts.map(
            (contact, index) => ({
              buildingId,
              ownerAccountId: ctx.ownerAccountId,
              name: contact.name,
              role: contact.role,
              phone: contact.phone ?? null,
              type: contact.type,
              sortOrder: index,
            }),
          )
          await tx.insert(emergencyContacts).values(contactsToInsert)
        }
      }

      // Record audit event
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
      if (
        validated.whatsappGroupLink !== undefined &&
        validated.whatsappGroupLink !== existing.whatsappGroupLink
      ) {
        oldValues.whatsappGroupLink = existing.whatsappGroupLink
        newValues.whatsappGroupLink = validated.whatsappGroupLink
      }
      if (
        coverImageUrl !== undefined &&
        coverImageUrl !== existing.coverImageUrl
      ) {
        oldValues.coverImageUrl = existing.coverImageUrl
        newValues.coverImageUrl = coverImageUrl
      }

      if (
        Object.keys(newValues).length > 0 ||
        validated.emergencyContacts !== undefined
      ) {
        this.auditLogger.log({
          actorId: ctx.userId,
          action: 'building_updated',
          entityType: 'building',
          entityId: buildingId,
          ownerAccountId: ctx.ownerAccountId,
          oldValues,
          newValues: {
            ...newValues,
            ...(validated.emergencyContacts !== undefined && {
              emergencyContactsUpdated: true,
            }),
          },
        })
      }

      const fullBuilding = await this.buildingRepository.findById(
        buildingId,
        ctx.ownerAccountId,
        tx as unknown as Database,
      )
      return fullBuilding as unknown as Building
    })
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

    const buildingIds =
      ctx.role === 'manager' ? ctx.assignedBuildingIds : undefined

    if (ctx.role === 'manager' && buildingIds && buildingIds.length === 0) {
      return { data: [], total: 0, page, pageSize, totalPages: 0 }
    }

    const [data, total] = await Promise.all([
      this.buildingRepository.list(ctx.ownerAccountId, page, pageSize, buildingIds),
      this.buildingRepository.count(ctx.ownerAccountId, buildingIds),
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

    return building as unknown as Building
  }
}
