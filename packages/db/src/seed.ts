import { client, db } from "./client";
import {
  buildings,
  emergencyContacts,
  flats,
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

  // Domain 02 Fixture: Realistic 6-story Dhanmondi residential building
  const dhanmondiBuildingId = "bld-dhanmondi-lakeview";
  await db
    .insert(buildings)
    .values({
      id: dhanmondiBuildingId,
      organizationId: demoBuildingOrgId,
      name: "Dhanmondi Lakeview Residency",
      address: "House 42, Road 8/A, Dhanmondi",
      city: "Dhaka",
      thana: "Dhanmondi",
      postalCode: "1205",
      totalFloors: 6,
      hasElevator: true,
      hasGenerator: true,
      gateClosingTime: "11:00 PM",
      caretakerPhone: "01712345678",
      managerPhone: "01812345678",
      whatsappGroupLink: "https://chat.whatsapp.com/demo-dhanmondi",
      rules: "No loud music after 10 PM. Advance service charge by the 7th of every month.",
    })
    .onConflictDoNothing();

  // Emergency contacts for Dhanmondi Lakeview
  await db
    .insert(emergencyContacts)
    .values([
      {
        id: "emg-caretaker-dhanmondi",
        organizationId: demoBuildingOrgId,
        buildingId: dhanmondiBuildingId,
        name: "Abdur Rahim (Caretaker)",
        role: "Head Caretaker & Gate Security",
        phone: "01712345678",
        type: "building",
      },
      {
        id: "emg-police-dhanmondi",
        organizationId: demoBuildingOrgId,
        buildingId: dhanmondiBuildingId,
        name: "Dhanmondi Police Station",
        role: "Local Police Station (Thana)",
        phone: "01713373126",
        type: "nearby",
      },
      {
        id: "emg-wasa-dhanmondi",
        organizationId: demoBuildingOrgId,
        buildingId: dhanmondiBuildingId,
        name: "Dhaka WASA Helpline",
        role: "Water & Sewerage Emergency",
        phone: "16162",
        type: "nearby",
      },
    ])
    .onConflictDoNothing();

  // 12 Flats across 6 floors (Flats 1A, 1B through 6A, 6B)
  const flatFixtures = [];
  for (let floor = 1; floor <= 6; floor++) {
    for (const unit of ["A", "B"]) {
      const flatNumber = `${floor}${unit}`;
      const isOccupied = floor < 4; // Floors 1-3 occupied, 4-6 vacant or maintenance
      const isMaintenance = floor === 6 && unit === "B";
      const status = isOccupied ? "occupied" : isMaintenance ? "under_maintenance" : "vacant";

      flatFixtures.push({
        id: `flat-dhanmondi-${flatNumber.toLowerCase()}`,
        organizationId: demoBuildingOrgId,
        buildingId: dhanmondiBuildingId,
        flatNumber,
        floor,
        unitType: "residential",
        bedrooms: 3,
        bathrooms: 2,
        balconies: 2,
        squareFeet: 1450,
        defaultRentAmount: 28000 + (floor - 1) * 1000,
        defaultServiceCharge: 5000,
        electricityMeterNumber: `DPDC-${100000 + floor * 10 + (unit === "A" ? 1 : 2)}`,
        electricityMeterType: "prepaid",
        gasType: "cylinder",
        waterSubmeterNumber: `WASA-SUB-${floor}${unit}`,
        status,
        notes: `Standard 3-BHK North-facing unit with cross ventilation.`,
      });
    }
  }

  await db.insert(flats).values(flatFixtures).onConflictDoNothing();

  console.log("Database seeded successfully.");
  await client.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
