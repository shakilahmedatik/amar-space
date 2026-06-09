import type { BillStatus } from '@repo/shared/constants'
import type { RequestContext, UserRole } from '@repo/shared/types'
import {
  addUtilityChargeSchema,
  billStatusEnum,
  generateBillForContractSchema,
  generateBillsSchema,
} from '@repo/shared/validation'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { approvalGuard } from '../../middleware/approval-guard'
import { authGuard } from '../../middleware/auth-guard'
import { roleGuard } from '../../middleware/role-guard'
import { tenantScope } from '../../middleware/tenant-scope'
import { BillingService } from '../../services/billing'
import {
  dateTimeResponseSchema,
  errorResponseSchema,
} from '../../utils/schemas'

const billItemSchema = z.object({
  id: z.string(),
  ownerAccountId: z.string(),
  contractId: z.string(),
  flatId: z.string(),
  renterId: z.string(),
  billingMonth: z.string(),
  dueDate: z.string(),
  baseRent: z.number(),
  rentDays: z.number().nullable(),
  totalDaysInMonth: z.number().nullable(),
  monthlyRent: z.number(),
  totalAmount: z.number(),
  paidAmount: z.number(),
  status: z.enum(['unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled']),
  flatNumber: z.string(),
  buildingName: z.string(),
  renterName: z.string(),
  createdAt: dateTimeResponseSchema,
})

