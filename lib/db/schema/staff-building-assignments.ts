import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { buildings } from "./buildings";
import { users } from "./users";

export const staffBuildingAssignments = pgTable(
	"staff_building_assignments",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		ownerAccountId: text("owner_account_id")
			.notNull()
			.references(() => users.id),
		staffId: text("staff_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		buildingId: uuid("building_id")
			.notNull()
			.references(() => buildings.id),
		assignedAt: timestamp("assigned_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		staffBuildingUnique: unique("staff_building_unique").on(
			table.staffId,
			table.buildingId,
		),
	}),
);
