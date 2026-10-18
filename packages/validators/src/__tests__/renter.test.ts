import { describe, expect, it } from "bun:test";
import {
  bloodGroupEnum,
  createContractSchema,
  createRenterSchema,
  RENTER_ERROR_CODES,
  renterNidSchema,
  terminateContractSchema,
} from "../renter";

describe("Domain 03: Renter, Contract & Bangladeshi KYC Validator Rules", () => {
  it("validates 10-digit Smart NID and 17-digit legacy NID correctly", () => {
    // 10-digit Smart NID
    expect(renterNidSchema.parse("5508123456")).toBe("5508123456");
    expect(renterNidSchema.parse("1234567890")).toBe("1234567890");

    // Formatted with spaces or dashes
    expect(renterNidSchema.parse("5508 123 456")).toBe("5508123456");
    expect(renterNidSchema.parse("5508-123-456")).toBe("5508123456");

    // 17-digit legacy NID
    expect(renterNidSchema.parse("19922612345678901")).toBe("19922612345678901");
    expect(renterNidSchema.parse("1986-2612-3456-78901")).toBe("19862612345678901");
  });

  it("rejects invalid NID numbers (wrong length, letters, symbols)", () => {
    // Wrong length
    expect(() => renterNidSchema.parse("123456789")).toThrow(); // 9 digits
    expect(() => renterNidSchema.parse("12345678901")).toThrow(); // 11 digits
    expect(() => renterNidSchema.parse("1992261234567890")).toThrow(); // 16 digits
    expect(() => renterNidSchema.parse("199226123456789012")).toThrow(); // 18 digits

    // Letters and symbols
    expect(() => renterNidSchema.parse("550812345A")).toThrow();
    expect(() => renterNidSchema.parse("not-a-valid-nid")).toThrow();
  });

  it("validates bloodGroupEnum strictly against 8 ABO types", () => {
    const validGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    for (const bg of validGroups) {
      expect(bloodGroupEnum.parse(bg)).toBe(bg as any);
    }

    expect(() => bloodGroupEnum.parse("C+")).toThrow();
    expect(() => bloodGroupEnum.parse("O")).toThrow();
    expect(() => bloodGroupEnum.parse("POSITIVE")).toThrow();
    expect(() => bloodGroupEnum.parse("unknown")).toThrow();
  });

  it("validates createRenterSchema successfully", () => {
    const validRenter = {
      fullName: "Farhana Yasmin",
      phone: "01719876543",
      nidNumber: "19922612345678901",
      dateOfBirth: "1992-05-14",
      occupation: "Senior Software Engineer",
      bloodGroup: "B+",
      totalFamilyMembers: 3,
      familyMemberNames: ["Farhana Yasmin", "Saiful Islam", "Aayan Islam"],
      emergencyContactName: "Dr. M. A. Rashid",
      emergencyContactNumber: "+8801819876543",
      emergencyContactRelationship: "Father",
      nidFrontPhoto: "https://example.com/nid-front.jpg",
      nidBackPhoto: "https://example.com/nid-back.jpg",
      digitalSignatureUrl: "https://example.com/sig.png",
    };

    const parsed = createRenterSchema.parse(validRenter);
    expect(parsed.fullName).toBe("Farhana Yasmin");
    expect(parsed.phone).toBe("01719876543");
    expect(parsed.emergencyContactNumber).toBe("01819876543"); // converted to standard 01...
    expect(parsed.bloodGroup).toBe("B+");
  });

  it("validates createContractSchema and enforces positive rent", () => {
    const validContract = {
      renterId: "renter-123",
      flatId: "flat-456",
      monthlyRent: 28000,
      serviceCharge: 5000,
      securityDepositAmount: 56000,
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      noticePeriodDays: 60,
    };

    const parsed = createContractSchema.parse(validContract);
    expect(parsed.monthlyRent).toBe(28000);
    expect(parsed.serviceCharge).toBe(5000);
    expect(parsed.securityDepositAmount).toBe(56000);

    // Negative rent rejected
    expect(() =>
      createContractSchema.parse({
        ...validContract,
        monthlyRent: -100,
      }),
    ).toThrow();

    // Zero rent rejected
    expect(() =>
      createContractSchema.parse({
        ...validContract,
        monthlyRent: 0,
      }),
    ).toThrow();
  });

  it("validates terminateContractSchema successfully", () => {
    const termination = {
      contractId: "contract-123",
      terminationDate: "2026-12-31",
      terminationReason: "Tenant relocating out of Dhaka",
      deductions: 2500,
      refundAmount: 53500,
      nextFlatStatus: "vacant" as const,
      inspectionNotes: "Paint touches required in bedroom 2; keys handed over.",
    };

    const parsed = terminateContractSchema.parse(termination);
    expect(parsed.contractId).toBe("contract-123");
    expect(parsed.deductions).toBe(2500);
    expect(parsed.nextFlatStatus).toBe("vacant");
  });

  it("exports standard domain error codes", () => {
    expect(RENTER_ERROR_CODES.NID_INVALID_FORMAT).toBe("NID_INVALID_FORMAT");
    expect(RENTER_ERROR_CODES.NID_ALREADY_EXISTS).toBe("NID_ALREADY_EXISTS");
    expect(RENTER_ERROR_CODES.FLAT_ALREADY_OCCUPIED).toBe("FLAT_ALREADY_OCCUPIED");
    expect(RENTER_ERROR_CODES.INVALID_BLOOD_GROUP).toBe("INVALID_BLOOD_GROUP");
    expect(RENTER_ERROR_CODES.CONTRACT_NOT_IN_DRAFT).toBe("CONTRACT_NOT_IN_DRAFT");
  });
});
