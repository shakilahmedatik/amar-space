import type { IAuditLogger } from "@/lib/shared/types";
import { getActiveContractForRenter } from "./helpers/renter-context";
import {
	type Database,
	advanceAdjustments,
	billLineItems,
	bills,
	flats,
	payments,
	rentalContracts,
	renters,
} from "@repo/db";
import {
	BILL_STATUS,
	type BillStatus,
	FLAT_STATUS,
	ROLES,
} from "@repo/shared/constants";
import {
	ForbiddenError,
	NotFoundError,
	ValidationError,
} from "@repo/shared/errors";
import type { PaginationInput, RequestContext } from "@repo/shared/types";
import {
	type AddUtilityChargeInput,
	addUtilityChargeSchema,
	billingMonthSchema,
	validateOrThrow,
} from "@repo/shared/validation";
import { and, count, eq, inArray, sql } from "drizzle-orm";

import {
	BillingRepository,
	type ListBillsFilters as RepoListBillsFilters,
	type ScopeContext,
} from "../repositories";
import {
	calculateDueDate,
	calculateRentForMonth,
	getDefaultLineItems,
} from "../utils/bill-calculation";

export interface BillResult {
	id: string;
	ownerAccountId: string;
	contractId: string;
	flatId: string;
	renterId: string;
	billingMonth: string;
	dueDate: string;
	baseRent: string;
	rentDays: number | null;
	totalDaysInMonth: number | null;
	monthlyRent: string;
	totalAmount: string;
	paidAmount: string;
	status: string;
	createdAt: Date;
	updatedAt: Date;
	flatNumber: string;
	buildingName: string;
	renterName: string;
}

export interface MapToBillResultInput {
	id: string;
	ownerAccountId: string;
	contractId: string;
	flatId: string;
	renterId: string;
	billingMonth: string;
	dueDate: string | null;
	baseRent: string;
	rentDays: number | null;
	totalDaysInMonth: number | null;
	monthlyRent: string | null;
	totalAmount: string;
	paidAmount: string;
	status: string;
	createdAt: Date;
	updatedAt: Date;
	flatNumber?: string | null;
	buildingName?: string | null;
	renterName?: string | null;
	flat?: {
		flatNumber: string;
		building?: {
			name: string;
		} | null;
	} | null;
	renter?: {
		fullName: string;
	} | null;
}

export interface BillWithDetails extends BillResult {
	lineItems: LineItemResult[];
	payments: PaymentResult[];
}

export interface LineItemResult {
	id: string;
	billId: string;
	description: string;
	amount: string;
	createdAt: Date;
}

export interface PaymentResult {
	id: string;
	billId: string;
	receiptReference: string;
	amount: string;
	paymentDate: string;
	paymentMethod: string;
	note: string | null;
	createdAt: Date;
}

export interface ListBillsFilters {
	buildingId?: string;
	flatId?: string;
	renterId?: string;
	contractId?: string;
	billingMonth?: string;
	status?: BillStatus | BillStatus[];
}

