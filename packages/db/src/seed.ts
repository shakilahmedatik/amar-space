import { client, db } from "./client";
import {
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
  organizations,
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

  // Platform superadmin user
  const adminId = "superadmin-root";
  await db
    .insert(users)
    .values({
      id: adminId,
      name: "Platform Super Admin",
      email: "admin@omniheaven.com",
      emailVerified: true,
      globalRole: "superadmin",
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        globalRole: "superadmin",
      },
    });

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
      status: "active",
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
      status: "active",
    })
    .onConflictDoNothing();

  // Subscriptions for both demo orgs
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // 180 days

  await db
    .insert(subscriptions)
    .values([
      {
        id: "sub-demo-building",
        organizationId: demoBuildingOrgId,
        planId: "starter",
        plan: "starter",
        status: "trialing",
        billingCycle: "monthly",
        trialStartsAt: now,
        trialEndsAt: trialEnd,
        paymentProvider: "bkash",
      },
      {
        id: "sub-demo-hotel",
        organizationId: demoHotelOrgId,
        planId: "pro",
        plan: "pro",
        status: "active",
        billingCycle: "monthly",
        trialStartsAt: now,
        trialEndsAt: trialEnd,
        paymentProvider: "bkash",
      },
    ])
    .onConflictDoUpdate({
      target: subscriptions.id,
      set: {
        planId: subscriptions.planId,
        status: subscriptions.status,
        billingCycle: subscriptions.billingCycle,
      },
    });

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
      accessCode: "9871",
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
      accessCode: "4432",
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
      accessCode: "6655",
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

  console.log("Database seeded successfully.");
  await client.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
