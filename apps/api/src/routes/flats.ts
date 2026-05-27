import { flats } from '@repo/db'
import type { FlatStatus } from '@repo/shared/constants'
import type { RequestContext } from '@repo/shared/types'
import {
  createFlatSchema,
  flatStatusEnum,
  updateFlatSchema,
} from '@repo/shared/validation'
import { and, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authGuard } from '../middleware/auth-guard'
import { roleGuard } from '../middleware/role-guard'
import { tenantScope } from '../middleware/tenant-scope'
import { FlatService } from '../services/flat'

/**
 * Flat routes plugin.
 *
 * Provides:
 * - GET /api/flats — List flats with optional filters
 * - POST /api/flats — Create a new flat
 * - GET /api/flats/:id — Get a flat by ID
 * - PUT /api/flats/:id — Update a flat
 * - DELETE /api/flats/:id — Delete a flat
 * - PUT /api/flats/:id/status — Transition flat status
 *
 * Access control:
 * - Owner: full access (create, read, update, delete, status transition)
 * - Manager: read, update status only (no create/delete)
 *
 * Requirements: 5.5, 6.7, 6.8, 6.9
 */
async function flatRoutes(fastify: FastifyInstance) {
  const flatService = new FlatService(fastify.db, fastify.auditLogger)

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
   * GET /api/flats
   * Lists flats with optional buildingId and status filters, plus pagination.
   * Owner and Manager can access.
   */
  fastify.get(
    '/',
    {
      preHandler: [authGuard, roleGuard(['owner', 'manager']), tenantScope],
      schema: {
        querystring: z.object({
          buildingId: z.string().uuid().optional(),
          status: flatStatusEnum.optional(),
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(50).default(20),
        }),
      },
    },
    async (request, reply) => {
      const { buildingId, status, page, pageSize } = request.query as {
        buildingId?: string
        status?: FlatStatus
        page: number
        pageSize: number
      }
      const ctx = buildRequestContext(request as never)

      const result = await flatService.listFlats(ctx, {
        buildingId,
        status,
        page,
        pageSize,
      })

      return reply.status(200).send(result)
    },
  )

  /**
   * POST /api/flats
   * Creates a new flat. Owner only.
   */
  fastify.post(
    '/',
    {
      preHandler: [authGuard, roleGuard(['owner']), tenantScope],
      schema: {
        body: createFlatSchema,
      },
    },
    async (request, reply) => {
      const ctx = buildRequestContext(request as never)
      const input = request.body as {
        buildingId: string
        flatNumber: string
        floor: number
      }

      const flat = await flatService.createFlat(ctx, input)

      return reply.status(201).send(flat)
    },
  )

  /**
   * GET /api/flats/:id
   * Gets a flat by ID. Owner and Manager can access.
   */
  fastify.get(
    '/:id',
    {
      preHandler: [authGuard, roleGuard(['owner', 'manager']), tenantScope],
      schema: {
        params: z.object({
          id: z.string().uuid('Invalid flat ID format'),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const ctx = buildRequestContext(request as never)

      const flat = await fastify.db.query.flats.findFirst({
        where: and(
          eq(flats.id, id),
          eq(flats.ownerAccountId, ctx.ownerAccountId),
        ),
      })

      if (!flat) {
        return reply.status(404).send({
          requestId: request.id,
          statusCode: 404,
          error: 'Not Found',
          message: 'Flat not found',
        })
      }

      return reply.status(200).send(flat)
    },
  )

  /**
   * PUT /api/flats/:id
   * Updates a flat's properties. Owner only.
   */
  fastify.put(
    '/:id',
    {
      preHandler: [authGuard, roleGuard(['owner']), tenantScope],
      schema: {
        params: z.object({
          id: z.string().uuid('Invalid flat ID format'),
        }),
        body: updateFlatSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const ctx = buildRequestContext(request as never)
      const input = request.body as {
        flatNumber?: string
        floor?: number
        status?: FlatStatus
      }

      const flat = await flatService.updateFlat(ctx, id, input)

      return reply.status(200).send(flat)
    },
  )

  /**
   * DELETE /api/flats/:id
   * Deletes a flat. Owner only.
   */
  fastify.delete(
    '/:id',
    {
      preHandler: [authGuard, roleGuard(['owner']), tenantScope],
      schema: {
        params: z.object({
          id: z.string().uuid('Invalid flat ID format'),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const ctx = buildRequestContext(request as never)

      await flatService.deleteFlat(ctx, id)

      return reply.status(204).send()
    },
  )

  /**
   * PUT /api/flats/:id/status
   * Transitions flat status according to the state machine.
   * Owner and Manager can access.
   */
  fastify.put(
    '/:id/status',
    {
      preHandler: [authGuard, roleGuard(['owner', 'manager']), tenantScope],
      schema: {
        params: z.object({
          id: z.string().uuid('Invalid flat ID format'),
        }),
        body: z.object({
          status: flatStatusEnum,
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const ctx = buildRequestContext(request as never)
      const { status } = request.body as { status: FlatStatus }

      const flat = await flatService.transitionStatus(ctx, id, status)

      return reply.status(200).send(flat)
    },
  )
}

export default flatRoutes
