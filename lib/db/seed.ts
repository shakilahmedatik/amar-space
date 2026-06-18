import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";
import type { Database } from "./client";
import { createDbClient } from "./client";
import {
	accounts,
	permissions,
	rolePermissions,
	staffRoles,
	users,
} from "./schema";

const STAFF_ROLES_SEED = [
	{
		slug: "manager",
		name: "Manager",
		description:
			"Manages buildings, flats, renters, billing and day-to-day operations",
		permissions: [
			"buildings:read",
			"flats:read",
			"flats:write",
			"renters:read",
			"renters:write",
			"bills:read",
			"bills:write",
			"payments:read",
			"payments:write",
			"deposits:read",
			"maintenance:read",
			"maintenance:write",
			"issues:read",
			"issues:write",
			"notices:read",
			"notices:write",
		],
	},
	{
		slug: "security_guard",
		name: "Security Guard",
		description: "Monitors building issues and security concerns",
		permissions: [
			"buildings:read",
			"flats:read",
			"maintenance:read",
			"maintenance:write",
			"issues:read",
			"issues:write",
			"notices:read",
		],
	},
	{
		slug: "care_taker",
		name: "Care Taker",
		description: "Handles maintenance requests and building upkeep",
		permissions: [
			"buildings:read",
			"flats:read",
			"maintenance:read",
			"maintenance:write",
			"issues:read",
			"issues:write",
			"notices:read",
		],
	},
];

const ALL_PERMISSIONS = [
	{ key: "buildings:read", label: "View Buildings", group: "buildings" },
	{
		key: "buildings:write",
		label: "Create/Edit Buildings",
		group: "buildings",
	},
	{ key: "flats:read", label: "View Flats", group: "flats" },
	{ key: "flats:write", label: "Create/Edit Flats", group: "flats" },
	{ key: "flats:delete", label: "Delete Flats", group: "flats" },
	{ key: "renters:read", label: "View Renters", group: "renters" },
	{ key: "renters:write", label: "Create/Edit Renters", group: "renters" },
	{ key: "bills:read", label: "View Bills", group: "bills" },
	{ key: "bills:write", label: "Create/Edit Bills", group: "bills" },
	{ key: "payments:read", label: "View Payments", group: "payments" },
	{ key: "payments:write", label: "Record Payments", group: "payments" },
	{ key: "deposits:read", label: "View Deposits", group: "deposits" },
	{ key: "deposits:write", label: "Manage Deposits", group: "deposits" },
	{
		key: "maintenance:read",
		label: "View Maintenance",
		group: "maintenance",
	},
	{
		key: "maintenance:write",
		label: "Manage Maintenance",
		group: "maintenance",
	},
	{ key: "issues:read", label: "View Issues", group: "issues" },
	{ key: "issues:write", label: "Manage Issues", group: "issues" },
	{ key: "notices:read", label: "View Notices", group: "notices" },
	{ key: "notices:write", label: "Create Notices", group: "notices" },
	{ key: "notices:delete", label: "Delete Notices", group: "notices" },
	{ key: "audit:read", label: "View Audit Log", group: "audit" },
	{ key: "roles:write", label: "Manage Roles", group: "roles" },
	{ key: "staff:read", label: "View Staff", group: "staff" },
	{ key: "staff:write", label: "Manage Staff", group: "staff" },
];

export async function seed(db: Database): Promise<void> {
	console.log("[seed] Seeding database with system requirements...");

	const now = new Date();

	// 1. Seed permissions
	const permKeyToId = new Map<string, string>();
	for (const perm of ALL_PERMISSIONS) {
		const result = await db
			.insert(permissions)
			.values({
				key: perm.key,
				label: perm.label,
				group: perm.group,
			})
			.onConflictDoNothing({ target: permissions.key })
			.returning({ id: permissions.id, key: permissions.key });

		if (result.length > 0) {
			permKeyToId.set(result[0]?.key as string, result[0]?.id as string);
		} else {
			const existing = await db.query.permissions.findFirst({
				where: (p, { eq }) => eq(p.key, perm.key),
				columns: { id: true, key: true },
			});
			if (existing) {
				permKeyToId.set(existing.key, existing.id);
			}
		}
	}

	// 2. Seed system roles
	for (const role of STAFF_ROLES_SEED) {
		const existingRole = await db.query.staffRoles.findFirst({
			where: (sr, { and, eq, isNull }) =>
				and(eq(sr.slug, role.slug), isNull(sr.ownerAccountId)),
		});

		let roleId: string;

		if (existingRole) {
			roleId = existingRole.id;
		} else {
			const inserted = await db
				.insert(staffRoles)
				.values({
					ownerAccountId: null,
					name: role.name,
					slug: role.slug,
					description: role.description,
					isSystemRole: true,
				})
				.returning({ id: staffRoles.id });

			roleId = inserted[0]?.id as string;
		}

		for (const permKey of role.permissions) {
			const permId = permKeyToId.get(permKey);
			if (!permId) {
				console.warn(`[seed] Permission key "${permKey}" not found, skipping`);
				continue;
			}

			await db
				.insert(rolePermissions)
				.values({
					roleId,
					permissionId: permId,
				})
				.onConflictDoNothing();
		}
	}

	// 3. Seed Superadmin from .env
	const adminEmail = process.env.SUPERADMIN_EMAIL;
	const adminPassword = process.env.SUPERADMIN_PASSWORD;
	const adminName = process.env.SUPERADMIN_NAME || "Super Admin";

	if (adminEmail && adminPassword) {
		console.log(`[seed] Creating superadmin for ${adminEmail}...`);
		const adminId = randomUUID();
		const hashedPassword = await hashPassword(adminPassword);

		await db
			.insert(users)
			.values({
				id: adminId,
				email: adminEmail,
				name: adminName,
				emailVerified: true,
				role: "superadmin",
				ownerAccountId: null,
				approvalStatus: "approved",
				isActive: true,
				createdAt: now,
				updatedAt: now,
			})
			.onConflictDoNothing({ target: users.email });

		// Fetch ID in case it already existed
		const existingAdmin = await db.query.users.findFirst({
			where: (u, { eq }) => eq(u.email, adminEmail),
		});

		if (existingAdmin) {
			await db
				.insert(accounts)
				.values({
					id: `account-${existingAdmin.id}`,
					accountId: existingAdmin.email,
					providerId: "credential",
					userId: existingAdmin.id,
					password: hashedPassword,
					createdAt: now,
					updatedAt: now,
				})
				.onConflictDoNothing({ target: accounts.id });
		}
	} else {
		console.warn(
			"[seed] Skipping superadmin creation. SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD not set in .env",
		);
	}

	console.log("[seed] Database seeded successfully.");
}

// Main execution block
if (
	import.meta.url === `file://${process.argv[1]}` ||
	process.argv[1]?.endsWith("seed.ts")
) {
	const db = createDbClient();
	seed(db)
		.then(() => {
			console.log("[seed] Done.");
			process.exit(0);
		})
		.catch((error) => {
			console.error("[seed] Seed failed:", error);
			process.exit(1);
		});
}
