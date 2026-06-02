import type { RequestContext, UserRole } from '@repo/shared/types'
import { applyAdjustmentSchema } from '@repo/shared/validation'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { approvalGuard } from '../../middleware/approval-guard'
import { authGuard } from '../../middleware/auth-guard'
import { roleGuard } from '../../middleware/role-guard'
import { tenantScope } from '../../middleware/tenant-scope'
import { DepositService } from '../../services/deposit'
import {
  dateTimeResponseSchema,
  errorResponseSchema,
} from '../../utils/schemas'

/**
 * Deposit routes plugin.
 *
 * Provides:
 * - GET /api/deposits/:contractId — Get deposit balance for a contract
 * - POST /api/deposits/:contractId/adjust — Apply advance adjustment (Owner only)
 * - GET /api/deposits/:contractId/history — List adjustments for a contract
 *
 * Access control:
 * - Owner: full access (view, adjust)
 * - Manager: view deposits for assigned buildings
 * - Renter: view own deposit balance and history
 */
async function depositRoutes(fastify: FastifyInstance) {
  const depositService = new DepositService(fastify.db, fastify.auditLogger)

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
   * GET /api/deposits/:contractId
   * Gets the deposit balance for a rental contract.
   * Owner sees all, Manager sees assigned buildings, Renter sees own.
   */
  fastify.get(
    '/:contractId',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Deposits'],
        summary: 'Get deposit balance',
        description:
          'Returns the deposit balance for a rental contract.\n\n**Roles: owner, manager, renter**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          contractId: z.string().uuid('Invalid contract ID format'),
        }),
        response: {
          200: z.object({
            contractId: z.string(),
            initialAmount: z.number(),
            remainingBalance: z.number(),
            totalAdjusted: z.number(),
          }),
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { contractId } = request.params as { contractId: string }
      const ctx = buildRequestContext(request as never)

      const deposit = await depositService.getDeposit(ctx, contractId)

      return reply.status(200).send({
        contractId: deposit.contractId,
        initialAmount: Number.parseFloat(deposit.securityDepositAmount),
        remainingBalance: Number.parseFloat(deposit.remainingDepositBalance),
        totalAdjusted:
          Number.parseFloat(deposit.securityDepositAmount) -
          Number.parseFloat(deposit.remainingDepositBalance),
      })
    },
  )

  /**
   * POST /api/deposits/:contractId/adjust
   * Applies an advance adjustment against a contract's deposit balance.
   * Owner only.
   */
  fastify.post(
    '/:contractId/adjust',
    {
      preHandler: [authGuard, roleGuard(['owner']), approvalGuard, tenantScope],
      schema: {
        tags: ['Deposits'],
        summary: 'Apply deposit adjustment',
        description:
          "Applies an advance adjustment against a contract's deposit balance. Can be linked to a specific bill.\n\n**Roles: owner**",
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          contractId: z.string().uuid('Invalid contract ID format'),
        }),
        body: applyAdjustmentSchema,
        response: {
          201: z.object({
            id: z.string(),
            contractId: z.string(),
            amount: z.number(),
            billId: z.string().nullable(),
            note: z.string().nullable(),
            createdAt: dateTimeResponseSchema,
          }),
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { contractId } = request.params as { contractId: string }
      const ctx = buildRequestContext(request as never)
      const data = request.body as {
        amount: number
        billId?: string
        note?: string
      }

      const adjustment = await depositService.applyAdjustment(
        ctx,
        contractId,
        data,
      )

      return reply.status(201).send({
        id: adjustment.id,
        contractId: adjustment.contractId,
        amount: Number.parseFloat(adjustment.amount),
        billId: adjustment.billId,
        note: adjustment.note,
        createdAt: adjustment.createdAt,
      })
    },
  )

  /**
   * GET /api/deposits/:contractId/history
   * Lists all adjustments for a contract with pagination.
   * Owner sees all, Manager sees assigned buildings, Renter sees own.
   */
  fastify.get(
    '/:contractId/history',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Deposits'],
        summary: 'List deposit adjustments',
        description:
          'Returns a paginated history of deposit adjustments for a rental contract.\n\n**Roles: owner, manager, renter**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          contractId: z.string().uuid('Invalid contract ID format'),
        }),
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(20),
        }),
        response: {
          200: z.object({
            data: z.array(
              z.object({
                id: z.string(),
                contractId: z.string(),
                amount: z.number(),
                billId: z.string().nullable(),
                note: z.string().nullable(),
                createdAt: dateTimeResponseSchema,
              }),
            ),
            total: z.number(),
            page: z.number(),
            pageSize: z.number(),
          }),
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { contractId } = request.params as { contractId: string }
      const { page, pageSize } = request.query as {
        page: number
        pageSize: number
      }
      const ctx = buildRequestContext(request as never)

      const result = await depositService.listAdjustments(ctx, contractId, {
        page,
        pageSize,
      })

      return reply.status(200).send({
        data: result.data.map((adj) => ({
          id: adj.id,
          contractId: adj.contractId,
          amount: Number.parseFloat(adj.amount),
          billId: adj.billId,
          note: adj.note,
          createdAt: adj.createdAt,
        })),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      })
    },
  )
}

export default depositRoutes
