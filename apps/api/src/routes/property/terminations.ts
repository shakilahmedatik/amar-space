import { CONTRACT_STATUS } from '@repo/shared/constants'
import type { RequestContext, UserRole } from '@repo/shared/types'
import {
  processDepositRefundSchema,
  scheduleTerminationSchema,
} from '@repo/shared/validation'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { approvalGuard } from '../../middleware/approval-guard'
import { authGuard } from '../../middleware/auth-guard'
import { roleGuard } from '../../middleware/role-guard'
import { tenantScope } from '../../middleware/tenant-scope'
import { DepositService } from '../../services/deposit'
import { TerminationService } from '../../services/termination.service'
import {
  dateTimeResponseSchema,
  errorResponseSchema,
} from '../../utils/schemas'

async function terminationRoutes(fastify: FastifyInstance) {
  const terminationService = new TerminationService(
    fastify.db,
    fastify.auditLogger,
  )
  const depositService = new DepositService(fastify.db, fastify.auditLogger)

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
   * POST /api/renters/:id/terminate
   * Schedule a contract termination for a renter.
   * Owner or Manager can access.
   */
  fastify.post(
    '/:id/terminate',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Terminations'],
        summary: 'Schedule termination',
        description:
          "Schedule a renter's contract termination. The effective date is always the last day of the specified month.\n\n**Roles: owner, manager**",
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid renter ID format'),
        }),
        body: scheduleTerminationSchema,
        response: {
          200: z.object({
            contractId: z.string(),
            status: z.string(),
            scheduledTerminationDate: z.string().nullable(),
            noticeGivenAt: z.string().nullable(),
            terminationReason: z.string().nullable(),
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
      const ctx = buildRequestContext(request as never)
      const body = request.body as {
        terminationMonth: string
        reason?: string
      }

      const result = await terminationService.scheduleTermination(ctx, id, body)

      return reply.status(200).send({
        contractId: result.contractId,
        status: result.status,
        scheduledTerminationDate: result.scheduledTerminationDate,
        noticeGivenAt: result.noticeGivenAt?.toISOString() ?? null,
        terminationReason: result.terminationReason,
      })
    },
  )

  /**
   * DELETE /api/renters/:id/termination
   * Cancel a scheduled termination.
   * Owner or Manager can access.
   */
  fastify.delete(
    '/:id/termination',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Terminations'],
        summary: 'Cancel termination',
        description:
          "Cancel a renter's scheduled contract termination, reverting status to active.\n\n**Roles: owner, manager**",
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid renter ID format'),
        }),
        response: {
          200: z.object({
            contractId: z.string(),
            status: z.string(),
            scheduledTerminationDate: z.string().nullable(),
            noticeGivenAt: z.string().nullable(),
            terminationReason: z.string().nullable(),
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
      const ctx = buildRequestContext(request as never)

      const result = await terminationService.cancelTermination(ctx, id)

      return reply.status(200).send({
        contractId: result.contractId,
        status: result.status,
        scheduledTerminationDate: result.scheduledTerminationDate,
        noticeGivenAt: result.noticeGivenAt?.toISOString() ?? null,
        terminationReason: result.terminationReason,
      })
    },
  )

  /**
   * POST /api/renters/:id/execute-termination
   * Execute a pending termination (owner only).
   */
  fastify.post(
    '/:id/execute-termination',
    {
      preHandler: [authGuard, roleGuard(['owner']), approvalGuard, tenantScope],
      schema: {
        tags: ['Terminations'],
        summary: 'Execute termination',
        description:
          "Execute a pending contract termination. Sets contract to terminated, flat to vacant, and deactivates the renter's account.\n\n**Roles: owner**",
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid renter ID format'),
        }),
        response: {
          200: z.object({
            contractId: z.string(),
            status: z.string(),
            scheduledTerminationDate: z.string().nullable(),
            noticeGivenAt: z.string().nullable(),
            terminationReason: z.string().nullable(),
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
      const ctx = buildRequestContext(request as never)

      const result = await terminationService.executeTermination(ctx, id)

      return reply.status(200).send({
        contractId: result.contractId,
        status: result.status,
        scheduledTerminationDate: result.scheduledTerminationDate,
        noticeGivenAt: result.noticeGivenAt?.toISOString() ?? null,
        terminationReason: result.terminationReason,
      })
    },
  )

  /**
   * GET /api/renters/:id/deposit-refund
   * Get deposit refund calculation for a terminated contract.
   */
  fastify.get(
    '/:id/deposit-refund',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Terminations'],
        summary: 'Get deposit refund calculation',
        description:
          'Calculate the deposit refund amount for a terminated or pending-termination contract. Shows remaining balance minus outstanding bills.\n\n**Roles: owner, manager**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid renter ID format'),
        }),
        response: {
          200: z.object({
            contractId: z.string(),
            securityDepositAmount: z.number(),
            remainingDepositBalance: z.number(),
            outstandingBillTotal: z.number(),
            suggestedRefund: z.number(),
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

      // Look up the renter's terminated/pending_termination contract
      const renter = await fastify.db.query.renters.findFirst({
        where: (renters, { and, eq }) =>
          and(
            eq(renters.id, id),
            eq(renters.ownerAccountId, ctx.ownerAccountId),
          ),
      })

      if (!renter) {
        return reply.status(404).send({
          requestId: 'unknown',
          statusCode: 404,
          error: 'Not Found',
          message: 'Renter not found',
        })
      }

      const contract = await fastify.db.query.rentalContracts.findFirst({
        where: (contracts, { and, eq, inArray }) =>
          and(
            eq(contracts.renterId, id),
            eq(contracts.ownerAccountId, ctx.ownerAccountId),
            inArray(contracts.status, [
              CONTRACT_STATUS.TERMINATED,
              CONTRACT_STATUS.PENDING_TERMINATION,
            ]),
          ),
      })

      if (!contract) {
        return reply.status(404).send({
          requestId: 'unknown',
          statusCode: 404,
          error: 'Not Found',
          message: 'No terminated or pending termination contract found',
        })
      }

      const result = await terminationService.getDepositRefund(ctx, contract.id)

      return reply.status(200).send({
        contractId: result.contractId,
        securityDepositAmount: Number.parseFloat(result.securityDepositAmount),
        remainingDepositBalance: Number.parseFloat(
          result.remainingDepositBalance,
        ),
        outstandingBillTotal: Number.parseFloat(result.outstandingBillTotal),
        suggestedRefund: Number.parseFloat(result.suggestedRefund),
      })
    },
  )

  /**
   * POST /api/renters/:id/refund-deposit
   * Process a deposit refund for a terminated contract.
   */
  fastify.post(
    '/:id/refund-deposit',
    {
      preHandler: [authGuard, roleGuard(['owner']), approvalGuard, tenantScope],
      schema: {
        tags: ['Terminations'],
        summary: 'Process deposit refund',
        description:
          'Process a deposit refund for a terminated contract. Deducts the specified amount from the remaining deposit balance.\n\n**Roles: owner**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid renter ID format'),
        }),
        body: processDepositRefundSchema,
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
      const { id } = request.params as { id: string }
      const ctx = buildRequestContext(request as never)
      const body = request.body as { refundAmount: number; note?: string }

      // Look up the renter's terminated contract
      const renter = await fastify.db.query.renters.findFirst({
        where: (renters, { and, eq }) =>
          and(
            eq(renters.id, id),
            eq(renters.ownerAccountId, ctx.ownerAccountId),
          ),
      })

      if (!renter) {
        return reply.status(404).send({
          requestId: 'unknown',
          statusCode: 404,
          error: 'Not Found',
          message: 'Renter not found',
        })
      }

      const contract = await fastify.db.query.rentalContracts.findFirst({
        where: (contracts, { and, eq, inArray }) =>
          and(
            eq(contracts.renterId, id),
            eq(contracts.ownerAccountId, ctx.ownerAccountId),
            inArray(contracts.status, [
              CONTRACT_STATUS.TERMINATED,
              CONTRACT_STATUS.PENDING_TERMINATION,
            ]),
          ),
      })

      if (!contract) {
        return reply.status(404).send({
          requestId: 'unknown',
          statusCode: 404,
          error: 'Not Found',
          message: 'No terminated or pending termination contract found',
        })
      }

      const result = await depositService.processDepositRefund(
        ctx,
        contract.id,
        body.refundAmount,
        body.note,
      )

      return reply.status(201).send({
        id: result.id,
        contractId: result.contractId,
        amount: Number.parseFloat(result.amount),
        billId: result.billId,
        note: result.note,
        createdAt: result.createdAt,
      })
    },
  )
}

export default terminationRoutes
