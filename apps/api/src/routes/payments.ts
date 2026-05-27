import type { PaymentMethod } from '@repo/shared/constants'
import type { RequestContext } from '@repo/shared/types'
import { paymentMethodEnum, recordPaymentSchema } from '@repo/shared/validation'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authGuard } from '../middleware/auth-guard'
import { roleGuard } from '../middleware/role-guard'
import { tenantScope } from '../middleware/tenant-scope'
import { PaymentService } from '../services/payment'

/**
 * Payment routes plugin.
 *
 * Provides:
 * - GET /api/payments — List payments with filters and pagination
 * - POST /api/payments — Record a payment against a bill
 * - GET /api/payments/:id — Get a payment receipt
 *
 * Access control:
 * - Owner: full access (list, record, view)
 * - Manager: list and view payments for assigned buildings, record payments
 * - Renter: list and view own payments only (cannot record)
 *
 * Requirements: 8.6, 8.9
 */
async function paymentRoutes(fastify: FastifyInstance) {
  const paymentService = new PaymentService(fastify.db, fastify.auditLogger)

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
   * GET /api/payments
   * Lists payments with filters and pagination.
   * Owner sees all, Manager sees assigned buildings, Renter sees own payments.
   *
   * Requirements: 8.6, 8.9
   */
  fastify.get(
    '/',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager', 'renter']),
        tenantScope,
      ],
      schema: {
        querystring: z.object({
          billId: z.string().uuid().optional(),
          renterId: z.string().uuid().optional(),
          startDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(),
          endDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(),
          paymentMethod: paymentMethodEnum.optional(),
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(50).default(20),
        }),
      },
    },
    async (request, reply) => {
      const {
        billId,
        renterId,
        startDate,
        endDate,
        paymentMethod,
        page,
        pageSize,
      } = request.query as {
        billId?: string
        renterId?: string
        startDate?: string
        endDate?: string
        paymentMethod?: PaymentMethod
        page: number
        pageSize: number
      }
      const ctx = buildRequestContext(request as never)

      const result = await paymentService.listPayments(
        ctx,
        { billId, renterId, startDate, endDate, paymentMethod },
        { page, pageSize },
      )

      return reply.status(200).send(result)
    },
  )

  /**
   * POST /api/payments
   * Records a payment against a bill.
   * Owner and Manager only.
   *
   * Requirements: 8.1, 8.6
   */
  fastify.post(
    '/',
    {
      preHandler: [authGuard, roleGuard(['owner', 'manager']), tenantScope],
      schema: {
        body: recordPaymentSchema,
      },
    },
    async (request, reply) => {
      const ctx = buildRequestContext(request as never)
      const data = request.body as {
        billId: string
        amount: number
        paymentDate: string
        paymentMethod: PaymentMethod
        note?: string
      }

      const payment = await paymentService.recordPayment(ctx, data)

      return reply.status(201).send(payment)
    },
  )

  /**
   * GET /api/payments/:id
   * Gets a payment receipt by ID.
   * Owner sees all, Manager sees assigned buildings, Renter sees own payments.
   *
   * Requirements: 8.6, 8.8
   */
  fastify.get(
    '/:id',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager', 'renter']),
        tenantScope,
      ],
      schema: {
        params: z.object({
          id: z.string().uuid('Invalid payment ID format'),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const ctx = buildRequestContext(request as never)

      const payment = await paymentService.getPayment(ctx, id)

      return reply.status(200).send(payment)
    },
  )
}

export default paymentRoutes
