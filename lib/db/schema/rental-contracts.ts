import {
	date,
	index,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { flats } from "./flats";
import { renters } from "./renters";
import { users } from "./users";

export const rentalContracts = pgTable(
	"rental_contracts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		ownerAccountId: text("owner_account_id")
			.notNull()
			.references(() => users.id),
		renterId: uuid("renter_id")
			.notNull()
			.references(() => renters.id),
		flatId: uuid("flat_id")
			.notNull()
			.references(() => flats.id),
		monthlyRent: numeric("monthly_rent", { precision: 12, scale: 2 }).notNull(),
		startDate: date("start_date").notNull(),
		endDate: date("end_date"),
		securityDepositAmount: numeric("security_deposit_amount", {
			precision: 12,
			scale: 2,
		}).notNull(),
		remainingDepositBalance: numeric("remaining_deposit_balance", {
			precision: 12,
			scale: 2,
		}).notNull(),
		gasBill: numeric("gas_bill", { precision: 12, scale: 2 })
			.notNull()
			.default("0.00"),
		waterBill: numeric("water_bill", { precision: 12, scale: 2 })
			.notNull()
			.default("0.00"),
		serviceCharge: numeric("service_charge", { precision: 12, scale: 2 })
			.notNull()
			.default("0.00"),
		otherCharges: numeric("other_charges", { precision: 12, scale: 2 })
			.notNull()
			.default("0.00"),
		status: varchar("status", {
			length: 20,
			enum: ["active", "pending_termination", "terminated"],
		})
			.notNull()
			.default("active"),
		scheduledTerminationDate: date("scheduled_termination_date"),
		noticeGivenAt: timestamp("notice_given_at", { withTimezone: true }),
		terminationReason: varchar("termination_reason", { length: 500 }),
		terminatedBy: text("terminated_by").references(() => users.id),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		renterStatusIdx: index("rental_contracts_renter_status_idx").on(
			table.renterId,
			table.status,
		),
		flatStatusIdx: index("rental_contracts_flat_status_idx").on(
			table.flatId,
			table.status,
		),
		ownerAccountIdx: index("rental_contracts_owner_account_idx").on(
			table.ownerAccountId,
		),
	}),
);
