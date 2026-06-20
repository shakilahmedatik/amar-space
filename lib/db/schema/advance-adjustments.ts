import { relations } from "drizzle-orm";
import {
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { bills } from "./bills";
import { rentalContracts } from "./rental-contracts";
import { users } from "./users";

export const advanceAdjustments = pgTable("advance_adjustments", {
	id: uuid("id").primaryKey().defaultRandom(),
	ownerAccountId: text("owner_account_id")
		.notNull()
		.references(() => users.id),
	contractId: uuid("contract_id")
		.notNull()
		.references(() => rentalContracts.id),
	amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
	billId: uuid("bill_id").references(() => bills.id), // optional link to bill
	note: varchar("note", { length: 500 }),
	adjustedBy: text("adjusted_by")
		.notNull()
		.references(() => users.id),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const advanceAdjustmentsRelations = relations(
	advanceAdjustments,
	({ one }) => ({
		owner: one(users, {
			fields: [advanceAdjustments.ownerAccountId],
			references: [users.id],
			relationName: "ownerAdvanceAdjustments",
		}),
		contract: one(rentalContracts, {
			fields: [advanceAdjustments.contractId],
			references: [rentalContracts.id],
		}),
		bill: one(bills, {
			fields: [advanceAdjustments.billId],
			references: [bills.id],
		}),
		adjustedByUser: one(users, {
			fields: [advanceAdjustments.adjustedBy],
			references: [users.id],
			relationName: "adjustedByUser",
		}),
	}),
);
