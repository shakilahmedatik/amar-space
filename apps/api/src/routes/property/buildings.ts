import type { RequestContext } from '@repo/shared/types'
import {
  createBuildingSchema,
  updateBuildingSchema,
} from '@repo/shared/validation'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { approvalGuard } from '../../middleware/approval-guard'
import { authGuard } from '../../middleware/auth-guard'
import { roleGuard } from '../../middleware/role-guard'
import { tenantScope } from '../../middleware/tenant-scope'
import { BuildingService } from '../../services/building'
import {
  dateTimeResponseSchema,
  errorResponseSchema,
} from '../../utils/schemas'

/**
 * Building routes plugin.
 *
 * Provides:
 * - GET /api/buildings — List buildings with pagination
 * - POST /api/buildings — Create a new building
 * - GET /api/buildings/:id — Get a building by ID
 * - PUT /api/buildings/:id — Update a building
 *
 * Access control:
 * - Owner: full access (create, read, update)
 * - Manager: read-only access (GET only)
 */
async function buildingRoutes(fastify: FastifyInstance) {
  const buildingService = new BuildingService(
    fastify.db,
    fastify.auditLogger,
    fastify.r2,
  )

  /**
   * Helper to build RequestContext from the Fastify request.
   */
  function buildRequestContext(request: FastifyRequest): RequestContext {
    const userAgentHeader = request.headers['user-agent']
    const userAgent =
      typeof userAgentHeader === 'string'
        ? userAgentHeader
        : Array.isArray(userAgentHeader)
          ? (userAgentHeader[0] ?? '')
          : ''
    return {
      userId: request.user.id,
      role: request.user.role,
      ownerAccountId: request.tenantScope.ownerAccountId,
      assignedBuildingIds: request.tenantScope.assignedBuildingIds,
      assignedFlatId: request.tenantScope.assignedFlatId,
      ipAddress: request.ip,
      userAgent,
    }
  }

  /**
   * Helper to format R2 URLs.
   */
  const r2BaseUrl = fastify.env.R2_PUBLIC_BASE_URL.replace(/\/$/, '')
  const formatR2Url = (key: string | null | undefined) => {
    if (!key) return null
    if (key.startsWith('http://') || key.startsWith('https://')) return key
    return `${r2BaseUrl}/${key}`
  }

  /**
   * GET /api/buildings
   * Lists buildings with pagination. Owner and Manager can access.
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
        tags: ['Buildings'],
        summary: 'List buildings',
        description:
          'Returns a paginated list of buildings within the tenant scope.\n\n**Roles: owner, manager**',
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
                name: z.string(),
                address: z.string(),
                totalFloors: z.number().nullable(),
                whatsappGroupLink: z.string().nullable(),
                managerPhone: z.string().nullable(),
                coverImageUrl: z.string().nullable(),
                logoUrl: z.string().nullable(),
                rules: z.string().nullable(),
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
      const ctx = buildRequestContext(request)

      const result = await buildingService.listBuildings(ctx, {
        page,
        pageSize,
      })

      const formattedData = result.data.map((b) => ({
        ...b,
        coverImageUrl: formatR2Url(b.coverImageUrl),
      }))

      return reply.status(200).send({
        ...result,
        data: formattedData,
      })
    },
  )

  /**
   * POST /api/buildings
   * Creates a new building. Owner only.
   */
  fastify.post(
    '/',
    {
      preHandler: [authGuard, roleGuard(['owner']), approvalGuard, tenantScope],
      schema: {
        tags: ['Buildings'],
        summary: 'Create a building',
        description:
          "Creates a new building within the owner's tenant.\n\n**Roles: owner**",
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        body: createBuildingSchema,
        response: {
          201: z.object({
            id: z.string(),
            name: z.string(),
            address: z.string(),
            totalFloors: z.number().nullable(),
            whatsappGroupLink: z.string().nullable(),
            managerPhone: z.string().nullable(),
            coverImageUrl: z.string().nullable(),
            logoUrl: z.string().nullable(),
            rules: z.string().nullable(),
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
      const ctx = buildRequestContext(request)
      const input = request.body as {
        name: string
        address: string
        totalFloors?: number
        whatsappGroupLink?: string | null
        managerPhone?: string | null
        buildingPhoto?: string | null
        logoPhoto?: string | null
        rules?: string | null
        emergencyContacts?: Array<{
          name: string
          role: string
          phone?: string | null
          type: 'building' | 'nearby'
        }>
      }

      const building = await buildingService.createBuilding(ctx, input)

      return reply.status(201).send({
        ...building,
        coverImageUrl: formatR2Url(building.coverImageUrl),
        logoUrl: formatR2Url(building.logoUrl),
      })
    },
  )

  /**
   * GET /api/buildings/:id
   * Gets a building by ID. Owner and Manager can access.
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
        tags: ['Buildings'],
        summary: 'Get a building',
        description: 'Returns a building by ID.\n\n**Roles: owner, manager**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid building ID format'),
        }),
        response: {
          200: z.object({
            id: z.string(),
            name: z.string(),
            address: z.string(),
            totalFloors: z.number().nullable(),
            whatsappGroupLink: z.string().nullable(),
            managerPhone: z.string().nullable(),
            coverImageUrl: z.string().nullable(),
            logoUrl: z.string().nullable(),
            rules: z.string().nullable(),
            ownerAccountId: z.string(),
            createdAt: dateTimeResponseSchema,
            emergencyContacts: z
              .array(
                z.object({
                  id: z.string(),
                  buildingId: z.string(),
                  ownerAccountId: z.string(),
                  name: z.string(),
                  role: z.string(),
                  phone: z.string().nullable(),
                  type: z.enum(['building', 'nearby']),
                  sortOrder: z.number(),
                  createdAt: dateTimeResponseSchema,
                  updatedAt: dateTimeResponseSchema,
                }),
              )
              .optional(),
          }),
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const ctx = buildRequestContext(request)

      const building = await buildingService.getBuilding(ctx, id)

      return reply.status(200).send({
        ...building,
        coverImageUrl: formatR2Url(building.coverImageUrl),
        logoUrl: formatR2Url(building.logoUrl),
      })
    },
  )

  /**
   * PUT /api/buildings/:id
   * Updates a building. Owner only.
   */
  fastify.put(
    '/:id',
    {
      preHandler: [authGuard, roleGuard(['owner']), approvalGuard, tenantScope],
      schema: {
        tags: ['Buildings'],
        summary: 'Update a building',
        description:
          "Updates a building's name, address, total floors, whatsapp link, photo, or emergency contacts.\n\n**Roles: owner**",
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid building ID format'),
        }),
        body: updateBuildingSchema,
        response: {
          200: z.object({
            id: z.string(),
            name: z.string(),
            address: z.string(),
            totalFloors: z.number().nullable(),
            whatsappGroupLink: z.string().nullable(),
            managerPhone: z.string().nullable(),
            coverImageUrl: z.string().nullable(),
            logoUrl: z.string().nullable(),
            rules: z.string().nullable(),
            ownerAccountId: z.string(),
            updatedAt: dateTimeResponseSchema,
            emergencyContacts: z
              .array(
                z.object({
                  id: z.string(),
                  buildingId: z.string(),
                  ownerAccountId: z.string(),
                  name: z.string(),
                  role: z.string(),
                  phone: z.string().nullable(),
                  type: z.enum(['building', 'nearby']),
                  sortOrder: z.number(),
                  createdAt: dateTimeResponseSchema,
                  updatedAt: dateTimeResponseSchema,
                }),
              )
              .optional(),
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
      const ctx = buildRequestContext(request)
      const input = request.body as {
        name?: string
        address?: string
        totalFloors?: number | null
        whatsappGroupLink?: string | null
        managerPhone?: string | null
        buildingPhoto?: string | null
        logoPhoto?: string | null
        rules?: string | null
        emergencyContacts?: Array<{
          name: string
          role: string
          phone?: string | null
          type: 'building' | 'nearby'
        }>
      }

      const building = await buildingService.updateBuilding(ctx, id, input)

      return reply.status(200).send({
        ...building,
        coverImageUrl: formatR2Url(building.coverImageUrl),
        logoUrl: formatR2Url(building.logoUrl),
      })
    },
  )
}

export default buildingRoutes
