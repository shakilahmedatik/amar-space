import { buildings, flats } from '@repo/db'
import type { ApiErrorResponse } from '@repo/shared/types'
import { and, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { errorResponseSchema } from '../app'
import { approvalGuard } from '../middleware/approval-guard'
import { authGuard } from '../middleware/auth-guard'
import { roleGuard } from '../middleware/role-guard'
import { tenantScope } from '../middleware/tenant-scope'
import { QrCodeService } from '../services/qr-code'

/**
 * Building bulk QR code routes plugin.
 *
 * Provides:
 * - GET /api/buildings/:id/qr-codes — Generate QR codes for all flats in a building as a ZIP archive
 *
 * Access control:
 * - Owner: can generate bulk QR codes for any building within their ownerAccountId
 * - Manager: can only generate bulk QR codes for buildings in their assigned buildings
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 2.1, 2.2, 2.3
 */
async function buildingQrCodeRoutes(fastify: FastifyInstance) {
  const qrCodeService = new QrCodeService(fastify.env.AUTH_BASE_URL)

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

      // Generate ZIP archive stream
      const zipStream = await qrCodeService.generateBulkZipStream(
        buildingFlats,
        building.name,
        { size },
      )

      return reply
        .header('Content-Type', 'application/zip')
        .header(
          'Content-Disposition',
          `attachment; filename="${building.name}_qr_codes.zip"`,
        )
        .send(zipStream)
    },
  )
}

export default buildingQrCodeRoutes
