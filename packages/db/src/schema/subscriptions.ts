import { index, integer, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const subscriptionPlans = pgTable("subscription_plans", {
  id: text("id").primaryKey(), // 'starter' | 'pro' | 'enterprise'
  name: text("name").notNull(),
  description: text("description"),
  priceMonthlyBdt: numeric("price_monthly_bdt", { precision: 12, scale: 2 }).notNull(),
  priceYearlyBdt: numeric("price_yearly_bdt", { precision: 12, scale: 2 }).notNull(),
  maxUnits: integer("max_units").notNull().default(20),
  features: text("features").notNull(), // JSON string array of enabled features
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    planId: text("plan_id").references(() => subscriptionPlans.id, { onDelete: "restrict" }),
    plan: text("plan").default("starter"), // backward compatibility
    status: text("status").notNull().default("trialing"), // 'trialing' | 'active' | 'past_due' | 'canceled' | 'suspended'
    billingCycle: text("billing_cycle").notNull().default("monthly"), // 'monthly' | 'yearly'
    trialStartsAt: timestamp("trial_starts_at", { withTimezone: true }).defaultNow().notNull(),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }).notNull(),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    paymentProvider: text("payment_provider").default("bkash"), // 'paystation' | 'bkash' | 'sslcommerz' | 'stripe' | 'manual'
    providerCustomerId: text("provider_customer_id"),
    providerSubscriptionId: text("provider_subscription_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("subscriptions_org_idx").on(table.organizationId),
    index("subscriptions_status_idx").on(table.status),
    index("subscriptions_plan_idx").on(table.planId),
  ],
);
