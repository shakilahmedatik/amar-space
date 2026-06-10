import { randomUUID } from 'node:crypto'
import {
  flats,
  registrationRequests,
  rentalContracts,
  renterAccessCodes,
  renters,
  users,
} from '@repo/db'
import { FLAT_STATUS } from '@repo/shared/constants'
import { and, desc, eq, inArray } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { approvalGuard } from '../../middleware/approval-guard'
import { authGuard } from '../../middleware/auth-guard'
import { roleGuard } from '../../middleware/role-guard'
import { tenantScope } from '../../middleware/tenant-scope'
import {
  dateTimeResponseSchema,
  errorResponseSchema,
} from '../../utils/schemas'

async function registrationRequestRoutes(fastify: FastifyInstance) {
  // GET /api/registration-requests
  // List pending registration requests for the current manager/owner
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
        tags: ['Registration Requests'],
        summary: 'List pending registration requests',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        response: {
          200: z.object({
            data: z.array(
              z.object({
                id: z.string(),
                fullName: z.string(),
                phone: z.string(),
                nidNumber: z.string(),
                nidPhotoUrl: z.string().nullable(),
                bloodGroup: z.string(),
                occupation: z.string(),
                familyMembers: z.number(),
                familyMemberNames: z.array(z.string()).nullable(),
                emergencyContactName: z.string().nullable(),
                emergencyContact: z.string(),
                emergencyContactRelationship: z.string().nullable(),
                selfiePhotoUrl: z.string().nullable(),
                rentalStartDate: z.string(),
                advanceAmount: z.string(),
                digitalSignatureUrl: z.string(),
                flatId: z.string(),
                flatNumber: z.string().optional(),
                buildingName: z.string().optional(),
                createdAt: dateTimeResponseSchema,
              }),
            ),
          }),
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { ownerAccountId, assignedBuildingIds } = request.tenantScope
      const { role } = request.user

      const conditions = [
        eq(registrationRequests.ownerAccountId, ownerAccountId),
        eq(registrationRequests.status, 'PENDING_APPROVAL'),
      ]

      // Filter by building assignment for managers
      if (
        role === 'manager' &&
        assignedBuildingIds &&
        assignedBuildingIds.length > 0
      ) {
        const scopedFlats = await fastify.db
          .select({ id: flats.id })
          .from(flats)
          .where(inArray(flats.buildingId, assignedBuildingIds))
        const flatIds = scopedFlats.map((f) => f.id)
        if (flatIds.length === 0) {
          return reply.status(200).send({ data: [] })
        }
        conditions.push(inArray(registrationRequests.flatId, flatIds))
      } else if (role === 'manager') {
        // Manager with no assigned buildings sees nothing
        return reply.status(200).send({ data: [] })
      }

      // Query requests
      const requests = await fastify.db.query.registrationRequests.findMany({
        where: and(...conditions),
        with: {
          flat: {
            with: {
              building: true,
            },
          },
        },
        orderBy: desc(registrationRequests.createdAt),
      })

      const r2BaseUrl = fastify.env.R2_PUBLIC_BASE_URL.replace(/\/$/, '')
      const formatR2Url = (key: string | null | undefined) => {
        if (!key) return null
        if (key.startsWith('http://') || key.startsWith('https://')) return key
        return `${r2BaseUrl}/${key}`
      }

      return reply.status(200).send({
        data: requests.map((req) => ({
          id: req.id,
          fullName: req.fullName,
          phone: req.phone,
          nidNumber: req.nidNumber,
          nidPhotoUrl: formatR2Url(req.nidPhotoUrl),
          bloodGroup: req.bloodGroup,
          occupation: req.occupation,
          familyMembers: req.familyMembers,
          familyMemberNames: req.familyMemberNames as string[] | null,
          emergencyContactName: req.emergencyContactName,
          emergencyContact: req.emergencyContact,
          emergencyContactRelationship: req.emergencyContactRelationship,
          selfiePhotoUrl: formatR2Url(req.selfiePhotoUrl),
          rentalStartDate: req.rentalStartDate,
          advanceAmount: req.advanceAmount,
          digitalSignatureUrl: formatR2Url(req.digitalSignatureUrl),
          flatId: req.flatId,
          flatNumber: req.flat?.flatNumber,
          buildingName: req.flat?.building?.name,
          createdAt: req.createdAt,
        })),
      })
    },
  )

  // POST /api/registration-requests/:id/approve
  fastify.post(
    '/:id/approve',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Registration Requests'],
        summary: 'Approve a registration request',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z.object({
          monthlyRent: z.number().positive(),
          advanceAmount: z.number().nonnegative(),
          startDate: z.string(),
          gasBill: z.number().nonnegative().optional().default(0),
          waterBill: z.number().nonnegative().optional().default(0),
          serviceCharge: z.number().nonnegative().optional().default(0),
          otherCharges: z.number().nonnegative().optional().default(0),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { ownerAccountId, assignedBuildingIds } = request.tenantScope
      const { role } = request.user
      const body = request.body as {
        monthlyRent: number
        advanceAmount: number
        startDate: string
        gasBill: number
        waterBill: number
        serviceCharge: number
        otherCharges: number
      }

      // 1. Fetch request details
      const req = await fastify.db.query.registrationRequests.findFirst({
        where: and(
          eq(registrationRequests.id, id),
          eq(registrationRequests.ownerAccountId, ownerAccountId),
          eq(registrationRequests.status, 'PENDING_APPROVAL'),
        ),
        with: {
          flat: true,
        },
      })

      if (!req) {
        return reply.status(404).send({
          requestId: request.id,
          statusCode: 404,
          error: 'Not Found',
          message: 'আবেদনটি খুঁজে পাওয়া যায়নি অথবা ইতিমধ্যে এটি প্রসেস করা হয়েছে।',
        })
      }

      // If manager, check if flat belongs to assigned building
      if (role === 'manager' && assignedBuildingIds) {
        if (!req.flat || !assignedBuildingIds.includes(req.flat.buildingId)) {
          return reply.status(403).send({
            requestId: request.id,
            statusCode: 403,
            error: 'Forbidden',
            message: 'এই ফ্ল্যাটের আবেদন অনুমোদন করার অনুমতি আপনার নেই।',
          })
        }
      }

      // 2. Perform DB operations inside a transaction
      await fastify.db.transaction(async (tx) => {
        // Create user in users table
        const renterEmail = `renter_${req.phone}@amarspace.local`
        const renterUserId = randomUUID()

        await tx.insert(users).values({
          id: renterUserId,
          email: renterEmail,
          name: req.fullName,
          role: 'renter',
          ownerAccountId: ownerAccountId,
          phone: req.phone,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        // Create renter in renters table
        const [renter] = await tx
          .insert(renters)
          .values({
            ownerAccountId: ownerAccountId,
            userId: renterUserId,
            fullName: req.fullName,
            phone: req.phone,
            nidNumber: req.nidNumber,
            nidPhotoUrl: req.nidPhotoUrl,
            occupation: req.occupation,
            bloodGroup: req.bloodGroup,
            totalFamilyMembers: req.familyMembers,
            familyMemberNames: req.familyMemberNames,
            emergencyContactName: req.emergencyContactName || 'জরুরি যোগাযোগ',
            emergencyContactNumber: req.emergencyContact,
            emergencyContactRelationship:
              req.emergencyContactRelationship || 'অন্যান্য',
            selfiePhotoUrl: req.selfiePhotoUrl,
            digitalSignatureUrl: req.digitalSignatureUrl,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning()

        // Create rental contract
        const [contract] = await tx
          .insert(rentalContracts)
          .values({
            ownerAccountId: ownerAccountId,
            renterId: renter!.id,
            flatId: req.flatId,
            monthlyRent: body.monthlyRent.toFixed(2),
            startDate: body.startDate,
            securityDepositAmount: body.advanceAmount.toFixed(2),
            remainingDepositBalance: body.advanceAmount.toFixed(2),
            gasBill: body.gasBill.toFixed(2),
            waterBill: body.waterBill.toFixed(2),
            serviceCharge: body.serviceCharge.toFixed(2),
            otherCharges: body.otherCharges.toFixed(2),
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning()

        // If accessCodeHash is on request, copy to renterAccessCodes table
        if (req.accessCodeHash) {
          await tx.insert(renterAccessCodes).values({
            flatId: req.flatId,
            renterId: renter!.id,
            codeHash: req.accessCodeHash,
            failedAttempts: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        }

        // Update Flat status to occupied
        await tx
          .update(flats)
          .set({
            status: FLAT_STATUS.OCCUPIED,
            updatedAt: new Date(),
          })
          .where(eq(flats.id, req.flatId))

        // Set request status to APPROVED
        await tx
          .update(registrationRequests)
          .set({
            status: 'APPROVED',
            updatedAt: new Date(),
          })
          .where(eq(registrationRequests.id, req.id))

        // Log audit event
        fastify.auditLogger.log({
          actorId: request.user.id,
          action: 'renter_registered',
          entityType: 'renter',
          entityId: renter!.id,
          ownerAccountId: ownerAccountId,
          newValues: {
            renterId: renter!.id,
            userId: renterUserId,
            flatId: req.flatId,
            contractId: contract!.id,
            fullName: req.fullName,
            phone: req.phone,
            monthlyRent: body.monthlyRent,
            startDate: body.startDate,
            advanceAmount: body.advanceAmount,
            gasBill: body.gasBill,
            waterBill: body.waterBill,
            serviceCharge: body.serviceCharge,
          },
        })
      })

      return reply.status(200).send({
        success: true,
        message: 'আবেদনটি সফলভাবে অনুমোদন করা হয়েছে।',
      })
    },
  )

  // POST /api/registration-requests/:id/reject
  fastify.post(
    '/:id/reject',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Registration Requests'],
        summary: 'Reject a registration request',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { ownerAccountId, assignedBuildingIds } = request.tenantScope
      const { role } = request.user

      // Fetch request details
      const req = await fastify.db.query.registrationRequests.findFirst({
        where: and(
          eq(registrationRequests.id, id),
          eq(registrationRequests.ownerAccountId, ownerAccountId),
          eq(registrationRequests.status, 'PENDING_APPROVAL'),
        ),
        with: {
          flat: true,
        },
      })

      if (!req) {
        return reply.status(404).send({
          requestId: request.id,
          statusCode: 404,
          error: 'Not Found',
          message: 'আবেদনটি খুঁজে পাওয়া যায়নি অথবা ইতিমধ্যে এটি প্রসেস করা হয়েছে।',
        })
      }

      // If manager, check if flat belongs to assigned building
      if (role === 'manager' && assignedBuildingIds) {
        if (!req.flat || !assignedBuildingIds.includes(req.flat.buildingId)) {
          return reply.status(403).send({
            requestId: request.id,
            statusCode: 403,
            error: 'Forbidden',
            message: 'এই ফ্ল্যাটের আবেদন বাতিল করার অনুমতি আপনার নেই।',
          })
        }
      }

      // Update status to REJECTED
      await fastify.db
        .update(registrationRequests)
        .set({
          status: 'REJECTED',
          updatedAt: new Date(),
        })
        .where(eq(registrationRequests.id, req.id))

      return reply.status(200).send({
        success: true,
        message: 'আবেদনটি বাতিল করা হয়েছে।',
      })
    },
  )
}

export default registrationRequestRoutes
