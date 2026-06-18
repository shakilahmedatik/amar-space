import {
	boolean,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export const loginAttempts = pgTable("login_attempts", {
	id: uuid("id").primaryKey().defaultRandom(),
	email: varchar("email", { length: 255 }).notNull(),
	success: boolean("success").notNull(),
	ipAddress: varchar("ip_address", { length: 45 }),
	attemptedAt: timestamp("attempted_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});
