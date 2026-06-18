import type { IAuditLogger } from "@/lib/shared/types";
import {
	type Database,
	bills,
	flats,
	rentalContracts,
	renterAccessCodes,
	renters,
	users,
} from "@repo/db";
import {
	BILL_STATUS,
	CONTRACT_STATUS,
	FLAT_STATUS,
	ROLES,
} from "@repo/shared/constants";
import {
	ForbiddenError,
	NotFoundError,
	ValidationError,
} from "@repo/shared/errors";
import type { RequestContext } from "@repo/shared/types";
import { billingMonthSchema, validateOrThrow } from "@repo/shared/validation";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { getLastDayOfMonth } from "../utils/bill-calculation";
import { getActiveContractForRenter } from "./helpers/renter-context";

export interface TerminationResult {
	contractId: string;
	status: string;
	scheduledTerminationDate: string | null;
	noticeGivenAt: Date | null;
	terminationReason: string | null;
}

export interface DepositRefundResult {
	contractId: string;
	securityDepositAmount: string;
	remainingDepositBalance: string;
	outstandingBillTotal: string;
	suggestedRefund: string;
}

export class TerminationService {
	constructor(
		private db: Database,
		private auditLogger: IAuditLogger,
	) {}

	/**
	 * Schedule a contract termination. Sets contract status to pending_termination
	 * and the effective date to the last day of the specified month.
	 */
	async scheduleTermination(
		ctx: RequestContext,
		renterId: string,
		input: { terminationMonth: string; reason?: string },
	): Promise<TerminationResult> {
		if (ctx.role === "renter") {
			throw new ForbiddenError();
		}

		validateOrThrow(billingMonthSchema, input.terminationMonth);

		const renter = await this.db.query.renters.findFirst({
			where: and(
				eq(renters.id, renterId),
				eq(renters.ownerAccountId, ctx.ownerAccountId),
			),
		});

		if (!renter) {
			throw new NotFoundError("Renter");
		}

		const contract = await this.db.query.rentalContracts.findFirst({
			where: and(
				eq(rentalContracts.renterId, renterId),
				eq(rentalContracts.ownerAccountId, ctx.ownerAccountId),
				eq(rentalContracts.status, CONTRACT_STATUS.ACTIVE),
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

		const effectiveDateStr = getLastDayOfMonth(input.terminationMonth);
		const effectiveDate = new Date(`${effectiveDateStr}T23:59:59.999Z`);

		// Ensure the effective date is in the future (at least current day)
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const terminationDateOnly = new Date(`${effectiveDateStr}T00:00:00.000Z`);
		if (terminationDateOnly < today) {
			throw new ValidationError([
				{
					field: "terminationMonth",
					message:
						"Termination month must be the current month or a future month",
					rule: "past_date",
				},
			]);
		}

		await this.db
			.update(rentalContracts)
			.set({
				status: CONTRACT_STATUS.PENDING_TERMINATION,
				scheduledTerminationDate: effectiveDateStr,
				noticeGivenAt: new Date(),
				terminationReason: input.reason ?? null,
				updatedAt: new Date(),
			})
			.where(eq(rentalContracts.id, contract.id));

		// Set access code expiry
		const accessCode = await this.db.query.renterAccessCodes.findFirst({
			where: eq(renterAccessCodes.renterId, renterId),
		});
		if (accessCode) {
			await this.db
				.update(renterAccessCodes)
				.set({
					expiresAt: effectiveDate,
					updatedAt: new Date(),
				})
				.where(eq(renterAccessCodes.id, accessCode.id));
		}

		this.auditLogger.log({
			actorId: ctx.userId,
			action: "contract_termination_scheduled",
			entityType: "rental_contract",
			entityId: contract.id,
			ownerAccountId: ctx.ownerAccountId,
			newValues: {
				renterId,
				flatId: contract.flatId,
				scheduledTerminationDate: effectiveDateStr,
				terminationReason: input.reason ?? null,
			},
		});

		return {
			contractId: contract.id,
			status: CONTRACT_STATUS.PENDING_TERMINATION,
			scheduledTerminationDate: effectiveDateStr,
			noticeGivenAt: new Date(),
			terminationReason: input.reason ?? null,
		};
	}

	/**
	 * Cancel a scheduled termination, reverting contract status to active.
	 */
	async cancelTermination(
		ctx: RequestContext,
		renterId: string,
	): Promise<TerminationResult> {
		if (ctx.role === "renter") {
			throw new ForbiddenError();
		}

		const renter = await this.db.query.renters.findFirst({
			where: and(
				eq(renters.id, renterId),
				eq(renters.ownerAccountId, ctx.ownerAccountId),
			),
		});

		if (!renter) {
			throw new NotFoundError("Renter");
		}

		const contract = await this.db.query.rentalContracts.findFirst({
			where: and(
				eq(rentalContracts.renterId, renterId),
				eq(rentalContracts.ownerAccountId, ctx.ownerAccountId),
				eq(rentalContracts.status, CONTRACT_STATUS.PENDING_TERMINATION),
			),
		});

		if (!contract) {
			throw new NotFoundError("Contract with pending termination");
		}

		if (ctx.role === ROLES.MANAGER && ctx.assignedBuildingIds) {
			const flat = await this.db.query.flats.findFirst({
				where: eq(flats.id, contract.flatId),
			});
			if (!flat || !ctx.assignedBuildingIds.includes(flat.buildingId)) {
				throw new NotFoundError("Contract");
			}
		}

		// Cancel future unpaid bills for months after termination
		if (contract.scheduledTerminationDate) {
			const lastMonth = contract.scheduledTerminationDate.substring(0, 7);
			await this.db
				.update(bills)
				.set({
					status: BILL_STATUS.CANCELLED,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(bills.contractId, contract.id),
						sql`${bills.billingMonth} > ${lastMonth}`,
						inArray(bills.status, [BILL_STATUS.UNPAID, BILL_STATUS.OVERDUE]),
					),
				);
		}

		await this.db
			.update(rentalContracts)
			.set({
				status: CONTRACT_STATUS.ACTIVE,
				scheduledTerminationDate: null,
				noticeGivenAt: null,
				terminationReason: null,
				updatedAt: new Date(),
			})
			.where(eq(rentalContracts.id, contract.id));

		// Clear access code expiry
		const accessCode = await this.db.query.renterAccessCodes.findFirst({
			where: eq(renterAccessCodes.renterId, renterId),
		});
		if (accessCode) {
			await this.db
				.update(renterAccessCodes)
				.set({
					expiresAt: null,
					updatedAt: new Date(),
				})
				.where(eq(renterAccessCodes.id, accessCode.id));
		}

		this.auditLogger.log({
			actorId: ctx.userId,
			action: "contract_termination_cancelled",
			entityType: "rental_contract",
			entityId: contract.id,
			ownerAccountId: ctx.ownerAccountId,
			newValues: {
				renterId,
				contractId: contract.id,
			},
		});

		return {
			contractId: contract.id,
			status: CONTRACT_STATUS.ACTIVE,
			scheduledTerminationDate: null,
			noticeGivenAt: null,
			terminationReason: null,
		};
	}

	/**
	 * Execute a termination for a contract whose scheduled termination date has passed.
	 * Sets contract status to terminated, flat to vacant, deactivates renter account.
	 */
	async executeTermination(
		ctx: RequestContext,
		renterId: string,
	): Promise<TerminationResult> {
		if (ctx.role !== ROLES.OWNER) {
			throw new ForbiddenError();
		}

		const renter = await this.db.query.renters.findFirst({
			where: and(
				eq(renters.id, renterId),
				eq(renters.ownerAccountId, ctx.ownerAccountId),
			),
		});

		if (!renter) {
			throw new NotFoundError("Renter");
		}

		const contract = await this.db.query.rentalContracts.findFirst({
			where: and(
				eq(rentalContracts.renterId, renterId),
				eq(rentalContracts.ownerAccountId, ctx.ownerAccountId),
				eq(rentalContracts.status, CONTRACT_STATUS.PENDING_TERMINATION),
			),
		});

		if (!contract) {
			throw new NotFoundError("Contract with pending termination");
		}

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		if (contract.scheduledTerminationDate) {
			const terminationDate = new Date(
				`${contract.scheduledTerminationDate}T00:00:00.000Z`,
			);
			if (terminationDate > today) {
				throw new ValidationError([
					{
						field: "scheduledTerminationDate",
						message: "Cannot execute termination before the scheduled date",
						rule: "future_date",
					},
				]);
			}
		}

		await this.executeTerminationTransaction(
			contract,
			renter.userId,
			renterId,
			ctx.userId,
		);

		this.auditLogger.log({
			actorId: ctx.userId,
			action: "contract_terminated",
			entityType: "rental_contract",
			entityId: contract.id,
			ownerAccountId: ctx.ownerAccountId,
			newValues: {
				renterId,
				flatId: contract.flatId,
				terminatedBy: ctx.userId,
				endDate: contract.scheduledTerminationDate,
			},
		});

		return {
			contractId: contract.id,
			status: CONTRACT_STATUS.TERMINATED,
			scheduledTerminationDate: contract.scheduledTerminationDate,
			noticeGivenAt: contract.noticeGivenAt,
			terminationReason: contract.terminationReason,
		};
	}

	/**
	 * Process all scheduled terminations whose effective date has passed.
	 * Called as a daily check (not user-initiated).
	 */
	async processScheduledTerminations(): Promise<number> {
		const today = new Date().toISOString().split("T")[0];

		const pendingContracts = await this.db
			.select()
			.from(rentalContracts)
			.where(
				and(
					eq(rentalContracts.status, CONTRACT_STATUS.PENDING_TERMINATION),
					isNotNull(rentalContracts.scheduledTerminationDate),
					sql`${rentalContracts.scheduledTerminationDate} <= ${today}`,
				),
			);

		let processed = 0;

		for (const contract of pendingContracts) {
			const renter = await this.db.query.renters.findFirst({
				where: eq(renters.id, contract.renterId),
			});

			if (!renter) continue;

			await this.executeTerminationTransaction(
				contract,
				renter.userId,
				renter.id,
				null,
			);

			processed++;

			this.auditLogger.log({
				actorId: "system",
				action: "contract_terminated_auto",
				entityType: "rental_contract",
				entityId: contract.id,
				ownerAccountId: contract.ownerAccountId,
				newValues: {
					renterId: contract.renterId,
					flatId: contract.flatId,
					endDate: contract.scheduledTerminationDate,
				},
			});
		}

		return processed;
	}

	/**
	 * Get the deposit refund calculation for a terminated contract.
	 * remainingDepositBalance - sum of unpaid/partially_paid bills.
	 */
	async getDepositRefund(
		ctx: RequestContext,
		contractId: string,
	): Promise<DepositRefundResult> {
		const contract = await this.db.query.rentalContracts.findFirst({
			where: and(
				eq(rentalContracts.id, contractId),
				eq(rentalContracts.ownerAccountId, ctx.ownerAccountId),
				inArray(rentalContracts.status, [
					CONTRACT_STATUS.TERMINATED,
					CONTRACT_STATUS.PENDING_TERMINATION,
				]),
			),
		});

		if (!contract) {
			throw new NotFoundError("Contract");
		}

		const outstandingBills = await this.db
			.select({
				totalAmount: bills.totalAmount,
				paidAmount: bills.paidAmount,
			})
			.from(bills)
			.where(
				and(
					eq(bills.contractId, contractId),
					inArray(bills.status, [
						BILL_STATUS.UNPAID,
						BILL_STATUS.PARTIALLY_PAID,
						BILL_STATUS.OVERDUE,
					]),
				),
			);

		const outstandingTotal = outstandingBills.reduce((sum, bill) => {
			return (
				sum +
				Number.parseFloat(bill.totalAmount) -
				Number.parseFloat(bill.paidAmount)
			);
		}, 0);

		const remainingBalance = Number.parseFloat(
			contract.remainingDepositBalance,
		);
		const suggestedRefund = Math.max(0, remainingBalance - outstandingTotal);

		return {
			contractId: contract.id,
			securityDepositAmount: contract.securityDepositAmount,
			remainingDepositBalance: contract.remainingDepositBalance,
			outstandingBillTotal: outstandingTotal.toFixed(2),
			suggestedRefund: suggestedRefund.toFixed(2),
		};
	}

	private async executeTerminationTransaction(
		contract: {
			id: string;
			flatId: string;
			scheduledTerminationDate: string | null;
		},
		userId: string,
		renterId: string,
		terminatedBy: string | null,
	) {
		await this.db.transaction(async (tx) => {
			await tx
				.update(rentalContracts)
				.set({
					status: CONTRACT_STATUS.TERMINATED,
					endDate:
						contract.scheduledTerminationDate ??
						new Date().toISOString().split("T")[0],
					terminatedBy,
					updatedAt: new Date(),
				})
				.where(eq(rentalContracts.id, contract.id));

			await tx
				.update(flats)
				.set({
					status: FLAT_STATUS.VACANT,
					updatedAt: new Date(),
				})
				.where(eq(flats.id, contract.flatId));

			await tx
				.update(users)
				.set({
					isActive: false,
					deactivatedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(users.id, userId));

			await tx
				.update(renterAccessCodes)
				.set({
					expiresAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(renterAccessCodes.renterId, renterId));
		});
	}
}
