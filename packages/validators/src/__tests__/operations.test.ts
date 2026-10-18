import { describe, expect, it } from "bun:test";
import {
  createMaintenanceRequestSchema,
  createNoticeSchema,
  isNoticeActive,
  OPERATIONS_ERROR_CODES,
  pinNoticeSchema,
  resolveMaintenanceRequestSchema,
  updateRequestStatusSchema,
} from "../operations";

describe("Domain 05: Maintenance & Operations Validator Rules", () => {
  it("validates createMaintenanceRequestSchema successfully with defaults", () => {
    const valid = createMaintenanceRequestSchema.parse({
      buildingId: "bld-dhanmondi-lakeview",
      flatId: "flat-dhanmondi-1a",
      title: "Kitchen sink water pipe leak",
      description: "Severe dripping beneath the kitchen counter sink connecting pipe.",
    });

    expect(valid.buildingId).toBe("bld-dhanmondi-lakeview");
    expect(valid.category).toBe("general");
    expect(valid.priority).toBe("medium");
    expect(valid.photoUrls).toEqual([]);
  });

  it("validates specific categories and priorities in createMaintenanceRequestSchema", () => {
    const valid = createMaintenanceRequestSchema.parse({
      buildingId: "bld-dhanmondi-lakeview",
      category: "plumbing",
      title: "Main water riser valve stuck",
      description: "Water valve cannot be turned off on the 3rd floor riser shaft.",
      priority: "urgent",
      photoUrls: ["https://example.com/pipe.jpg"],
    });

    expect(valid.category).toBe("plumbing");
    expect(valid.priority).toBe("urgent");
    expect(valid.photoUrls.length).toBe(1);
  });

  it("rejects invalid title and short descriptions in maintenance requests", () => {
    // Title too short
    expect(() =>
      createMaintenanceRequestSchema.parse({
        buildingId: "bld-1",
        title: "Hi",
        description: "Adequate description length for testing.",
      }),
    ).toThrow();

    // Description too short
    expect(() =>
      createMaintenanceRequestSchema.parse({
        buildingId: "bld-1",
        title: "Broken window handle",
        description: "Broken",
      }),
    ).toThrow();

    // Invalid category
    expect(() =>
      createMaintenanceRequestSchema.parse({
        buildingId: "bld-1",
        title: "Roof leakage issue",
        description: "Rainwater seeping into bedroom ceiling corner.",
        category: "invalid_category" as any,
      }),
    ).toThrow();
  });

  it("enforces mandatory resolution notes in resolveMaintenanceRequestSchema", () => {
    const valid = resolveMaintenanceRequestSchema.parse({
      requestId: "ticket-101",
      resolutionNotes: "Replaced blown capacitor on water pump motor. System operational.",
      repairCost: "1200.00",
      costBilledTo: "landlord",
      resolutionPhotoUrls: ["https://example.com/repaired-pump.jpg"],
    });

    expect(valid.requestId).toBe("ticket-101");
    expect(valid.repairCost).toBe("1200.00");
    expect(valid.costBilledTo).toBe("landlord");

    // Empty or too short resolution notes rejected
    expect(() =>
      resolveMaintenanceRequestSchema.parse({
        requestId: "ticket-101",
        resolutionNotes: "Done",
      }),
    ).toThrow();

    expect(() =>
      resolveMaintenanceRequestSchema.parse({
        requestId: "ticket-101",
        resolutionNotes: "   ",
      }),
    ).toThrow();
  });

  it("safely normalizes repairCost numbers or strings in resolveMaintenanceRequestSchema", () => {
    const withNumber = resolveMaintenanceRequestSchema.parse({
      requestId: "ticket-102",
      resolutionNotes: "Replaced elevator door sensor relay.",
      repairCost: 4500,
    });
    expect(withNumber.repairCost).toBe("4500.00");

    const withNegative = resolveMaintenanceRequestSchema.parse({
      requestId: "ticket-103",
      resolutionNotes: "Tightened bathroom tap screw.",
      repairCost: -100,
    });
    expect(withNegative.repairCost).toBe("0.00");
  });

  it("validates updateRequestStatusSchema and pinNoticeSchema", () => {
    const statusUpdate = updateRequestStatusSchema.parse({
      requestId: "ticket-101",
      status: "in_progress",
    });
    expect(statusUpdate.status).toBe("in_progress");

    const pinUpdate = pinNoticeSchema.parse({
      noticeId: "notice-201",
      isPinned: true,
    });
    expect(pinUpdate.isPinned).toBe(true);
  });

  it("validates createNoticeSchema with target audiences", () => {
    const notice = createNoticeSchema.parse({
      title: "Scheduled Water Tank Cleaning",
      body: "Water reservoir cleaning on Friday from 8 AM to 2 PM. Please store water.",
      targetAudience: "specific_building",
      targetBuildingId: "bld-dhanmondi-lakeview",
      isPinned: true,
      expiresAt: "2026-11-01",
    });

    expect(notice.title).toBe("Scheduled Water Tank Cleaning");
    expect(notice.targetAudience).toBe("specific_building");
    expect(notice.isPinned).toBe(true);

    // Body too short rejected
    expect(() =>
      createNoticeSchema.parse({
        title: "Short body notice",
        body: "Short",
      }),
    ).toThrow();
  });

  it("calculates isNoticeActive correctly for future, past, and null expirations", () => {
    const now = new Date("2026-10-18T12:00:00Z");

    // No expiration = always active
    expect(isNoticeActive(null, now)).toBe(true);
    expect(isNoticeActive(undefined, now)).toBe(true);

    // Future expiration = active
    expect(isNoticeActive(new Date("2026-10-25T12:00:00Z"), now)).toBe(true);
    expect(isNoticeActive("2026-10-25T12:00:00Z", now)).toBe(true);

    // Past expiration = inactive
    expect(isNoticeActive(new Date("2026-10-10T12:00:00Z"), now)).toBe(false);
    expect(isNoticeActive("2026-10-10T12:00:00Z", now)).toBe(false);
  });

  it("exports standard domain error codes", () => {
    expect(OPERATIONS_ERROR_CODES.TICKET_NOT_FOUND).toBe("TICKET_NOT_FOUND");
    expect(OPERATIONS_ERROR_CODES.TICKET_ALREADY_CLOSED).toBe("TICKET_ALREADY_CLOSED");
    expect(OPERATIONS_ERROR_CODES.RESOLUTION_NOTES_REQUIRED).toBe("RESOLUTION_NOTES_REQUIRED");
    expect(OPERATIONS_ERROR_CODES.FORBIDDEN_TICKET_ACCESS).toBe("FORBIDDEN_TICKET_ACCESS");
    expect(OPERATIONS_ERROR_CODES.NOTICE_EXPIRED).toBe("NOTICE_EXPIRED");
  });
});
