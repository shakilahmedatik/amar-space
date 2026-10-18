import { describe, expect, it } from "bun:test";
import {
  createOrganizationSchema,
  inviteMemberSchema,
  ORG_ERROR_CODES,
  ORG_SLUG_REGEX,
  updateOrganizationSchema,
} from "../organization";

describe("Domain 01: Organization Slug & Validation Rules", () => {
  it("validates correct lowercase alphanumeric slugs with hyphens", () => {
    const validSlugs = [
      "bashundhara-tower",
      "green-villa",
      "hotel-cox-1",
      "tower99",
      "grand-haven-resort-2026",
    ];

    for (const slug of validSlugs) {
      expect(ORG_SLUG_REGEX.test(slug)).toBe(true);
    }
  });

  it("rejects invalid slugs: uppercase, consecutive hyphens, leading/trailing hyphens, special characters", () => {
    const invalidSlugs = [
      "Bashundhara-Tower", // uppercase
      "green--villa", // consecutive hyphens
      "-leading-hyphen", // leading hyphen
      "trailing-hyphen-", // trailing hyphen
      "space in slug", // spaces
      "special@char", // special char
      "under_score", // underscores not allowed in web slugs
      "", // empty
    ];

    for (const slug of invalidSlugs) {
      expect(ORG_SLUG_REGEX.test(slug)).toBe(false);
    }
  });

  it("validates createOrganizationSchema successfully", () => {
    const result = createOrganizationSchema.safeParse({
      name: "Bashundhara Royal Heights",
      slug: "bashundhara-royal-heights",
      productType: "building",
      contactPhone: "01711223344",
      contactEmail: "info@bashundhara.com",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.productType).toBe("building");
      expect(result.data.contactPhone).toBe("01711223344");
    }
  });

  it("validates updateOrganizationSchema successfully", () => {
    const result = updateOrganizationSchema.safeParse({
      name: "Bashundhara Royal Heights Updated",
      customDomain: "portal.bashundhararoyal.com",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Bashundhara Royal Heights Updated");
      expect(result.data.customDomain).toBe("portal.bashundhararoyal.com");
    }
  });

  it("rejects invalid phone numbers in organization creation", () => {
    const result = createOrganizationSchema.safeParse({
      name: "Bashundhara Royal Heights",
      slug: "bashundhara-royal",
      contactPhone: "12345", // Invalid BD phone
    });

    expect(result.success).toBe(false);
  });

  it("validates inviteMemberSchema with default 7-day TTL", () => {
    const result = inviteMemberSchema.safeParse({
      email: "Staff@Bashundhara.com",
      role: "staff",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("staff@bashundhara.com"); // transforms to lowercase
      expect(result.data.expiresInDays).toBe(7);
    }
  });

  it("exports required standard domain error codes", () => {
    expect(ORG_ERROR_CODES.CANNOT_REMOVE_LAST_OWNER).toBe("CANNOT_REMOVE_LAST_OWNER");
    expect(ORG_ERROR_CODES.ORG_SLUG_TAKEN).toBe("ORG_SLUG_TAKEN");
    expect(ORG_ERROR_CODES.INVITATION_EXPIRED).toBe("INVITATION_EXPIRED");
    expect(ORG_ERROR_CODES.ORG_FORBIDDEN).toBe("ORG_FORBIDDEN");
  });
});
