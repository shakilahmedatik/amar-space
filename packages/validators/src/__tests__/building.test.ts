import { describe, expect, it } from "bun:test";
import {
  buildingPhoneSchema,
  bulkCreateFlatsSchema,
  createBuildingSchema,
  createFlatSchema,
  PROPERTY_ERROR_CODES,
} from "../building";

describe("Domain 02: Building, Flat & Bangladeshi Validator Rules", () => {
  it("validates valid Bangladeshi phone formats with and without country code", () => {
    // Valid standard numbers
    expect(buildingPhoneSchema.parse("01712345678")).toBe("01712345678");
    expect(buildingPhoneSchema.parse("+8801812345678")).toBe("+8801812345678");
    expect(buildingPhoneSchema.parse("01999999999")).toBe("01999999999");
    expect(buildingPhoneSchema.parse("+8801300000000")).toBe("+8801300000000");

    // Formatted with spaces / dashes
    expect(buildingPhoneSchema.parse("0171-2345678")).toBe("01712345678");
    expect(buildingPhoneSchema.parse("+880 181 234 5678")).toBe("+8801812345678");
  });

  it("rejects invalid phone numbers", () => {
    // Invalid operator prefixes
    expect(() => buildingPhoneSchema.parse("01212345678")).toThrow();
    expect(() => buildingPhoneSchema.parse("01012345678")).toThrow();

    // Too short or too long
    expect(() => buildingPhoneSchema.parse("0171234567")).toThrow();
    expect(() => buildingPhoneSchema.parse("017123456789")).toThrow();

    // Random non-numeric strings
    expect(() => buildingPhoneSchema.parse("not-a-phone")).toThrow();
    expect(() => buildingPhoneSchema.parse("12345678901")).toThrow();
  });

  it("validates createBuildingSchema successfully", () => {
    const validBuilding = {
      name: "Lakeview Residence Tower",
      address: "House 12, Road 5, Dhanmondi, Dhaka",
      city: "Dhaka",
      thana: "Dhanmondi",
      postalCode: "1205",
      totalFloors: 10,
      hasElevator: true,
      hasGenerator: true,
      gateClosingTime: "11:30 PM",
      caretakerPhone: "01712345678",
      managerPhone: "+8801812345678",
    };

    const parsed = createBuildingSchema.parse(validBuilding);
    expect(parsed.name).toBe("Lakeview Residence Tower");
    expect(parsed.city).toBe("Dhaka");
    expect(parsed.hasElevator).toBe(true);
  });

  it("validates createFlatSchema with non-negative rent and service charges", () => {
    const validFlat = {
      buildingId: "bld-123",
      flatNumber: "4A",
      floor: 4,
      unitType: "residential" as const,
      bedrooms: 3,
      bathrooms: 2,
      balconies: 2,
      squareFeet: 1550,
      defaultRentAmount: 32000,
      defaultServiceCharge: 5000,
      electricityMeterType: "prepaid" as const,
      gasType: "cylinder" as const,
    };

    const parsed = createFlatSchema.parse(validFlat);
    expect(parsed.flatNumber).toBe("4A");
    expect(parsed.defaultRentAmount).toBe(32000);

    // Negative rent rejected
    expect(() =>
      createFlatSchema.parse({
        ...validFlat,
        defaultRentAmount: -500,
      }),
    ).toThrow("Rent amount cannot be negative");

    // Negative service charge rejected
    expect(() =>
      createFlatSchema.parse({
        ...validFlat,
        defaultServiceCharge: -100,
      }),
    ).toThrow("Service charge cannot be negative");
  });

  it("validates bulkCreateFlatsSchema and rejects invalid floor ranges", () => {
    const validBulk = {
      buildingId: "bld-456",
      floorStart: 1,
      floorEnd: 5,
      letters: ["A", "B"],
      unitType: "residential" as const,
      bedrooms: 3,
      bathrooms: 2,
      defaultRentAmount: 25000,
      defaultServiceCharge: 4000,
    };

    const parsed = bulkCreateFlatsSchema.parse(validBulk);
    expect(parsed.floorStart).toBe(1);
    expect(parsed.floorEnd).toBe(5);
    expect(parsed.letters).toEqual(["A", "B"]);

    // Inverted range: floorEnd < floorStart
    expect(() =>
      bulkCreateFlatsSchema.parse({
        ...validBulk,
        floorStart: 6,
        floorEnd: 2,
      }),
    ).toThrow("Floor end must be greater than or equal to floor start");
  });

  it("exports standard domain error codes", () => {
    expect(PROPERTY_ERROR_CODES.BUILDING_NOT_FOUND).toBe("BUILDING_NOT_FOUND");
    expect(PROPERTY_ERROR_CODES.BUILDING_HAS_ACTIVE_UNITS).toBe("BUILDING_HAS_ACTIVE_UNITS");
    expect(PROPERTY_ERROR_CODES.FLAT_DUPLICATE_NUMBER).toBe("FLAT_DUPLICATE_NUMBER");
    expect(PROPERTY_ERROR_CODES.FLAT_OCCUPIED_STATUS_LOCKED).toBe("FLAT_OCCUPIED_STATUS_LOCKED");
  });
});
