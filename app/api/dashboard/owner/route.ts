import { withAuth } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import {
	auditLogs,
	bills,
	buildings,
	flats,
	maintenanceRequests,
	users,
} from "@repo/db";
import { and, count, desc, eq, inArray, sql, sum } from "drizzle-orm";
import { NextResponse } from "next/server";

export const GET = withAuth(
	async (_req, ctx) => {
		const ownerAccountId = ctx.tenantScope.ownerAccountId;

		try {
			const [buildingRows, flatRows, unpaidRows, maintenanceRows, auditRows] =
				await Promise.all([
					db
						.select({ count: count() })
						.from(buildings)
						.where(eq(buildings.ownerAccountId, ownerAccountId)),
					db
						.select({ status: flats.status, count: count() })
						.from(flats)
						.where(eq(flats.ownerAccountId, ownerAccountId))
						.groupBy(flats.status),
					db
						.select({
							total: sum(sql`${bills.totalAmount} - ${bills.paidAmount}`),
						})
						.from(bills)
						.where(
							and(
								eq(bills.ownerAccountId, ownerAccountId),
								inArray(bills.status, ["unpaid", "partially_paid", "overdue"]),
							),
						),
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
				]);

			const totalBuildings = buildingRows[0]?.count ?? 0;

			let totalFlats = 0;
			let occupiedFlats = 0;
			let vacantFlats = 0;
			for (const row of flatRows) {
				totalFlats += row.count;
				if (row.status === "occupied") occupiedFlats += row.count;
				if (row.status === "vacant") vacantFlats += row.count;
			}

			const unpaidBillsTotal = Number(unpaidRows[0]?.total ?? 0);

			return NextResponse.json({
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
			});
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner"] },
);
