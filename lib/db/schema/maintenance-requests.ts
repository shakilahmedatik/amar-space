import {
	index,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { buildings } from "./buildings";
import { flats } from "./flats";
import { renters } from "./renters";
import { users } from "./users";

export const maintenanceRequests = pgTable(
	"maintenance_requests",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		ownerAccountId: text("owner_account_id")
			.notNull()
			.references(() => users.id),
		flatId: uuid("flat_id").references(() => flats.id),
		renterId: uuid("renter_id").references(() => renters.id),
		buildingId: uuid("building_id")
			.notNull()
			.references(() => buildings.id),
		title: varchar("title", { length: 200 }).notNull(),
		description: varchar("description", { length: 2000 }).notNull(),
		priority: varchar("priority", { length: 10 }).notNull(),
		status: varchar("status", {
			length: 20,
			enum: ["open", "in_progress", "resolved", "closed"],
		})
			.notNull()
			.default("open"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		ownerAccountIdx: index("maintenance_requests_owner_account_idx").on(
			table.ownerAccountId,
		),
		buildingStatusIdx: index("maintenance_requests_building_status_idx").on(
			table.buildingId,
			table.status,
		),
		statusCreatedIdx: index("maintenance_requests_status_created_idx").on(
			table.status,
			table.createdAt,
		),
	}),
);
