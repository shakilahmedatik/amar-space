import {
	type Database,
	type DatabaseOrTransaction,
	rentalContracts,
	renterAccessCodes,
	renters,
} from "@repo/db";
import { type SQL, and, count, desc, eq, ilike } from "drizzle-orm";
import { BaseRepository, type ScopeContext } from "./scoped-query";

export class RenterRepository extends BaseRepository {
	findById(id: string, ownerAccountId: string, tx?: DatabaseOrTransaction) {
		const client = this.txOrDb(tx);
		return client.query.renters.findFirst({
			where: and(
				eq(renters.id, id),
				eq(renters.ownerAccountId, ownerAccountId),
			),
			with: {
				user: { columns: { id: true, email: true, isActive: true } },
			},
		});
	}

	findByIdWithAccess(id: string, scope: ScopeContext) {
		const conditions: SQL[] = [eq(renters.id, id)];
		if (scope.role !== "superadmin") {
			conditions.push(eq(renters.ownerAccountId, scope.ownerAccountId));
		}
		return this.db.query.renters.findFirst({
			where: and(...conditions),
			with: {
				user: { columns: { id: true, email: true, isActive: true } },
			},
		});
	}

	list(
		scope: ScopeContext,
		filters: {
			buildingId?: string;
			status?: string;
			search?: string;
		},
		page: number,
		pageSize: number,
		tx?: DatabaseOrTransaction,
	) {
		const client = this.txOrDb(tx);
		const offset = (page - 1) * pageSize;

		const conditions: SQL[] = [];
		if (scope.role !== "superadmin") {
			conditions.push(eq(renters.ownerAccountId, scope.ownerAccountId));
		}
		if (filters.search) {
			conditions.push(ilike(renters.fullName, `%${filters.search}%`));
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		return Promise.all([
			client
				.select()
				.from(renters)
				.where(whereClause)
				.orderBy(desc(renters.createdAt))
				.limit(pageSize)
				.offset(offset),
			client.select({ count: count() }).from(renters).where(whereClause),
		]);
	}

	findByUserId(userId: string) {
		return this.db.query.renters.findFirst({
			where: eq(renters.userId, userId),
		});
	}

	findActiveContract(renterId: string, ownerAccountId: string) {
		return this.db.query.rentalContracts.findFirst({
			where: and(
				eq(rentalContracts.renterId, renterId),
				eq(rentalContracts.ownerAccountId, ownerAccountId),
				eq(rentalContracts.status, "active"),
			),
		});
	}

	create(data: typeof renters.$inferInsert, tx?: DatabaseOrTransaction) {
		const client = this.txOrDb(tx);
		return client.insert(renters).values(data).returning();
	}

	update(
		id: string,
		data: Partial<typeof renters.$inferInsert>,
		tx?: DatabaseOrTransaction,
	) {
		const client = this.txOrDb(tx);
		return client
			.update(renters)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(renters.id, id))
			.returning();
	}

	deleteRenter(id: string, tx?: DatabaseOrTransaction) {
		const client = this.txOrDb(tx);
		return client.delete(renters).where(eq(renters.id, id));
	}

	findAccessCode(renterId: string, flatId: string) {
		return this.db.query.renterAccessCodes.findFirst({
			where: and(
				eq(renterAccessCodes.renterId, renterId),
				eq(renterAccessCodes.flatId, flatId),
			),
		});
	}
}
