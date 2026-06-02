import { buildings, flatSlugs, flats } from '@repo/db'
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
 * Building bulk QR code routes plugin.
 *
 * Provides:
 * - GET /api/buildings/:id/qr-codes — Generate QR codes for all flats in a building as a ZIP archive
 *
 * Access control:
 * - Owner: can generate bulk QR codes for any building within their ownerAccountId
 * - Manager: can only generate bulk QR codes for buildings in their assigned buildings
 */
async function buildingQrCodeRoutes(fastify: FastifyInstance) {
  const qrCodeService = new QrCodeService(fastify.env.FRONTEND_URL)

  /**
   * GET /api/buildings/:id/qr-codes
   * Generates QR codes for all flats in a building and streams them as a ZIP archive.
   *
   * Each file in the archive is named {building_name}_{flat_number}.png.
   */
  fastify.get(
    '/:id/qr-codes',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['QR Codes'],
        summary: 'Generate bulk QR codes for a building',
        description:
          'Generates QR codes for all flats in a building and returns them as a ZIP archive.\n\n**Roles: owner, manager**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid building ID format'),
        }),
        querystring: z.object({
          size: z.coerce
            .number()
            .int()
            .min(100)
            .max(1000)
            .optional()
            .default(300),
        }),
        response: {
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
      const { size } = request.query as { size: number }

      // Fetch the building scoped to the user's ownerAccountId
      const building = await fastify.db.query.buildings.findFirst({
        where: and(
          eq(buildings.id, id),
          eq(buildings.ownerAccountId, request.tenantScope.ownerAccountId),
        ),
      })

      if (!building) {
        const response: ApiErrorResponse = {
          requestId: request.id,
          statusCode: 404,
          error: 'Not Found',
          message: 'Building not found',
        }
        return reply.status(404).send(response)
      }

      // Manager access check: verify building is in assignedBuildingIds
      if (request.user.role === 'manager') {
        const assignedIds = request.tenantScope.assignedBuildingIds ?? []
        if (!assignedIds.includes(building.id)) {
          const response: ApiErrorResponse = {
            requestId: request.id,
            statusCode: 403,
            error: 'Forbidden',
            message: 'Insufficient permissions',
          }
          return reply.status(403).send(response)
        }
      }

      // Query all flats for this building
      const buildingFlats = await fastify.db.query.flats.findMany({
        where: and(
          eq(flats.buildingId, building.id),
          eq(flats.ownerAccountId, request.tenantScope.ownerAccountId),
        ),
        columns: {
          id: true,
          flatNumber: true,
        },
      })

      if (buildingFlats.length === 0) {
        const response: ApiErrorResponse = {
          requestId: request.id,
          statusCode: 400,
          error: 'Bad Request',
          message: 'Building has no flats to generate QR codes for',
        }
        return reply.status(400).send(response)
      }

      // Ensure all flats have slugs — look up existing or create new ones
      const flatsWithSlugs: Array<{
        id: string
        flatNumber: string
        slug: string
      }> = []

      for (const flat of buildingFlats) {
        let slugRecord = await fastify.db.query.flatSlugs.findFirst({
          where: eq(flatSlugs.flatId, flat.id),
          columns: { slug: true },
        })

        if (!slugRecord) {
          const rawSlug = `${building.name}-flat-${flat.flatNumber}`
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
            slugRecord = created
          } else {
            slugRecord = await fastify.db.query.flatSlugs.findFirst({
              where: eq(flatSlugs.flatId, flat.id),
              columns: { slug: true },
            })
          }
        }

        if (slugRecord) {
          flatsWithSlugs.push({
            id: flat.id,
            flatNumber: flat.flatNumber,
            slug: slugRecord.slug,
          })
        }
      }

      if (flatsWithSlugs.length === 0) {
        const response: ApiErrorResponse = {
          requestId: request.id,
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to generate slugs for flats',
        }
        return reply.status(500).send(response)
      }

      // Generate ZIP archive stream
      const zipStream = await qrCodeService.generateBulkZipStream(
        flatsWithSlugs,
        building.name,
        { size },
      )

      const rawFilename = `${building.name}_qr_codes.zip`
      const asciiFilename = rawFilename.replace(/[^\x20-\x7E]/g, '_')
      const encodedFilename = encodeURIComponent(rawFilename)

      return reply
        .header('Content-Type', 'application/zip')
        .header(
          'Content-Disposition',
          `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
        )
        .send(zipStream)
    },
  )
}

export default buildingQrCodeRoutes
