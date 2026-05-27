import type { RequestContext } from '@repo/shared/types'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authGuard } from '../middleware/auth-guard'
import { roleGuard } from '../middleware/role-guard'
import { tenantScope } from '../middleware/tenant-scope'
import {
  type RegisterRenterData,
  type RenterFileUpload,
  RenterRegistrationService,
} from '../services/renter-registration'

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
      preHandler: [authGuard, roleGuard(['owner', 'manager']), tenantScope],
      schema: {
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(50).default(20),
        }),
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
      preHandler: [authGuard, roleGuard(['owner', 'manager']), tenantScope],
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

      return reply.status(201).send(result)
    },
  )

  /**
   * GET /api/renters/:id
   * Gets a renter by ID. Owner and Manager can access.
   */
  fastify.get(
    '/:id',
    {
      preHandler: [authGuard, roleGuard(['owner', 'manager']), tenantScope],
      schema: {
        params: z.object({
          id: z.string().uuid('Invalid renter ID format'),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const ctx = buildRequestContext(request as never)

      const renter = await renterService.getRenter(ctx, id)

      return reply.status(200).send(renter)
    },
  )
}

export default renterRoutes