async function billRoutes(fastify: FastifyInstance) {
  const billingService = new BillingService(fastify.db, fastify.auditLogger)

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
   * GET /api/bills
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
        tags: ['Bills'],
        summary: 'List bills',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        querystring: z.object({
          buildingId: z.string().uuid().optional(),
          flatId: z.string().uuid().optional(),
          renterId: z.string().uuid().optional(),
          contractId: z.string().uuid().optional(),
          billingMonth: z
            .string()
            .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
            .optional(),
          status: z.union([billStatusEnum, z.array(billStatusEnum)]).optional(),
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(20),
        }),
        response: {
          200: z.object({
            data: z.array(billItemSchema),
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
        contractId,
        billingMonth,
        status,
        page,
        pageSize,
      } = request.query as {
        buildingId?: string
        flatId?: string
        renterId?: string
        contractId?: string
        billingMonth?: string
        status?: BillStatus | BillStatus[]
        page: number
        pageSize: number
      }
      const ctx = buildRequestContext(request as never)

      const result = await billingService.listBills(
        ctx,
        { buildingId, flatId, renterId, contractId, billingMonth, status },
        { page, pageSize },
      )

      return reply.status(200).send({
        data: result.data.map((bill) => ({
          id: bill.id,
          ownerAccountId: bill.ownerAccountId,
          contractId: bill.contractId,
          flatId: bill.flatId,
          renterId: bill.renterId,
          billingMonth: bill.billingMonth,
          dueDate: bill.dueDate,
          baseRent: Number.parseFloat(bill.baseRent),
          rentDays: bill.rentDays,
          totalDaysInMonth: bill.totalDaysInMonth,
          monthlyRent: Number.parseFloat(bill.monthlyRent),
          totalAmount: Number.parseFloat(bill.totalAmount),
          paidAmount: Number.parseFloat(bill.paidAmount),
          status: bill.status as
            | 'unpaid'
            | 'partially_paid'
            | 'paid'
            | 'overdue'
            | 'cancelled',
          flatNumber: bill.flatNumber,
          buildingName: bill.buildingName,
          renterName: bill.renterName,
          createdAt: bill.createdAt,
        })),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      })
    },
  )

  /**
   * POST /api/bills/generate
   * Generates monthly bills for all occupied flats.
   */
  fastify.post(
    '/generate',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
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

      return reply.status(201).send({
        generated: result.generated,
        skipped: result.skipped.length,
        billingMonth,
      })
    },
  )

  /**
   * POST /api/bills/generate/:contractId
   * Generates a bill for a specific contract and month.
   */
  fastify.post(
    '/generate/:contractId',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Bills'],
        summary: 'Generate bill for a contract',
        description:
          'Generates a bill for a specific rental contract for the given billing month. Calculates prorated rent if the contract started mid-month.\n\n**Roles: owner, manager**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          contractId: z.string().uuid('Invalid contract ID format'),
        }),
        body: generateBillForContractSchema,
        response: {
          201: billItemSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { contractId } = request.params as { contractId: string }
      const { billingMonth } = request.body as { billingMonth: string }
      const ctx = buildRequestContext(request as never)

      const bill = await billingService.generateBillForContract(
        ctx,
        contractId,
        billingMonth,
      )

      return reply.status(201).send({
        id: bill.id,
        ownerAccountId: bill.ownerAccountId,
        contractId: bill.contractId,
        flatId: bill.flatId,
        renterId: bill.renterId,
        billingMonth: bill.billingMonth,
        dueDate: bill.dueDate,
        baseRent: Number.parseFloat(bill.baseRent),
        rentDays: bill.rentDays,
        totalDaysInMonth: bill.totalDaysInMonth,
        monthlyRent: Number.parseFloat(bill.monthlyRent),
        totalAmount: Number.parseFloat(bill.totalAmount),
        paidAmount: Number.parseFloat(bill.paidAmount),
        status: bill.status as
          | 'unpaid'
          | 'partially_paid'
          | 'paid'
          | 'overdue'
          | 'cancelled',
        flatNumber: bill.flatNumber,
        buildingName: bill.buildingName,
        renterName: bill.renterName,
        createdAt: bill.createdAt,
      })
    },
  )

  /**
   * GET /api/bills/:id
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
            contractId: z.string(),
            billingMonth: z.string(),
            dueDate: z.string(),
            baseRent: z.number(),
            rentDays: z.number().nullable(),
            totalDaysInMonth: z.number().nullable(),
            monthlyRent: z.number(),
            totalAmount: z.number(),
            paidAmount: z.number(),
            remainingBalance: z.number(),
            status: z.enum([
              'unpaid',
              'partially_paid',
              'paid',
              'overdue',
              'cancelled',
            ]),
            flatId: z.string(),
            flatNumber: z.string(),
            buildingName: z.string(),
            renterId: z.string(),
            renterName: z.string(),
            ownerAccountId: z.string(),
            createdAt: dateTimeResponseSchema,
            updatedAt: dateTimeResponseSchema,
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
                receiptReference: z.string(),
                note: z.string().nullable(),
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
      const totalAmount = Number.parseFloat(bill.totalAmount)
      const paidAmount = Number.parseFloat(bill.paidAmount)

      return reply.status(200).send({
        id: bill.id,
        contractId: bill.contractId,
        billingMonth: bill.billingMonth,
        dueDate: bill.dueDate,
        baseRent: Number.parseFloat(bill.baseRent),
        rentDays: bill.rentDays,
        totalDaysInMonth: bill.totalDaysInMonth,
        monthlyRent: Number.parseFloat(bill.monthlyRent),
        totalAmount,
        paidAmount,
        remainingBalance: totalAmount - paidAmount,
        status: bill.status as
          | 'unpaid'
          | 'partially_paid'
          | 'paid'
          | 'overdue'
          | 'cancelled',
        flatId: bill.flatId,
        flatNumber: bill.flatNumber,
        buildingName: bill.buildingName,
        renterId: bill.renterId,
        renterName: bill.renterName,
        ownerAccountId: bill.ownerAccountId,
        createdAt: bill.createdAt,
        updatedAt: bill.updatedAt,
        lineItems: bill.lineItems.map((item) => ({
          id: item.id,
          description: item.description,
          amount: Number.parseFloat(item.amount),
          createdAt: item.createdAt,
        })),
        payments: bill.payments.map((payment) => ({
          id: payment.id,
          amount: Number.parseFloat(payment.amount),
          paidAt: new Date(payment.paymentDate),
          method: payment.paymentMethod,
          receiptReference: payment.receiptReference,
          note: payment.note,
        })),
      })
    },
  )

  /**
   * POST /api/bills/:id/charges
   */
  fastify.post(
    '/:id/charges',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
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

      return reply.status(201).send({
        id: lineItem.id,
        billId: lineItem.billId,
        description: lineItem.description,
        amount: Number.parseFloat(lineItem.amount),
        createdAt: lineItem.createdAt,
      })
    },
  )

  /**
   * DELETE /api/bills/:id
   */
  fastify.delete(
    '/:id',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Bills'],
        summary: 'Delete a bill',
        description:
          'Deletes a bill along with its line items and payment records inside a transaction.\n\n**Roles: owner, manager**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid bill ID format'),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            message: z.string(),
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

      await billingService.deleteBill(ctx, id)

      return reply.status(200).send({
        success: true,
        message:
          '\u09AC\u09BF\u09B2\u099F\u09BF \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09A1\u09BF\u09B2\u09BF\u099F \u0995\u09B0\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964',
      })
    },
  )
}

export default billRoutes
