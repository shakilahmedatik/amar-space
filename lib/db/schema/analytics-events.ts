import {
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export const analyticsEvents = pgTable("analytics_events", {
	id: uuid("id").primaryKey().defaultRandom(),
	eventName: varchar("event_name", { length: 50 }).notNull(),
	flatSlug: varchar("flat_slug", { length: 100 }).notNull(),
	userAgent: text("user_agent"),
	metadata: jsonb("metadata"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});
