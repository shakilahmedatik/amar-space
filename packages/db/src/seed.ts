import { client, db } from "./client";
import {
  invitations,
  members,
  organizations,
  subscriptions,
  users,
  websiteConfigs,
} from "./schema";

async function main() {
  console.log("Seeding initial database data...");

  // Platform superadmin user
  const adminId = "superadmin-root";
  await db
    .insert(users)
    .values({
      id: adminId,
      name: "Super Admin",
      email: "admin@omniheaven.com",
      emailVerified: true,
      globalRole: "admin",
    })
    .onConflictDoNothing();

  // Test Organization 1: Commercial / Residential Building
  const demoBuildingOrgId = "org-bashundhara-tower";
  await db
    .insert(organizations)
    .values({
      id: demoBuildingOrgId,
      name: "Bashundhara Royal Heights",
      slug: "bashundhara-royal-heights",
      productType: "building",
      contactPhone: "01711223344",
      contactEmail: "info@bashundhararoyal.com",
      address: "Plot 14, Block C, Bashundhara R/A, Dhaka-1229",
    })
    .onConflictDoNothing();

  // Test Organization 2: Hotel & Resort
  const demoHotelOrgId = "org-grand-haven";
  await db
    .insert(organizations)
    .values({
      id: demoHotelOrgId,
      name: "Grand Haven Luxury Resort",
      slug: "grand-haven",
      productType: "hotel",
      contactPhone: "01700000000",
      contactEmail: "info@grandhaven.com",
      address: "Marine Drive, Cox's Bazar",
    })
    .onConflictDoNothing();

  // 6-month free trial subscription for both orgs
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // 180 days

  await db
    .insert(subscriptions)
    .values([
      {
        id: "sub-demo-building",
        organizationId: demoBuildingOrgId,
        plan: "trial_6_month",
        status: "trialing",
        trialStartsAt: now,
        trialEndsAt: trialEnd,
        paymentProvider: "paystation",
      },
      {
        id: "sub-demo-hotel",
        organizationId: demoHotelOrgId,
        plan: "trial_6_month",
        status: "trialing",
        trialStartsAt: now,
        trialEndsAt: trialEnd,
        paymentProvider: "paystation",
      },
    ])
    .onConflictDoNothing();

  // Multi-Role Fixture Users for Building
  const landlordUser = {
    id: "user-landlord-1",
    name: "Mohammad Tanvir Rahman",
    email: "landlord@bashundhara.com",
    emailVerified: true,
  };
  const managerUser = {
    id: "user-manager-1",
    name: "Kamrul Hasan",
    email: "manager@bashundhara.com",
    emailVerified: true,
  };
  const staffUser = {
    id: "user-staff-1",
    name: "Abdur Rahim",
    email: "staff@bashundhara.com",
    emailVerified: true,
  };
  const renterUser = {
    id: "user-renter-1",
    name: "Nazmul Huda",
    email: "renter@bashundhara.com",
    emailVerified: true,
  };
  const hotelOwnerUser = {
    id: "user-hotel-owner-1",
    name: "Zubair Al-Mamun",
    email: "owner@grandhaven.com",
    emailVerified: true,
  };

  await db
    .insert(users)
    .values([landlordUser, managerUser, staffUser, renterUser, hotelOwnerUser])
    .onConflictDoNothing();

  // Memberships
  await db
    .insert(members)
    .values([
      {
        id: "member-landlord-building",
        organizationId: demoBuildingOrgId,
        userId: landlordUser.id,
        role: "owner",
      },
      {
        id: "member-manager-building",
        organizationId: demoBuildingOrgId,
        userId: managerUser.id,
        role: "manager",
      },
      {
        id: "member-staff-building",
        organizationId: demoBuildingOrgId,
        userId: staffUser.id,
        role: "staff",
      },
      {
        id: "member-renter-building",
        organizationId: demoBuildingOrgId,
        userId: renterUser.id,
        role: "member",
      },
      {
        id: "member-owner-hotel",
        organizationId: demoHotelOrgId,
        userId: hotelOwnerUser.id,
        role: "owner",
      },
    ])
    .onConflictDoNothing();

  // Pending invitation fixture
  const inviteExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await db
    .insert(invitations)
    .values({
      id: "invitation-pending-1",
      organizationId: demoBuildingOrgId,
      email: "assistant.manager@bashundhara.com",
      role: "admin",
      status: "pending",
      expiresAt: inviteExpiresAt,
      inviterId: landlordUser.id,
    })
    .onConflictDoNothing();

  // Initial Website Config for Demo Hotel
  await db
    .insert(websiteConfigs)
    .values({
      id: "config-demo-hotel",
      organizationId: demoHotelOrgId,
      themeSlug: "classic-luxury",
      brand: {
        primaryColor: "#0f172a",
        accentColor: "#d97706",
        fontFamily: "Playfair Display",
      },
      hero: {
        headline: "Welcome to Grand Haven Resort",
        tagline: "Where luxury meets the sea breeze in Cox's Bazar",
        ctaText: "Explore Rooms & Suites",
        ctaLink: "#rooms",
      },
      enabledSections: ["hero", "rooms", "amenities", "gallery", "about", "contact"],
      sectionOrder: ["hero", "rooms", "amenities", "gallery", "about", "contact"],
    })
    .onConflictDoNothing();

  console.log("Database seeded successfully.");
  await client.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
