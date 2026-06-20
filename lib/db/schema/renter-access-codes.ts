import {
	integer,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { flats } from "./flats";
import { renters } from "./renters";

export const renterAccessCodes = pgTable("renter_access_codes", {
	id: uuid("id").primaryKey().defaultRandom(),
	flatId: uuid("flat_id")
		.notNull()
		.references(() => flats.id, { onDelete: "cascade" }),
	renterId: uuid("renter_id")
		.notNull()
		.references(() => renters.id),
	codeHash: varchar("code_hash", { length: 255 }).notNull(),
	failedAttempts: integer("failed_attempts").notNull().default(0),
	lockedUntil: timestamp("locked_until", { withTimezone: true }),
	expiresAt: timestamp("expires_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});
