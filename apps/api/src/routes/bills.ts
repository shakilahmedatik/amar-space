import type { BillStatus } from '@repo/shared/constants'
import type { RequestContext } from '@repo/shared/types'
import {
  addUtilityChargeSchema,
  billStatusEnum,
  generateBillsSchema,
} from '@repo/shared/validation'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { dateTimeResponseSchema, errorResponseSchema } from '../app'
import { authGuard } from '../middleware/auth-guard'
import { roleGuard } from '../middleware/role-guard'
import { tenantScope } from '../middleware/tenant-scope'
import { BillingService } from '../services/billing'

/**
 * Billing routes plugin.
 *
 * Provides:
 * - GET /api/bills — List bills with filters and pagination
 * - POST /api/bills/generate — Generate monthly bills for occupied flats
 * - GET /api/bills/:id — Get a bill with line items and payments
 * - POST /api/bills/:id/charges — Add a utility charge to a bill
 *
 * Access control:
 * - Owner: full access (list, generate, view, add charges)
 * - Manager: list and view bills for assigned buildings, generate and add charges
 * - Renter: list and view own bills only
 *
 * Requirements: 7.6, 7.7, 7.8, 7.14
 */
async function billRoutes(fastify: FastifyInstance) {
  const billingService = new BillingService(fastify.db, fastify.auditLogger)

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
   * GET /api/bills
   * Lists bills with multi-field filters and pagination.
   * Owner sees all, Manager sees assigned buildings, Renter sees own bills.
   *
   * Requirements: 7.6, 7.7, 7.8, 7.11
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
        tags: ['Bills'],
        summary: 'List bills',
        description:
          'Returns paginated bills with optional filters by building, flat, renter, billing month, and status.\n\n**Roles: owner, manager, renter**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        querystring: z.object({
          buildingId: z.string().uuid().optional(),
          flatId: z.string().uuid().optional(),
          renterId: z.string().uuid().optional(),
          billingMonth: z
            .string()
            .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
            .optional(),
          status: billStatusEnum.optional(),
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(20),
        }),
        response: {
          200: z.object({
            data: z.array(
              z.object({
                id: z.string(),
                billingMonth: z.string(),
                totalAmount: z.number(),
                paidAmount: z.number(),
                status: z.enum(['unpaid', 'partially_paid', 'paid', 'overdue']),
                flatId: z.string(),
                renterId: z.string(),
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
        buildingId,
        flatId,
        renterId,
        billingMonth,
        status,
        page,
        pageSize,
      } = request.query as {
        buildingId?: string
        flatId?: string
        renterId?: string
        billingMonth?: string
        status?: BillStatus
        page: number
        pageSize: number
      }
      const ctx = buildRequestContext(request as never)

      const result = await billingService.listBills(
        ctx,
        { buildingId, flatId, renterId, billingMonth, status },
        { page, pageSize },
      )

      return reply.status(200).send(result)
    },
  )

  /**
   * POST /api/bills/generate
   * Generates monthly bills for all occupied flats in a given month.
   * Owner and Manager only.
   *
   * Requirements: 7.1, 7.14
   */
  fastify.post(
    '/generate',
    {
      preHandler: [authGuard, roleGuard(['owner', 'manager']), tenantScope],
      schema: {
        tags: ['Bills'],
        summary: 'Generate monthly bills',
        description:
          'Generates monthly bills for all occupied flats in the specified billing month. Idempotent — skips flats that already have a bill for the month.\n\n**Roles: owner, manager**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        body: generateBillsSchema,
        response: {
          201: z.object({
            generated: z.number(),
            skipped: z.number(),
            billingMonth: z.string(),
          }),
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const ctx = buildRequestContext(request as never)
      const { billingMonth } = request.body as { billingMonth: string }

      const result = await billingService.generateBills(ctx, billingMonth)

      return reply.status(201).send(result)
    },
  )

  /**
   * GET /api/bills/:id
   * Gets a bill with its line items and payments.
   * Owner sees all, Manager sees assigned buildings, Renter sees own bills.
   *
   * Requirements: 7.6, 7.7, 7.8
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
        tags: ['Bills'],
        summary: 'Get a bill',
        description:
          'Returns a bill with its line items and payment history.\n\n**Roles: owner, manager, renter**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid bill ID format'),
        }),
        response: {
          200: z.object({
            id: z.string(),
            billingMonth: z.string(),
            totalAmount: z.number(),
            paidAmount: z.number(),
            status: z.enum(['unpaid', 'partially_paid', 'paid', 'overdue']),
            flatId: z.string(),
            renterId: z.string(),
            ownerAccountId: z.string(),
            createdAt: dateTimeResponseSchema,
            lineItems: z.array(
              z.object({
                id: z.string(),
                description: z.string(),
                amount: z.number(),
                createdAt: dateTimeResponseSchema,
              }),
            ),
            payments: z.array(
              z.object({
                id: z.string(),
                amount: z.number(),
                paidAt: dateTimeResponseSchema,
                method: z.string(),
              }),
            ),
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

      const bill = await billingService.getBill(ctx, id)

      return reply.status(200).send(bill)
    },
  )

  /**
   * POST /api/bills/:id/charges
   * Adds a utility charge (line item) to a bill.
   * Owner and Manager only.
   *
   * Requirements: 7.2, 7.14
   */
  fastify.post(
    '/:id/charges',
    {
      preHandler: [authGuard, roleGuard(['owner', 'manager']), tenantScope],
      schema: {
        tags: ['Bills'],
        summary: 'Add utility charge',
        description:
          'Adds a utility charge (line item) to a bill. The bill total is updated automatically.\n\n**Roles: owner, manager**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid bill ID format'),
        }),
        body: addUtilityChargeSchema,
        response: {
          201: z.object({
            id: z.string(),
            billId: z.string(),
            description: z.string(),
            amount: z.number(),
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
      const charge = request.body as { description: string; amount: number }

      const lineItem = await billingService.addUtilityCharge(ctx, id, charge)

      return reply.status(201).send(lineItem)
    },
  )
}

export default billRoutes
