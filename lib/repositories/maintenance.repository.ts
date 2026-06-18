import {
	type Database,
	type DatabaseOrTransaction,
	buildings,
	flats,
	maintenanceAttachments,
	maintenanceComments,
	maintenanceRequests,
	rentalContracts,
	renters,
} from "@repo/db";
import type { MaintenanceStatus, Priority } from "@repo/shared/constants";
import { type SQL, and, count, desc, eq, inArray } from "drizzle-orm";
import { BaseRepository, type ScopeContext } from "./scoped-query";

export interface ListMaintenanceFilters {
	buildingId?: string;
	flatId?: string;
	status?: MaintenanceStatus;
	priority?: Priority;
}

export class MaintenanceRepository extends BaseRepository {
	findById(id: string, ownerAccountId: string, tx?: DatabaseOrTransaction) {
		const client = this.txOrDb(tx);
		return client.query.maintenanceRequests.findFirst({
			where: and(
				eq(maintenanceRequests.id, id),
				eq(maintenanceRequests.ownerAccountId, ownerAccountId),
			),
			with: {
				flat: { columns: { id: true, flatNumber: true } },
				renter: { columns: { id: true, fullName: true } },
				attachments: true,
				comments: {
					orderBy: (mc, { asc }) => [asc(mc.createdAt)],
					with: {
						author: { columns: { id: true, name: true } },
					},
				},
			},
		});
	}

	findByIdWithAccess(id: string, scope: ScopeContext) {
		const conditions: SQL[] = [eq(maintenanceRequests.id, id)];
		if (scope.role !== "superadmin") {
			conditions.push(
				eq(maintenanceRequests.ownerAccountId, scope.ownerAccountId),
			);
		}
		if (
			scope.role === "manager" &&
			scope.assignedBuildingIds &&
			scope.assignedBuildingIds.length > 0
		) {
			conditions.push(
				inArray(maintenanceRequests.buildingId, scope.assignedBuildingIds),
			);
		}
		if (scope.role === "renter" && scope.assignedFlatId) {
			conditions.push(eq(maintenanceRequests.flatId, scope.assignedFlatId));
		}

		return this.db.query.maintenanceRequests.findFirst({
			where: and(...conditions),
			with: {
				flat: { columns: { id: true, flatNumber: true } },
				renter: { columns: { id: true, fullName: true } },
				attachments: true,
				comments: {
					orderBy: (mc, { asc }) => [asc(mc.createdAt)],
					with: {
						author: { columns: { id: true, name: true } },
					},
				},
			},
		});
	}

	list(
		scope: ScopeContext,
		filters: ListMaintenanceFilters,
		page: number,
		pageSize: number,
	) {
		const client = this.db;
		const offset = (page - 1) * pageSize;

		const conditions: SQL[] = [];
		if (scope.role !== "superadmin") {
			conditions.push(
				eq(maintenanceRequests.ownerAccountId, scope.ownerAccountId),
			);
		}
		if (
			scope.role === "manager" &&
			scope.assignedBuildingIds &&
			scope.assignedBuildingIds.length > 0
		) {
			conditions.push(
				inArray(maintenanceRequests.buildingId, scope.assignedBuildingIds),
			);
		}
		if (scope.role === "renter" && scope.assignedFlatId) {
			conditions.push(eq(maintenanceRequests.flatId, scope.assignedFlatId));
		}
		if (filters.buildingId) {
			conditions.push(eq(maintenanceRequests.buildingId, filters.buildingId));
		}
		if (filters.flatId) {
			conditions.push(eq(maintenanceRequests.flatId, filters.flatId));
		}
		if (filters.status) {
			conditions.push(eq(maintenanceRequests.status, filters.status));
		}
		if (filters.priority) {
			conditions.push(eq(maintenanceRequests.priority, filters.priority));
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		return Promise.all([
			client
				.select({
					id: maintenanceRequests.id,
					ownerAccountId: maintenanceRequests.ownerAccountId,
					flatId: maintenanceRequests.flatId,
					renterId: maintenanceRequests.renterId,
					buildingId: maintenanceRequests.buildingId,
					title: maintenanceRequests.title,
					description: maintenanceRequests.description,
					priority: maintenanceRequests.priority,
					status: maintenanceRequests.status,
					createdAt: maintenanceRequests.createdAt,
					updatedAt: maintenanceRequests.updatedAt,
					flatNumber: flats.flatNumber,
					renterName: renters.fullName,
				})
				.from(maintenanceRequests)
				.leftJoin(flats, eq(maintenanceRequests.flatId, flats.id))
				.leftJoin(renters, eq(maintenanceRequests.renterId, renters.id))
				.where(whereClause)
				.orderBy(desc(maintenanceRequests.createdAt))
				.limit(pageSize)
				.offset(offset),
			client
				.select({ count: count() })
				.from(maintenanceRequests)
				.where(whereClause),
		]);
	}

	create(
		data: typeof maintenanceRequests.$inferInsert,
		tx?: DatabaseOrTransaction,
	) {
		const client = this.txOrDb(tx);
		return client.insert(maintenanceRequests).values(data).returning();
	}

	update(
		id: string,
		data: Partial<typeof maintenanceRequests.$inferInsert>,
		tx?: DatabaseOrTransaction,
	) {
		const client = this.txOrDb(tx);
		return client
			.update(maintenanceRequests)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(maintenanceRequests.id, id))
			.returning();
	}

	delete(id: string, tx?: DatabaseOrTransaction) {
		const client = this.txOrDb(tx);
		return client
			.delete(maintenanceRequests)
			.where(eq(maintenanceRequests.id, id));
	}

	insertAttachments(
		data: (typeof maintenanceAttachments.$inferInsert)[],
		tx?: DatabaseOrTransaction,
	) {
		const client = this.txOrDb(tx);
		if (data.length === 0) return [];
		return client.insert(maintenanceAttachments).values(data).returning();
	}

	insertComment(
		data: typeof maintenanceComments.$inferInsert,
		tx?: DatabaseOrTransaction,
	) {
		const client = this.txOrDb(tx);
		return client.insert(maintenanceComments).values(data).returning();
	}

	findRenterByUserId(userId: string) {
		return this.db.query.renters.findFirst({
			where: eq(renters.userId, userId),
		});
	}

	findActiveContractForFlat(flatId: string, ownerAccountId: string) {
		return this.db.query.rentalContracts.findFirst({
			where: and(
				eq(rentalContracts.flatId, flatId),
				eq(rentalContracts.ownerAccountId, ownerAccountId),
				eq(rentalContracts.status, "active"),
			),
		});
	}

	findFlatById(flatId: string, ownerAccountId: string) {
		return this.db.query.flats.findFirst({
			where: and(
				eq(flats.id, flatId),
				eq(flats.ownerAccountId, ownerAccountId),
			),
		});
	}

	findBuildingById(buildingId: string, ownerAccountId: string) {
		return this.db.query.buildings.findFirst({
			where: and(
				eq(buildings.id, buildingId),
				eq(buildings.ownerAccountId, ownerAccountId),
			),
		});
	}
}
