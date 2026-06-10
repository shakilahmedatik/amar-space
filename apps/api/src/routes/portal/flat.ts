import { randomInt } from 'node:crypto'
import {
  bills,
  emergencyContacts,
  flatSlugs,
  notices,
  payments,
  portalSessions,
  registrationRequests,
  renterAccessCodes,
} from '@repo/db'
import { isValidFlatSlug, registrationFormSchema } from '@repo/shared/portal'
import { and, asc, desc, eq, or, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { compareAccessCode, hashAccessCode } from '../../utils/access-code-hash'
import { formatNoticesForPortal } from '../../utils/notice-formatting'

/**
 * Status mapping from database values to portal display values.
 * Database uses: vacant, occupied, under_maintenance
 * Portal uses: AVAILABLE, OCCUPIED, MAINTENANCE
 */
const STATUS_MAP: Record<string, 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'> = {
  vacant: 'AVAILABLE',
  occupied: 'OCCUPIED',
  under_maintenance: 'MAINTENANCE',
}

/**
 * Portal flat route plugin.
 *
 * Provides `GET /api/portal/flat/:slug` — a public (unauthenticated) endpoint
 * that returns building info, flat status, emergency contacts, and pending
 * registration flag for the given flat slug.
 *
 * No private data (NID, payments, contracts) is included in the response.
 */
