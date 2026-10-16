import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const websiteConfigs = pgTable("website_configs", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: "cascade" }),
  themeSlug: text("theme_slug").notNull().default("classic-luxury"),
  brand: jsonb("brand").notNull().default({}), // logoUrl, faviconUrl, primaryColor, accentColor, fontFamily
  hero: jsonb("hero").notNull().default({}), // headline, tagline, backgroundImageUrl, ctaText, ctaLink
  enabledSections: jsonb("enabled_sections").notNull().default([]), // string[] of section IDs
  sectionOrder: jsonb("section_order").notNull().default([]), // string[] of section IDs
  customCss: text("custom_css"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
