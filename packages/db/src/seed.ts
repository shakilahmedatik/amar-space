import { randomBytes, scryptSync } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { client, db } from "./client";
import {
  accounts,
  advanceAdjustments,
  auditLogs,
  bills,
  bookings,
  buildings,
  emergencyContacts,
  flats,
  invitations,
  maintenanceRequests,
  members,
  notices,
  type OrganizationRole,
  organizations,
  type ProductType,
  payments,
  rentalContracts,
  renters,
  rooms,
  roomTypes,
  subscriptionPlans,
  subscriptions,
  users,
  websiteConfigs,
} from "./schema";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password.normalize("NFKC"), salt, 64, {
    N: 16384,
    r: 16,
    p: 1,
    maxmem: 128 * 16384 * 16 * 2,
  }).toString("hex");
  return `${salt}:${key}`;
}

async function ensureUser(userDef: {
  id: string;
  name: string;
  email: string;
  globalRole?: string;
  password?: string;
}): Promise<typeof users.$inferSelect> {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, userDef.email),
  });
  if (existing) {
    console.log(`[SEED:USER] User "${userDef.email}" already exists -> skipping.`);
    return existing;
  }

  console.log(`[SEED:USER] Creating user "${userDef.email}" (${userDef.name})...`);
  const [created] = await db
    .insert(users)
    .values({
      id: userDef.id,
      name: userDef.name,
      email: userDef.email,
      emailVerified: true,
      globalRole: userDef.globalRole ?? "user",
    })
    .returning();

  const pwd = userDef.password;
  if (!pwd) {
    throw new Error(`Refusing to seed user "${userDef.email}" without an explicit password`);
  }
  await db
    .insert(accounts)
    .values({
      id: `acc-${userDef.id}`,
      userId: userDef.id,
      accountId: userDef.id,
      providerId: "credential",
      password: hashPassword(pwd),
    })
    .onConflictDoNothing();

  if (!created) {
    throw new Error(`Failed to create user ${userDef.email}`);
  }
  return created;
}

async function ensureOrganization(orgDef: {
  id: string;
  name: string;
  slug: string;
  productType: ProductType;
  contactPhone: string;
  contactEmail: string;
  address: string;
  status?: "active" | "trialing" | "suspended";
}): Promise<typeof organizations.$inferSelect> {
  const existing = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgDef.slug),
  });
  if (existing) {
    console.log(`[SEED:ORG] Organization "${orgDef.slug}" already exists -> skipping.`);
    return existing;
  }

  console.log(`[SEED:ORG] Creating organization "${orgDef.name}" (${orgDef.slug})...`);
  const [created] = await db
    .insert(organizations)
    .values({
      id: orgDef.id,
      name: orgDef.name,
      slug: orgDef.slug,
      productType: orgDef.productType,
      contactPhone: orgDef.contactPhone,
      contactEmail: orgDef.contactEmail,
      address: orgDef.address,
      status: orgDef.status ?? "active",
    })
    .returning();

  // Ensure subscription for new organization
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
  await db
    .insert(subscriptions)
    .values({
      id: `sub-${orgDef.id}`,
      organizationId: orgDef.id,
      planId: "pro",
      plan: "pro",
      status: "active",
      billingCycle: "monthly",
      trialStartsAt: now,
      trialEndsAt: trialEnd,
      paymentProvider: "bkash",
    })
    .onConflictDoNothing();

  if (!created) {
    throw new Error(`Failed to create organization ${orgDef.slug}`);
  }
  return created;
}

async function ensureMembership(
  organizationId: string,
  userId: string,
  role: OrganizationRole = "owner",
) {
  const existing = await db.query.members.findFirst({
    where: and(eq(members.organizationId, organizationId), eq(members.userId, userId)),
  });
  if (existing) {
    return existing;
  }

  const [member] = await db
    .insert(members)
    .values({
      id: `member-${userId}-${organizationId}`,
      organizationId,
      userId,
      role,
    })
    .returning();
  return member;
}

