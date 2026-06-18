import {
	index,
	integer,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { buildings } from "./buildings";
import { users } from "./users";

export const flats = pgTable(
	"flats",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		ownerAccountId: text("owner_account_id")
			.notNull()
			.references(() => users.id),
		buildingId: uuid("building_id")
			.notNull()
			.references(() => buildings.id),
		flatNumber: varchar("flat_number", { length: 20 }).notNull(),
		floor: integer("floor").notNull(),
		status: varchar("status", {
			length: 20,
			enum: ["vacant", "occupied", "under_maintenance"],
		})
			.notNull()
			.default("vacant"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		buildingFlatNumberUnique: unique("flats_building_flat_number_unique").on(
			table.buildingId,
			table.flatNumber,
		),
		ownerAccountIdx: index("flats_owner_account_idx").on(table.ownerAccountId),
		buildingOwnerIdx: index("flats_building_owner_idx").on(
			table.buildingId,
			table.ownerAccountId,
		),
	}),
);
