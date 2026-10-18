import { client, db } from "./client";
import {
  advanceAdjustments,
  bills,
  buildings,
  emergencyContacts,
  flats,
  invitations,
  members,
  organizations,
  payments,
  rentalContracts,
  renters,
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

  console.log("Database seeded successfully.");
  await client.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