async function portalFlatRoutes(fastify: FastifyInstance) {
  const r2BaseUrl = fastify.env.R2_PUBLIC_BASE_URL.replace(/\/$/, '')
  const formatR2Url = (key: string | null | undefined) => {
    if (!key) return null
    if (key.startsWith('http://') || key.startsWith('https://')) return key
    return `${r2BaseUrl}/${key}`
  }

  fastify.get(
    '/:slug',
    {
      schema: {
        tags: ['Portal'],
        summary: 'Get public flat portal data',
        description:
          'Returns public building info, flat status, emergency contacts, and pending registration flag for a flat slug. No authentication required.',
        params: z.object({
          slug: z.string(),
        }),
        response: {
          200: z.object({
            building: z.object({
              name: z.string(),
              logoUrl: z.string().nullable(),
              coverImageUrl: z.string().nullable(),
              whatsappGroupLink: z.string().nullable(),
              managerPhone: z.string().nullable(),
              rules: z.string().nullable(),
            }),
            flat: z.object({
              flatNumber: z.string(),
              status: z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE']),
              slug: z.string(),
            }),
            emergencyContacts: z.array(
              z.object({
                name: z.string(),
                role: z.string(),
                phone: z.string().nullable(),
                type: z.enum(['building', 'nearby']),
                order: z.number(),
              }),
            ),
            hasPendingRegistration: z.boolean(),
          }),
          400: z.object({
            error: z.string(),
            message: z.string(),
          }),
          404: z.object({
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params as { slug: string }

      // Validate slug format — reject invalid slugs without DB lookup
      if (!isValidFlatSlug(slug)) {
        return reply.status(400).send({
          error: 'INVALID_SLUG',
          message: 'অবৈধ QR কোড',
        })
      }

      // Query flat_slugs → join flats → join buildings
      const flatSlugRecord = await fastify.db.query.flatSlugs.findFirst({
        where: eq(flatSlugs.slug, slug),
        with: {
          flat: {
            with: {
              building: true,
            },
          },
        },
      })

      if (!flatSlugRecord?.flat) {
        return reply.status(404).send({
          error: 'FLAT_NOT_FOUND',
          message: 'ফ্ল্যাটটি পাওয়া যায়নি',
        })
      }

      const { flat } = flatSlugRecord
      const building = flat.building

      if (!building) {
        return reply.status(404).send({
          error: 'FLAT_NOT_FOUND',
          message: 'ফ্ল্যাটটি পাওয়া যায়নি',
        })
      }

      // Query emergency contacts for the building, ordered by sort_order
      const contacts = await fastify.db
        .select({
          name: emergencyContacts.name,
          role: emergencyContacts.role,
          phone: emergencyContacts.phone,
          type: emergencyContacts.type,
          order: emergencyContacts.sortOrder,
        })
        .from(emergencyContacts)
        .where(eq(emergencyContacts.buildingId, building.id))
        .orderBy(asc(emergencyContacts.sortOrder))

      // Check for pending registration requests for this flat
      const pendingRegistration =
        await fastify.db.query.registrationRequests.findFirst({
          where: and(
            eq(registrationRequests.flatId, flat.id),
            eq(registrationRequests.status, 'PENDING_APPROVAL'),
          ),
          columns: { id: true },
        })

      // Map database status to portal status
      const portalStatus = STATUS_MAP[flat.status] ?? 'AVAILABLE'

      return reply.status(200).send({
        building: {
          name: building.name,
          logoUrl: formatR2Url(building.logoUrl),
          coverImageUrl: formatR2Url(building.coverImageUrl),
          whatsappGroupLink: building.whatsappGroupLink ?? null,
          managerPhone: building.managerPhone ?? null,
          rules: building.rules ?? null,
        },
        flat: {
          flatNumber: flat.flatNumber,
          status: portalStatus,
          slug,
        },
        emergencyContacts: contacts.map((c) => ({
          name: c.name,
          role: c.role,
          phone: c.phone ?? null,
          type: c.type as 'building' | 'nearby',
          order: c.order,
        })),
        hasPendingRegistration: !!pendingRegistration,
      })
    },
  )

  /**
   * GET /api/portal/flat/:slug/notices
   *
   * Returns public notices for the flat's building, sorted by created_at DESC,
   * limited to 20. Notice body is truncated to 120 characters.
   * No authentication required.
   */
  fastify.get(
    '/:slug/notices',
    {
      schema: {
        tags: ['Portal'],
        summary: 'Get public notices for a flat',
        description:
          "Returns public notices for the flat's building, sorted by most recent first, limited to 20. Notice body is truncated to 120 characters. No authentication required.",
        params: z.object({
          slug: z.string(),
        }),
        response: {
          200: z.object({
            notices: z.array(
              z.object({
                id: z.string(),
                title: z.string(),
                body: z.string(),
                createdAt: z.string(),
                isPinned: z.boolean(),
              }),
            ),
          }),
          400: z.object({
            error: z.string(),
            message: z.string(),
          }),
          404: z.object({
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params as { slug: string }

      // Validate slug format — reject invalid slugs without DB lookup
      if (!isValidFlatSlug(slug)) {
        return reply.status(400).send({
          error: 'INVALID_SLUG',
          message: 'অবৈধ QR কোড',
        })
      }

      // Resolve flat via flat_slugs table
      const flatSlugRecord = await fastify.db.query.flatSlugs.findFirst({
        where: eq(flatSlugs.slug, slug),
        with: {
          flat: {
            with: {
              building: true,
            },
          },
        },
      })

      if (!flatSlugRecord?.flat) {
        return reply.status(404).send({
          error: 'FLAT_NOT_FOUND',
          message: 'ফ্ল্যাটটি পাওয়া যায়নি',
        })
      }

      const { flat } = flatSlugRecord
      const building = flat.building

      if (!building) {
        return reply.status(404).send({
          error: 'FLAT_NOT_FOUND',
          message: 'ফ্ল্যাটটি পাওয়া যায়নি',
        })
      }

      // Query public notices for the flat's building
      // Public notices are: all_renters OR specific_building targeting this building
      // Exclude expired notices
      const buildingNotices = await fastify.db
        .select({
          id: notices.id,
          title: notices.title,
          body: notices.body,
          createdAt: notices.createdAt,
          isPinned: notices.isPinned,
        })
        .from(notices)
        .where(
          and(
            eq(notices.ownerAccountId, building.ownerAccountId),
            or(
              eq(notices.targetAudience, 'all_renters'),
              and(
                eq(notices.targetAudience, 'specific_building'),
                eq(notices.targetBuildingId, building.id),
              ),
            ),
            sql`${notices.expiresAt} IS NULL OR ${notices.expiresAt} > NOW()`,
          ),
        )
        .orderBy(desc(notices.createdAt))
        .limit(20)

      // Format notices: sort DESC, limit 20, truncate body to 120 chars
      const formattedNotices = formatNoticesForPortal(buildingNotices)

      return reply.status(200).send({
        notices: formattedNotices,
      })
    },
  )

  /**
   * POST /api/portal/flat/:slug/register
   *
   * Submits a renter registration request for an available flat.
   * Validates the request body using the shared registration schema,
   * checks for duplicate pending registrations, uploads NID photo and
   * digital signature to S3/R2, and creates a registration_requests record.
   * No authentication required.
   *
   */
  fastify.post(
    '/:slug/register',
    {
      schema: {
        tags: ['Portal'],
        summary: 'Submit renter registration request',
        description:
          'Submits a registration request for an available flat. Validates form data, checks for duplicates, uploads files to S3, and creates a pending registration record. No authentication required.',
        params: z.object({
          slug: z.string(),
        }),
        body: z.object({
          fullName: z.string(),
          phone: z.string(),
          nidNumber: z.string(),
          bloodGroup: z.string(),
          occupation: z.string(),
          familyMembers: z.number(),
          familyMemberNames: z.array(z.string()),
          emergencyContactName: z.string(),
          emergencyContact: z.string(),
          emergencyContactRelationship: z.string(),
          rentalStartDate: z.string(),
          advanceAmount: z.number(),
          digitalSignature: z.string(),
          nidPhoto: z.string(),
          selfiePhoto: z.string(),
        }),
        response: {
          201: z.object({
            success: z.boolean(),
            message: z.string(),
            requestId: z.string(),
            accessCode: z.string(),
          }),
          400: z.object({
            error: z.string(),
            message: z.string(),
            errors: z
              .union([
                z.record(z.string(), z.string()),
                z.array(z.object({ field: z.string(), message: z.string() })),
              ])
              .optional(),
          }),
          409: z.object({
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params as { slug: string }

      // Validate slug format — reject invalid slugs without DB lookup
      if (!isValidFlatSlug(slug)) {
        return reply.status(400).send({
          error: 'INVALID_SLUG',
          message: 'অবৈধ QR কোড',
        })
      }

      // Validate request body using shared registration schema
      const body = request.body as Record<string, unknown>

      const parseResult = registrationFormSchema.safeParse(body)
      if (!parseResult.success) {
        const errors: Record<string, string> = {}
        for (const issue of parseResult.error.issues) {
          const field = issue.path.join('.')
          if (!errors[field]) {
            errors[field] = issue.message
          }
        }
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'ফর্মে ত্রুটি রয়েছে',
          errors,
        })
      }

      const data = parseResult.data

      // Resolve flat via flat_slugs table
      const flatSlugRecord = await fastify.db.query.flatSlugs.findFirst({
        where: eq(flatSlugs.slug, slug),
        with: {
          flat: {
            with: {
              building: true,
            },
          },
        },
      })

      if (!flatSlugRecord?.flat) {
        return reply.status(400).send({
          error: 'INVALID_SLUG',
          message: 'ফ্ল্যাটটি পাওয়া যায়নি',
        })
      }

      const { flat } = flatSlugRecord
      const building = flat.building

      if (!building) {
        return reply.status(400).send({
          error: 'INVALID_SLUG',
          message: 'ফ্ল্যাটটি পাওয়া যায়নি',
        })
      }

      // Check for duplicate pending registration (same flat + phone)
      const existingPending =
        await fastify.db.query.registrationRequests.findFirst({
          where: and(
            eq(registrationRequests.flatId, flat.id),
            eq(registrationRequests.phone, data.phone),
            eq(registrationRequests.status, 'PENDING_APPROVAL'),
          ),
          columns: { id: true },
        })

      if (existingPending) {
        return reply.status(409).send({
          error: 'DUPLICATE_REQUEST',
          message:
            'এই ফোন নম্বর দিয়ে ইতিমধ্যে একটি আবেদন জমা দেওয়া হয়েছে। অনুগ্রহ করে অপেক্ষা করুন।',
        })
      }

      // Upload digital signature to S3/R2
      const signatureBase64 = data.digitalSignature.includes(',')
        ? data.digitalSignature.split(',')[1]!
        : data.digitalSignature
      const signatureBuffer = Buffer.from(signatureBase64, 'base64')
      const digitalSignatureUrl = await fastify.r2.upload(
        building.ownerAccountId,
        'registration_signature',
        flat.id,
        `signature-${Date.now()}.png`,
        signatureBuffer,
        'image/png',
      )

      // Upload NID photo to S3/R2
      const nidBase64 = data.nidPhoto.includes(',')
        ? data.nidPhoto.split(',')[1]!
        : data.nidPhoto
      const nidBuffer = Buffer.from(nidBase64, 'base64')
      const nidPhotoUrl = await fastify.r2.upload(
        building.ownerAccountId,
        'registration_nid',
        flat.id,
        `nid-${Date.now()}.png`,
        nidBuffer,
        'image/png',
      )

      // Upload Selfie Photo to S3/R2
      const selfieBase64 = data.selfiePhoto.includes(',')
        ? data.selfiePhoto.split(',')[1]!
        : data.selfiePhoto
      const selfieBuffer = Buffer.from(selfieBase64, 'base64')
      const selfiePhotoUrl = await fastify.r2.upload(
        building.ownerAccountId,
        'registration_selfie',
        flat.id,
        `selfie-${Date.now()}.png`,
        selfieBuffer,
        'image/png',
      )

      // Generate a random 6-digit access code (plaintext) and its hash securely
      const accessCode = randomInt(100000, 1000000).toString()
      const accessCodeHash = hashAccessCode(accessCode)

      // Create registration_requests record with PENDING_APPROVAL status
      const [registrationRecord] = await fastify.db
        .insert(registrationRequests)
        .values({
          flatId: flat.id,
          ownerAccountId: building.ownerAccountId,
          fullName: data.fullName,
          phone: data.phone,
          nidNumber: data.nidNumber,
          nidPhotoUrl,
          bloodGroup: data.bloodGroup,
          occupation: data.occupation,
          familyMembers: data.familyMembers,
          familyMemberNames: data.familyMemberNames,
          emergencyContactName: data.emergencyContactName,
          emergencyContact: data.emergencyContact,
          emergencyContactRelationship: data.emergencyContactRelationship,
          selfiePhotoUrl,
          rentalStartDate: data.rentalStartDate,
          advanceAmount: String(data.advanceAmount),
          digitalSignatureUrl,
          status: 'PENDING_APPROVAL',
          accessCodeHash,
        })
        .returning({ id: registrationRequests.id })

      return reply.status(201).send({
        success: true,
        message: 'আপনার আবেদন সফলভাবে জমা হয়েছে। অনুগ্রহ করে অপেক্ষা করুন।',
        requestId: registrationRecord!.id,
        accessCode,
      })
    },
  )

  /**
   * POST /api/portal/flat/:slug/access
   *
   * Verifies a 6-digit access code for an occupied flat.
   * Implements rate limiting: 5 consecutive failures → 15-minute lockout.
   * On success: creates a portal session (30-min expiry), sets HTTP-only cookie.
   * No authentication required (this IS the authentication mechanism).
   *
   */
  fastify.post(
    '/:slug/access',
    {
      schema: {
        tags: ['Portal'],
        summary: 'Verify access code',
        description:
          'Verifies a 6-digit access code for an occupied flat. Creates a 30-minute session on success. Rate limited: 5 consecutive failures trigger a 15-minute lockout.',
        params: z.object({
          slug: z.string(),
        }),
        body: z.object({
          code: z.string(),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            message: z.string(),
            redirectUrl: z.string(),
          }),
          400: z.object({
            error: z.string(),
            message: z.string(),
          }),
          401: z.object({
            error: z.string(),
            message: z.string(),
            attemptsRemaining: z.number(),
          }),
          429: z.object({
            error: z.string(),
            message: z.string(),
            lockedUntil: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params as { slug: string }
      const { code } = request.body as { code: string }

      // Validate slug format
      if (!isValidFlatSlug(slug)) {
        return reply.status(400).send({
          error: 'INVALID_SLUG',
          message: 'অবৈধ QR কোড',
        })
      }

      // Validate 6-digit code format
      if (!/^\d{6}$/.test(code)) {
        return reply.status(400).send({
          error: 'INVALID_CODE_FORMAT',
          message: 'অ্যাক্সেস কোড ৬ সংখ্যার হতে হবে',
        })
      }

      // Resolve flat via flat_slugs table
      const flatSlugRecord = await fastify.db.query.flatSlugs.findFirst({
        where: eq(flatSlugs.slug, slug),
        columns: { flatId: true },
      })

      if (!flatSlugRecord) {
        return reply.status(400).send({
          error: 'INVALID_SLUG',
          message: 'অবৈধ QR কোড',
        })
      }

      const flatId = flatSlugRecord.flatId

      // Find the access code record for this flat
      const accessCodeRecord =
        await fastify.db.query.renterAccessCodes.findFirst({
          where: eq(renterAccessCodes.flatId, flatId),
        })

      if (!accessCodeRecord) {
        return reply.status(401).send({
          error: 'INVALID_CODE',
          message: 'অবৈধ অ্যাক্সেস কোড',
          attemptsRemaining: 0,
        })
      }

      // Check lockout status
      if (
        accessCodeRecord.lockedUntil &&
        new Date(accessCodeRecord.lockedUntil) > new Date()
      ) {
        return reply.status(429).send({
          error: 'LOCKED',
          message: 'অনেক বার ভুল কোড দেওয়া হয়েছে। অনুগ্রহ করে পরে আবার চেষ্টা করুন।',
          lockedUntil: new Date(accessCodeRecord.lockedUntil).toISOString(),
        })
      }

      // Compare the provided code against the stored hash
      const isValid = await compareAccessCode(code, accessCodeRecord.codeHash)

      if (!isValid) {
        // Increment failed attempts
        const newFailedAttempts = accessCodeRecord.failedAttempts + 1
        const MAX_ATTEMPTS = 5
        const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

        const updateData: {
          failedAttempts: number
          lockedUntil: Date | null
          updatedAt: Date
        } = {
          failedAttempts: newFailedAttempts,
          lockedUntil: null,
          updatedAt: new Date(),
        }

        // Lock after 5 consecutive failures
        if (newFailedAttempts >= MAX_ATTEMPTS) {
          updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS)
        }

        await fastify.db
          .update(renterAccessCodes)
          .set(updateData)
          .where(eq(renterAccessCodes.id, accessCodeRecord.id))

        // If locked, return 429
        if (newFailedAttempts >= MAX_ATTEMPTS) {
          return reply.status(429).send({
            error: 'LOCKED',
            message: 'অনেক বার ভুল কোড দেওয়া হয়েছে। অনুগ্রহ করে পরে আবার চেষ্টা করুন।',
            lockedUntil: updateData.lockedUntil!.toISOString(),
          })
        }

        const attemptsRemaining = MAX_ATTEMPTS - newFailedAttempts

        return reply.status(401).send({
          error: 'INVALID_CODE',
          message: 'অবৈধ অ্যাক্সেস কোড',
          attemptsRemaining,
        })
      }

      // Success: reset failed attempts
      await fastify.db
        .update(renterAccessCodes)
        .set({
          failedAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(renterAccessCodes.id, accessCodeRecord.id))

      // Create portal session (30-minute expiry)
      const SESSION_DURATION_MS = 30 * 60 * 1000 // 30 minutes
      const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)

      const result = await fastify.db
        .insert(portalSessions)
        .values({
          flatId,
          renterId: accessCodeRecord.renterId,
          expiresAt,
        })
        .returning({ id: portalSessions.id })

      const sessionId = result[0]!.id

      // Set HTTP-only secure session cookie
      reply.setCookie('portal_session', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: SESSION_DURATION_MS / 1000, // seconds
      })

      return reply.status(200).send({
        success: true as const,
        message: 'সফলভাবে লগইন হয়েছে',
        redirectUrl: '/dashboard',
      })
    },
  )

  /**
   * GET /api/portal/flat/:slug/session
   *
   * Checks if the current portal session is still valid.
   * Returns session validity status. Used by the client-side hook
   * to detect session expiry and redirect back to the portal.
   *
   */
  fastify.get(
    '/:slug/session',
    {
      schema: {
        tags: ['Portal'],
        summary: 'Check portal session validity',
        description:
          'Checks if the current portal session cookie is valid and not expired. Returns valid: true/false.',
        params: z.object({
          slug: z.string(),
        }),
        response: {
          200: z.object({
            valid: z.boolean(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params as { slug: string }
      const sessionId = request.cookies.portal_session

      if (!sessionId) {
        return reply.status(200).send({ valid: false })
      }

      // Resolve flat via flat_slugs table to get flatId
      const flatSlugRecord = await fastify.db.query.flatSlugs.findFirst({
        where: eq(flatSlugs.slug, slug),
      })

      if (!flatSlugRecord) {
        return reply.status(200).send({ valid: false })
      }

      // Look up the session in the database
      const session = await fastify.db.query.portalSessions.findFirst({
        where: eq(portalSessions.id, sessionId),
        columns: { id: true, expiresAt: true, flatId: true },
      })

      if (!session) {
        return reply.status(200).send({ valid: false })
      }

      // Verify session belongs to the requested flat
      if (session.flatId !== flatSlugRecord.flatId) {
        return reply.status(200).send({ valid: false })
      }

      // Check if session has expired
      if (new Date(session.expiresAt) <= new Date()) {
        return reply.status(200).send({ valid: false })
      }

      return reply.status(200).send({ valid: true })
    },
  )

  /**
   * GET /api/portal/flat/:slug/renter-data
   *
   * Fetches authenticated renter's submitted details, active contract, and payment/bill history.
   * Requires a valid portal_session cookie.
   */
  fastify.get(
    '/:slug/renter-data',
    {
      schema: {
        tags: ['Portal'],
        summary: 'Get authenticated renter portal data',
        description:
          "Returns the authenticated renter's profile, active rental contract details, and full bill and payment histories. Requires a valid portal_session cookie.",
        params: z.object({
          slug: z.string(),
        }),
        response: {
          200: z.object({
            renter: z.object({
              id: z.string(),
              fullName: z.string(),
              phone: z.string(),
              nidNumber: z.string(),
              nidPhotoUrl: z.string().nullable(),
              dateOfBirth: z.string().nullable(),
              occupation: z.string(),
              bloodGroup: z.string(),
              totalFamilyMembers: z.number(),
              familyMemberNames: z.array(z.string()).nullable(),
              emergencyContactName: z.string(),
              emergencyContactNumber: z.string(),
              emergencyContactRelationship: z.string(),
              digitalSignatureUrl: z.string().nullable(),
              selfiePhotoUrl: z.string().nullable(),
            }),
            contract: z
              .object({
                id: z.string(),
                monthlyRent: z.number(),
                startDate: z.string(),
                depositBalance: z.number(),
                gasBill: z.number().nullable(),
                waterBill: z.number().nullable(),
                serviceCharge: z.number().nullable(),
                otherCharges: z.number().nullable(),
              })
              .nullable(),
            bills: z.array(
              z.object({
                id: z.string(),
                billingMonth: z.string(),
                totalAmount: z.number(),
                paidAmount: z.number(),
                status: z.string(),
                createdAt: z.string(),
              }),
            ),
            payments: z.array(
              z.object({
                id: z.string(),
                amount: z.number(),
                paymentDate: z.string(),
                paymentMethod: z.string(),
                receiptReference: z.string(),
                note: z.string().nullable(),
                createdAt: z.string(),
              }),
            ),
            flat: z.object({
              buildingId: z.string(),
              flatNumber: z.string(),
              floor: z.number(),
              buildingName: z.string(),
              buildingAddress: z.string(),
            }),
          }),
          401: z.object({
            error: z.string(),
            message: z.string(),
          }),
          404: z.object({
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params as { slug: string }

      const sessionId = request.cookies.portal_session
      if (!sessionId) {
        return reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'প্রবেশাধিকার নেই। অনুগ্রহ করে কোড দিয়ে লগইন করুন।',
        })
      }

      // Resolve flat via flat_slugs table to get flatId
      const flatSlugRecord = await fastify.db.query.flatSlugs.findFirst({
        where: eq(flatSlugs.slug, slug),
      })

      if (!flatSlugRecord) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'ফ্ল্যাটটি পাওয়া যায়নি',
        })
      }

      // Check portal session in DB
      const portalSession = await fastify.db.query.portalSessions.findFirst({
        where: eq(portalSessions.id, sessionId),
        with: {
          renter: {
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
          },
        },
      })

      if (
        !portalSession ||
        new Date(portalSession.expiresAt) <= new Date() ||
        !portalSession.renter
      ) {
        return reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'সেশনের মেয়াদ শেষ হয়েছে। আবার লগইন করুন।',
        })
      }

      // Verify session belongs to the requested flat
      if (portalSession.flatId !== flatSlugRecord.flatId) {
        return reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'এই ফ্ল্যাটে প্রবেশের জন্য আপনার সেশনটি সঠিক নয়।',
        })
      }

      const { renter } = portalSession
      const activeContract = renter.rentalContracts?.[0]
      const flat = activeContract?.flat
      const building = flat?.building

      if (!flat || !building) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'কোনো সক্রিয় ফ্ল্যাট বা চুক্তি পাওয়া যায়নি।',
        })
      }

      // Query all bills for this renter
      const renterBills = await fastify.db
        .select()
        .from(bills)
        .where(eq(bills.renterId, renter.id))
        .orderBy(desc(bills.billingMonth))

      // Query all payments for this renter's bills
      const renterPayments = await fastify.db
        .select()
        .from(payments)
        .innerJoin(bills, eq(payments.billId, bills.id))
        .where(eq(bills.renterId, renter.id))
        .orderBy(desc(payments.paymentDate))

      return reply.status(200).send({
        renter: {
          id: renter.id,
          fullName: renter.fullName,
          phone: renter.phone,
          nidNumber: renter.nidNumber,
          nidPhotoUrl: formatR2Url(renter.nidPhotoUrl),
          dateOfBirth: renter.dateOfBirth,
          occupation: renter.occupation,
          bloodGroup: renter.bloodGroup,
          totalFamilyMembers: renter.totalFamilyMembers,
          familyMemberNames: renter.familyMemberNames as string[] | null,
          emergencyContactName: renter.emergencyContactName,
          emergencyContactNumber: renter.emergencyContactNumber,
          emergencyContactRelationship: renter.emergencyContactRelationship,
          digitalSignatureUrl: formatR2Url(renter.digitalSignatureUrl),
          selfiePhotoUrl: formatR2Url(renter.selfiePhotoUrl),
        },
        contract: activeContract
          ? {
              id: activeContract.id,
              monthlyRent: Number.parseFloat(activeContract.monthlyRent),
              startDate: activeContract.startDate,
              depositBalance: Number.parseFloat(
                activeContract.remainingDepositBalance,
              ),
              gasBill: activeContract.gasBill
                ? Number.parseFloat(activeContract.gasBill)
                : null,
              waterBill: activeContract.waterBill
                ? Number.parseFloat(activeContract.waterBill)
                : null,
              serviceCharge: activeContract.serviceCharge
                ? Number.parseFloat(activeContract.serviceCharge)
                : null,
              otherCharges: activeContract.otherCharges
                ? Number.parseFloat(activeContract.otherCharges)
                : null,
            }
          : null,
        bills: renterBills.map((b) => ({
          id: b.id,
          billingMonth: b.billingMonth,
          totalAmount: Number.parseFloat(b.totalAmount),
          paidAmount: Number.parseFloat(b.paidAmount),
          status: b.status,
          createdAt: b.createdAt.toISOString(),
        })),
        payments: renterPayments.map(({ payments: p }) => ({
          id: p.id,
          amount: Number.parseFloat(p.amount),
          paymentDate: p.paymentDate,
          paymentMethod: p.paymentMethod,
          receiptReference: p.receiptReference,
          note: p.note,
          createdAt: p.createdAt.toISOString(),
        })),
        flat: {
          buildingId: flat.buildingId,
          flatNumber: flat.flatNumber,
          floor: flat.floor,
          buildingName: building.name,
          buildingAddress: building.address,
        },
      })
    },
  )

  /**
   * DELETE /api/portal/flat/:slug/logout
   *
   * Clears the portal_session cookie and deletes the session in DB.
   */
  fastify.delete(
    '/:slug/logout',
    {
      schema: {
        tags: ['Portal'],
        summary: 'Logout from portal',
        description:
          'Clears the portal_session cookie and invalidates it in the database.',
        params: z.object({
          slug: z.string(),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const sessionId = request.cookies.portal_session

      if (sessionId) {
        // Delete the session record in DB
        await fastify.db
          .delete(portalSessions)
          .where(eq(portalSessions.id, sessionId))
      }

      // Clear the cookie
      reply.clearCookie('portal_session', { path: '/' })

      return reply.status(200).send({
        success: true,
        message: 'লগআউট সফল হয়েছে',
      })
    },
  )
}

export default portalFlatRoutes
