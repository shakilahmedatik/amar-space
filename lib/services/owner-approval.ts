import type { IAuditLogger, PaginatedResult } from "@/lib/shared/types";
import { type Database, users } from "@repo/db";
import { AppError, NotFoundError } from "@repo/shared/errors";
import {
	type ApprovalStatus,
	VALID_APPROVAL_TRANSITIONS,
} from "@repo/shared/roles";
import { and, count, desc, eq } from "drizzle-orm";

// --- Types ---

export interface OwnerListItem {
	id: string;
	name: string;
	email: string;
	approvalStatus: string | null;
	createdAt: Date;
}

// --- Service ---

/**
 * OwnerApprovalService handles the owner account approval workflow.
 *
 * Provides:
 * - Paginated listing of owner accounts with optional status filter
 * - Approval status transitions with validation against VALID_APPROVAL_TRANSITIONS
 * - Audit logging for all approval actions
 *
 */
export class OwnerApprovalService {
	private db: Database;
	private auditLogger: IAuditLogger;

	constructor(db: Database, auditLogger: IAuditLogger) {
		this.db = db;
		this.auditLogger = auditLogger;
	}

	/**
	 * Lists owner accounts with pagination and optional status filter.
	 *
	 * - Default page size: 20, max: 100
	 * - Sorted by creation date descending
	 * - Filters by approval status if provided
	 *
	 * Requirement: 2.5
	 */
	async listOwners(params: {
		page: number;
		pageSize: number;
		status?: ApprovalStatus;
	}): Promise<PaginatedResult<OwnerListItem>> {
		const pageSize = Math.min(Math.max(params.pageSize, 1), 100);
		const page = Math.max(params.page, 1);
		const offset = (page - 1) * pageSize;

		const conditions = [eq(users.role, "owner")];

		if (params.status) {
			conditions.push(eq(users.approvalStatus, params.status));
		}

		const whereClause = and(...conditions);

		const [data, totalResult] = await Promise.all([
			this.db
				.select({
					id: users.id,
					name: users.name,
					email: users.email,
					approvalStatus: users.approvalStatus,
					createdAt: users.createdAt,
				})
				.from(users)
				.where(whereClause)
				.orderBy(desc(users.createdAt))
				.limit(pageSize)
				.offset(offset),
			this.db.select({ count: count() }).from(users).where(whereClause),
		]);

		const total = totalResult[0]?.count ?? 0;

		return {
			data,
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize),
		};
	}

	/**
	 * Updates the approval status of an owner account.
	 *
	 * Validates:
	 * - Owner exists and has role 'owner'
	 * - Transition is valid per VALID_APPROVAL_TRANSITIONS
	 *
	 * Returns 404 for non-existent owner, 400 for invalid transitions.
	 * Logs all approval actions to the audit logger.
	 *
	 */
	async updateApprovalStatus(
		actorId: string,
		ownerId: string,
		newStatus: ApprovalStatus,
	): Promise<void> {
		// Step 1: Find the owner
		const owner = await this.db.query.users.findFirst({
			where: and(eq(users.id, ownerId), eq(users.role, "owner")),
		});

		if (!owner) {
			throw new NotFoundError("User");
		}

		// Step 2: Validate the transition
		const currentStatus =
			owner.approvalStatus === "approved"
				? "approved"
				: owner.approvalStatus === "rejected"
					? "rejected"
					: "pending";
		const allowedTransitions = VALID_APPROVAL_TRANSITIONS[currentStatus];

		if (!allowedTransitions?.includes(newStatus)) {
			throw new AppError(
				400,
				"INVALID_TRANSITION",
				`Invalid status transition from ${currentStatus} to ${newStatus}`,
			);
		}

		// Step 3: Persist the status change
		await this.db
			.update(users)
			.set({ approvalStatus: newStatus, updatedAt: new Date() })
			.where(eq(users.id, ownerId));

		// Step 4: Log the approval action to audit
		this.auditLogger.log({
			actorId,
			action: `owner_${newStatus}`,
			entityType: "user",
			entityId: ownerId,
			ownerAccountId: ownerId,
			oldValues: { approvalStatus: currentStatus },
			newValues: { approvalStatus: newStatus },
		});
	}
}