export interface PaginatedBills {
	data: BillResult[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

export interface GenerateBillsResult {
	generated: number;
	skipped: { flatId: string; reason: string }[];
}

export class BillingService {
	private billingRepo: BillingRepository;
	constructor(
		private db: Database,
		private auditLogger: IAuditLogger,
	) {
		this.billingRepo = new BillingRepository(db);
	}

	/**
	 * Generates a bill for a single contract for a given billing month.
	 * Calculates prorated rent if contract started mid-month.
	 * Auto-adds line items from contract defaults (gas, water, service, other).
	 */
	async generateBillForContract(
		ctx: RequestContext,
		contractId: string,
		billingMonth: string,
	): Promise<BillResult> {
		if (ctx.role === "renter") {
			throw new ForbiddenError();
		}

		validateOrThrow(billingMonthSchema, billingMonth);

		const contract = await this.db.query.rentalContracts.findFirst({
			where: and(
				eq(rentalContracts.id, contractId),
				eq(rentalContracts.ownerAccountId, ctx.ownerAccountId),
				inArray(rentalContracts.status, ["active", "pending_termination"]),
			),
		});

		if (!contract) {
			throw new NotFoundError("Contract");
		}

		if (ctx.role === ROLES.MANAGER && ctx.assignedBuildingIds) {
			const flat = await this.db.query.flats.findFirst({
				where: eq(flats.id, contract.flatId),
			});
			if (!flat || !ctx.assignedBuildingIds.includes(flat.buildingId)) {
				throw new NotFoundError("Contract");
			}
		}

		const existingBill = await this.billingRepo.findExistingBill(
			contract.flatId,
			billingMonth,
		);
		if (existingBill) {
			throw new ValidationError([
				{
					field: "billingMonth",
					message: `A bill already exists for this flat in ${billingMonth}`,
					rule: "duplicate",
				},
			]);
		}

		const rentCalc = calculateRentForMonth(
			contract.monthlyRent,
			contract.startDate,
			billingMonth,
		);
		const dueDate = calculateDueDate(billingMonth);

		const lineItemsData = getDefaultLineItems(contract);
		let totalAmountVal = Number.parseFloat(rentCalc.baseRent);
		for (const item of lineItemsData) {
			totalAmountVal += Number.parseFloat(item.amount);
		}

		let newBill: typeof bills.$inferSelect | undefined;
		try {
			const [inserted] = await this.db
				.insert(bills)
				.values({
					ownerAccountId: ctx.ownerAccountId,
					contractId: contract.id,
					flatId: contract.flatId,
					renterId: contract.renterId,
					billingMonth,
					dueDate,
					baseRent: rentCalc.baseRent,
					rentDays: rentCalc.rentDays,
					totalDaysInMonth: rentCalc.totalDaysInMonth,
					monthlyRent: contract.monthlyRent,
					totalAmount: totalAmountVal.toFixed(2),
					paidAmount: "0",
					status: BILL_STATUS.UNPAID,
				})
				.returning();
			newBill = inserted;
		} catch (error) {
			const err = error as { code?: string; message?: string };
			if (
				err.code === "23505" ||
				err.message?.includes("bills_flat_billing_month_unique")
			) {
				throw new ValidationError([
					{
						field: "billingMonth",
						message: `A bill already exists for this flat in ${billingMonth}`,
						rule: "duplicate",
					},
				]);
			}
			throw error;
		}

		if (!newBill) {
			throw new Error("Failed to create bill");
		}

		if (lineItemsData.length > 0) {
			await this.db.insert(billLineItems).values(
				lineItemsData.map((item) => ({
					billId: newBill.id,
					description: item.description,
					amount: item.amount,
				})),
			);
		}

		this.auditLogger.log({
			actorId: ctx.userId,
			action: "bill_created",
			entityType: "bill",
			entityId: newBill.id,
			ownerAccountId: ctx.ownerAccountId,
			newValues: {
				contractId: contract.id,
				flatId: contract.flatId,
				billingMonth,
				dueDate,
				baseRent: rentCalc.baseRent,
				rentDays: rentCalc.rentDays,
				totalDaysInMonth: rentCalc.totalDaysInMonth,
				monthlyRent: contract.monthlyRent,
				totalAmount: totalAmountVal.toFixed(2),
				status: BILL_STATUS.UNPAID,
			},
		});

		return {
			id: newBill.id,
			ownerAccountId: newBill.ownerAccountId,
			contractId: newBill.contractId,
			flatId: newBill.flatId,
			renterId: newBill.renterId,
			billingMonth: newBill.billingMonth,
			dueDate: newBill.dueDate,
			baseRent: newBill.baseRent,
			rentDays: newBill.rentDays,
			totalDaysInMonth: newBill.totalDaysInMonth,
			monthlyRent: newBill.monthlyRent,
			totalAmount: newBill.totalAmount,
			paidAmount: newBill.paidAmount,
			status: newBill.status,
			createdAt: newBill.createdAt,
			updatedAt: newBill.updatedAt,
			flatNumber: "",
			buildingName: "",
			renterName: "",
		};
	}

	/**
	 * Generates bills for all active contracts in a given month.
	 */
	async generateBills(
		ctx: RequestContext,
		month: string,
	): Promise<GenerateBillsResult> {
		if (ctx.role === "renter") {
			throw new ForbiddenError();
		}

		const billingMonth = validateOrThrow(billingMonthSchema, month);

		const conditions = [
			eq(flats.ownerAccountId, ctx.ownerAccountId),
			eq(flats.status, FLAT_STATUS.OCCUPIED),
		];

		if (ctx.role === ROLES.MANAGER && ctx.assignedBuildingIds) {
			conditions.push(inArray(flats.buildingId, ctx.assignedBuildingIds));
		}

		const occupiedFlats = await this.db
			.select()
			.from(flats)
			.where(and(...conditions));

		const result: GenerateBillsResult = {
			generated: 0,
			skipped: [],
		};

		if (occupiedFlats.length === 0) {
			return result;
		}

		const flatIds = occupiedFlats.map((f) => f.id);
		const existingBills = await this.billingRepo.batchFindExistingBills(
			flatIds,
			billingMonth,
		);
		const flatsWithBills = new Set(existingBills.map((b) => b.flatId));

		const contractStatuses = ["active", "pending_termination"] as const;
		const activeContracts = await this.db
			.select()
			.from(rentalContracts)
			.where(
				and(
					inArray(rentalContracts.flatId, flatIds),
					eq(rentalContracts.ownerAccountId, ctx.ownerAccountId),
					inArray(rentalContracts.status, contractStatuses),
				),
			);
		const contractMap = new Map(activeContracts.map((c) => [c.flatId, c]));

		for (const flat of occupiedFlats) {
			if (flatsWithBills.has(flat.id)) {
				result.skipped.push({
					flatId: flat.id,
					reason: `Bill already exists for flat ${flat.flatNumber} in ${billingMonth}`,
				});
				continue;
			}

			const contract = contractMap.get(flat.id);

			if (!contract) {
				result.skipped.push({
					flatId: flat.id,
					reason: `No active rental contract for flat ${flat.flatNumber}`,
				});
				continue;
			}

			if (
				!contract.monthlyRent ||
				Number.parseFloat(contract.monthlyRent) <= 0
			) {
				result.skipped.push({
					flatId: flat.id,
					reason: `No rent amount defined for flat ${flat.flatNumber}`,
				});
				continue;
			}

			const rentCalc = calculateRentForMonth(
				contract.monthlyRent,
				contract.startDate,
				billingMonth,
			);
			const dueDate = calculateDueDate(billingMonth);

			const lineItemsData = getDefaultLineItems(contract);
			let totalAmountVal = Number.parseFloat(rentCalc.baseRent);
			for (const item of lineItemsData) {
				totalAmountVal += Number.parseFloat(item.amount);
			}

			let newBill: typeof bills.$inferSelect | undefined;
			try {
				const [inserted] = await this.db
					.insert(bills)
					.values({
						ownerAccountId: ctx.ownerAccountId,
						contractId: contract.id,
						flatId: flat.id,
						renterId: contract.renterId,
						billingMonth,
						dueDate,
						baseRent: rentCalc.baseRent,
						rentDays: rentCalc.rentDays,
						totalDaysInMonth: rentCalc.totalDaysInMonth,
						monthlyRent: contract.monthlyRent,
						totalAmount: totalAmountVal.toFixed(2),
						paidAmount: "0",
						status: BILL_STATUS.UNPAID,
					})
					.returning();
				newBill = inserted;
			} catch (error) {
				const err = error as { code?: string; message?: string };
				if (
					err.code === "23505" ||
					err.message?.includes("bills_flat_billing_month_unique")
				) {
					result.skipped.push({
						flatId: flat.id,
						reason: `Bill already exists for flat ${flat.flatNumber} in ${billingMonth}`,
					});
					continue;
				}
				throw error;
			}

			if (!newBill) {
				result.skipped.push({
					flatId: flat.id,
					reason: `Failed to create bill for flat ${flat.flatNumber}`,
				});
				continue;
			}

			if (lineItemsData.length > 0) {
				await this.db.insert(billLineItems).values(
					lineItemsData.map((item) => ({
						billId: newBill.id,
						description: item.description,
						amount: item.amount,
					})),
				);
			}

			result.generated++;

			this.auditLogger.log({
				actorId: ctx.userId,
				action: "bill_created",
				entityType: "bill",
				entityId: newBill.id,
				ownerAccountId: ctx.ownerAccountId,
				newValues: {
					flatId: flat.id,
					billingMonth,
					baseRent: rentCalc.baseRent,
					totalAmount: totalAmountVal.toFixed(2),
					status: BILL_STATUS.UNPAID,
				},
			});
		}

		return result;
	}

	async addUtilityCharge(
		ctx: RequestContext,
		billId: string,
		charge: AddUtilityChargeInput,
	): Promise<LineItemResult> {
		if (ctx.role === "renter") {
			throw new ForbiddenError();
		}

		const validated = validateOrThrow(addUtilityChargeSchema, charge);
		const bill = await this.findBillWithAccess(ctx, billId);

		const existingLineItems = await this.db
			.select({ count: count() })
			.from(billLineItems)
			.where(eq(billLineItems.billId, billId));

		const lineItemCount = existingLineItems[0]?.count ?? 0;
		if (lineItemCount >= 20) {
			throw new ValidationError([
				{
					field: "lineItems",
					message: "Maximum of 20 line items per bill reached",
					rule: "max_items",
				},
			]);
		}

		const [lineItem] = await this.db
			.insert(billLineItems)
			.values({
				billId,
				description: validated.description,
				amount: validated.amount.toFixed(2),
			})
			.returning();

		if (!lineItem) {
			throw new Error("Failed to add utility charge");
		}

		const newTotal =
			Number.parseFloat(bill.baseRent) +
			(await this.calculateLineItemsTotal(billId));

		await this.db
			.update(bills)
			.set({
				totalAmount: newTotal.toFixed(2),
				updatedAt: new Date(),
			})
			.where(eq(bills.id, billId));

		this.auditLogger.log({
			actorId: ctx.userId,
			action: "bill_utility_charge_added",
			entityType: "bill",
			entityId: billId,
			ownerAccountId: ctx.ownerAccountId,
			oldValues: { totalAmount: bill.totalAmount },
			newValues: {
				totalAmount: newTotal.toFixed(2),
				lineItem: {
					description: validated.description,
					amount: validated.amount,
				},
			},
		});

		return {
			id: lineItem.id,
			billId: lineItem.billId,
			description: lineItem.description,
			amount: lineItem.amount,
			createdAt: lineItem.createdAt,
		};
	}

	async getBill(ctx: RequestContext, billId: string): Promise<BillWithDetails> {
		const bill = await this.findBillWithAccess(ctx, billId);

		const [lineItems, billPayments] = await Promise.all([
			this.billingRepo.getLineItems(billId),
			this.billingRepo.getPayments(billId),
		]);

		return {
			...bill,
			lineItems: lineItems.map((item) => ({
				id: item.id,
				billId: item.billId,
				description: item.description,
				amount: item.amount,
				createdAt: item.createdAt,
			})),
			payments: billPayments.map((payment) => ({
				id: payment.id,
				billId: payment.billId,
				receiptReference: payment.receiptReference,
				amount: payment.amount,
				paymentDate: payment.paymentDate,
				paymentMethod: payment.paymentMethod,
				note: payment.note,
				createdAt: payment.createdAt,
			})),
		};
	}

	async listBills(
		ctx: RequestContext,
		filters: ListBillsFilters,
		pagination: PaginationInput,
	): Promise<PaginatedBills> {
		const pageSize = Math.min(Math.max(pagination.pageSize, 1), 50);
		const page = Math.max(pagination.page, 1);

		const scope: ScopeContext = {
			ownerAccountId: ctx.ownerAccountId,
			role: ctx.role,
			assignedBuildingIds: ctx.assignedBuildingIds,
			assignedFlatId: ctx.assignedFlatId,
		};

		if (ctx.role === "renter") {
			const context = await getActiveContractForRenter(
				this.db as any,
				ctx.userId,
			);

			if (!context) {
				return {
					data: [],
					total: 0,
					page: pagination.page,
					pageSize: pagination.pageSize,
					totalPages: 0,
				};
			}

			scope.assignedFlatId = context.activeContract.flatId;
		}

		const repoFilters: RepoListBillsFilters = {
			buildingId: filters.buildingId,
			flatId: filters.flatId,
			renterId: filters.renterId,
			contractId: filters.contractId,
			billingMonth: filters.billingMonth,
			status: filters.status,
		};

		const [data, totalResult] = await this.billingRepo.list(
			scope,
			repoFilters,
			page,
			pageSize,
		);
		const total = totalResult[0]?.count ?? 0;

		return {
			data: data.map((bill) => this.mapToBillResult(bill)),
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize),
		};
	}

	async updateOverdueBills(): Promise<number> {
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = now.getMonth() + 1;

		const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

		const result = await this.db
			.update(bills)
			.set({
				status: BILL_STATUS.OVERDUE,
				updatedAt: new Date(),
			})
			.where(
				and(
					sql`${bills.billingMonth} < ${currentMonthStr}`,
					inArray(bills.status, [
						BILL_STATUS.UNPAID,
						BILL_STATUS.PARTIALLY_PAID,
					]),
				),
			)
			.returning({ id: bills.id });

		return result.length;
	}

	async deleteBill(ctx: RequestContext, billId: string): Promise<void> {
		const bill = await this.findBillWithAccess(ctx, billId);

		const existingPayments = await this.db
			.select({ count: count() })
			.from(payments)
			.where(eq(payments.billId, billId));
		const paymentsCount = existingPayments[0]?.count ?? 0;

		if (paymentsCount > 0) {
			throw new ValidationError([
				{
					field: "billId",
					message:
						"Cannot delete a bill that has associated payments. Delete the payments first.",
					rule: "has_payments",
				},
			]);
		}

		await this.db.transaction(async (tx) => {
			await tx
				.update(advanceAdjustments)
				.set({ billId: null })
				.where(eq(advanceAdjustments.billId, billId));

			await tx.delete(billLineItems).where(eq(billLineItems.billId, billId));
			await tx.delete(bills).where(eq(bills.id, billId));
		});

		this.auditLogger.log({
			actorId: ctx.userId,
			action: "bill_deleted",
			entityType: "bill",
			entityId: billId,
			ownerAccountId: ctx.ownerAccountId,
			oldValues: {
				billingMonth: bill.billingMonth,
				totalAmount: bill.totalAmount,
				flatId: bill.flatId,
				renterId: bill.renterId,
			},
		});
	}

	private async findBillWithAccess(
		ctx: RequestContext,
		billId: string,
	): Promise<BillResult> {
		const scope: ScopeContext = {
			ownerAccountId: ctx.ownerAccountId,
			role: ctx.role,
			assignedBuildingIds: ctx.assignedBuildingIds,
			assignedFlatId: ctx.assignedFlatId,
		};

		if (ctx.role === "renter") {
			const context = await getActiveContractForRenter(
				this.db as any,
				ctx.userId,
				["active", "pending_termination"],
			);

			if (!context) {
				throw new NotFoundError("Bill");
			}

			scope.assignedFlatId = context.activeContract.flatId;
		}

		const bill = await this.billingRepo.findByIdWithAccess(billId, scope);

		if (!bill) {
			throw new NotFoundError("Bill");
		}

		if (ctx.role === ROLES.MANAGER && ctx.assignedBuildingIds) {
			const flat = await this.db.query.flats.findFirst({
				where: eq(flats.id, bill.flatId),
			});

			if (!flat || !ctx.assignedBuildingIds.includes(flat.buildingId)) {
				throw new NotFoundError("Bill");
			}
		}

		return this.mapToBillResult({
			id: bill.id,
			ownerAccountId: bill.ownerAccountId,
			contractId: bill.contractId,
			flatId: bill.flatId,
			renterId: bill.renterId,
			billingMonth: bill.billingMonth,
			dueDate: bill.dueDate ?? null,
			baseRent: bill.baseRent,
			rentDays: bill.rentDays ?? null,
			totalDaysInMonth: bill.totalDaysInMonth ?? null,
			monthlyRent: bill.monthlyRent ?? bill.baseRent,
			totalAmount: bill.totalAmount,
			paidAmount: bill.paidAmount,
			status: bill.status,
			createdAt: bill.createdAt,
			updatedAt: bill.updatedAt,
			flatNumber: bill.flat?.flatNumber ?? null,
			buildingName: bill.flat?.building?.name ?? null,
			renterName: bill.renter?.fullName ?? null,
			flat: bill.flat
				? {
						flatNumber: bill.flat.flatNumber,
						building: bill.flat.building
							? { name: bill.flat.building.name }
							: null,
					}
				: null,
			renter: bill.renter ? { fullName: bill.renter.fullName } : null,
		});
	}

	private async calculateLineItemsTotal(billId: string): Promise<number> {
		const result = await this.db
			.select({
				total: sql<string>`COALESCE(SUM(${billLineItems.amount}::numeric), 0)`,
			})
			.from(billLineItems)
			.where(eq(billLineItems.billId, billId));

		return Number.parseFloat(result[0]?.total ?? "0");
	}

	private mapToBillResult(bill: MapToBillResultInput): BillResult {
		const flatNumber = bill.flatNumber || bill.flat?.flatNumber || "";
		const buildingName = bill.buildingName || bill.flat?.building?.name || "";
		const renterName = bill.renterName || bill.renter?.fullName || "";

		return {
			id: bill.id,
			ownerAccountId: bill.ownerAccountId,
			contractId: bill.contractId,
			flatId: bill.flatId,
			renterId: bill.renterId,
			billingMonth: bill.billingMonth,
			dueDate: bill.dueDate ?? calculateDueDate(bill.billingMonth),
			baseRent: bill.baseRent,
			rentDays: bill.rentDays,
			totalDaysInMonth: bill.totalDaysInMonth,
			monthlyRent: bill.monthlyRent ?? bill.baseRent,
			totalAmount: bill.totalAmount,
			paidAmount: bill.paidAmount,
			status: bill.status,
			createdAt: bill.createdAt,
			updatedAt: bill.updatedAt,
			flatNumber,
			buildingName,
			renterName,
		};
	}
}
