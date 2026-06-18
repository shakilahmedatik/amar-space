import type { IAuditLogger } from "@/lib/shared/types";
import { type Database, buildings, managerAssignments, users } from "@repo/db";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
	ValidationError,
} from "@repo/shared/errors";
import type { PaginationInput, RequestContext } from "@repo/shared/types";
import {
	type CreateManagerInput,
	createManagerSchema,
	validateOrThrow,
} from "@repo/shared/validation";
import { and, count, desc, eq, inArray } from "drizzle-orm";

import { generateTemporaryPassword } from "../utils/password-generator";

// --- Types ---

export interface PaginatedResult<T> {
	data: T[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

export interface CreateManagerResult {
	id: string;
	email: string;
	name: string;
	role: "manager";
	buildingIds: string[];
	temporaryPassword: string;
}

export interface ManagerListItem {
	id: string;
	name: string;
	email: string;
	buildingIds: string[];
	createdAt: Date;
}

// --- Service ---

/**
 * ManagerService handles manager user creation, listing, and building assignment
 * management for owners.
 *
 * All operations are scoped to the owner's account via ownerAccountId.
 * Enforces:
 * - Building ownership validation (all buildings must belong to the owner)
 * - Email uniqueness (409 if duplicate)
 * - Building ID count (1-20)
 * - At least 1 assignment must remain on updates
 * - Audit logging for create and assignment update operations
 *
 */
export class ManagerService {
	private db: Database;
	private auditLogger: IAuditLogger;

	constructor(db: Database, auditLogger: IAuditLogger) {
		this.db = db;
		this.auditLogger = auditLogger;
	}

	/**
	 * Creates a new manager user assigned to the owner's account.
	 *
	 * Validates:
	 * - Input schema (email max 254, name 1-200, buildingIds 1-20)
	 * - All building IDs belong to the owner's account
	 * - Email is unique across the system
	 *
	 * Creates:
	 * - User record with role='manager' and ownerAccountId
	 * - Manager assignment records for each building
	 * - Generates a temporary password
	 * - Logs to audit
	 *
	 */
	async createManager(
		ctx: RequestContext,
		input: CreateManagerInput,
	): Promise<CreateManagerResult> {
		// Step 1: Validate input using Zod schema
		const validated = validateOrThrow(createManagerSchema, input);

		// Step 2: Validate building ownership — all buildingIds must belong to owner's account
		const ownedBuildings = await this.db
			.select({ id: buildings.id })
			.from(buildings)
			.where(
				and(
					eq(buildings.ownerAccountId, ctx.ownerAccountId),
					inArray(buildings.id, validated.buildingIds),
				),
			);

		const ownedBuildingIds = new Set(ownedBuildings.map((b) => b.id));
		const invalidBuildingIds = validated.buildingIds.filter(
			(id) => !ownedBuildingIds.has(id),
		);

		if (invalidBuildingIds.length > 0) {
			throw new ForbiddenError();
		}

		// Step 3: Check email uniqueness (Requirement 3.5)
		const existingUser = await this.db.query.users.findFirst({
			where: eq(users.email, validated.email),
		});

		if (existingUser) {
			throw new ConflictError("A user with this email already exists");
		}

		// Step 4: Generate temporary password (Requirement 3.7)
		const temporaryPassword = generateTemporaryPassword();

		// Step 5: Create user with manager role
		const now = new Date();
		const managerId = crypto.randomUUID();

		await this.db.insert(users).values({
			id: managerId,
			name: validated.name,
			email: validated.email,
			emailVerified: false,
			role: "manager",
			ownerAccountId: ctx.ownerAccountId,
			approvalStatus: null,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		});

		// Step 6: Create manager_assignment records for each building
		const assignmentValues = validated.buildingIds.map((buildingId) => ({
			ownerAccountId: ctx.ownerAccountId,
			managerId,
			buildingId,
		}));

		await this.db.insert(managerAssignments).values(assignmentValues);

		// Step 7: Log to audit (Requirement 3.8)
		this.auditLogger.log({
			actorId: ctx.userId,
			action: "manager_created",
			entityType: "user",
			entityId: managerId,
			ownerAccountId: ctx.ownerAccountId,
			newValues: {
				email: validated.email,
				name: validated.name,
				buildingIds: validated.buildingIds,
			},
		});

		return {
			id: managerId,
			email: validated.email,
			name: validated.name,
			role: "manager",
			buildingIds: validated.buildingIds,
			temporaryPassword,
		};
	}

	/**
	 * Lists managers for the owner's account with pagination.
	 *
	 * - Tenant-scoped via ownerAccountId
	 * - Max 100 per page
	 * - Sorted by createdAt descending
	 * - Includes assigned building IDs for each manager
	 *
	 * Requirement: 6.5
	 */
	async listManagers(
		ctx: RequestContext,
		pagination: PaginationInput,
	): Promise<PaginatedResult<ManagerListItem>> {
		const pageSize = Math.min(Math.max(pagination.pageSize, 1), 100);
		const page = Math.max(pagination.page, 1);
		const offset = (page - 1) * pageSize;

		const whereClause = and(
			eq(users.ownerAccountId, ctx.ownerAccountId),
			eq(users.role, "manager"),
		);

		// Get paginated managers
		const [managersData, totalResult] = await Promise.all([
			this.db
				.select({
					id: users.id,
					name: users.name,
					email: users.email,
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

		// Fetch building assignments for the returned managers
		let data: ManagerListItem[] = [];

		if (managersData.length > 0) {
			const managerIds = managersData.map((m) => m.id);
			const assignments = await this.db
				.select({
					managerId: managerAssignments.managerId,
					buildingId: managerAssignments.buildingId,
				})
				.from(managerAssignments)
				.where(inArray(managerAssignments.managerId, managerIds));

			// Group assignments by managerId
			const assignmentMap = new Map<string, string[]>();
			for (const assignment of assignments) {
				const existing = assignmentMap.get(assignment.managerId) ?? [];
				existing.push(assignment.buildingId);
				assignmentMap.set(assignment.managerId, existing);
			}

			data = managersData.map((manager) => ({
				id: manager.id,
				name: manager.name,
				email: manager.email,
				buildingIds: assignmentMap.get(manager.id) ?? [],
				createdAt: manager.createdAt,
			}));
		}

		return {
			data,
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize),
		};
	}

	/**
	 * Updates a manager's building assignments.
	 *
	 * Validates:
	 * - All building IDs belong to the owner's account
	 * - At least 1 building assignment remains
	 * - Manager exists and belongs to the owner's account
	 *
	 * Replaces all existing assignments with the new set.
	 *
	 */
	async updateAssignments(
		ctx: RequestContext,
		managerId: string,
		buildingIds: string[],
	): Promise<void> {
		// Step 1: Validate at least 1 building ID
		if (!buildingIds || buildingIds.length === 0) {
			throw new ValidationError([
				{
					field: "buildingIds",
					message: "Must assign at least 1 building",
					rule: "min",
				},
			]);
		}

		if (buildingIds.length > 20) {
			throw new ValidationError([
				{
					field: "buildingIds",
					message: "Must assign between 1 and 20 buildings",
					rule: "max",
				},
			]);
		}

		// Step 2: Verify manager exists and belongs to the owner's account
		const manager = await this.db.query.users.findFirst({
			where: and(
				eq(users.id, managerId),
				eq(users.ownerAccountId, ctx.ownerAccountId),
				eq(users.role, "manager"),
			),
		});

		if (!manager) {
			throw new NotFoundError("Manager");
		}

		// Step 3: Validate all building IDs belong to the owner's account
		const ownedBuildings = await this.db
			.select({ id: buildings.id })
			.from(buildings)
			.where(
				and(
					eq(buildings.ownerAccountId, ctx.ownerAccountId),
					inArray(buildings.id, buildingIds),
				),
			);

		const ownedBuildingIds = new Set(ownedBuildings.map((b) => b.id));
		const invalidBuildingIds = buildingIds.filter(
			(id) => !ownedBuildingIds.has(id),
		);

		if (invalidBuildingIds.length > 0) {
			throw new ForbiddenError();
		}

		// Step 4: Delete old assignments and create new ones
		await this.db
			.delete(managerAssignments)
			.where(eq(managerAssignments.managerId, managerId));

		const assignmentValues = buildingIds.map((buildingId) => ({
			ownerAccountId: ctx.ownerAccountId,
			managerId,
			buildingId,
		}));

		await this.db.insert(managerAssignments).values(assignmentValues);

		// Step 5: Log to audit
		this.auditLogger.log({
			actorId: ctx.userId,
			action: "manager_assignments_updated",
			entityType: "user",
			entityId: managerId,
			ownerAccountId: ctx.ownerAccountId,
			newValues: {
				buildingIds,
			},
		});
	}
}
