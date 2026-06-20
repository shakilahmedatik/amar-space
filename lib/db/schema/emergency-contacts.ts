import {
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { buildings } from "./buildings";
import { users } from "./users";

export const emergencyContacts = pgTable("emergency_contacts", {
	id: uuid("id").primaryKey().defaultRandom(),
	buildingId: uuid("building_id")
		.notNull()
		.references(() => buildings.id),
	ownerAccountId: text("owner_account_id")
		.notNull()
		.references(() => users.id),
	name: varchar("name", { length: 100 }).notNull(),
	role: varchar("role", { length: 50 }).notNull(),
	phone: varchar("phone", { length: 20 }),
	type: varchar("type", { length: 20, enum: ["building", "nearby"] }).notNull(),
	sortOrder: integer("sort_order").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});
