import {
  auditLogs,
  bills,
  buildings,
  flats,
  maintenanceRequests,
  rentalContracts,
  renters,
  users,
} from '@repo/db'
import { and, count, desc, eq, inArray, sql, sum } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { dateTimeResponseSchema, errorResponseSchema } from '../app'
import { authGuard } from '../middleware/auth-guard'
import { roleGuard } from '../middleware/role-guard'
import { tenantScope } from '../middleware/tenant-scope'

/**
 * Dashboard routes plugin.
 *
 * Provides:
 * - GET /api/dashboard/owner   — Owner summary stats + recent maintenance + recent audit
 * - GET /api/dashboard/manager — Manager assigned buildings + flats + pending maintenance
 * - GET /api/dashboard/renter  — Renter flat info + current bill + deposit + active maintenance
 */
async function dashboardRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/dashboard/owner
   * Returns: totalBuildings, totalFlats, occupiedFlats, vacantFlats,
   *          unpaidBillsTotal, recentMaintenance (5), recentAudit (5)
   */
  fastify.get(
    '/owner',
    {
      preHandler: [authGuard, roleGuard(['owner']), tenantScope],
      schema: {
        tags: ['Dashboard'],
        summary: 'Owner dashboard',
        description:
          'Returns owner summary stats including total buildings, flats, occupancy, unpaid bills, recent maintenance requests, and recent audit log entries.\n\n**Roles: owner**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        response: {
          200: z.object({
            totalBuildings: z.number(),
            totalFlats: z.number(),
            occupiedFlats: z.number(),
            vacantFlats: z.number(),
            unpaidBillsTotal: z.number(),
            recentMaintenance: z.array(
              z.object({
                id: z.string(),
                title: z.string(),
                priority: z.string(),
                status: z.string(),
                createdAt: dateTimeResponseSchema,
                flatNumber: z.string().optional(),
                buildingName: z.string().optional(),
              }),
            ),
            recentAudit: z.array(
              z.object({
                id: z.string(),
                action: z.string(),
                entityType: z.string(),
                entityId: z.string(),
                actorName: z.string(),
                createdAt: dateTimeResponseSchema,
              }),
            ),
          }),
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const db = fastify.db
      const ownerAccountId = request.tenantScope.ownerAccountId

      const [buildingRows, flatRows, unpaidRows, maintenanceRows, auditRows] =
        await Promise.all([
          // Total buildings
          db
            .select({ count: count() })
            .from(buildings)
            .where(eq(buildings.ownerAccountId, ownerAccountId)),

          // Flat counts by status
          db
            .select({ status: flats.status, count: count() })
            .from(flats)
            .where(eq(flats.ownerAccountId, ownerAccountId))
            .groupBy(flats.status),

          // Unpaid bills total
          db
            .select({
              total: sum(sql`${bills.totalAmount} - ${bills.paidAmount}`),
            })
            .from(bills)
            .where(
              and(
                eq(bills.ownerAccountId, ownerAccountId),
                inArray(bills.status, ['unpaid', 'partially_paid', 'overdue']),
              ),
            ),

          // Recent 5 maintenance requests
          db
            .select({
              id: maintenanceRequests.id,
              title: maintenanceRequests.title,
              priority: maintenanceRequests.priority,
              status: maintenanceRequests.status,
              createdAt: maintenanceRequests.createdAt,
              flatNumber: flats.flatNumber,
              buildingName: buildings.name,
            })
            .from(maintenanceRequests)
            .leftJoin(flats, eq(maintenanceRequests.flatId, flats.id))
            .leftJoin(
              buildings,
              eq(maintenanceRequests.buildingId, buildings.id),
            )
            .where(eq(maintenanceRequests.ownerAccountId, ownerAccountId))
            .orderBy(desc(maintenanceRequests.createdAt))
            .limit(5),

          // Recent 5 audit log entries with actor name
          db
            .select({
              id: auditLogs.id,
              action: auditLogs.action,
              entityType: auditLogs.entityType,
              entityId: auditLogs.entityId,
              actorId: auditLogs.actorId,
              actorName: users.name,
              createdAt: auditLogs.createdAt,
            })
            .from(auditLogs)
            .leftJoin(users, eq(auditLogs.actorId, users.id))
            .where(eq(auditLogs.ownerAccountId, ownerAccountId))
            .orderBy(desc(auditLogs.createdAt))
            .limit(5),
        ])

      const totalBuildings = buildingRows[0]?.count ?? 0

      let totalFlats = 0
      let occupiedFlats = 0
      let vacantFlats = 0
      for (const row of flatRows) {
        totalFlats += row.count
        if (row.status === 'occupied') occupiedFlats += row.count
        if (row.status === 'vacant') vacantFlats += row.count
      }

      const unpaidBillsTotal = Number(unpaidRows[0]?.total ?? 0)

      return reply.status(200).send({
        totalBuildings,
        totalFlats,
        occupiedFlats,
        vacantFlats,
        unpaidBillsTotal,
        recentMaintenance: maintenanceRows.map((r) => ({
          id: r.id,
          title: r.title,
          priority: r.priority,
          status: r.status,
          createdAt: r.createdAt,
          flatNumber: r.flatNumber ?? undefined,
          buildingName: r.buildingName ?? undefined,
        })),
        recentAudit: auditRows.map((r) => ({
          id: r.id,
          action: r.action,
          entityType: r.entityType,
          entityId: r.entityId,
          actorName: r.actorName ?? r.actorId,
          createdAt: r.createdAt,
        })),
      })
    },
  )

  /**
   * GET /api/dashboard/manager
   * Returns: assignedBuildings, flats (with occupancy), unpaidBillsTotal, pendingMaintenance
   */
  fastify.get(
    '/manager',
    {
      preHandler: [authGuard, roleGuard(['manager']), tenantScope],
      schema: {
        tags: ['Dashboard'],
        summary: 'Manager dashboard',
        description:
          'Returns manager dashboard data including assigned buildings, flats with occupancy status, unpaid bills total, and pending maintenance requests.\n\n**Roles: manager**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        response: {
          200: z.object({
            assignedBuildings: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                address: z.string(),
                totalFlats: z.number(),
              }),
            ),
            flats: z.array(
              z.object({
                id: z.string(),
                flatNumber: z.string(),
                floor: z.number(),
                status: z.string(),
                buildingName: z.string(),
              }),
            ),
            unpaidBillsTotal: z.number(),
            pendingMaintenance: z.array(
              z.object({
                id: z.string(),
                title: z.string(),
                priority: z.string(),
                status: z.string(),
                createdAt: dateTimeResponseSchema,
                flatNumber: z.string().optional(),
                buildingName: z.string().optional(),
              }),
            ),
          }),
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const db = fastify.db
      const { ownerAccountId, assignedBuildingIds = [] } = request.tenantScope

      if (assignedBuildingIds.length === 0) {
        return reply.status(200).send({
          assignedBuildings: [],
          flats: [],
          unpaidBillsTotal: 0,
          pendingMaintenance: [],
        })
      }

      const [buildingRows, flatRows, unpaidRows, maintenanceRows] =
        await Promise.all([
          // Assigned buildings with flat counts
          db
            .select({
              id: buildings.id,
              name: buildings.name,
              address: buildings.address,
              totalFlats: count(flats.id),
            })
            .from(buildings)
            .leftJoin(
              flats,
              and(
                eq(flats.buildingId, buildings.id),
                eq(flats.ownerAccountId, ownerAccountId),
              ),
            )
            .where(
              and(
                inArray(buildings.id, assignedBuildingIds),
                eq(buildings.ownerAccountId, ownerAccountId),
              ),
            )
            .groupBy(buildings.id, buildings.name, buildings.address),

          // Flats in assigned buildings
          db
            .select({
              id: flats.id,
              flatNumber: flats.flatNumber,
              floor: flats.floor,
              status: flats.status,
              buildingName: buildings.name,
            })
            .from(flats)
            .leftJoin(buildings, eq(flats.buildingId, buildings.id))
            .where(
              and(
                inArray(flats.buildingId, assignedBuildingIds),
                eq(flats.ownerAccountId, ownerAccountId),
              ),
            )
            .orderBy(buildings.name, flats.flatNumber),

          // Unpaid bills for assigned buildings
          db
            .select({
              total: sum(sql`${bills.totalAmount} - ${bills.paidAmount}`),
            })
            .from(bills)
            .innerJoin(flats, eq(bills.flatId, flats.id))
            .where(
              and(
                eq(bills.ownerAccountId, ownerAccountId),
                inArray(flats.buildingId, assignedBuildingIds),
                inArray(bills.status, ['unpaid', 'partially_paid', 'overdue']),
              ),
            ),

          // Pending maintenance in assigned buildings
          db
            .select({
              id: maintenanceRequests.id,
              title: maintenanceRequests.title,
              priority: maintenanceRequests.priority,
              status: maintenanceRequests.status,
              createdAt: maintenanceRequests.createdAt,
              flatNumber: flats.flatNumber,
              buildingName: buildings.name,
            })
            .from(maintenanceRequests)
            .leftJoin(flats, eq(maintenanceRequests.flatId, flats.id))
            .leftJoin(
              buildings,
              eq(maintenanceRequests.buildingId, buildings.id),
            )
            .where(
              and(
                eq(maintenanceRequests.ownerAccountId, ownerAccountId),
                inArray(maintenanceRequests.buildingId, assignedBuildingIds),
                inArray(maintenanceRequests.status, ['open', 'in_progress']),
              ),
            )
            .orderBy(desc(maintenanceRequests.createdAt))
            .limit(10),
        ])

      return reply.status(200).send({
        assignedBuildings: buildingRows.map((b) => ({
          id: b.id,
          name: b.name,
          address: b.address,
          totalFlats: b.totalFlats,
        })),
        flats: flatRows.map((f) => ({
          id: f.id,
          flatNumber: f.flatNumber,
          floor: f.floor,
          status: f.status,
          buildingName: f.buildingName ?? '',
        })),
        unpaidBillsTotal: Number(unpaidRows[0]?.total ?? 0),
        pendingMaintenance: maintenanceRows.map((r) => ({
          id: r.id,
          title: r.title,
          priority: r.priority,
          status: r.status,
          createdAt: r.createdAt,
          flatNumber: r.flatNumber ?? undefined,
          buildingName: r.buildingName ?? undefined,
        })),
      })
    },
  )

  /**
   * GET /api/dashboard/renter
   * Returns: flat info, currentBill, depositBalance, activeMaintenanceRequests
   */
  fastify.get(
    '/renter',
    {
      preHandler: [authGuard, roleGuard(['renter']), tenantScope],
      schema: {
        tags: ['Dashboard'],
        summary: 'Renter dashboard',
        description:
          'Returns renter dashboard data including assigned flat info, current unpaid bill, deposit balance, and active maintenance requests.\n\n**Roles: renter**',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        response: {
          200: z.object({
            flat: z
              .object({
                flatNumber: z.string(),
                floor: z.number(),
                buildingName: z.string(),
                buildingAddress: z.string(),
              })
              .nullable(),
            currentBill: z
              .object({
                id: z.string(),
                billingMonth: z.string(),
                totalAmount: z.number(),
                paidAmount: z.number(),
                status: z.string(),
              })
              .nullable(),
            depositBalance: z.number(),
            activeMaintenanceRequests: z.array(
              z.object({
                id: z.string(),
                title: z.string(),
                priority: z.string(),
                status: z.string(),
                createdAt: dateTimeResponseSchema,
              }),
            ),
          }),
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const db = fastify.db
      const { ownerAccountId, assignedFlatId } = request.tenantScope
      const userId = request.user.id

      // Find renter record
      const renterRows = await db
        .select({ id: renters.id })
        .from(renters)
        .where(
          and(
            eq(renters.userId, userId),
            eq(renters.ownerAccountId, ownerAccountId),
          ),
        )
        .limit(1)

      const renterId = renterRows[0]?.id

      if (!renterId || !assignedFlatId) {
        return reply.status(200).send({
          flat: null,
          currentBill: null,
          depositBalance: 0,
          activeMaintenanceRequests: [],
        })
      }

      const [flatRows, contractRows, billRows, maintenanceRows] =
        await Promise.all([
          // Flat + building info
          db
            .select({
              flatNumber: flats.flatNumber,
              floor: flats.floor,
              buildingName: buildings.name,
              buildingAddress: buildings.address,
            })
            .from(flats)
            .leftJoin(buildings, eq(flats.buildingId, buildings.id))
            .where(eq(flats.id, assignedFlatId))
            .limit(1),

          // Active contract for deposit balance
          db
            .select({
              remainingDepositBalance: rentalContracts.remainingDepositBalance,
            })
            .from(rentalContracts)
            .where(
              and(
                eq(rentalContracts.renterId, renterId),
                eq(rentalContracts.ownerAccountId, ownerAccountId),
                eq(rentalContracts.status, 'active'),
              ),
            )
            .limit(1),

          // Most recent unpaid/partially-paid bill
          db
            .select({
              id: bills.id,
              billingMonth: bills.billingMonth,
              totalAmount: bills.totalAmount,
              paidAmount: bills.paidAmount,
              status: bills.status,
            })
            .from(bills)
            .where(
              and(
                eq(bills.renterId, renterId),
                eq(bills.ownerAccountId, ownerAccountId),
                inArray(bills.status, ['unpaid', 'partially_paid', 'overdue']),
              ),
            )
            .orderBy(desc(bills.createdAt))
            .limit(1),

          // Active maintenance requests for this flat
          db
            .select({
              id: maintenanceRequests.id,
              title: maintenanceRequests.title,
              priority: maintenanceRequests.priority,
              status: maintenanceRequests.status,
              createdAt: maintenanceRequests.createdAt,
            })
            .from(maintenanceRequests)
            .where(
              and(
                eq(maintenanceRequests.flatId, assignedFlatId),
                eq(maintenanceRequests.ownerAccountId, ownerAccountId),
                inArray(maintenanceRequests.status, ['open', 'in_progress']),
              ),
            )
            .orderBy(desc(maintenanceRequests.createdAt)),
        ])

      const flatRow = flatRows[0]
      const contractRow = contractRows[0]
      const billRow = billRows[0]

      return reply.status(200).send({
        flat: flatRow
          ? {
              flatNumber: flatRow.flatNumber,
              floor: flatRow.floor,
              buildingName: flatRow.buildingName ?? '',
              buildingAddress: flatRow.buildingAddress ?? '',
            }
          : null,
        currentBill: billRow
          ? {
              id: billRow.id,
              billingMonth: billRow.billingMonth,
              totalAmount: Number(billRow.totalAmount),
              paidAmount: Number(billRow.paidAmount),
              status: billRow.status,
            }
          : null,
        depositBalance: Number(contractRow?.remainingDepositBalance ?? 0),
        activeMaintenanceRequests: maintenanceRows.map((r) => ({
          id: r.id,
          title: r.title,
          priority: r.priority,
          status: r.status,
          createdAt: r.createdAt,
        })),
      })
    },
  )
}

export default dashboardRoutes
