import { randomUUID } from 'node:crypto'
import {
  type Database,
  fileReferences,
  flats,
  rentalContracts,
  renters,
  users,
  renterAccessCodes,
} from '@repo/db'
import { FLAT_STATUS } from '@repo/shared/constants'
import { NotFoundError, ValidationError } from '@repo/shared/errors'
import type { FieldError, RequestContext } from '@repo/shared/types'
import {
  type RegisterRenterInput,
  registerRenterSchema,
} from '@repo/shared/validation'
import { and, desc, eq } from 'drizzle-orm'
import type { AuditLogger } from '../plugins/audit-logger'
import type { R2Client } from '../plugins/r2'
import { hashAccessCode } from '../utils/access-code-hash'

// --- Types ---

export interface RenterFileUpload {
  filename: string
  buffer: Buffer
  mimeType: string
  fileSize: number
}

export interface RegisterRenterData extends RegisterRenterInput {
  nidPhoto?: RenterFileUpload
  digitalSignature?: RenterFileUpload
}

export interface RenterResult {
  id: string
  userId: string
  ownerAccountId: string
  fullName: string
  phone: string
  nidNumber: string
  nidPhotoUrl: string | null
  dateOfBirth: string | null
  occupation: string
  bloodGroup: string
  totalFamilyMembers: number
  familyMemberNames: unknown
  emergencyContactName: string
  emergencyContactNumber: string
  emergencyContactRelationship: string
  digitalSignatureUrl: string | null
  selfiePhotoUrl: string | null
  createdAt: Date
  updatedAt: Date
  flatId?: string | null
  flatNumber?: string | null
  buildingName?: string | null
  contractId?: string | null
  monthlyRent?: number | null
  startDate?: string | null
  depositBalance?: number | null
  accessCode?: string | null
}

export interface RentalContractResult {
  id: string
  ownerAccountId: string
  renterId: string
  flatId: string
  monthlyRent: string
  startDate: string
  securityDepositAmount: string
  remainingDepositBalance: string
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface RegisterRenterResult {
  renter: RenterResult
  contract: RentalContractResult
  user: {
    id: string
    email: string
    role: string
  }
}

// --- Constants ---

const ALLOWED_NID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// --- Service ---

/**
 * RenterRegistrationService handles the full renter onboarding flow:
 * 1. Validates all required fields (NID, phone, blood group, family members)
 * 2. Verifies the target flat exists and is Vacant
 * 3. Creates a user account with Renter role
 * 4. Creates a renter record with personal data
 * 5. Creates a rental_contract linking renter to flat
 * 6. Updates flat status to Occupied
 * 7. Handles file uploads for NID photo and digital signature
 * 8. Records audit event
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 4.13
 */
export class RenterRegistrationService {
  constructor(
    private db: Database,
    private auditLogger: AuditLogger,
    private r2: R2Client,
  ) {}

