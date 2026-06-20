import {
	integer,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { issues } from "./issues";

export const issueAttachments = pgTable("issue_attachments", {
	id: uuid("id").primaryKey().defaultRandom(),
	issueId: uuid("issue_id")
		.notNull()
		.references(() => issues.id, { onDelete: "cascade" }),
	fileUrl: varchar("file_url", { length: 500 }).notNull(),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	fileSize: integer("file_size").notNull(),
	mimeType: varchar("mime_type", { length: 50 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});