async function main() {
  console.log("Seeding initial database data...");

  // Seed SaaS Subscription Plans
  console.log("Seeding subscription plans...");
  await db
    .insert(subscriptionPlans)
    .values([
      {
        id: "starter",
        name: "Starter Tier",
        description:
          "Essential property management for independent landlords & boutique hotels up to 20 units.",
        priceMonthlyBdt: "1499.00",
        priceYearlyBdt: "14990.00",
        maxUnits: 20,
        features: JSON.stringify([
          "Up to 20 residential units / hotel rooms",
          "Bangladeshi KYC & NID verification",
          "Automated monthly billing & utility charges",
          "Housekeeping & maintenance ticket tracking",
          "Basic financial reports & CSV export",
        ]),
        isActive: 1,
      },
      {
        id: "pro",
        name: "Pro Growth",
        description:
          "Advanced multi-property operations with automated bKash integration for up to 100 units.",
        priceMonthlyBdt: "3999.00",
        priceYearlyBdt: "39990.00",
        maxUnits: 100,
        features: JSON.stringify([
          "Up to 100 units / hotel rooms across multiple buildings",
          "Automated bKash & Nagad recurring payment notifications",
          "Dynamic hotel tape chart & walk-in reservations",
          "Staff role-based access control (RBAC)",
          "Immutable security audit logs & compliance trail",
          "Priority phone & email support in Dhaka",
        ]),
        isActive: 1,
      },
      {
        id: "enterprise",
        name: "Enterprise Unlimited",
        description:
          "Unlimited scale for resort chains, real estate developers, and commercial asset managers.",
        priceMonthlyBdt: "9999.00",
        priceYearlyBdt: "99990.00",
        maxUnits: 999999,
        features: JSON.stringify([
          "Unlimited units, rooms, and properties",
          "Dedicated custom domain with SSL & white-labeling",
          "Direct database export & webhook telemetry",
          "Custom payment gateway routing (SSLCOMMERZ / Shurjopay)",
          "24/7 VIP SLA with dedicated account director",
        ]),
        isActive: 1,
      },
    ])
    .onConflictDoUpdate({
      target: subscriptionPlans.id,
      set: {
        name: subscriptionPlans.name,
        priceMonthlyBdt: subscriptionPlans.priceMonthlyBdt,
        priceYearlyBdt: subscriptionPlans.priceYearlyBdt,
        maxUnits: subscriptionPlans.maxUnits,
        features: subscriptionPlans.features,
      },
    });

  const isProduction = process.env.NODE_ENV === "production";
  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || (isProduction ? "" : "Password123!");
  if (!defaultPassword) {
    throw new Error(
      "SEED_DEFAULT_PASSWORD must be set when seeding in production; refusing to use a built-in demo password.",
    );
  }
  const superadminPassword =
    process.env.SUPERADMIN_PASSWORD || process.env.SUPERADMIN_DEFAULT_PASSWORD || defaultPassword;
  const superadminEmail = process.env.SUPERADMIN_EMAIL || "admin@omniheaven.com";
  const superadminName = process.env.SUPERADMIN_NAME || "Platform Super Admin";

  // =========================================================================
  // 1. PLATFORM SUPERADMIN (Saas Platform HQ)
  // =========================================================================
  const superAdmin = await ensureUser({
    id: "superadmin-root",
    name: superadminName,
    email: superadminEmail,
    globalRole: "superadmin",
    password: superadminPassword,
  });
  const adminId = superAdmin.id;

  // =========================================================================
  // 2. TENANT ORGANIZATIONS (All Verticals)
  // =========================================================================
  // Org 1: Building Vertical (Bashundhara Royal Heights)
  const demoBuildingOrg = await ensureOrganization({
    id: "org-bashundhara-tower",
    name: "Bashundhara Royal Heights",
    slug: "bashundhara-royal-heights",
    productType: "building",
    contactPhone: "01711223344",
    contactEmail: "info@bashundhararoyal.com",
    address: "Plot 14, Block C, Bashundhara R/A, Dhaka-1229",
    status: "active",
  });
  const demoBuildingOrgId = demoBuildingOrg.id;

  // Org 2: Flat / Apartment Landlord (Gulshan Lakeview Luxury Suites)
  const demoFlatOrg = await ensureOrganization({
    id: "org-gulshan-flat",
    name: "Gulshan Lakeview Luxury Suites",
    slug: "gulshan-lakeview-suites",
    productType: "building",
    contactPhone: "01711998877",
    contactEmail: "landlord@gulshanluxury.com",
    address: "House 12, Road 45, Gulshan-2, Dhaka",
    status: "active",
  });
  const demoFlatOrgId = demoFlatOrg.id;

  // Org 3: Hotel Vertical (Grand Haven Luxury Hotel)
  const demoHotelOrg = await ensureOrganization({
    id: "org-grand-haven",
    name: "Grand Haven Luxury Resort",
    slug: "grand-haven",
    productType: "hotel",
    contactPhone: "01700000000",
    contactEmail: "info@grandhaven.com",
    address: "Marine Drive, Cox's Bazar",
    status: "active",
  });
  const demoHotelOrgId = demoHotelOrg.id;

  // Org 4: Resort Vertical (Sreemangal Tea Valley Resort)
  const demoResortOrg = await ensureOrganization({
    id: "org-sreemangal-resort",
    name: "Sreemangal Tea Valley Resort",
    slug: "sreemangal-tea-valley",
    productType: "resort",
    contactPhone: "01755123456",
    contactEmail: "reservations@teavalleyresort.com",
    address: "Radhanagar, Sreemangal, Moulvibazar",
    status: "active",
  });
  const demoResortOrgId = demoResortOrg.id;

  // Org 5: Commercial Vertical (Banani Commercial Complex)
  const demoCommercialOrg = await ensureOrganization({
    id: "org-banani-commercial",
    name: "Banani Commercial Complex",
    slug: "banani-commercial-complex",
    productType: "commercial",
    contactPhone: "01733445566",
    contactEmail: "leasing@bananitower.com",
    address: "Kamal Ataturk Avenue, Banani, Dhaka-1213",
    status: "active",
  });
  const demoCommercialOrgId = demoCommercialOrg.id;

  // Org 6: Society Vertical (Uttara Sector 7 Resident Society)
  const demoSocietyOrg = await ensureOrganization({
    id: "org-uttara-society",
    name: "Uttara Sector 7 Resident Society",
    slug: "uttara-sector-7-society",
    productType: "building",
    contactPhone: "01788776655",
    contactEmail: "secretary@uttarasector7.org",
    address: "Sector 7 Welfare Society Office, Uttara, Dhaka-1230",
    status: "active",
  });
  const demoSocietyOrgId = demoSocietyOrg.id;

  // =========================================================================
  // 3. OWNER PERSONAS (1 Building, 1 Flat, 1 Hotel, 1 Resort, 1 Commercial, 1 Society)
  // =========================================================================
  const ownerBuilding = await ensureUser({
    id: "user-owner-building",
    name: "Tariqul Islam (Building Owner)",
    email: "owner.building@omniheaven.com",
    password: defaultPassword,
  });
  await ensureMembership(demoBuildingOrgId, ownerBuilding.id, "owner");

  const ownerFlat = await ensureUser({
    id: "user-owner-flat",
    name: "Farzana Yasmin (Flat Owner)",
    email: "owner.flat@omniheaven.com",
    password: defaultPassword,
  });
  await ensureMembership(demoFlatOrgId, ownerFlat.id, "owner");

  const ownerHotel = await ensureUser({
    id: "user-owner-hotel",
    name: "Zubair Al-Mamun (Hotel Owner)",
    email: "owner.hotel@omniheaven.com",
    password: defaultPassword,
  });
  await ensureMembership(demoHotelOrgId, ownerHotel.id, "owner");

  const ownerResort = await ensureUser({
    id: "user-owner-resort",
    name: "Shamim Ahsan (Resort Owner)",
    email: "owner.resort@omniheaven.com",
    password: defaultPassword,
  });
  await ensureMembership(demoResortOrgId, ownerResort.id, "owner");

  const ownerCommercial = await ensureUser({
    id: "user-owner-commercial",
    name: "Kazi Monirul Islam (Commercial Owner)",
    email: "owner.commercial@omniheaven.com",
    password: defaultPassword,
  });
  await ensureMembership(demoCommercialOrgId, ownerCommercial.id, "owner");

  const ownerSociety = await ensureUser({
    id: "user-owner-society",
    name: "Anisur Rahman (Society President)",
    email: "owner.society@omniheaven.com",
    password: defaultPassword,
  });
  await ensureMembership(demoSocietyOrgId, ownerSociety.id, "owner");

  // =========================================================================
  // 4. MULTI-ROLE FIXTURE USERS & BACKWARD COMPATIBILITY
  // =========================================================================
  const landlordUser = await ensureUser({
    id: "user-landlord-1",
    name: "Mohammad Tanvir Rahman",
    email: "landlord@bashundhara.com",
    password: defaultPassword,
  });
  const managerUser = await ensureUser({
    id: "user-manager-1",
    name: "Kamrul Hasan",
    email: "manager@bashundhara.com",
    password: defaultPassword,
  });
  const staffUser = await ensureUser({
    id: "user-staff-1",
    name: "Abdur Rahim",
    email: "staff@bashundhara.com",
    password: defaultPassword,
  });
  const renterUser = await ensureUser({
    id: "user-renter-1",
    name: "Nazmul Huda",
    email: "renter@bashundhara.com",
    password: defaultPassword,
  });
  const hotelOwnerUser = await ensureUser({
    id: "user-hotel-owner-1",
    name: "Zubair Al-Mamun",
    email: "owner@grandhaven.com",
    password: defaultPassword,
  });
  const hotelManagerUser = await ensureUser({
    id: "user-hotel-manager-1",
    name: "Zubair Al-Mamun",
    email: "manager@grandhaven.com",
    password: defaultPassword,
  });

  // Assign memberships for fixture users
  await ensureMembership(demoBuildingOrgId, landlordUser.id, "owner");
  await ensureMembership(demoBuildingOrgId, managerUser.id, "manager");
  await ensureMembership(demoBuildingOrgId, staffUser.id, "staff");
  await ensureMembership(demoBuildingOrgId, renterUser.id, "member");
  await ensureMembership(demoHotelOrgId, hotelOwnerUser.id, "owner");
  await ensureMembership(demoHotelOrgId, hotelManagerUser.id, "owner");

  // Pending invitation fixture
  const now = new Date();
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

  // Domain 03 Fixtures: Realistic Bangladeshi Tenants and Active Contracts
  const tenantUsers = [
    {
      id: "user-renter-1",
      name: "Farhana Yasmin",
      email: "farhana.yasmin@gmail.com",
      emailVerified: true,
      globalRole: "user",
    },
    {
      id: "user-renter-2",
      name: "Kazi Naimul Haque",
      email: "naimul.haque@dhakabank.com.bd",
      emailVerified: true,
      globalRole: "user",
    },
    {
      id: "user-renter-3",
      name: "Dr. Sharmin Akter",
      email: "dr.sharmin@squarehospital.com",
      emailVerified: true,
      globalRole: "user",
    },
  ];

  await db.insert(users).values(tenantUsers).onConflictDoNothing();

  const renterFixtures = [
    {
      id: "renter-farhana-1a",
      organizationId: demoBuildingOrgId,
      userId: "user-renter-1",
      flatId: "flat-dhanmondi-1a",
      fullName: "Farhana Yasmin",
      phone: "01719876543",
      nidNumber: "19922612345678901", // 17-digit legacy NID
      dateOfBirth: "1992-05-14",
      occupation: "Senior Software Engineer, Grameenphone",
      bloodGroup: "B+",
      totalFamilyMembers: 3,
      familyMemberNames: ["Farhana Yasmin", "Saiful Islam (Spouse)", "Aayan Islam (Child)"],
      emergencyContactName: "Dr. M. A. Rashid (Father)",
      emergencyContactNumber: "01819876543",
      emergencyContactRelationship: "Father",
      nidFrontPhoto: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
      nidBackPhoto: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
      digitalSignatureUrl: "https://omniheaven-storage.s3.amazonaws.com/signatures/farhana-sig.png",
      accessCode: "K7M2Q-9X4TR",
    },
    {
      id: "renter-naimul-1b",
      organizationId: demoBuildingOrgId,
      userId: "user-renter-2",
      flatId: "flat-dhanmondi-1b",
      fullName: "Kazi Naimul Haque",
      phone: "01811223344",
      nidNumber: "5508123456", // 10-digit Smart NID
      dateOfBirth: "1986-11-20",
      occupation: "Branch Manager, Dhaka Bank Ltd.",
      bloodGroup: "O+",
      totalFamilyMembers: 4,
      familyMemberNames: [
        "Kazi Naimul Haque",
        "Nasreen Sultana (Spouse)",
        "Kazi Zayan (Son)",
        "Kazi Raisa (Daughter)",
      ],
      emergencyContactName: "Kazi Rafiqul Haque (Brother)",
      emergencyContactNumber: "01911223344",
      emergencyContactRelationship: "Brother",
      nidFrontPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
      nidBackPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
      digitalSignatureUrl: "https://omniheaven-storage.s3.amazonaws.com/signatures/naimul-sig.png",
      accessCode: "R4T8N-2WZ6P",
    },
    {
      id: "renter-sharmin-2a",
      organizationId: demoBuildingOrgId,
      userId: "user-renter-3",
      flatId: "flat-dhanmondi-2a",
      fullName: "Dr. Sharmin Akter",
      phone: "01919887766",
      nidNumber: "7890123456", // 10-digit Smart NID
      dateOfBirth: "1989-08-05",
      occupation: "Cardiology Fellow, Square Hospital",
      bloodGroup: "A+",
      totalFamilyMembers: 2,
      familyMemberNames: ["Dr. Sharmin Akter", "Tanvir Ahmed (Spouse)"],
      emergencyContactName: "Prof. Abu Taher (Father-in-law)",
      emergencyContactNumber: "01711998877",
      emergencyContactRelationship: "Father-in-law",
      nidFrontPhoto: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400",
      nidBackPhoto: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400",
      digitalSignatureUrl: "https://omniheaven-storage.s3.amazonaws.com/signatures/sharmin-sig.png",
      accessCode: "B9N5Y-6YH3M",
    },
  ];

  await db.insert(renters).values(renterFixtures).onConflictDoNothing();

  const contractFixtures = [
    {
      id: "contract-farhana-1a",
      organizationId: demoBuildingOrgId,
      renterId: "renter-farhana-1a",
      flatId: "flat-dhanmondi-1a",
      monthlyRent: "28000.00",
      serviceCharge: "5000.00",
      securityDepositAmount: "56000.00",
      remainingDepositBalance: "56000.00",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      noticePeriodDays: 60,
      status: "active",
      contractDocumentUrl:
        "https://omniheaven-storage.s3.amazonaws.com/contracts/contract-1a-farhana.pdf",
    },
    {
      id: "contract-naimul-1b",
      organizationId: demoBuildingOrgId,
      renterId: "renter-naimul-1b",
      flatId: "flat-dhanmondi-1b",
      monthlyRent: "28000.00",
      serviceCharge: "5000.00",
      securityDepositAmount: "56000.00",
      remainingDepositBalance: "56000.00",
      startDate: "2025-03-01",
      endDate: "2026-02-28",
      noticePeriodDays: 30,
      status: "active",
      contractDocumentUrl:
        "https://omniheaven-storage.s3.amazonaws.com/contracts/contract-1b-naimul.pdf",
    },
    {
      id: "contract-sharmin-2a",
      organizationId: demoBuildingOrgId,
      renterId: "renter-sharmin-2a",
      flatId: "flat-dhanmondi-2a",
      monthlyRent: "29000.00",
      serviceCharge: "5000.00",
      securityDepositAmount: "58000.00",
      remainingDepositBalance: "24000.00", // ৳34,000 adjusted against Nov rent/service
      startDate: "2024-06-01",
      endDate: "2025-05-31",
      noticePeriodDays: 30,
      status: "notice_period",
      terminationDate: "2026-11-30",
      terminationReason: "Relocating to Chittagong for hospital posting",
      contractDocumentUrl:
        "https://omniheaven-storage.s3.amazonaws.com/contracts/contract-2a-sharmin.pdf",
    },
  ];

  await db.insert(rentalContracts).values(contractFixtures).onConflictDoNothing();

  // Tier 1 Seed: Monthly Bills
  const billFixtures = [
    {
      id: "bill-farhana-202610",
      organizationId: demoBuildingOrgId,
      contractId: "contract-farhana-1a",
      billNumber: "INV-202610-1A",
      billingMonth: "2026-10",
      rentAmount: "28000.00",
      serviceChargeAmount: "5000.00",
      gasAmount: "1080.00",
      waterAmount: "650.00",
      electricityAmount: "3200.00",
      wasteAndOtherAmount: "300.00",
      lateFeeAmount: "0.00",
      totalAmount: "38230.00",
      advanceAdjustedAmount: "0.00",
      amountPaid: "38230.00",
      balanceDue: "0.00",
      status: "paid",
      dueDate: "2026-10-10",
      notes: "October full settlement via bKash",
    },
    {
      id: "bill-farhana-202611",
      organizationId: demoBuildingOrgId,
      contractId: "contract-farhana-1a",
      billNumber: "INV-202611-1A",
      billingMonth: "2026-11",
      rentAmount: "28000.00",
      serviceChargeAmount: "5000.00",
      gasAmount: "1080.00",
      waterAmount: "650.00",
      electricityAmount: "3450.00",
      wasteAndOtherAmount: "300.00",
      lateFeeAmount: "0.00",
      totalAmount: "38480.00",
      advanceAdjustedAmount: "0.00",
      amountPaid: "0.00",
      balanceDue: "38480.00",
      status: "unpaid",
      dueDate: "2026-11-10",
      notes: "November bill generated automatically",
    },
    {
      id: "bill-naimul-202610",
      organizationId: demoBuildingOrgId,
      contractId: "contract-naimul-1b",
      billNumber: "INV-202610-1B",
      billingMonth: "2026-10",
      rentAmount: "28000.00",
      serviceChargeAmount: "5000.00",
      gasAmount: "1080.00",
      waterAmount: "500.00",
      electricityAmount: "2800.00",
      wasteAndOtherAmount: "300.00",
      lateFeeAmount: "0.00",
      totalAmount: "37680.00",
      advanceAdjustedAmount: "0.00",
      amountPaid: "25000.00",
      balanceDue: "12680.00",
      status: "partially_paid",
      dueDate: "2026-10-10",
      notes: "Partial payment received via City Bank transfer",
    },
    {
      id: "bill-sharmin-202611",
      organizationId: demoBuildingOrgId,
      contractId: "contract-sharmin-2a",
      billNumber: "INV-202611-2A",
      billingMonth: "2026-11",
      rentAmount: "29000.00",
      serviceChargeAmount: "5000.00",
      gasAmount: "0.00",
      waterAmount: "0.00",
      electricityAmount: "0.00",
      wasteAndOtherAmount: "0.00",
      lateFeeAmount: "0.00",
      totalAmount: "34000.00",
      advanceAdjustedAmount: "34000.00",
      amountPaid: "0.00",
      balanceDue: "0.00",
      status: "adjusted",
      dueDate: "2026-11-10",
      notes: "Adjusted against advance security deposit during departure notice period",
    },
  ];

  await db.insert(bills).values(billFixtures).onConflictDoNothing();

  // Tier 1 Seed: Advance Security Deposit Adjustments
  const adjustmentFixtures = [
    {
      id: "adj-sharmin-202611",
      organizationId: demoBuildingOrgId,
      contractId: "contract-sharmin-2a",
      adjustedAgainstBillId: "bill-sharmin-202611",
      adjustmentType: "rent_adjustment",
      amount: "34000.00",
      balanceBefore: "58000.00",
      balanceAfter: "24000.00",
      note: "November rent & service charge settled from advance security deposit during notice period",
      adjustedBy: adminId,
    },
  ];

  await db.insert(advanceAdjustments).values(adjustmentFixtures).onConflictDoNothing();

  // Tier 1 Seed: Payments & Receipts
  const paymentFixtures = [
    {
      id: "pay-farhana-202610",
      organizationId: demoBuildingOrgId,
      billId: "bill-farhana-202610",
      amount: "38230.00",
      paymentMethod: "bkash",
      transactionId: "BK9A7X32LM",
      paymentDate: "2026-10-07",
      receiptNumber: "REC-202610-0014",
      receivedBy: adminId,
      status: "completed",
      note: "Paid in full via bKash personal merchant checkout",
    },
    {
      id: "pay-naimul-202610",
      organizationId: demoBuildingOrgId,
      billId: "bill-naimul-202610",
      amount: "25000.00",
      paymentMethod: "bank_transfer",
      transactionId: "CBL-TRX-998811",
      paymentDate: "2026-10-09",
      receiptNumber: "REC-202610-0019",
      receivedBy: adminId,
      status: "completed",
      note: "City Bank EFT payment partial settlement",
    },
  ];

  await db.insert(payments).values(paymentFixtures).onConflictDoNothing();

  // Tier 1 Seed: Domain 05 Maintenance Requests
  const maintenanceFixtures = [
    {
      id: "ticket-plumbing-1a",
      organizationId: demoBuildingOrgId,
      buildingId: dhanmondiBuildingId,
      flatId: "flat-dhanmondi-1a",
      category: "plumbing",
      title: "Master bathroom flush tank leakage",
      description: "Continuous water leaking from flush tank inlet pipe causing bathroom dampness.",
      priority: "high",
      status: "resolved",
      requestedBy: "Farhana Yasmin",
      requestedByUserId: "user-renter-1",
      assignedToStaffId: "user-staff-1",
      repairCost: "850.00",
      costBilledTo: "landlord",
      resolutionNotes:
        "Replaced faulty rubber washer and teflon tape on supply valve. Water pressure tested and sealed.",
      photoUrls: ["https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600"],
      resolutionPhotoUrls: ["https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600"],
      resolvedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
      closedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    },
    {
      id: "ticket-electrical-1b",
      organizationId: demoBuildingOrgId,
      buildingId: dhanmondiBuildingId,
      flatId: "flat-dhanmondi-1b",
      category: "electrical",
      title: "Circuit breaker tripping on AC startup",
      description:
        "Living room AC circuit breaker trips automatically after running for 5 minutes.",
      priority: "urgent",
      status: "in_progress",
      requestedBy: "Kazi Naimul Haque",
      requestedByUserId: "user-renter-2",
      assignedToStaffId: "user-staff-1",
      repairCost: "0.00",
      costBilledTo: "landlord",
      photoUrls: ["https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=600"],
      resolutionPhotoUrls: [],
    },
    {
      id: "ticket-elevator-common",
      organizationId: demoBuildingOrgId,
      buildingId: dhanmondiBuildingId,
      flatId: null,
      category: "elevator",
      title: "Elevator B door sensor obstruction warning",
      description: "Elevator door repeatedly beeps and delays closing on the 3rd floor landing.",
      priority: "medium",
      status: "assigned",
      requestedBy: "Kamrul Hasan (Manager)",
      requestedByUserId: "user-manager-1",
      assignedToStaffId: "user-staff-1",
      repairCost: "0.00",
      costBilledTo: "landlord",
      photoUrls: [],
      resolutionPhotoUrls: [],
    },
    {
      id: "ticket-generator-routine",
      organizationId: demoBuildingOrgId,
      buildingId: dhanmondiBuildingId,
      flatId: null,
      category: "generator",
      title: "Monthly backup generator diesel refueling & filter check",
      description: "Scheduled routine servicing of standby 150 kVA Perkins generator.",
      priority: "low",
      status: "open",
      requestedBy: "Kamrul Hasan (Manager)",
      requestedByUserId: "user-manager-1",
      assignedToStaffId: null,
      repairCost: "0.00",
      costBilledTo: "landlord",
      photoUrls: [],
      resolutionPhotoUrls: [],
    },
  ];

  await db.insert(maintenanceRequests).values(maintenanceFixtures).onConflictDoNothing();

  // Tier 1 Seed: Domain 05 Building Broadcast Notices
  const noticeFixtures = [
    {
      id: "notice-generator-servicing",
      organizationId: demoBuildingOrgId,
      title: "Scheduled Standby Generator Servicing & Brief Power Interruption",
      body: "Please be informed that routine maintenance of the central backup generator will take place on **Saturday, October 24 between 10:00 AM and 12:00 PM**. During this window, DESCO line power will remain active, but standby backup power will not be available in case of utility outages. We appreciate your cooperation.",
      targetAudience: "all_renters",
      targetBuildingId: dhanmondiBuildingId,
      isPinned: true,
      authorUserId: "user-manager-1",
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    },
    {
      id: "notice-water-tank-cleaning",
      organizationId: demoBuildingOrgId,
      title: "Overhead & Underground Water Reservoir Deep Cleaning",
      body: "The annual chemical cleaning and disinfection of overhead and underground water reservoirs will take place on **Friday, October 30 from 08:00 AM to 02:00 PM**. Water supply will be temporarily paused during cleaning hours. Residents are requested to store adequate water beforehand.",
      targetAudience: "specific_building",
      targetBuildingId: dhanmondiBuildingId,
      isPinned: false,
      authorUserId: "user-manager-1",
      expiresAt: new Date(Date.now() + 14 * 24 * 3600 * 1000),
    },
    {
      id: "notice-eid-security-advisory",
      organizationId: demoBuildingOrgId,
      title: "Eid Holiday Building Security Protocol & Visitor Logs",
      body: "Caretakers will maintain strict 24/7 visitor sign-in logs during the Eid holiday week. Please inform management if your flat will be vacant.",
      targetAudience: "all_renters",
      targetBuildingId: dhanmondiBuildingId,
      isPinned: false,
      authorUserId: "user-manager-1",
      expiresAt: new Date(Date.now() - 30 * 24 * 3600 * 1000), // Expired fixture
    },
  ];

  await db.insert(notices).values(noticeFixtures).onConflictDoNothing();

  // Domain 06: Audit Logs & Security Fixtures
  const auditLogFixtures = [
    {
      id: "audit-rent-update-flat-4a",
      organizationId: demoBuildingOrgId,
      actorUserId: "user-landlord-1",
      actorEmail: "landlord@bashundhara.com",
      actorRole: "owner",
      action: "UPDATE",
      entityType: "flat",
      entityId: "flat-dhanmondi-4a",
      oldValue: { baseRent: "45000.00", serviceCharge: "5000.00" },
      newValue: { baseRent: "48000.00", serviceCharge: "5500.00" },
      metadata: { reason: "Annual contractual rent review and service charge adjustment" },
      ipAddress: "103.114.98.22",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36",
      createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000),
    },
    {
      id: "audit-advance-adj-9941",
      organizationId: demoBuildingOrgId,
      actorUserId: "user-manager-1",
      actorEmail: "manager@bashundhara.com",
      actorRole: "manager",
      action: "ADJUST",
      entityType: "advance_adjustment",
      entityId: "adj-contract-4a-oct",
      oldValue: { remainingDepositBalance: "60000.00" },
      newValue: { remainingDepositBalance: "30000.00", adjustedAmount: "30000.00" },
      metadata: {
        note: "Adjusting November rent against security deposit",
        billId: "bill-nov-flat-4a",
      },
      ipAddress: "103.114.98.22",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36",
      createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    },
    {
      id: "audit-contract-create-4a",
      organizationId: demoBuildingOrgId,
      actorUserId: "user-manager-1",
      actorEmail: "manager@bashundhara.com",
      actorRole: "manager",
      action: "CREATE",
      entityType: "contract",
      entityId: "contract-rafiq-flat-4a",
      oldValue: null,
      newValue: {
        flatId: "flat-dhanmondi-4a",
        renterId: "renter-rafiq-ahmed",
        monthlyRent: "45000.00",
        advanceDeposit: "90000.00",
        status: "active",
      },
      metadata: { agreementVersion: "standard_residential_v2" },
      ipAddress: "103.114.98.22",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36",
      createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000),
    },
    {
      id: "audit-maint-assign-1",
      organizationId: demoBuildingOrgId,
      actorUserId: "user-manager-1",
      actorEmail: "manager@bashundhara.com",
      actorRole: "manager",
      action: "ASSIGN",
      entityType: "maintenance",
      entityId: "maint-plumbing-leak",
      oldValue: { status: "open", assignedToStaffId: null },
      newValue: { status: "assigned", assignedToStaffId: "user-staff-1" },
      metadata: { technician: "Abdul Karim (Plumbing Specialist)" },
      ipAddress: "103.114.98.25",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
      createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    },
    {
      id: "audit-notice-pin-1",
      organizationId: demoBuildingOrgId,
      actorUserId: "user-manager-1",
      actorEmail: "manager@bashundhara.com",
      actorRole: "manager",
      action: "UPDATE",
      entityType: "notice",
      entityId: "notice-generator-servicing",
      oldValue: { isPinned: false },
      newValue: { isPinned: true },
      metadata: { actionDetail: "Pinned generator servicing advisory to the top of notice board" },
      ipAddress: "103.114.98.25",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36",
      createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
    },
    {
      id: "audit-bill-payment-1",
      organizationId: demoBuildingOrgId,
      actorUserId: "user-manager-1",
      actorEmail: "manager@bashundhara.com",
      actorRole: "manager",
      action: "PAY",
      entityType: "bill",
      entityId: "bill-oct-flat-4a",
      oldValue: { paymentStatus: "unpaid", paidAmount: "0.00" },
      newValue: { paymentStatus: "paid", paidAmount: "53500.00" },
      metadata: {
        paymentMethod: "bank_transfer",
        bankName: "City Bank",
        transactionId: "TXN-8849201",
      },
      ipAddress: "103.114.98.22",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36",
      createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
    },
  ];

  await db.insert(auditLogs).values(auditLogFixtures).onConflictDoNothing();

  // ==========================================
  // DOMAIN 07: HOTEL & RESORT PMS FIXTURES
  // ==========================================
  const roomTypeOceanSuite = {
    id: "rt-ocean-suite",
    organizationId: demoHotelOrgId,
    name: "Grand Ocean View Suite",
    description:
      "Panoramic Bay of Bengal vista, private balcony, jacuzzi, and complimentary morning breakfast.",
    basePrice: "14500.00",
    capacityAdults: 2,
    capacityChildren: 1,
    bedType: "king",
    bedCount: 1,
    sizeSqFt: "750.00",
    amenities: [
      "Ocean View",
      "Private Balcony",
      "Jacuzzi",
      "King Bed",
      "High-speed WiFi",
      "Mini Bar",
      "Complimentary Breakfast",
    ],
    photos: [
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
    ],
  };

  const roomTypeDeluxe = {
    id: "rt-deluxe-sea",
    organizationId: demoHotelOrgId,
    name: "Executive Sea View Deluxe",
    description:
      "Elegant modern aesthetic with direct sea view, executive work desk, and luxury rain shower.",
    basePrice: "9800.00",
    capacityAdults: 2,
    capacityChildren: 1,
    bedType: "queen",
    bedCount: 1,
    sizeSqFt: "480.00",
    amenities: [
      "Sea View",
      "Executive Desk",
      "Rain Shower",
      "High-speed WiFi",
      "Smart TV",
      "Air Conditioning",
    ],
    photos: [
      "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80",
    ],
  };

  const roomTypeFamily = {
    id: "rt-palm-family",
    organizationId: demoHotelOrgId,
    name: "Palm Garden Family Suite",
    description:
      "Spacious dual queen bed suite overlooking tropical resort gardens, perfect for families.",
    basePrice: "12500.00",
    capacityAdults: 4,
    capacityChildren: 2,
    bedType: "queen",
    bedCount: 2,
    sizeSqFt: "650.00",
    amenities: [
      "Garden View",
      "Dual Queen Beds",
      "Kid-friendly",
      "Kitchenette",
      "Private Patio",
      "High-speed WiFi",
    ],
    photos: [
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80",
    ],
  };

  const roomTypeStandard = {
    id: "rt-hill-breeze",
    organizationId: demoHotelOrgId,
    name: "Standard Hill Breeze Room",
    description:
      "Cozy retreat facing the lush green hills of Himchari with quiet ambiance and fresh mountain air.",
    basePrice: "5500.00",
    capacityAdults: 2,
    capacityChildren: 0,
    bedType: "double",
    bedCount: 1,
    sizeSqFt: "320.00",
    amenities: [
      "Hill View",
      "Double Bed",
      "Work Desk",
      "High-speed WiFi",
      "Electric Kettle",
      "Air Conditioning",
    ],
    photos: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    ],
  };

  await db
    .insert(roomTypes)
    .values([roomTypeOceanSuite, roomTypeDeluxe, roomTypeFamily, roomTypeStandard])
    .onConflictDoNothing();

  // 12 Physical Rooms across the 4 types
  const hotelRooms = [
    // Ocean Suites (Floor 3)
    {
      id: "room-301",
      organizationId: demoHotelOrgId,
      roomTypeId: roomTypeOceanSuite.id,
      roomNumber: "301",
      floor: 3,
      status: "available",
      housekeepingNotes: "Inspected and ready for VIP guest",
    },
    {
      id: "room-302",
      organizationId: demoHotelOrgId,
      roomTypeId: roomTypeOceanSuite.id,
      roomNumber: "302",
      floor: 3,
      status: "occupied",
      housekeepingNotes: "Guest checked in, requested extra towels",
    },
    {
      id: "room-303",
      organizationId: demoHotelOrgId,
      roomTypeId: roomTypeOceanSuite.id,
      roomNumber: "303",
      floor: 3,
      status: "cleaning",
      housekeepingNotes: "Previous guest departed 11:30 AM, deep cleaning in progress",
    },

    // Deluxe Rooms (Floor 2)
    {
      id: "room-201",
      organizationId: demoHotelOrgId,
      roomTypeId: roomTypeDeluxe.id,
      roomNumber: "201",
      floor: 2,
      status: "available",
      housekeepingNotes: "Standard turnover complete",
    },
    {
      id: "room-202",
      organizationId: demoHotelOrgId,
      roomTypeId: roomTypeDeluxe.id,
      roomNumber: "202",
      floor: 2,
      status: "occupied",
      housekeepingNotes: "Do Not Disturb sign active",
    },
    {
      id: "room-203",
      organizationId: demoHotelOrgId,
      roomTypeId: roomTypeDeluxe.id,
      roomNumber: "203",
      floor: 2,
      status: "available",
      housekeepingNotes: "Inspected by floor supervisor",
    },

    // Family Suites (Floor 1)
    {
      id: "room-101",
      organizationId: demoHotelOrgId,
      roomTypeId: roomTypeFamily.id,
      roomNumber: "101",
      floor: 1,
      status: "available",
      housekeepingNotes: "Baby cot setup ready",
    },
    {
      id: "room-102",
      organizationId: demoHotelOrgId,
      roomTypeId: roomTypeFamily.id,
      roomNumber: "102",
      floor: 1,
      status: "reserved",
      housekeepingNotes: "Arrival scheduled for 3:00 PM",
    },
    {
      id: "room-103",
      organizationId: demoHotelOrgId,
      roomTypeId: roomTypeFamily.id,
      roomNumber: "103",
      floor: 1,
      status: "maintenance",
      housekeepingNotes: "AC coolant refill in progress by engineering",
    },

    // Standard Hill Breeze Rooms (Floors 1-3)
    {
      id: "room-104",
      organizationId: demoHotelOrgId,
      roomTypeId: roomTypeStandard.id,
      roomNumber: "104",
      floor: 1,
      status: "available",
      housekeepingNotes: null,
    },
    {
      id: "room-204",
      organizationId: demoHotelOrgId,
      roomTypeId: roomTypeStandard.id,
      roomNumber: "204",
      floor: 2,
      status: "available",
      housekeepingNotes: null,
    },
    {
      id: "room-304",
      organizationId: demoHotelOrgId,
      roomTypeId: roomTypeStandard.id,
      roomNumber: "304",
      floor: 3,
      status: "cleaning",
      housekeepingNotes: "Linen change underway",
    },
  ];

  await db.insert(rooms).values(hotelRooms).onConflictDoNothing();

  // Seed sample bookings
  const hotelBookings = [
    {
      id: "booking-active-302",
      organizationId: demoHotelOrgId,
      bookingReference: "BK-202610-8801",
      roomTypeId: roomTypeOceanSuite.id,
      roomId: "room-302",
      checkInDate: "2026-10-17",
      checkOutDate: "2026-10-20",
      guestName: "Tariqul Islam",
      guestEmail: "tariqul.islam@example.com",
      guestPhone: "01719876543",
      guestNidOrPassport: "19912692019000456",
      specialRequests: "Anniversary setup with flowers if possible",
      adultsCount: 2,
      childrenCount: 1,
      totalPrice: "43500.00",
      extraCharges: "2500.00",
      status: "checked_in",
      paymentStatus: "paid",
      checkedInAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
    },
    {
      id: "booking-reserved-102",
      organizationId: demoHotelOrgId,
      bookingReference: "BK-202610-9214",
      roomTypeId: roomTypeFamily.id,
      roomId: "room-102",
      checkInDate: "2026-10-22",
      checkOutDate: "2026-10-25",
      guestName: "Nusrat Jahan",
      guestEmail: "nusrat.jahan@example.com",
      guestPhone: "01812349876",
      guestNidOrPassport: "19882692019000789",
      specialRequests: "Ground floor quiet location requested",
      adultsCount: 3,
      childrenCount: 2,
      totalPrice: "37500.00",
      extraCharges: "0.00",
      status: "confirmed",
      paymentStatus: "paid",
    },
  ];

  await db.insert(bookings).values(hotelBookings).onConflictDoNothing();

  // =========================================================================
  // FIXTURES FOR SREEMANGAL RESORT, GULSHAN FLAT, BANANI COMMERCIAL, UTTARA SOCIETY
  // =========================================================================
  // Sreemangal Resort Website Config
  await db
    .insert(websiteConfigs)
    .values({
      id: "config-sreemangal-resort",
      organizationId: demoResortOrgId,
      themeSlug: "tropical-resort",
      brand: {
        primaryColor: "#065f46",
        accentColor: "#10b981",
        fontFamily: "Outfit",
      },
      hero: {
        headline: "Sreemangal Tea Valley Eco Resort",
        tagline: "Serenity in the Heart of Bangladesh's Lush Tea Estates",
        ctaText: "Discover Eco Cottages",
        ctaLink: "#rooms",
      },
      enabledSections: ["hero", "rooms", "amenities", "gallery", "about", "contact"],
      sectionOrder: ["hero", "rooms", "amenities", "gallery", "about", "contact"],
    })
    .onConflictDoNothing();

  // Sreemangal Resort Room Types
  const resortCottage = {
    id: "rtype-resort-cottage",
    organizationId: demoResortOrgId,
    name: "Tea Garden Eco Cottage",
    description: "Handcrafted wooden cottage overlooking panoramic tea gardens.",
    basePrice: "8500.00",
    maxOccupancy: 3,
    amenities: ["Tea Estate View", "King Bed", "Private Balcony", "Breakfast Included", "WiFi"],
    photos: [
      "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80",
    ],
  };
  const resortVilla = {
    id: "rtype-resort-villa",
    organizationId: demoResortOrgId,
    name: "Canopy Luxury Villa",
    description: "Two-story luxury timber villa with plunge pool and private tea garden trail.",
    basePrice: "14500.00",
    maxOccupancy: 5,
    amenities: [
      "Private Plunge Pool",
      "Two King Suites",
      "Butler Service",
      "Fire Pit",
      "Organic Breakfast",
    ],
    photos: [
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
    ],
  };
  await db.insert(roomTypes).values([resortCottage, resortVilla]).onConflictDoNothing();

  // Sreemangal Physical Cottages
  await db
    .insert(rooms)
    .values([
      {
        id: "room-sreemangal-c101",
        organizationId: demoResortOrgId,
        roomTypeId: resortCottage.id,
        roomNumber: "C-101",
        floor: 1,
        status: "available",
        housekeepingNotes: "Organic toiletries restocked",
      },
      {
        id: "room-sreemangal-c102",
        organizationId: demoResortOrgId,
        roomTypeId: resortCottage.id,
        roomNumber: "C-102",
        floor: 1,
        status: "occupied",
        housekeepingNotes: "Guest staying 3 nights",
      },
      {
        id: "room-sreemangal-v201",
        organizationId: demoResortOrgId,
        roomTypeId: resortVilla.id,
        roomNumber: "V-201",
        floor: 1,
        status: "available",
        housekeepingNotes: "Plunge pool serviced",
      },
    ])
    .onConflictDoNothing();

  // Gulshan Lakeview Building & Luxury Flats
  const gulshanBuildingId = "bld-gulshan-lakeview";
  await db
    .insert(buildings)
    .values({
      id: gulshanBuildingId,
      organizationId: demoFlatOrgId,
      name: "Gulshan Lakeview Luxury Suites",
      address: "House 12, Road 45, Gulshan-2",
      city: "Dhaka",
      thana: "Gulshan",
      postalCode: "1212",
      totalFloors: 5,
      hasElevator: true,
      hasGenerator: true,
      caretakerPhone: "01711998877",
    })
    .onConflictDoNothing();

  await db
    .insert(flats)
    .values([
      {
        id: "flat-gulshan-1a",
        organizationId: demoFlatOrgId,
        buildingId: gulshanBuildingId,
        flatNumber: "1A",
        floor: 1,
        unitType: "residential",
        bedrooms: 3,
        bathrooms: 3,
        balconies: 2,
        squareFeet: 2200,
        defaultRentAmount: 85000,
        defaultServiceCharge: 12000,
        status: "occupied",
      },
      {
        id: "flat-gulshan-1b",
        organizationId: demoFlatOrgId,
        buildingId: gulshanBuildingId,
        flatNumber: "1B",
        floor: 1,
        unitType: "residential",
        bedrooms: 3,
        bathrooms: 3,
        balconies: 2,
        squareFeet: 2200,
        defaultRentAmount: 85000,
        defaultServiceCharge: 12000,
        status: "vacant",
      },
      {
        id: "flat-gulshan-2a",
        organizationId: demoFlatOrgId,
        buildingId: gulshanBuildingId,
        flatNumber: "2A",
        floor: 2,
        unitType: "residential",
        bedrooms: 4,
        bathrooms: 4,
        balconies: 3,
        squareFeet: 2800,
        defaultRentAmount: 120000,
        defaultServiceCharge: 15000,
        status: "occupied",
      },
    ])
    .onConflictDoNothing();

  // Banani Commercial Complex Building & Commercial Suites
  const bananiBuildingId = "bld-banani-commercial";
  await db
    .insert(buildings)
    .values({
      id: bananiBuildingId,
      organizationId: demoCommercialOrgId,
      name: "Banani Commercial Complex",
      address: "Kamal Ataturk Avenue, Banani",
      city: "Dhaka",
      thana: "Banani",
      postalCode: "1213",
      totalFloors: 12,
      hasElevator: true,
      hasGenerator: true,
      caretakerPhone: "01733445566",
    })
    .onConflictDoNothing();

  await db
    .insert(flats)
    .values([
      {
        id: "flat-banani-suite-201",
        organizationId: demoCommercialOrgId,
        buildingId: bananiBuildingId,
        flatNumber: "Suite-201",
        floor: 2,
        unitType: "commercial",
        bedrooms: 0,
        bathrooms: 2,
        balconies: 0,
        squareFeet: 3500,
        defaultRentAmount: 250000,
        defaultServiceCharge: 35000,
        status: "occupied",
      },
      {
        id: "flat-banani-suite-301",
        organizationId: demoCommercialOrgId,
        buildingId: bananiBuildingId,
        flatNumber: "Suite-301",
        floor: 3,
        unitType: "commercial",
        bedrooms: 0,
        bathrooms: 2,
        balconies: 0,
        squareFeet: 3500,
        defaultRentAmount: 250000,
        defaultServiceCharge: 35000,
        status: "vacant",
      },
    ])
    .onConflictDoNothing();

  // Uttara Resident Society Building & Community Units
  const uttaraBuildingId = "bld-uttara-society";
  await db
    .insert(buildings)
    .values({
      id: uttaraBuildingId,
      organizationId: demoSocietyOrgId,
      name: "Uttara Sector 7 Resident Society Building",
      address: "Road 10, Sector 7, Uttara",
      city: "Dhaka",
      thana: "Uttara",
      postalCode: "1230",
      totalFloors: 4,
      hasElevator: true,
      hasGenerator: true,
      caretakerPhone: "01788776655",
    })
    .onConflictDoNothing();

  await db
    .insert(flats)
    .values([
      {
        id: "flat-uttara-soc-1",
        organizationId: demoSocietyOrgId,
        buildingId: uttaraBuildingId,
        flatNumber: "Unit-1",
        floor: 1,
        unitType: "residential",
        bedrooms: 3,
        bathrooms: 2,
        balconies: 2,
        squareFeet: 1550,
        defaultRentAmount: 35000,
        defaultServiceCharge: 5000,
        status: "occupied",
      },
      {
        id: "flat-uttara-soc-2",
        organizationId: demoSocietyOrgId,
        buildingId: uttaraBuildingId,
        flatNumber: "Unit-2",
        floor: 2,
        unitType: "residential",
        bedrooms: 3,
        bathrooms: 2,
        balconies: 2,
        squareFeet: 1550,
        defaultRentAmount: 35000,
        defaultServiceCharge: 5000,
        status: "occupied",
      },
    ])
    .onConflictDoNothing();

  console.log("Database seeded successfully.");
  await client.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
