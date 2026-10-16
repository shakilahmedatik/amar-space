import { client, db } from "./client";
import { organizations, subscriptions, users, websiteConfigs } from "./schema";

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
    })
    .onConflictDoNothing();

  // Demo Hotel Organization
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

  // 6-month free trial subscription
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // 180 days ~ 6 months
  await db
    .insert(subscriptions)
    .values({
      id: "sub-demo-hotel",
      organizationId: demoHotelOrgId,
      plan: "trial_6_month",
      status: "trialing",
      trialStartsAt: now,
      trialEndsAt: trialEnd,
      paymentProvider: "paystation",
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
