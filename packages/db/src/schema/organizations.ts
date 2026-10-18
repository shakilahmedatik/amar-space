import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const PRODUCT_TYPES = ["building", "hotel", "resort", "commercial"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const ORGANIZATION_ROLES = ["owner", "admin", "manager", "staff", "member"] as const;
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export const INVITATION_STATUSES = ["pending", "accepted", "rejected", "canceled"] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    productType: text("product_type").$type<ProductType>().notNull().default("building"),
    contactPhone: text("contact_phone"),
    contactEmail: text("contact_email"),
    address: text("address"),
    customDomain: text("custom_domain").unique(),
    metadata: text("metadata"), // JSON string
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("orgs_slug_idx").on(table.slug),
    uniqueIndex("orgs_custom_domain_idx").on(table.customDomain),
  ],
);

export const members = pgTable(
  "members",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").$type<OrganizationRole>().notNull().default("member"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("members_org_user_idx").on(table.organizationId, table.userId),
    index("members_org_role_idx").on(table.organizationId, table.role),
  ],
);

export const invitations = pgTable(
  "invitations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").$type<OrganizationRole>().notNull().default("member"),
    status: text("status").$type<InvitationStatus>().notNull().default("pending"),
    expiresAt: timestamp("expires_at").notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("invitations_org_email_idx").on(table.organizationId, table.email),
    index("invitations_status_idx").on(table.status),
  ],
);
