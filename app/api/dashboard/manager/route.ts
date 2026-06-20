import { withAuth } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { bills, buildings, flats, maintenanceRequests } from "@repo/db";
import { and, count, desc, eq, inArray, sql, sum } from "drizzle-orm";
import { NextResponse } from "next/server";

export const GET = withAuth(
	async (_req, ctx) => {
		const { ownerAccountId, assignedBuildingIds = [] } = ctx.tenantScope;

		try {
			if (assignedBuildingIds.length === 0) {
				return NextResponse.json({
					assignedBuildings: [],
					flats: [],
					unpaidBillsTotal: 0,
					pendingMaintenance: [],
				});
			}

			const [buildingRows, flatRows, unpaidRows, maintenanceRows] =
				await Promise.all([
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
						.where(
							and(
								eq(maintenanceRequests.ownerAccountId, ownerAccountId),
								inArray(maintenanceRequests.buildingId, assignedBuildingIds),
								inArray(maintenanceRequests.status, ["open", "in_progress"]),
							),
						)
						.orderBy(desc(maintenanceRequests.createdAt))
						.limit(10),
				]);

			return NextResponse.json({
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
					buildingName: f.buildingName ?? "",
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
			});
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["manager"] },
);
