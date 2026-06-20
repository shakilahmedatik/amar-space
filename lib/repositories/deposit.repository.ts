import {
	type Database,
	type DatabaseOrTransaction,
	advanceAdjustments,
	bills,
	rentalContracts,
} from "@repo/db";
import { type SQL, and, count, desc, eq } from "drizzle-orm";
import { BaseRepository, type ScopeContext } from "./scoped-query";

export class DepositRepository extends BaseRepository {
	findContractById(id: string, ownerAccountId: string) {
		return this.db.query.rentalContracts.findFirst({
			where: and(
				eq(rentalContracts.id, id),
				eq(rentalContracts.ownerAccountId, ownerAccountId),
			),
		});
	}

	findContractWithRenter(contractId: string, ownerAccountId: string) {
		return this.db.query.rentalContracts.findFirst({
			where: and(
				eq(rentalContracts.id, contractId),
				eq(rentalContracts.ownerAccountId, ownerAccountId),
			),
			with: {
				renter: true,
				flat: {
					with: {
						building: true,
					},
				},
			},
		});
	}

	findBillById(id: string, ownerAccountId: string) {
		return this.db.query.bills.findFirst({
			where: and(eq(bills.id, id), eq(bills.ownerAccountId, ownerAccountId)),
		});
	}

	updateContractBalance(
		contractId: string,
		newBalance: string,
		tx?: DatabaseOrTransaction,
	) {
		const client = this.txOrDb(tx);
		return client
			.update(rentalContracts)
			.set({
				remainingDepositBalance: newBalance,
				updatedAt: new Date(),
			})
			.where(eq(rentalContracts.id, contractId))
			.returning();
	}

	updateBillPaidAmount(
		billId: string,
		paidAmount: string,
		status: import("@repo/shared/constants").BillStatus,
		tx?: DatabaseOrTransaction,
	) {
		const client = this.txOrDb(tx);
		return client
			.update(bills)
			.set({
				paidAmount,
				status,
				updatedAt: new Date(),
			})
			.where(eq(bills.id, billId))
			.returning();
	}

	createAdjustment(
		data: typeof advanceAdjustments.$inferInsert,
		tx?: DatabaseOrTransaction,
	) {
		const client = this.txOrDb(tx);
		return client.insert(advanceAdjustments).values(data).returning();
	}

	listAdjustments(
		scope: ScopeContext,
		contractId: string,
		page: number,
		pageSize: number,
	) {
		const offset = (page - 1) * pageSize;

		const conditions: SQL[] = [eq(advanceAdjustments.contractId, contractId)];

		if (scope.role !== "superadmin") {
			conditions.push(
				eq(advanceAdjustments.ownerAccountId, scope.ownerAccountId),
			);
		}

		const whereClause = and(...conditions);

		return Promise.all([
			this.db
				.select({
					id: advanceAdjustments.id,
					ownerAccountId: advanceAdjustments.ownerAccountId,
					contractId: advanceAdjustments.contractId,
					amount: advanceAdjustments.amount,
					billId: advanceAdjustments.billId,
					note: advanceAdjustments.note,
					adjustedBy: advanceAdjustments.adjustedBy,
					createdAt: advanceAdjustments.createdAt,
				})
				.from(advanceAdjustments)
				.where(whereClause)
				.orderBy(desc(advanceAdjustments.createdAt))
				.limit(pageSize)
				.offset(offset),
			this.db
				.select({ count: count() })
				.from(advanceAdjustments)
				.where(whereClause),
		]);
	}
}