  /**
   * Registers a new renter with full onboarding flow.
   *
   * Validates:
   * - All required fields per Zod schema (NID 10-17 digits, phone 11 digits starting 01,
   *   blood group enum, family members 1-50)
   * - Flat exists and belongs to the owner's account
   * - Flat status is Vacant (Requirement 4.13)
   * - NID photo is valid format/size if provided (Requirement 4.11)
   * - Digital signature is valid if provided (Requirement 4.12)
   *
   * Creates:
   * - User account with Renter role (Requirement 4.8)
   * - Renter record with personal data (Requirement 4.1, 4.2)
   * - Rental contract with rent, start date, deposit (Requirement 4.7)
   * - Updates flat status to Occupied (Requirement 6.4)
   * - Records audit event (Requirement 4.10)
   */
  async registerRenter(
    ctx: RequestContext,
    data: RegisterRenterData,
  ): Promise<RegisterRenterResult> {
    // Step 1: Validate input using Zod schema (Requirements 4.3, 4.4, 4.5, 4.6)
    const parseResult = registerRenterSchema.safeParse(data)
    if (!parseResult.success) {
      const errors: FieldError[] = parseResult.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'unknown',
        message: issue.message,
        rule: issue.code,
      }))
      throw new ValidationError(errors)
    }

    const validated = parseResult.data

    // Step 2: Validate file uploads if provided (Requirements 4.11, 4.12)
    if (data.nidPhoto) {
      this.validateFileUpload(data.nidPhoto, 'nidPhoto')
    }
    if (data.digitalSignature) {
      this.validateFileUpload(data.digitalSignature, 'digitalSignature')
    }

    // Step 3: Verify flat exists and belongs to the owner (Requirement 4.13)
    const flat = await this.db.query.flats.findFirst({
      where: and(
        eq(flats.id, validated.flatId),
        eq(flats.ownerAccountId, ctx.ownerAccountId),
      ),
    })

    if (!flat) {
      throw new NotFoundError('Flat')
    }

    // Step 4: Reject if flat is not Vacant (Requirement 4.13)
    if (flat.status !== FLAT_STATUS.VACANT) {
      throw new ValidationError([
        {
          field: 'flatId',
          message:
            'The specified flat is not available for assignment. Only vacant flats can be assigned to renters.',
          rule: 'flat_not_vacant',
        },
      ])
    }

    // Step 5: Create user account with Renter role (Requirement 4.8)
    // Generate a unique email for the renter based on phone number
    const renterEmail = `renter_${validated.phone}@amarspace.local`

    const [renterUser] = await this.db
      .insert(users)
      .values({
        id: randomUUID(),
        email: renterEmail,
        name: validated.fullName,
        role: 'renter',
        ownerAccountId: ctx.ownerAccountId,
        phone: validated.phone,
        approvalStatus: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    if (!renterUser) {
      throw new Error('Failed to create renter user account')
    }

    // Step 6: Handle file uploads (Requirements 4.11, 4.12)
    let nidPhotoUrl: string | null = null
    let digitalSignatureUrl: string | null = null

    if (data.nidPhoto) {
      nidPhotoUrl = await this.uploadFile(
        ctx.ownerAccountId,
        'renter_nid',
        renterUser.id,
        data.nidPhoto,
      )
    }

    if (data.digitalSignature) {
      digitalSignatureUrl = await this.uploadFile(
        ctx.ownerAccountId,
        'signature',
        renterUser.id,
        data.digitalSignature,
      )
    }

    // Step 7: Create renter record (Requirements 4.1, 4.2)
    const [renter] = await this.db
      .insert(renters)
      .values({
        ownerAccountId: ctx.ownerAccountId,
        userId: renterUser.id,
        fullName: validated.fullName,
        phone: validated.phone,
        nidNumber: validated.nidNumber,
        nidPhotoUrl,
        dateOfBirth: validated.dateOfBirth ?? null,
        occupation: validated.occupation,
        bloodGroup: validated.bloodGroup,
        totalFamilyMembers: validated.totalFamilyMembers,
        familyMemberNames: validated.familyMemberNames ?? null,
        emergencyContactName: validated.emergencyContactName,
        emergencyContactNumber: validated.emergencyContactNumber,
        emergencyContactRelationship: validated.emergencyContactRelationship,
        digitalSignatureUrl,
      })
      .returning()

    if (!renter) {
      throw new Error('Failed to create renter record')
    }

    // Step 8: Create rental contract (Requirement 4.7)
    const [contract] = await this.db
      .insert(rentalContracts)
      .values({
        ownerAccountId: ctx.ownerAccountId,
        renterId: renter.id,
        flatId: validated.flatId,
        monthlyRent: validated.monthlyRent.toFixed(2),
        startDate: validated.startDate,
        securityDepositAmount: validated.advanceAmount.toFixed(2),
        remainingDepositBalance: validated.advanceAmount.toFixed(2),
        status: 'active',
      })
      .returning()

    if (!contract) {
      throw new Error('Failed to create rental contract')
    }

    // Step 9: Update flat status to Occupied (Requirement 6.4)
    await this.db
      .update(flats)
      .set({
        status: FLAT_STATUS.OCCUPIED,
        updatedAt: new Date(),
      })
      .where(eq(flats.id, validated.flatId))

    // Step 10: Record audit event (Requirement 4.10)
    this.auditLogger.log({
      actorId: ctx.userId,
      action: 'renter_registered',
      entityType: 'renter',
      entityId: renter.id,
      ownerAccountId: ctx.ownerAccountId,
      newValues: {
        renterId: renter.id,
        userId: renterUser.id,
        flatId: validated.flatId,
        contractId: contract.id,
        fullName: validated.fullName,
        phone: validated.phone,
        monthlyRent: validated.monthlyRent,
        startDate: validated.startDate,
        advanceAmount: validated.advanceAmount,
      },
    })

    return {
      renter: {
        id: renter.id,
        userId: renter.userId,
        ownerAccountId: renter.ownerAccountId,
        fullName: renter.fullName,
        phone: renter.phone,
        nidNumber: renter.nidNumber,
        nidPhotoUrl: renter.nidPhotoUrl,
        dateOfBirth: renter.dateOfBirth,
        occupation: renter.occupation,
        bloodGroup: renter.bloodGroup,
        totalFamilyMembers: renter.totalFamilyMembers,
        familyMemberNames: renter.familyMemberNames,
        emergencyContactName: renter.emergencyContactName,
        emergencyContactNumber: renter.emergencyContactNumber,
        emergencyContactRelationship: renter.emergencyContactRelationship,
        digitalSignatureUrl: renter.digitalSignatureUrl,
        selfiePhotoUrl: renter.selfiePhotoUrl,
        createdAt: renter.createdAt,
        updatedAt: renter.updatedAt,
      },
      contract: {
        id: contract.id,
        ownerAccountId: contract.ownerAccountId,
        renterId: contract.renterId,
        flatId: contract.flatId,
        monthlyRent: contract.monthlyRent,
        startDate: contract.startDate,
        securityDepositAmount: contract.securityDepositAmount,
        remainingDepositBalance: contract.remainingDepositBalance,
        status: contract.status,
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt,
      },
      user: {
        id: renterUser.id,
        email: renterUser.email,
        role: renterUser.role,
      },
    }
  }

  /**
   * Gets a renter by ID, scoped to the owner's account.
   */
  async getRenter(
    ctx: RequestContext,
    renterId: string,
  ): Promise<RenterResult> {
    const renter = await this.db.query.renters.findFirst({
      where: and(
        eq(renters.id, renterId),
        eq(renters.ownerAccountId, ctx.ownerAccountId),
      ),
      with: {
        rentalContracts: {
          where: (contracts, { eq }) => eq(contracts.status, 'active'),
          with: {
            flat: {
              with: {
                building: true,
              },
            },
          },
        },
      },
    })

    if (!renter) {
      throw new NotFoundError('Renter')
    }

    const activeContract = renter.rentalContracts?.[0]
    const flat = activeContract?.flat
    const building = flat?.building

    const accessCodeRecord = await this.db.query.renterAccessCodes.findFirst({
      where: eq(renterAccessCodes.renterId, renterId),
    })

    return {
      id: renter.id,
      userId: renter.userId,
      ownerAccountId: renter.ownerAccountId,
      fullName: renter.fullName,
      phone: renter.phone,
      nidNumber: renter.nidNumber,
      nidPhotoUrl: renter.nidPhotoUrl,
      dateOfBirth: renter.dateOfBirth,
      occupation: renter.occupation,
      bloodGroup: renter.bloodGroup,
      totalFamilyMembers: renter.totalFamilyMembers,
      familyMemberNames: renter.familyMemberNames,
      emergencyContactName: renter.emergencyContactName,
      emergencyContactNumber: renter.emergencyContactNumber,
      emergencyContactRelationship: renter.emergencyContactRelationship,
      digitalSignatureUrl: renter.digitalSignatureUrl,
      selfiePhotoUrl: renter.selfiePhotoUrl,
      createdAt: renter.createdAt,
      updatedAt: renter.updatedAt,
      flatId: activeContract?.flatId ?? null,
      flatNumber: flat?.flatNumber ?? null,
      buildingName: building?.name ?? null,
      contractId: activeContract?.id ?? null,
      monthlyRent: activeContract
        ? Number.parseFloat(activeContract.monthlyRent)
        : null,
      startDate: activeContract?.startDate ?? null,
      depositBalance: activeContract
        ? Number.parseFloat(activeContract.remainingDepositBalance)
        : null,
      accessCode: accessCodeRecord?.code ?? null,
    }
  }

  /**
   * Resets the renter's access code and returns the new plaintext code.
   */
  async resetAccessCode(
    ctx: RequestContext,
    renterId: string,
  ): Promise<{ code: string }> {
    const renter = await this.db.query.renters.findFirst({
      where: and(
        eq(renters.id, renterId),
        eq(renters.ownerAccountId, ctx.ownerAccountId),
      ),
      with: {
        rentalContracts: {
          where: (contracts, { eq }) => eq(contracts.status, 'active'),
        },
      },
    })

    if (!renter) {
      throw new NotFoundError('Renter')
    }

    const activeContract = renter.rentalContracts?.[0]
    if (!activeContract) {
      throw new ValidationError([
        {
          field: 'contractId',
          message:
            'সক্রিয় চুক্তি ব্যতীত কোনো ভাড়াটিয়ার অ্যাক্সেস কোড পরিবর্তন করা সম্ভব নয়।',
          rule: 'no_active_contract',
        },
      ])
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString()
    const newHash = hashAccessCode(newCode)

    const existingAccessCode = await this.db.query.renterAccessCodes.findFirst({
      where: eq(renterAccessCodes.renterId, renterId),
    })

    if (existingAccessCode) {
      await this.db
        .update(renterAccessCodes)
        .set({
          code: newCode,
          codeHash: newHash,
          failedAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(renterAccessCodes.id, existingAccessCode.id))
    } else {
      await this.db.insert(renterAccessCodes).values({
        flatId: activeContract.flatId,
        renterId: renterId,
        code: newCode,
        codeHash: newHash,
        failedAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    this.auditLogger.log({
      actorId: ctx.userId,
      action: 'renter_access_code_reset',
      entityType: 'renter',
      entityId: renterId,
      ownerAccountId: ctx.ownerAccountId,
      newValues: {
        flatId: activeContract.flatId,
        renterId,
      },
    })

    return { code: newCode }
  }

  /**
   * Lists renters with optional filtering, scoped to the owner's account.
   * Paginated with max 50 per page.
   */
  async listRenters(
    ctx: RequestContext,
    pagination: { page: number; pageSize: number },
  ): Promise<{
    data: RenterResult[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }> {
    const pageSize = Math.min(Math.max(pagination.pageSize, 1), 50)
    const page = Math.max(pagination.page, 1)
    const offset = (page - 1) * pageSize

    const whereClause = eq(renters.ownerAccountId, ctx.ownerAccountId)

    const { count } = await import('drizzle-orm')

    const [data, totalResult] = await Promise.all([
      this.db.query.renters.findMany({
        where: whereClause,
        limit: pageSize,
        offset: offset,
        with: {
          rentalContracts: {
            where: (contracts, { eq }) => eq(contracts.status, 'active'),
            with: {
              flat: {
                with: {
                  building: true,
                },
              },
            },
          },
        },
        orderBy: desc(renters.createdAt),
      }),
      this.db.select({ count: count() }).from(renters).where(whereClause),
    ])

    const total = totalResult[0]?.count ?? 0

    return {
      data: data.map((row) => {
        const activeContract = row.rentalContracts?.[0]
        const flat = activeContract?.flat
        const building = flat?.building
        return {
          id: row.id,
          userId: row.userId,
          ownerAccountId: row.ownerAccountId,
          fullName: row.fullName,
          phone: row.phone,
          nidNumber: row.nidNumber,
          nidPhotoUrl: row.nidPhotoUrl,
          dateOfBirth: row.dateOfBirth,
          occupation: row.occupation,
          bloodGroup: row.bloodGroup,
          totalFamilyMembers: row.totalFamilyMembers,
          familyMemberNames: row.familyMemberNames,
          emergencyContactName: row.emergencyContactName,
          emergencyContactNumber: row.emergencyContactNumber,
          emergencyContactRelationship: row.emergencyContactRelationship,
          digitalSignatureUrl: row.digitalSignatureUrl,
          selfiePhotoUrl: row.selfiePhotoUrl,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          flatId: activeContract?.flatId ?? null,
          flatNumber: flat?.flatNumber ?? null,
          buildingName: building?.name ?? null,
          contractId: activeContract?.id ?? null,
          monthlyRent: activeContract
            ? Number.parseFloat(activeContract.monthlyRent)
            : null,
          startDate: activeContract?.startDate ?? null,
          depositBalance: activeContract
            ? Number.parseFloat(activeContract.remainingDepositBalance)
            : null,
        }
      }),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  // --- Private Helpers ---

  /**
   * Validates a file upload for NID photo or digital signature.
   * Requirements 4.11: JPEG/PNG/WebP, max 5MB
   */
  private validateFileUpload(file: RenterFileUpload, fieldName: string): void {
    const errors: FieldError[] = []

    if (!ALLOWED_NID_MIME_TYPES.includes(file.mimeType)) {
      errors.push({
        field: fieldName,
        message: 'File must be in JPEG, PNG, or WebP format',
        rule: 'mime_type',
      })
    }

    if (file.fileSize > MAX_FILE_SIZE) {
      errors.push({
        field: fieldName,
        message: 'File size must not exceed 5MB',
        rule: 'max_size',
      })
    }

    if (errors.length > 0) {
      throw new ValidationError(errors)
    }
  }

  /**
   * Uploads a file to R2 and records the file reference in the database.
   * Returns the storage key (URL reference).
   */
  private async uploadFile(
    ownerAccountId: string,
    entityType: string,
    entityId: string,
    file: RenterFileUpload,
  ): Promise<string> {
    // Upload to R2
    const storageKey = await this.r2.upload(
      ownerAccountId,
      entityType,
      entityId,
      file.filename,
      file.buffer,
      file.mimeType,
    )

    // Record file reference in database
    await this.db.insert(fileReferences).values({
      ownerAccountId,
      entityType,
      entityId,
      storageKey,
      fileName: file.filename,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
    })

    return storageKey
  }
}
