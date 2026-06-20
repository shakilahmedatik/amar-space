import {
	integer,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const buildings = pgTable(
	"buildings",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		ownerAccountId: text("owner_account_id")
			.notNull()
			.references(() => users.id),
		name: varchar("name", { length: 200 }).notNull(),
		address: varchar("address", { length: 500 }).notNull(),
		totalFloors: integer("total_floors"),
		whatsappGroupLink: varchar("whatsapp_group_link", { length: 500 }),
		managerPhone: varchar("manager_phone", { length: 20 }),
		logoUrl: varchar("logo_url", { length: 500 }),
		coverImageUrl: varchar("cover_image_url", { length: 500 }),
		rules: text("rules"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		ownerNameUnique: unique("buildings_owner_name_unique").on(
			table.ownerAccountId,
			table.name,
		),
	}),
);
