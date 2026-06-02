import { flatSlugs, flats } from '@repo/db'
import type { ApiErrorResponse } from '@repo/shared/types'
import { and, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { approvalGuard } from '../../middleware/approval-guard'
import { authGuard } from '../../middleware/auth-guard'
import { roleGuard } from '../../middleware/role-guard'
import { tenantScope } from '../../middleware/tenant-scope'
import { QrCodeService } from '../../services/qr-code'
import { errorResponseSchema } from '../../utils/schemas'

/**
 * Flat QR code routes plugin.
 *
 * Provides:
 * - GET /api/flats/:id/qr-code — Generate QR code for a single flat
 *
 * Access control:
 * - Owner: can generate QR codes for any flat within their ownerAccountId
 * - Manager: can only generate QR codes for flats in their assigned buildings
 */
async function flatQrCodeRoutes(fastify: FastifyInstance) {
  const qrCodeService = new QrCodeService(fastify.env.FRONTEND_URL)

  /**
   * GET /api/flats/:id/qr-code
   * Generates a QR code for a specific flat.
   *
   * Returns either a PNG image or JSON metadata with base64-encoded image,
   * depending on the `format` query parameter.
   */
  fastify.get(
    '/:id/qr-code',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['QR Codes'],
        summary: 'Generate QR code for a flat',
        description:
          'Generates a QR code PNG image or metadata for a specific flat.\n\n**Roles: owner, manager**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid flat ID format'),
        }),
        querystring: z.object({
          size: z.coerce
            .number()
            .int()
            .min(100)
            .max(1000)
            .optional()
            .default(300),
          format: z.enum(['image', 'metadata']).optional().default('image'),
        }),
        response: {
          200: z.object({
            flatId: z.string(),
            flatNumber: z.string(),
            buildingName: z.string(),
            encodedUrl: z.string(),
            imageBase64: z.string(),
          }),
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { size, format } = request.query as {
        size: number
        format: 'image' | 'metadata'
      }

      // Fetch the flat with its building, scoped to the user's ownerAccountId
      const flat = await fastify.db.query.flats.findFirst({
        where: and(
          eq(flats.id, id),
          eq(flats.ownerAccountId, request.tenantScope.ownerAccountId),
        ),
        with: {
          building: {
            columns: { id: true, name: true },
          },
        },
      })

      if (!flat) {
        const response: ApiErrorResponse = {
          requestId: request.id,
          statusCode: 404,
          error: 'Not Found',
          message: 'Flat not found',
        }
        return reply.status(404).send(response)
      }

      // Manager access check: verify flat's buildingId is in assignedBuildingIds
      if (request.user.role === 'manager') {
        const assignedIds = request.tenantScope.assignedBuildingIds ?? []
        if (!assignedIds.includes(flat.buildingId)) {
          const response: ApiErrorResponse = {
            requestId: request.id,
            statusCode: 403,
            error: 'Forbidden',
            message: 'Insufficient permissions',
          }
          return reply.status(403).send(response)
        }
      }

      const buildingName = flat.building?.name ?? 'Unknown'

      // Look up or create the flat slug for the portal URL
      let flatSlugRecord = await fastify.db.query.flatSlugs.findFirst({
        where: eq(flatSlugs.flatId, flat.id),
        columns: { slug: true },
      })

      if (!flatSlugRecord) {
        // Auto-generate a slug from building name + flat number
        const rawSlug = `${buildingName}-flat-${flat.flatNumber}`
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 100)

        const [created] = await fastify.db
          .insert(flatSlugs)
          .values({ flatId: flat.id, slug: rawSlug })
          .onConflictDoNothing()
          .returning({ slug: flatSlugs.slug })

        if (created) {
          flatSlugRecord = created
        } else {
          // Conflict on flatId means it was created concurrently — re-fetch
          flatSlugRecord = await fastify.db.query.flatSlugs.findFirst({
            where: eq(flatSlugs.flatId, flat.id),
            columns: { slug: true },
          })
        }
      }

      if (!flatSlugRecord) {
        const response: ApiErrorResponse = {
          requestId: request.id,
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to generate flat slug',
        }
        return reply.status(500).send(response)
      }

      const slug = flatSlugRecord.slug

      if (format === 'metadata') {
        const metadata = await qrCodeService.generateQrCodeWithMetadata(
          { id: flat.id, flatNumber: flat.flatNumber, slug },
          buildingName,
          { size },
        )

        return reply.status(200).send(metadata)
      }

      // Default: return PNG image
      const buffer = await qrCodeService.generateQrCode(slug, { size })

      const rawFilename = `${buildingName}_${flat.flatNumber}.png`
      const asciiFilename = rawFilename.replace(/[^\x20-\x7E]/g, '_')
      const encodedFilename = encodeURIComponent(rawFilename)

      return reply
        .status(200)
        .header('Content-Type', 'image/png')
        .header(
          'Content-Disposition',
          `inline; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
        )
        .send(buffer)
    },
  )
}

export default flatQrCodeRoutes
