import {
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { permissions } from "./permissions";
import { users } from "./users";

export const userPermissionOverrides = pgTable(
	"user_permission_overrides",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		permissionId: uuid("permission_id")
			.notNull()
			.references(() => permissions.id),
		effect: varchar("effect", { length: 10 }).notNull().default("grant"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		userPermissionUnique: unique("user_permission_unique").on(
			table.userId,
			table.permissionId,
		),
	}),
);
