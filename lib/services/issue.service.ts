import type { IAuditLogger, IR2Client } from "@/lib/shared/types";
import {
	type Database,
	buildings,
	flats,
	issueAttachments,
	issues,
	renters,
	users,
} from "@repo/db";
import {
	ISSUE_STATUS,
	ISSUE_STATUS_TRANSITIONS,
	type IssueStatus,
} from "@repo/shared/constants";
import {
	ForbiddenError,
	NotFoundError,
	ValidationError,
} from "@repo/shared/errors";
import type { RequestContext } from "@repo/shared/types";
import {
	type AssignIssueInput,
	type CreateIssueInput,
	type UpdateIssueStatusInput,
	assignIssueSchema,
	createIssueSchema,
	updateIssueStatusSchema,
	validateOrThrow,
} from "@repo/shared/validation";
import { and, eq } from "drizzle-orm";

import { IssueRepository, type ScopeContext } from "../repositories";

// --- Types ---

export interface ListIssuesInput {
	buildingId?: string;
	category?: string;
	status?: IssueStatus;
	priority?: string;
	assigneeId?: string;
	page: number;
	pageSize: number;
}

export interface AttachmentResult {
	id: string;
	fileName: string;
	fileUrl: string;
	fileSize: number;
	mimeType: string;
	createdAt: Date;
}

export interface IssueResult {
	id: string;
	ownerAccountId: string;
	buildingId: string;
	flatId: string;
	renterId: string;
	buildingName: string;
	title: string;
	description: string;
	category: string;
	priority: string;
	status: string;
	assigneeId: string | null;
	assigneeName: string | null;
	resolutionNotes: string | null;
	resolvedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
	attachments: AttachmentResult[];
}

