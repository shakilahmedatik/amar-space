import {
	type DatabaseOrTransaction,
	bills,
	buildings,
	flats,
	payments,
	rentalContracts,
	renters,
} from "@repo/db";
import type { PaymentMethod } from "@repo/shared/constants";
import { type SQL, and, count, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { BaseRepository, type ScopeContext } from "./scoped-query";

export interface ListPaymentsFilters {
	billId?: string;
	renterId?: string;
	startDate?: string;
	endDate?: string;
	paymentMethod?: PaymentMethod;
}

export class PaymentRepository extends BaseRepository {
	findById(id: string, ownerAccountId: string) {
		return this.db.query.payments.findFirst({
			where: and(
				eq(payments.id, id),
				eq(payments.ownerAccountId, ownerAccountId),
			),
		});
	}

	findByIdWithAccess(id: string, scope: ScopeContext) {
		const conditions: SQL[] = [eq(payments.id, id)];
		if (scope.role !== "superadmin") {
			conditions.push(eq(payments.ownerAccountId, scope.ownerAccountId));
		}
		return this.db.query.payments.findFirst({
			where: and(...conditions),
		});
	}

	list(
		scope: ScopeContext,
		filters: ListPaymentsFilters,
		page: number,
		pageSize: number,
	) {
		const offset = (page - 1) * pageSize;

		const conditions: SQL[] = [];
		if (scope.role !== "superadmin") {
			conditions.push(eq(payments.ownerAccountId, scope.ownerAccountId));
		}
		if (scope.role === "renter" && scope.assignedFlatId) {
			conditions.push(eq(bills.flatId, scope.assignedFlatId));
		}
		if (
			scope.role === "manager" &&
			scope.assignedBuildingIds &&
			scope.assignedBuildingIds.length > 0
		) {
			conditions.push(inArray(flats.buildingId, scope.assignedBuildingIds));
		}
		if (filters.billId) {
			conditions.push(eq(payments.billId, filters.billId));
		}
		if (filters.startDate) {
			conditions.push(gte(payments.paymentDate, filters.startDate));
		}
		if (filters.endDate) {
			conditions.push(lte(payments.paymentDate, filters.endDate));
		}
		if (filters.paymentMethod) {
			conditions.push(eq(payments.paymentMethod, filters.paymentMethod));
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		return Promise.all([
			this.db
				.select({
					id: payments.id,
					ownerAccountId: payments.ownerAccountId,
					billId: payments.billId,
					receiptReference: payments.receiptReference,
					amount: payments.amount,
					paymentDate: payments.paymentDate,
					paymentMethod: payments.paymentMethod,
					note: payments.note,
					createdAt: payments.createdAt,
					renterName: renters.fullName,
					flatNumber: flats.flatNumber,
					buildingName: buildings.name,
					billingMonth: bills.billingMonth,
				})
				.from(payments)
				.leftJoin(bills, eq(payments.billId, bills.id))
				.leftJoin(flats, eq(bills.flatId, flats.id))
				.leftJoin(buildings, eq(flats.buildingId, buildings.id))
				.leftJoin(renters, eq(bills.renterId, renters.id))
				.where(whereClause)
				.orderBy(desc(payments.createdAt))
				.limit(pageSize)
				.offset(offset),
			this.db
				.select({ count: count() })
				.from(payments)
				.leftJoin(bills, eq(payments.billId, bills.id))
				.where(whereClause),
		]);
	}

	create(data: typeof payments.$inferInsert, tx?: DatabaseOrTransaction) {
		const client = this.txOrDb(tx);
		return client.insert(payments).values(data).returning();
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

	findBillById(id: string, ownerAccountId: string) {
		return this.db.query.bills.findFirst({
			where: and(eq(bills.id, id), eq(bills.ownerAccountId, ownerAccountId)),
		});
	}

	findActiveContractForRenter(renterId: string, ownerAccountId: string) {
		return this.db.query.rentalContracts.findFirst({
			where: and(
				eq(rentalContracts.renterId, renterId),
				eq(rentalContracts.ownerAccountId, ownerAccountId),
				eq(rentalContracts.status, "active"),
			),
		});
	}
}
