import { flats } from '@repo/db'
import type { FlatStatus } from '@repo/shared/constants'
import type { RequestContext, UserRole } from '@repo/shared/types'
import {
  createFlatSchema,
  flatStatusEnum,
  updateFlatSchema,
} from '@repo/shared/validation'
import { and, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { approvalGuard } from '../../middleware/approval-guard'
import { authGuard } from '../../middleware/auth-guard'
import { roleGuard } from '../../middleware/role-guard'
import { tenantScope } from '../../middleware/tenant-scope'
import { FlatService } from '../../services/flat'
import {
  dateTimeResponseSchema,
  errorResponseSchema,
} from '../../utils/schemas'

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
 * - Manager: create, read, update status only (no update/delete)
 */
async function flatRoutes(fastify: FastifyInstance) {
  const flatService = new FlatService(fastify.db, fastify.auditLogger)

  /**
   * Helper to build RequestContext from the Fastify request.
   */
  function buildRequestContext(request: {
    user: {
      id: string
      role: UserRole
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
   * Reusable flat object Zod schema for response serialization.
   */
  const flatObjectSchema = z.object({
    id: z.string(),
    flatNumber: z.string(),
    floor: z.number(),
    status: flatStatusEnum,
    buildingId: z.string(),
    ownerAccountId: z.string(),
    createdAt: dateTimeResponseSchema,
  })

  /**
   * GET /api/flats
   * Lists flats with optional buildingId and status filters, plus pagination.
   * Owner and Manager can access.
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
        tags: ['Flats'],
        summary: 'List flats',
        description:
          'Returns paginated flats with optional buildingId and status filters.\n\n**Roles: owner, manager**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        querystring: z.object({
          buildingId: z.string().uuid().optional(),
          status: flatStatusEnum.optional(),
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(20),
        }),
        response: {
          200: z.object({
            data: z.array(
              flatObjectSchema.extend({
                buildingName: z.string().nullable(),
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
   * Creates a new flat. Owner and Manager.
   */
  fastify.post(
    '/',
    {
      preHandler: [authGuard, roleGuard(['owner', 'manager']), approvalGuard, tenantScope],
      schema: {
        tags: ['Flats'],
        summary: 'Create a flat',
        description: 'Creates a new flat in a building.\n\n**Roles: owner, manager**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        body: createFlatSchema,
        response: {
          201: flatObjectSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
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
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Flats'],
        summary: 'Get a flat',
        description: 'Returns a flat by ID.\n\n**Roles: owner, manager**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid flat ID format'),
        }),
        response: {
          200: flatObjectSchema.extend({
            buildingName: z.string().nullable(),
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

      const flat = await fastify.db.query.flats.findFirst({
        where: and(
          eq(flats.id, id),
          eq(flats.ownerAccountId, ctx.ownerAccountId),
        ),
        with: {
          building: {
            columns: { name: true },
          },
        },
      })

      if (!flat) {
        return reply.status(404).send({
          requestId: request.id,
          statusCode: 404,
          error: 'Not Found',
          message: 'Flat not found',
        })
      }

      return reply.status(200).send({
        ...flat,
        buildingName: flat.building?.name ?? null,
        building: undefined,
      })
    },
  )

  /**
   * PUT /api/flats/:id
   * Updates a flat's properties. Owner only.
   */
  fastify.put(
    '/:id',
    {
      preHandler: [authGuard, roleGuard(['owner']), approvalGuard, tenantScope],
      schema: {
        tags: ['Flats'],
        summary: 'Update a flat',
        description:
          "Updates a flat's number, floor, or status.\n\n**Roles: owner**",
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid flat ID format'),
        }),
        body: updateFlatSchema,
        response: {
          200: flatObjectSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
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
      preHandler: [authGuard, roleGuard(['owner']), approvalGuard, tenantScope],
      schema: {
        tags: ['Flats'],
        summary: 'Delete a flat',
        description:
          'Deletes a flat. Only allowed when the flat is vacant.\n\n**Roles: owner**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid flat ID format'),
        }),
        response: {
          204: z.null(),
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const ctx = buildRequestContext(request as never)

      await flatService.deleteFlat(ctx, id)

      return reply.status(204).send(null)
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
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Flats'],
        summary: 'Transition flat status',
        description:
          "Transitions a flat's status according to the state machine (vacant → occupied → maintenance → vacant).\n\n**Roles: owner, manager**",
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid flat ID format'),
        }),
        body: z.object({
          status: flatStatusEnum,
        }),
        response: {
          200: flatObjectSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
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