export interface PaginatedIssues {
	data: IssueResult[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

export interface FileAttachment {
	fileName: string;
	buffer: Buffer;
	mimeType: string;
	fileSize: number;
}

const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// --- Service ---

/**
 * IssueService handles building-level issue tracking with tenant isolation.
 *
 * Enforces:
 * - Title (max 200 chars), description (max 2000 chars) validation
 * - Category enum: plumbing, electrical, structural, cleaning, security, other
 * - Priority enum: low, medium, high, urgent
 * - Status state machine transitions (Open → In_Progress/Resolved/Closed, etc.)
 * - Resolution notes required when marking as Resolved
 * - Assignee must have Manager role
 * - Pagination with max 50 per page
 * - Audit events for status changes
 *
 */
export class IssueService {
	private issueRepo: IssueRepository;
	constructor(
		private db: Database,
		private auditLogger: IAuditLogger,
		private r2: IR2Client,
	) {
		this.issueRepo = new IssueRepository(db);
	}

	/**
	 * Creates a new building-level issue.
	 *
	 * Validates:
	 * - Title (1-200 chars), description (1-2000 chars) are required
	 * - Category must be a valid enum value
	 * - Priority must be a valid enum value
	 * - Building must exist and belong to the owner's account
	 * - Sets initial status to Open
	 *
	 */
	async createIssue(
		ctx: RequestContext,
		input: CreateIssueInput,
		attachments?: FileAttachment[],
	): Promise<IssueResult> {
		// Step 1: Validate input using Zod schema
		const validated = validateOrThrow(createIssueSchema, input);

		// Step 2: Validate attachments if provided
		if (attachments && attachments.length > 0) {
			this.validateAttachments(attachments);
		}

		// Verify building exists and belongs to the owner's account
		const building = await this.db.query.buildings.findFirst({
			where: and(
				eq(buildings.id, validated.buildingId),
				eq(buildings.ownerAccountId, ctx.ownerAccountId),
			),
		});

		if (!building) {
			throw new NotFoundError("Building");
		}

		// Resolve the renter and their flat context
		const renter = await this.db.query.renters.findFirst({
			where: and(
				eq(renters.userId, ctx.userId),
				eq(renters.ownerAccountId, ctx.ownerAccountId),
			),
		});

		if (!renter) {
			throw new ForbiddenError();
		}

		if (!ctx.assignedFlatId) {
			throw new ValidationError([
				{
					field: "flat",
					message: "No active flat assigned to this renter",
					rule: "required",
				},
			]);
		}

		const flat = await this.db.query.flats.findFirst({
			where: and(
				eq(flats.id, ctx.assignedFlatId),
				eq(flats.ownerAccountId, ctx.ownerAccountId),
			),
		});

		if (!flat || flat.buildingId !== validated.buildingId) {
			throw new ForbiddenError();
		}

		// Step 4: Insert the issue with status Open
		const [created] = await this.db
			.insert(issues)
			.values({
				ownerAccountId: ctx.ownerAccountId,
				buildingId: validated.buildingId,
				flatId: flat.id,
				renterId: renter.id,
				title: validated.title,
				description: validated.description,
				category: validated.category,
				priority: validated.priority,
				status: ISSUE_STATUS.OPEN,
			})
			.returning();

		if (!created) {
			throw new Error("Failed to create issue");
		}

		// Step 5: Upload attachments if provided
		if (attachments && attachments.length > 0) {
			await this.uploadAttachments(ctx.ownerAccountId, created.id, attachments);
		}

		// Step 6: Record audit event
		this.auditLogger.log({
			actorId: ctx.userId,
			action: "issue_created",
			entityType: "issue",
			entityId: created.id,
			ownerAccountId: ctx.ownerAccountId,
			newValues: {
				buildingId: validated.buildingId,
				title: validated.title,
				category: validated.category,
				priority: validated.priority,
				status: ISSUE_STATUS.OPEN,
			},
		});

		return this.mapToResult(created);
	}

	/**
	 * Assigns an issue to a user with the Manager role.
	 *
	 * Validates:
	 * - Issue exists and belongs to the owner's account
	 * - Assignee exists and has the Manager role
	 *
	 */
	async assignIssue(
		ctx: RequestContext,
		issueId: string,
		input: AssignIssueInput,
	): Promise<IssueResult> {
		// Step 1: Validate input
		const validated = validateOrThrow(assignIssueSchema, input);

		// Step 2: Verify issue exists and belongs to the owner's account
		const existing = await this.db.query.issues.findFirst({
			where: and(
				eq(issues.id, issueId),
				eq(issues.ownerAccountId, ctx.ownerAccountId),
			),
		});

		if (!existing) {
			throw new NotFoundError("Issue");
		}

		// Step 3: Verify assignee exists and has Manager role (Requirement 11.10)
		const assignee = await this.db.query.users.findFirst({
			where: eq(users.id, validated.assigneeId),
		});

		if (!assignee || assignee.role !== "manager") {
			throw new ValidationError([
				{
					field: "assigneeId",
					message: "Assignee must be a user with the Manager role",
					rule: "invalid_assignee",
				},
			]);
		}

		// Step 4: Update the issue with the assignee
		const [updated] = await this.db
			.update(issues)
			.set({
				assigneeId: validated.assigneeId,
				updatedAt: new Date(),
			})
			.where(eq(issues.id, issueId))
			.returning();

		if (!updated) {
			throw new Error("Failed to assign issue");
		}

		// Step 5: Record audit event
		this.auditLogger.log({
			actorId: ctx.userId,
			action: "issue_assigned",
			entityType: "issue",
			entityId: issueId,
			ownerAccountId: ctx.ownerAccountId,
			oldValues: { assigneeId: existing.assigneeId },
			newValues: { assigneeId: validated.assigneeId },
		});

		return this.mapToResult(updated);
	}

	/**
	 * Updates an issue's status according to the state machine.
	 *
	 * Valid transitions:
	 * - Open → In_Progress, Resolved, Closed
	 * - In_Progress → Resolved, Closed
	 * - Resolved → Closed
	 * - Closed → (no further transitions)
	 *
	 * When transitioning to Resolved:
	 * - Resolution notes are required (max 2000 chars)
	 * - resolvedAt timestamp is recorded
	 *
	 */
	async updateIssueStatus(
		ctx: RequestContext,
		issueId: string,
		input: UpdateIssueStatusInput,
	): Promise<IssueResult> {
		// Step 1: Validate input
		const validated = validateOrThrow(updateIssueStatusSchema, input);

		// Step 2: Verify issue exists and belongs to the owner's account
		const existing = await this.db.query.issues.findFirst({
			where: and(
				eq(issues.id, issueId),
				eq(issues.ownerAccountId, ctx.ownerAccountId),
			),
		});

		if (!existing) {
			throw new NotFoundError("Issue");
		}

		const currentStatus = existing.status;
		const newStatus = validated.status;

		// Step 3: Validate state machine transition (Requirement 11.8, 11.9)
		const allowedTransitions = ISSUE_STATUS_TRANSITIONS[currentStatus];
		if (!allowedTransitions?.includes(newStatus)) {
			throw new ValidationError([
				{
					field: "status",
					message: `Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowedTransitions?.join(", ") || "none"}`,
					rule: "invalid_transition",
				},
			]);
		}

		// Step 4: Require resolution notes when marking as Resolved (Requirement 11.4)
		if (newStatus === ISSUE_STATUS.RESOLVED) {
			if (
				!validated.resolutionNotes ||
				validated.resolutionNotes.trim().length === 0
			) {
				throw new ValidationError([
					{
						field: "resolutionNotes",
						message:
							"Resolution notes are required when marking an issue as Resolved",
						rule: "required",
					},
				]);
			}
		}

		// Step 5: Build update payload
		const updatePayload: Record<string, unknown> = {
			status: newStatus,
			updatedAt: new Date(),
		};

		if (newStatus === ISSUE_STATUS.RESOLVED) {
			updatePayload.resolutionNotes = validated.resolutionNotes;
			updatePayload.resolvedAt = new Date();
		}

		// Step 6: Perform the update
		const [updated] = await this.db
			.update(issues)
			.set(updatePayload)
			.where(eq(issues.id, issueId))
			.returning();

		if (!updated) {
			throw new Error("Failed to update issue status");
		}

		// Step 7: Record audit event for status change (Requirement 11.3)
		this.auditLogger.log({
			actorId: ctx.userId,
			action: "issue_status_changed",
			entityType: "issue",
			entityId: issueId,
			ownerAccountId: ctx.ownerAccountId,
			oldValues: { status: currentStatus },
			newValues: {
				status: newStatus,
				...(newStatus === ISSUE_STATUS.RESOLVED
					? { resolutionNotes: validated.resolutionNotes }
					: {}),
			},
		});

		return this.mapToResult(updated);
	}

	/**
	 * Lists issues with optional filtering by building, category, status, priority, and assignee.
	 * Paginated with max 50 per page, sorted by createdAt descending.
	 * Enforces tenant isolation via ownerAccountId.
	 *
	 * Requirement: 11.6
	 */
	async listIssues(
		ctx: RequestContext,
		input: ListIssuesInput,
	): Promise<PaginatedIssues> {
		const pageSize = Math.min(Math.max(input.pageSize, 1), 50);
		const page = Math.max(input.page, 1);

		const scope: ScopeContext = {
			ownerAccountId: ctx.ownerAccountId,
			role: ctx.role,
			assignedBuildingIds: ctx.assignedBuildingIds,
		};

		const [data, totalResult] = await this.issueRepo.list(
			scope,
			{
				buildingId: input.buildingId,
				category: input.category,
				status: input.status,
				priority: input.priority,
				assigneeId: input.assigneeId,
			},
			page,
			pageSize,
		);

		const total = totalResult[0]?.count ?? 0;

		return {
			data: data.map((row) => ({
				id: row.id,
				ownerAccountId: row.ownerAccountId,
				buildingId: row.buildingId,
				flatId: row.flatId as string,
				renterId: row.renterId as string,
				buildingName: row.buildingName ?? "",
				title: row.title,
				description: row.description,
				category: row.category,
				priority: row.priority,
				status: row.status,
				assigneeId: row.assigneeId,
				assigneeName: row.assigneeName ?? null,
				resolutionNotes: row.resolutionNotes,
				resolvedAt: row.resolvedAt,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt,
				attachments: [],
			})),
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize),
		};
	}

	/**
	 * Gets a single issue by ID, scoped to the owner's account.
	 *
	 * Returns NotFoundError if the issue doesn't exist or belongs to another account.
	 */
	async getIssue(ctx: RequestContext, issueId: string): Promise<IssueResult> {
		const result = await this.issueRepo.findByIdWithAccess(issueId, {
			ownerAccountId: ctx.ownerAccountId,
			role: ctx.role,
			assignedBuildingIds: ctx.assignedBuildingIds,
		});

		if (!result) {
			throw new NotFoundError("Issue");
		}

		return {
			id: result.id,
			ownerAccountId: result.ownerAccountId,
			buildingId: result.buildingId,
			flatId: result.flatId as string,
			renterId: result.renterId as string,
			buildingName: result.building?.name ?? "",
			title: result.title,
			description: result.description,
			category: result.category,
			priority: result.priority,
			status: result.status,
			assigneeId: result.assigneeId,
			assigneeName: result.assignee?.name ?? null,
			resolutionNotes: result.resolutionNotes,
			resolvedAt: result.resolvedAt,
			createdAt: result.createdAt,
			updatedAt: result.updatedAt,
			attachments: (result.attachments ?? []).map((a) => ({
				id: a.id,
				fileName: a.fileName,
				fileUrl: a.fileUrl,
				fileSize: a.fileSize,
				mimeType: a.mimeType,
				createdAt: a.createdAt,
			})),
		};
	}

	/**
	 * Deletes an issue by ID, scoped to the owner's account.
	 * Owner only.
	 */
	async deleteIssue(ctx: RequestContext, issueId: string): Promise<void> {
		const existing = await this.db.query.issues.findFirst({
			where: and(
				eq(issues.id, issueId),
				eq(issues.ownerAccountId, ctx.ownerAccountId),
			),
		});

		if (!existing) {
			throw new NotFoundError("Issue");
		}

		await this.db.delete(issues).where(eq(issues.id, issueId));

		this.auditLogger.log({
			actorId: ctx.userId,
			action: "issue_deleted",
			entityType: "issue",
			entityId: issueId,
			ownerAccountId: ctx.ownerAccountId,
			oldValues: {
				title: existing.title,
				category: existing.category,
				status: existing.status,
			},
		});
	}

	// --- Attachment Handling ---

	private validateAttachments(attachments: FileAttachment[]): void {
		if (attachments.length > MAX_ATTACHMENTS) {
			throw new ValidationError([
				{
					field: "attachments",
					message: `Maximum ${MAX_ATTACHMENTS} file attachments allowed`,
					rule: "max_attachments",
				},
			]);
		}

		const allowedMimes = ["image/jpeg", "image/png", "image/webp"];

		for (const file of attachments) {
			if (!allowedMimes.includes(file.mimeType)) {
				throw new ValidationError([
					{
						field: "attachments",
						message: `File "${file.fileName}" has unsupported type. Only JPEG, PNG, and WebP images are allowed`,
						rule: "invalid_mime_type",
					},
				]);
			}

			if (file.fileSize > MAX_FILE_SIZE) {
				throw new ValidationError([
					{
						field: "attachments",
						message: `File "${file.fileName}" exceeds the maximum size of 5MB`,
						rule: "file_too_large",
					},
				]);
			}
		}
	}

	private async uploadAttachments(
		ownerAccountId: string,
		issueId: string,
		attachments: FileAttachment[],
	): Promise<void> {
		for (const file of attachments) {
			const storageKey = await this.r2.upload(
				ownerAccountId,
				"issues",
				issueId,
				file.fileName,
				file.buffer,
				file.mimeType,
			);

			await this.db.insert(issueAttachments).values({
				issueId,
				fileUrl: storageKey,
				fileName: file.fileName,
				fileSize: file.fileSize,
				mimeType: file.mimeType,
			});
		}
	}

	// --- Private Helpers ---

	private mapToResult(row: typeof issues.$inferSelect): IssueResult {
		return {
			id: row.id,
			ownerAccountId: row.ownerAccountId,
			buildingId: row.buildingId,
			flatId: row.flatId,
			renterId: row.renterId,
			buildingName: "",
			title: row.title,
			description: row.description,
			category: row.category,
			priority: row.priority,
			status: row.status,
			assigneeId: row.assigneeId,
			assigneeName: null,
			resolutionNotes: row.resolutionNotes,
			resolvedAt: row.resolvedAt,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			attachments: [],
		};
	}
}
