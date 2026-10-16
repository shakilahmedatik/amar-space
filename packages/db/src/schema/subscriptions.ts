import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  plan: text("plan").notNull().default("trial_6_month"), // 'trial_6_month' | 'pro_monthly' | 'pro_yearly'
  status: text("status").notNull().default("trialing"), // 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired'
  trialStartsAt: timestamp("trial_starts_at").defaultNow().notNull(),
  trialEndsAt: timestamp("trial_ends_at").notNull(),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  paymentProvider: text("payment_provider"), // 'paystation' | 'bkash' | 'stripe'
  providerCustomerId: text("provider_customer_id"),
  providerSubscriptionId: text("provider_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
