import type { Database } from "@repo/db";
import {
	permissions,
	rolePermissions,
	staffRoles,
	userPermissionOverrides,
} from "@repo/db";
import { ROLE_PERMISSIONS } from "@repo/shared/constants";
import type { UserRole } from "@repo/shared/roles";
import { and, eq, or, sql } from "drizzle-orm";

export type Permission = string;

export interface ResolvedPermissions {
	permissions: Set<string>;
	overrides: Array<{ key: string; effect: "grant" | "deny" }>;
}

const DEFAULT_ROLE_PERMISSIONS = ROLE_PERMISSIONS as Record<
	string,
	readonly string[]
>;

export class PermissionService {
	private cache = new Map<string, ResolvedPermissions>();
	private cacheTtl = 5 * 60 * 1000;
	private cacheTimestamps = new Map<string, number>();

	constructor(private db: Database) {}

	async resolvePermissions(
		userId: string,
		role: UserRole,
		ownerAccountId: string,
	): Promise<ResolvedPermissions> {
		const cacheKey = `${userId}:${role}:${ownerAccountId}`;
		const cached = this.cache.get(cacheKey);
		const cachedAt = this.cacheTimestamps.get(cacheKey);
		if (cached && cachedAt && Date.now() - cachedAt < this.cacheTtl) {
			return cached;
		}

		let basePermissions: Set<string>;

		if (role === "superadmin") {
			const allPermKeys = await this.db
				.select({ key: permissions.key })
				.from(permissions);
			basePermissions = new Set(allPermKeys.map((p) => p.key));
		} else {
			basePermissions = new Set(DEFAULT_ROLE_PERMISSIONS[role] ?? []);
			const dbRolePerms = await this.loadRolePermissionsFromDb(
				ownerAccountId,
				role,
			);
			if (dbRolePerms.size > 0) {
				basePermissions = new Set([...basePermissions, ...dbRolePerms]);
			}
		}

		const overrides = await this.loadUserOverrides(userId);
		for (const override of overrides) {
			if (override.effect === "grant") {
				basePermissions.add(override.key);
			} else if (override.effect === "deny") {
				basePermissions.delete(override.key);
			}
		}

		const result: ResolvedPermissions = {
			permissions: basePermissions,
			overrides: overrides.map((o) => ({
				key: o.key,
				effect: o.effect as "grant" | "deny",
			})),
		};

		this.cache.set(cacheKey, result);
		this.cacheTimestamps.set(cacheKey, Date.now());
		return result;
	}

	async hasPermission(
		userId: string,
		role: UserRole,
		ownerAccountId: string,
		permission: Permission,
	): Promise<boolean> {
		const resolved = await this.resolvePermissions(
			userId,
			role,
			ownerAccountId,
		);
		return resolved.permissions.has(permission);
	}

	async hasAnyPermission(
		userId: string,
		role: UserRole,
		ownerAccountId: string,
		perms: Permission[],
	): Promise<boolean> {
		const resolved = await this.resolvePermissions(
			userId,
			role,
			ownerAccountId,
		);
		return perms.some((p) => resolved.permissions.has(p));
	}

	invalidateCache(userId: string, role: UserRole, ownerAccountId: string) {
		const cacheKey = `${userId}:${role}:${ownerAccountId}`;
		this.cache.delete(cacheKey);
		this.cacheTimestamps.delete(cacheKey);
	}

	invalidateAll() {
		this.cache.clear();
		this.cacheTimestamps.clear();
	}

	private async loadRolePermissionsFromDb(
		ownerAccountId: string,
		role: UserRole,
	): Promise<Set<string>> {
		// Find role IDs matching the user's role slug, scoped to the owner account or system roles
		const matchingRoles = await this.db
			.select({ id: staffRoles.id })
			.from(staffRoles)
			.where(
				and(
					eq(staffRoles.slug, role),
					or(
						eq(staffRoles.ownerAccountId, ownerAccountId),
						sql`${staffRoles.ownerAccountId} IS NULL`,
					),
				),
			);

		if (matchingRoles.length === 0) {
			return new Set();
		}

		const roleIds = matchingRoles.map((r: { id: string }) => r.id);

		// Get all permission keys for those roles
		const permRows = await this.db
			.select({ key: permissions.key })
			.from(rolePermissions)
			.innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
			.where(
				roleIds.length === 1
					? eq(rolePermissions.roleId, roleIds[0] ?? "")
					: sql`${rolePermissions.roleId} IN (${sql.join(
							roleIds.map((id: string) => sql`${id}`),
							sql`, `,
						)})`,
			);

		return new Set(permRows.map((p: { key: string }) => p.key));
	}

	private async loadUserOverrides(
		userId: string,
	): Promise<Array<{ key: string; effect: string }>> {
		return this.db
			.select({
				key: permissions.key,
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
