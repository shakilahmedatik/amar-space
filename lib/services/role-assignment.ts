import type { IAuditLogger } from "@/lib/shared/types";
import { type Database, buildings, managerAssignments, users } from "@repo/db";
import { ForbiddenError, ValidationError } from "@repo/shared/errors";
import type { FieldError } from "@repo/shared/types";
import { and, count, eq } from "drizzle-orm";

// --- Types ---

export type Role = "owner" | "manager" | "renter";

export interface RoleAssignmentInput {
	userId: string;
	role: Role;
	buildingIds?: string[];
}

export interface RoleAssignmentContext {
	userId: string;
	role: Role;
	ownerAccountId: string;
}

export interface RoleAssignmentResult {
	user: {
		id: string;
		email: string;
		role: Role;
	};
}

// --- Service ---

/**
 * Role Assignment Service.
 *
 * Handles assigning and changing user roles with the following rules:
 * - Only Owners can assign/change roles
 * - Manager role requires at least one building assignment
 * - Cannot remove the last Owner
 * - Records role changes in audit log
 * - Invalidates cached permissions on role change
 *
 */
export async function assignRole(
	db: Database,
	auditLogger: IAuditLogger,
	ctx: RoleAssignmentContext,
	input: RoleAssignmentInput,
): Promise<RoleAssignmentResult> {
	// Step 1: Validate that the caller is an Owner (Requirement 3.5)
	if (ctx.role !== "owner") {
		throw new ForbiddenError();
	}

	// Step 2: Validate input
	const errors: FieldError[] = [];

	if (!input.userId) {
		errors.push({
			field: "userId",
			message: "User ID is required",
			rule: "required",
		});
	}

	const validRoles: Role[] = ["owner", "manager", "renter"];
	if (!input.role || !validRoles.includes(input.role)) {
		errors.push({
			field: "role",
			message: "Role must be one of: owner, manager, renter",
			rule: "enum",
		});
	}

	// Requirement 3.7: Manager role requires at least one building assignment
	if (input.role === "manager") {
		if (!input.buildingIds || input.buildingIds.length === 0) {
			errors.push({
				field: "buildingIds",
				message: "At least one building must be assigned for the Manager role",
				rule: "required",
			});
		}
	}

	if (errors.length > 0) {
		throw new ValidationError(errors);
	}

	// Step 3: Verify the target user exists and belongs to the same owner account
	const targetUser = await db.query.users.findFirst({
		where: eq(users.id, input.userId),
	});

	if (!targetUser) {
		throw new ValidationError([
			{ field: "userId", message: "User not found", rule: "exists" },
		]);
	}

	// Verify the target user belongs to the same owner account.
	// Owners have ownerAccountId=null (they ARE the owner account, their id IS the ownerAccountId).
	// Non-owners have ownerAccountId set to their owner's id.
	const targetBelongsToAccount =
		targetUser.role === "owner"
			? targetUser.id === ctx.ownerAccountId
			: targetUser.ownerAccountId === ctx.ownerAccountId;

	if (!targetBelongsToAccount) {
		throw new ForbiddenError();
	}

	// Step 4: Prevent removal of last Owner (Requirement 3.8)
	if (targetUser.role === "owner" && input.role !== "owner") {
		// Count how many owners exist in this account
		const ownerCountResult = await db
			.select({ count: count() })
			.from(users)
			.where(and(eq(users.role, "owner")));

		const ownerCount = ownerCountResult[0]?.count ?? 0;

		// If the target user is an owner, we need to check if they are the last one
		// Owners are identified by role='owner' and either id=ownerAccountId or ownerAccountId=ctx.ownerAccountId
		if (ownerCount <= 1) {
			throw new ValidationError([
				{
					field: "role",
					message:
						"Cannot remove the last Owner. At least one Owner must exist at all times.",
					rule: "last_owner",
				},
			]);
		}
	}

	// Step 5: If assigning Manager role, validate building IDs exist and belong to the owner
	if (
		input.role === "manager" &&
		input.buildingIds &&
		input.buildingIds.length > 0
	) {
		for (const buildingId of input.buildingIds) {
			const building = await db.query.buildings.findFirst({
				where: and(
					eq(buildings.id, buildingId),
					eq(buildings.ownerAccountId, ctx.ownerAccountId),
				),
			});

			if (!building) {
				throw new ValidationError([
					{
						field: "buildingIds",
						message: `Building ${buildingId} not found or does not belong to your account`,
						rule: "exists",
					},
				]);
			}
		}
	}

	const previousRole = targetUser.role;

	// Step 6: Update the user's role
	await db
		.update(users)
		.set({
			role: input.role,
			ownerAccountId: input.role === "owner" ? null : ctx.ownerAccountId,
			updatedAt: new Date(),
		})
		.where(eq(users.id, input.userId));

	// Step 7: Handle manager_assignments
	// Remove existing manager assignments if changing away from manager
	if (previousRole === "manager" && input.role !== "manager") {
		await db
			.delete(managerAssignments)
			.where(
				and(
					eq(managerAssignments.managerId, input.userId),
					eq(managerAssignments.ownerAccountId, ctx.ownerAccountId),
				),
			);
	}

	// Create manager assignments if assigning manager role
	if (
		input.role === "manager" &&
		input.buildingIds &&
		input.buildingIds.length > 0
	) {
		// Remove existing assignments first to avoid duplicates
		await db
			.delete(managerAssignments)
			.where(
				and(
					eq(managerAssignments.managerId, input.userId),
					eq(managerAssignments.ownerAccountId, ctx.ownerAccountId),
				),
			);

		// Insert new assignments
		for (const buildingId of input.buildingIds) {
			await db.insert(managerAssignments).values({
				ownerAccountId: ctx.ownerAccountId,
				managerId: input.userId,
				buildingId,
			});
		}
	}

	// Step 8: Record role change in audit log (Requirement 3.5)
	auditLogger.log({
		actorId: ctx.userId,
		action: "role_change",
		entityType: "user",
		entityId: input.userId,
		ownerAccountId: ctx.ownerAccountId,
		oldValues: { role: previousRole },
		newValues: { role: input.role },
	});

	// Step 9: Invalidate cached permissions
	// In a stateless serverless architecture, session validation happens per-request.
	// The role is stored in the DB and read fresh on each request via Better Auth session.
	// No explicit cache invalidation is needed beyond updating the DB record.
	// If a session cache existed, we would clear it here.

	return {
		user: {
			id: input.userId,
			email: targetUser.email,
			role: input.role,
		},
	};
}
