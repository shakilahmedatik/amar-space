import type { RequestContext } from '@repo/shared/types'
import {
  createBuildingSchema,
  updateBuildingSchema,
} from '@repo/shared/validation'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authGuard } from '../middleware/auth-guard'
import { roleGuard } from '../middleware/role-guard'
import { tenantScope } from '../middleware/tenant-scope'
import { BuildingService } from '../services/building'

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
 *
 * Requirements: 5.5, 6.7, 6.8
 */
async function buildingRoutes(fastify: FastifyInstance) {
  const buildingService = new BuildingService(fastify.db, fastify.auditLogger)

  /**
   * Helper to build RequestContext from the Fastify request.
   */
  function buildRequestContext(request: {
    user: {
      id: string
      role: 'owner' | 'manager' | 'renter'
      ownerAccountId: string
    }
    tenantScope: { ownerAccountId: string; assignedBuildingIds?: string[] }
    ip: string
    headers: Record<string, string | string[] | undefined>
  }): RequestContext {
    return {
      userId: request.user.id,
      role: request.user.role,
      ownerAccountId: request.tenantScope.ownerAccountId,
      assignedBuildingIds: request.tenantScope.assignedBuildingIds,
      ipAddress: request.ip,
      userAgent: (request.headers['user-agent'] as string) || '',
    }
  }

  /**
   * GET /api/buildings
   * Lists buildings with pagination. Owner and Manager can access.
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

      const result = await buildingService.listBuildings(ctx, {
        page,
        pageSize,
      })

      return reply.status(200).send(result)
    },
  )

  /**
   * POST /api/buildings
   * Creates a new building. Owner only.
   */
  fastify.post(
    '/',
    {
      preHandler: [authGuard, roleGuard(['owner']), tenantScope],
      schema: {
        body: createBuildingSchema,
      },
    },
    async (request, reply) => {
      const ctx = buildRequestContext(request as never)
      const input = request.body as {
        name: string
        address: string
        totalFloors?: number
      }

      const building = await buildingService.createBuilding(ctx, input)

      return reply.status(201).send(building)
    },
  )

  /**
   * GET /api/buildings/:id
   * Gets a building by ID. Owner and Manager can access.
   */
  fastify.get(
    '/:id',
    {
      preHandler: [authGuard, roleGuard(['owner', 'manager']), tenantScope],
      schema: {
        params: z.object({
          id: z.string().uuid('Invalid building ID format'),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const ctx = buildRequestContext(request as never)

      const building = await buildingService.getBuilding(ctx, id)

      return reply.status(200).send(building)
    },
  )

  /**
   * PUT /api/buildings/:id
   * Updates a building. Owner only.
   */
  fastify.put(
    '/:id',
    {
      preHandler: [authGuard, roleGuard(['owner']), tenantScope],
      schema: {
        params: z.object({
          id: z.string().uuid('Invalid building ID format'),
        }),
        body: updateBuildingSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const ctx = buildRequestContext(request as never)
      const input = request.body as {
        name?: string
        address?: string
        totalFloors?: number | null
      }

      const building = await buildingService.updateBuilding(ctx, id, input)

      return reply.status(200).send(building)
    },
  )
}

export default buildingRoutes
