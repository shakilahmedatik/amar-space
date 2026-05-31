import type { PaymentMethod } from '@repo/shared/constants'
import type { RequestContext } from '@repo/shared/types'
import { paymentMethodEnum, recordPaymentSchema } from '@repo/shared/validation'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { approvalGuard } from '../../middleware/approval-guard'
import { authGuard } from '../../middleware/auth-guard'
import { roleGuard } from '../../middleware/role-guard'
import { tenantScope } from '../../middleware/tenant-scope'
import { PaymentService } from '../../services/payment'
import {
  dateTimeResponseSchema,
  errorResponseSchema,
} from '../../utils/schemas'

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
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Payments'],
        summary: 'List payments',
        description:
          'Returns paginated payments with optional filters by bill, renter, date range, and payment method.\n\n**Roles: owner, manager, renter**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
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
          pageSize: z.coerce.number().int().min(1).max(100).default(20),
        }),
        response: {
          200: z.object({
            data: z.array(
              z.object({
                id: z.string(),
                billId: z.string(),
                amount: z.number(),
                paymentDate: z.string(),
                paymentMethod: z.enum([
                  'cash',
                  'bank_transfer',
                  'mobile_banking',
                  'cheque',
                ]),
                note: z.string().nullable(),
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

      return reply.status(200).send({
        data: result.data.map((p) => ({
          id: p.id,
          billId: p.billId,
          amount: Number.parseFloat(p.amount),
          paymentDate: p.paymentDate,
          paymentMethod: p.paymentMethod as
            | 'cash'
            | 'bank_transfer'
            | 'mobile_banking'
            | 'cheque',
          note: p.note,
          ownerAccountId: p.ownerAccountId,
          createdAt: p.createdAt,
        })),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      })
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
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Payments'],
        summary: 'Record a payment',
        description:
          "Records a payment against a bill. Automatically updates the bill's paid amount and status.\n\n**Roles: owner, manager**",
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        body: recordPaymentSchema,
        response: {
          201: z.object({
            id: z.string(),
            billId: z.string(),
            amount: z.number(),
            paymentDate: z.string(),
            paymentMethod: z.enum([
              'cash',
              'bank_transfer',
              'mobile_banking',
              'cheque',
            ]),
            note: z.string().nullable(),
            ownerAccountId: z.string(),
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
      const ctx = buildRequestContext(request as never)
      const data = request.body as {
        billId: string
        amount: number
        paymentDate: string
        paymentMethod: PaymentMethod
        note?: string
      }

      const payment = await paymentService.recordPayment(ctx, data)

      return reply.status(201).send({
        id: payment.id,
        billId: payment.billId,
        amount: Number.parseFloat(payment.amount),
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod as
          | 'cash'
          | 'bank_transfer'
          | 'mobile_banking'
          | 'cheque',
        note: payment.note,
        ownerAccountId: payment.ownerAccountId,
        createdAt: payment.createdAt,
      })
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
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Payments'],
        summary: 'Get a payment',
        description:
          'Returns a payment receipt by ID.\n\n**Roles: owner, manager, renter**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid payment ID format'),
        }),
        response: {
          200: z.object({
            id: z.string(),
            billId: z.string(),
            amount: z.number(),
            paymentDate: z.string(),
            paymentMethod: z.enum([
              'cash',
              'bank_transfer',
              'mobile_banking',
              'cheque',
            ]),
            note: z.string().nullable(),
            ownerAccountId: z.string(),
            createdAt: dateTimeResponseSchema,
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

      const payment = await paymentService.getPayment(ctx, id)

      return reply.status(200).send({
        id: payment.id,
        billId: payment.billId,
        amount: Number.parseFloat(payment.amount),
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod as
          | 'cash'
          | 'bank_transfer'
          | 'mobile_banking'
          | 'cheque',
        note: payment.note,
        ownerAccountId: payment.ownerAccountId,
        createdAt: payment.createdAt,
      })
    },
  )
}

export default paymentRoutes
