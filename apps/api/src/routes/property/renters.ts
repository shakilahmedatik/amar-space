import type { RequestContext } from '@repo/shared/types'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { approvalGuard } from '../../middleware/approval-guard'
import { authGuard } from '../../middleware/auth-guard'
import { roleGuard } from '../../middleware/role-guard'
import { tenantScope } from '../../middleware/tenant-scope'
import {
  type RegisterRenterData,
  type RenterFileUpload,
  RenterRegistrationService,
} from '../../services/renter-registration'
import {
  dateTimeResponseSchema,
  errorResponseSchema,
} from '../../utils/schemas'

/**
 * Renter routes plugin.
 *
 * Provides:
 * - GET /api/renters — List renters with pagination
 * - POST /api/renters — Register a new renter (multipart form data)
 * - GET /api/renters/:id — Get a renter by ID
 *
 * Access control:
 * - Owner: full access (create, read)
 * - Manager: full access (create, read)
 *
 * Requirements: 4.1, 4.9
 */
async function renterRoutes(fastify: FastifyInstance) {
  const renterService = new RenterRegistrationService(
    fastify.db,
    fastify.auditLogger,
    fastify.r2,
  )

  /**
   * Helper to build RequestContext from the Fastify request.
   */
  function buildRequestContext(request: {
    user: {
      id: string
      role: 'owner' | 'manager' | 'renter'
      ownerAccountId: string
    }
    tenantScope: {
      ownerAccountId: string
      assignedBuildingIds?: string[]
      assignedFlatId?: string
    }
    ip: string
    headers: Record<string, string | string[] | undefined>
  }): RequestContext {
    return {
      userId: request.user.id,
      role: request.user.role,
      ownerAccountId: request.tenantScope.ownerAccountId,
      assignedBuildingIds: request.tenantScope.assignedBuildingIds,
      assignedFlatId: request.tenantScope.assignedFlatId,
      ipAddress: request.ip,
      userAgent: (request.headers['user-agent'] as string) || '',
    }
  }

  /**
   * GET /api/renters
   * Lists renters with pagination. Owner and Manager can access.
   */
  fastify.get(
    '/',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Renters'],
        summary: 'List renters',
        description:
          'Returns a paginated list of renters within the tenant scope.\n\n**Roles: owner, manager**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(20),
        }),
        response: {
          200: z.object({
            data: z.array(
              z.object({
                id: z.string(),
                fullName: z.string(),
                phone: z.string(),
                nidNumber: z.string(),
                occupation: z.string(),
                bloodGroup: z.string(),
                flatId: z.string().nullable(),
                flatNumber: z.string().nullable(),
                buildingName: z.string().nullable(),
                contractId: z.string().nullable(),
                monthlyRent: z.number().nullable(),
                startDate: z.string().nullable(),
                depositBalance: z.number().nullable(),
                ownerAccountId: z.string(),
                createdAt: dateTimeResponseSchema,
              }),
            ),
            total: z.number(),
            page: z.number(),
            pageSize: z.number(),
          }),
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { page, pageSize } = request.query as {
        page: number
        pageSize: number
      }
      const ctx = buildRequestContext(request as never)

      const result = await renterService.listRenters(ctx, { page, pageSize })

      return reply.status(200).send(result)
    },
  )

  /**
   * POST /api/renters
   * Registers a new renter. Accepts multipart form data for file uploads.
   * Owner and Manager can access.
   */
  fastify.post(
    '/',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Renters'],
        summary: 'Register a new renter',
        description:
          'Registers a renter with profile data and optional file uploads (NID photo, digital signature). Accepts multipart/form-data.\n\n**Roles: owner, manager**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        consumes: ['multipart/form-data'],
        body: z.object({
          fullName: z.string().describe('Full name of the renter'),
          phone: z.string().describe('Phone number'),
          nidNumber: z.string().describe('National ID number'),
          occupation: z.string().describe('Occupation'),
          bloodGroup: z.enum([
            'A+',
            'A-',
            'B+',
            'B-',
            'AB+',
            'AB-',
            'O+',
            'O-',
          ]),
          totalFamilyMembers: z
            .string()
            .describe('Total family members (numeric string)'),
          emergencyContactName: z.string(),
          emergencyContactNumber: z.string(),
          emergencyContactRelationship: z.string(),
          flatId: z.string().describe('UUID of the flat to assign'),
          monthlyRent: z
            .string()
            .describe('Monthly rent amount (numeric string)'),
          startDate: z.string().describe('Contract start date (YYYY-MM-DD)'),
          advanceAmount: z
            .string()
            .describe('Advance/deposit amount (numeric string)'),
          dateOfBirth: z
            .string()
            .describe('Date of birth (YYYY-MM-DD)')
            .nullable()
            .optional(),
          familyMemberNames: z
            .string()
            .describe('JSON array of family member names')
            .nullable()
            .optional(),
          nidPhoto: z
            .string()
            .describe('NID photo file (JPEG/PNG, max 5MB)')
            .optional(),
          digitalSignature: z
            .string()
            .describe('Digital signature file (JPEG/PNG, max 5MB)')
            .optional(),
        }),
        response: {
          201: z.object({
            id: z.string(),
            fullName: z.string(),
            phone: z.string(),
            nidNumber: z.string(),
            flatId: z.string().nullable(),
            ownerAccountId: z.string(),
            createdAt: dateTimeResponseSchema,
          }),
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const ctx = buildRequestContext(request as never)

      // Parse multipart form data
      const parts = request.parts()
      const fields: Record<string, string> = {}
      let nidPhoto: RenterFileUpload | undefined
      let digitalSignature: RenterFileUpload | undefined

      for await (const part of parts) {
        if (part.type === 'file') {
          const buffer = await part.toBuffer()
          const fileUpload: RenterFileUpload = {
            filename: part.filename,
            buffer,
            mimeType: part.mimetype,
            fileSize: buffer.length,
          }

          if (part.fieldname === 'nidPhoto') {
            nidPhoto = fileUpload
          } else if (part.fieldname === 'digitalSignature') {
            digitalSignature = fileUpload
          }
        } else {
          fields[part.fieldname] = part.value as string
        }
      }

      // Parse numeric and array fields from form data
      const data: RegisterRenterData = {
        fullName: fields.fullName ?? '',
        phone: fields.phone ?? '',
        nidNumber: fields.nidNumber ?? '',
        occupation: fields.occupation ?? '',
        bloodGroup: (fields.bloodGroup ?? '') as
          | 'A+'
          | 'A-'
          | 'B+'
          | 'B-'
          | 'AB+'
          | 'AB-'
          | 'O+'
          | 'O-',
        totalFamilyMembers: Number(fields.totalFamilyMembers || 0),
        emergencyContactName: fields.emergencyContactName ?? '',
        emergencyContactNumber: fields.emergencyContactNumber ?? '',
        emergencyContactRelationship: fields.emergencyContactRelationship ?? '',
        flatId: fields.flatId ?? '',
        monthlyRent: Number(fields.monthlyRent || 0),
        startDate: fields.startDate ?? '',
        advanceAmount: Number(fields.advanceAmount || 0),
        // Optional fields
        ...(fields.dateOfBirth && { dateOfBirth: fields.dateOfBirth }),
        ...(fields.familyMemberNames && {
          familyMemberNames: JSON.parse(fields.familyMemberNames),
        }),
        // File uploads
        nidPhoto,
        digitalSignature,
      }

      const result = await renterService.registerRenter(ctx, data)

      return reply.status(201).send({
        id: result.renter.id,
        fullName: result.renter.fullName,
        phone: result.renter.phone,
        nidNumber: result.renter.nidNumber,
        flatId: result.contract.flatId,
        ownerAccountId: result.renter.ownerAccountId,
        createdAt: result.renter.createdAt,
      })
    },
  )

  /**
   * GET /api/renters/:id
   * Gets a renter by ID. Owner and Manager can access.
   */
  fastify.get(
    '/:id',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Renters'],
        summary: 'Get a renter',
        description:
          'Returns a renter by ID with their profile and contract information.\n\n**Roles: owner, manager**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid renter ID format'),
        }),
        response: {
          200: z.object({
            id: z.string(),
            fullName: z.string(),
            phone: z.string(),
            nidNumber: z.string(),
            occupation: z.string(),
            bloodGroup: z.string(),
            totalFamilyMembers: z.number(),
            familyMemberNames: z.array(z.string()).nullable(),
            emergencyContactName: z.string(),
            emergencyContactNumber: z.string(),
            emergencyContactRelationship: z.string(),
            dateOfBirth: z.string().nullable(),
            flatId: z.string().nullable(),
            flatNumber: z.string().nullable(),
            buildingName: z.string().nullable(),
            contractId: z.string().nullable(),
            monthlyRent: z.number().nullable(),
            startDate: z.string().nullable(),
            depositBalance: z.number().nullable(),
            nidPhotoUrl: z.string().nullable(),
            digitalSignatureUrl: z.string().nullable(),
            selfiePhotoUrl: z.string().nullable(),
            ownerAccountId: z.string(),
            createdAt: dateTimeResponseSchema,
          }),
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const ctx = buildRequestContext(request as never)

      const renter = await renterService.getRenter(ctx, id)

      const r2BaseUrl = fastify.env.R2_PUBLIC_BASE_URL.replace(/\/$/, '')
      const formatR2Url = (key: string | null | undefined) => {
        if (!key) return null
        if (key.startsWith('http://') || key.startsWith('https://')) return key
        return `${r2BaseUrl}/${key}`
      }

      return reply.status(200).send({
        ...renter,
        nidPhotoUrl: formatR2Url(renter.nidPhotoUrl),
        digitalSignatureUrl: formatR2Url(renter.digitalSignatureUrl),
        selfiePhotoUrl: formatR2Url(renter.selfiePhotoUrl),
      })
    },
  )
}

export default renterRoutes
