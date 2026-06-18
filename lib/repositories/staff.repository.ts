import {
	type Database,
	type DatabaseOrTransaction,
	buildings,
	managerAssignments,
	permissions,
	rolePermissions,
	staffBuildingAssignments,
	staffRoles,
	userPermissionOverrides,
	users,
} from "@repo/db";
import { type SQL, and, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { BaseRepository, type ScopeContext } from "./scoped-query";

export class StaffRepository extends BaseRepository {
	findById(id: string, ownerAccountId: string) {
		return this.db.query.users.findFirst({
			where: and(eq(users.id, id), eq(users.ownerAccountId, ownerAccountId)),
			columns: {
				id: true,
				name: true,
				email: true,
				role: true,
				phone: true,
				isActive: true,
				ownerAccountId: true,
				createdAt: true,
				updatedAt: true,
			},
		});
	}

	listStaffWithAssignments(
		scope: ScopeContext,
		page: number,
		pageSize: number,
		roleFilter?: string,
	) {
		const offset = (page - 1) * pageSize;

		const conditions: SQL[] = [];
		if (scope.role !== "superadmin") {
			conditions.push(eq(users.ownerAccountId, scope.ownerAccountId));
		}
		conditions.push(
			inArray(users.role, ["manager", "security_guard", "care_taker"]),
		);

		if (roleFilter) {
			conditions.push(eq(users.role, roleFilter));
		}

		return Promise.all([
			this.db
				.select({
					id: users.id,
					name: users.name,
					email: users.email,
					role: users.role,
					isActive: users.isActive,
					createdAt: users.createdAt,
				})
				.from(users)
				.where(and(...conditions))
				.orderBy(desc(users.createdAt))
				.limit(pageSize)
				.offset(offset),
			this.db
				.select({ count: count() })
				.from(users)
				.where(and(...conditions)),
		]);
	}

	getAssignmentsForStaff(staffIds: string[]) {
		if (staffIds.length === 0) return [];
		return this.db
			.select({
				staffId: staffBuildingAssignments.staffId,
				buildingId: staffBuildingAssignments.buildingId,
			})
			.from(staffBuildingAssignments)
			.where(inArray(staffBuildingAssignments.staffId, staffIds));
	}

	getStaffDetail(id: string, ownerAccountId: string) {
		return this.db.query.users.findFirst({
			where: and(eq(users.id, id), eq(users.ownerAccountId, ownerAccountId)),
			columns: {
				id: true,
				name: true,
				email: true,
				role: true,
				phone: true,
				isActive: true,
				ownerAccountId: true,
				createdAt: true,
				updatedAt: true,
			},
		});
	}

	getStaffPermissions(userId: string, ownerAccountId: string) {
		return Promise.all([
			this.db
				.select({
					roleId: staffRoles.id,
					slug: staffRoles.slug,
					name: staffRoles.name,
					description: staffRoles.description,
					isSystemRole: staffRoles.isSystemRole,
				})
				.from(staffRoles)
				.where(
					or(
						eq(staffRoles.ownerAccountId, ownerAccountId),
						sql`${staffRoles.ownerAccountId} IS NULL`,
					),
				),
			this.db
				.select({
					permissionKey: permissions.key,
				})
				.from(rolePermissions)
				.innerJoin(staffRoles, eq(rolePermissions.roleId, staffRoles.id))
				.innerJoin(
					permissions,
					eq(rolePermissions.permissionId, permissions.id),
				)
				.where(
					or(
						eq(staffRoles.ownerAccountId, ownerAccountId),
						sql`${staffRoles.ownerAccountId} IS NULL`,
					),
				),
			this.db
				.select({
					permissionKey: userPermissionOverrides.permissionId,
					effect: userPermissionOverrides.effect,
				})
				.from(userPermissionOverrides)
				.where(eq(userPermissionOverrides.userId, userId)),
		]);
	}

	clearBuildingAssignments(
		staffId: string,
		ownerAccountId: string,
		tx?: DatabaseOrTransaction,
	) {
		const client = this.txOrDb(tx);
		return client
			.delete(staffBuildingAssignments)
			.where(
				and(
					eq(staffBuildingAssignments.staffId, staffId),
					eq(staffBuildingAssignments.ownerAccountId, ownerAccountId),
				),
			);
	}

	clearManagerAssignments(
		managerId: string,
		ownerAccountId: string,
		tx?: DatabaseOrTransaction,
	) {
		const client = this.txOrDb(tx);
		return client
			.delete(managerAssignments)
			.where(
				and(
					eq(managerAssignments.managerId, managerId),
					eq(managerAssignments.ownerAccountId, ownerAccountId),
				),
			);
	}

	insertBuildingAssignments(
		data: (typeof staffBuildingAssignments.$inferInsert)[],
		tx?: DatabaseOrTransaction,
	) {
		const client = this.txOrDb(tx);
		if (data.length === 0) return [];
		return client.insert(staffBuildingAssignments).values(data).returning();
	}

	insertManagerAssignments(
		data: (typeof managerAssignments.$inferInsert)[],
		tx?: DatabaseOrTransaction,
	) {
		const client = this.txOrDb(tx);
		if (data.length === 0) return [];
		return client.insert(managerAssignments).values(data).returning();
	}

	findBuildingsByIds(buildingIds: string[], ownerAccountId: string) {
		if (buildingIds.length === 0) return [];
		return this.db
			.select({ id: buildings.id })
			.from(buildings)
			.where(
				and(
					eq(buildings.ownerAccountId, ownerAccountId),
					inArray(buildings.id, buildingIds),
				),
			);
	}

	findByEmail(email: string) {
		return this.db.query.users.findFirst({
			where: eq(users.email, email),
		});
	}

	createUser(data: typeof users.$inferInsert, tx?: DatabaseOrTransaction) {
		const client = this.txOrDb(tx);
		return client.insert(users).values(data).returning();
	}

	updateUser(
		id: string,
		data: Partial<typeof users.$inferInsert>,
		tx?: DatabaseOrTransaction,
	) {
		const client = this.txOrDb(tx);
		return client
			.update(users)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(users.id, id))
			.returning();
	}

	getSystemAndOwnerRoles(ownerAccountId: string) {
		return this.db
			.select()
			.from(staffRoles)
			.where(
				or(
					sql`${staffRoles.ownerAccountId} IS NULL`,
					eq(staffRoles.ownerAccountId, ownerAccountId),
				),
			);
	}

	getRoleWithPermissions(roleId: string, _ownerAccountId: string) {
		return Promise.all([
			this.db.query.staffRoles.findFirst({
				where: eq(staffRoles.id, roleId),
			}),
			this.db
				.select({
					key: permissions.key,
					label: permissions.label,
					group: permissions.group,
				})
				.from(rolePermissions)
				.innerJoin(
					permissions,
					eq(rolePermissions.permissionId, permissions.id),
				)
				.where(eq(rolePermissions.roleId, roleId)),
		]);
	}

	getUserPermissionOverrides(userId: string) {
		return this.db
			.select({
				id: userPermissionOverrides.id,
				permissionKey: permissions.key,
				effect: userPermissionOverrides.effect,
			})
			.from(userPermissionOverrides)
			.innerJoin(
				permissions,
				eq(userPermissionOverrides.permissionId, permissions.id),
			)
			.where(eq(userPermissionOverrides.userId, userId));
	}
}
