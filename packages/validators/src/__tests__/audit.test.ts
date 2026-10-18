import { describe, expect, it } from "bun:test";
import {
  AUDIT_ERROR_CODES,
  generateAuditCsv,
  getEntityAuditTrailSchema,
  listAuditLogsSchema,
  sanitizeAuditValue,
  validateDateRange,
} from "../audit";

describe("Domain 06: Audit Logging & Security Validator Rules", () => {
  it("exports standard domain error codes", () => {
    expect(AUDIT_ERROR_CODES.AUDIT_FORBIDDEN).toBe("AUDIT_FORBIDDEN");
    expect(AUDIT_ERROR_CODES.AUDIT_LOG_WRITE_FAILED).toBe("AUDIT_LOG_WRITE_FAILED");
    expect(AUDIT_ERROR_CODES.INVALID_DATE_RANGE).toBe("INVALID_DATE_RANGE");
  });

  describe("sanitizeAuditValue", () => {
    it("strips password and secret keys from nested objects", () => {
      const raw = {
        name: "Landlord Tanvir",
        email: "landlord@bashundhara.com",
        password: "SuperSecretPassword123!",
        userToken: "jwt_token_9821731",
        settings: {
          apiKey: "sk_live_1234567890",
          creditCard: "4111222233334444",
          cvv: "123",
          theme: "luxury-dark",
        },
      };

      const sanitized = sanitizeAuditValue(raw) as typeof raw;

      expect(sanitized.name).toBe("Landlord Tanvir");
      expect(sanitized.email).toBe("landlord@bashundhara.com");
      expect(sanitized.password).toBe("[REDACTED]");
      expect(sanitized.userToken).toBe("[REDACTED]");
      expect(sanitized.settings.apiKey).toBe("[REDACTED]");
      expect(sanitized.settings.creditCard).toBe("[REDACTED]");
      expect(sanitized.settings.cvv).toBe("[REDACTED]");
      expect(sanitized.settings.theme).toBe("luxury-dark");
    });

    it("handles primitives, arrays, and nullish inputs safely", () => {
      expect(sanitizeAuditValue(null)).toBeNull();
      expect(sanitizeAuditValue(undefined)).toBeUndefined();
      expect(sanitizeAuditValue("simple-string")).toBe("simple-string");
      expect(sanitizeAuditValue(12345)).toBe(12345);

      const arrayData = [
        { password: "123", role: "staff" },
        { token: "abc", role: "manager" },
      ];
      const sanitizedArray = sanitizeAuditValue(arrayData) as typeof arrayData;
      const first = sanitizedArray[0];
      const second = sanitizedArray[1];
      expect(first?.password).toBe("[REDACTED]");
      expect(first?.role).toBe("staff");
      expect(second?.token).toBe("[REDACTED]");
      expect(second?.role).toBe("manager");
    });
  });

  describe("listAuditLogsSchema & getEntityAuditTrailSchema", () => {
    it("validates listAuditLogsSchema with defaults", () => {
      const result = listAuditLogsSchema.parse({});
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
      expect(result.entityType).toBeUndefined();
    });

    it("validates filter options in listAuditLogsSchema", () => {
      const result = listAuditLogsSchema.parse({
        entityType: "flat",
        entityId: "flat-4a",
        action: "UPDATE",
        startDate: "2026-10-01",
        endDate: "2026-10-18",
        limit: 100,
        offset: 10,
      });

      expect(result.entityType).toBe("flat");
      expect(result.entityId).toBe("flat-4a");
      expect(result.action).toBe("UPDATE");
      expect(result.limit).toBe(100);
      expect(result.offset).toBe(10);
    });

    it("validates getEntityAuditTrailSchema and requires entityType & entityId", () => {
      const valid = getEntityAuditTrailSchema.parse({
        entityType: "contract",
        entityId: "contract-123",
      });
      expect(valid.entityType).toBe("contract");
      expect(valid.entityId).toBe("contract-123");

      expect(() => getEntityAuditTrailSchema.parse({ entityType: "", entityId: "123" })).toThrow();
    });
  });

  describe("validateDateRange", () => {
    it("returns valid when start <= end within 90 days", () => {
      const check = validateDateRange("2026-08-01", "2026-10-18", 90);
      expect(check.valid).toBe(true);
      expect(check.error).toBeUndefined();
    });

    it("returns invalid when start > end", () => {
      const check = validateDateRange("2026-10-18", "2026-08-01");
      expect(check.valid).toBe(false);
      expect(check.error).toContain("earlier than or equal to end date");
    });

    it("returns invalid when date range exceeds maxDays", () => {
      const check = validateDateRange("2026-01-01", "2026-06-01", 90);
      expect(check.valid).toBe(false);
      expect(check.error).toContain("exceeds maximum allowed window of 90 days");
    });

    it("handles invalid date strings gracefully", () => {
      const check = validateDateRange("not-a-date", "2026-10-18");
      expect(check.valid).toBe(false);
      expect(check.error).toContain("Invalid date format");
    });
  });

  describe("generateAuditCsv", () => {
    it("generates CSV with headers and correctly escapes formulas and delimiters", () => {
      const csv = generateAuditCsv([
        {
          id: "log-1",
          createdAt: new Date("2026-10-18T10:00:00.000Z"),
          actorEmail: "manager@bashundhara.com",
          actorRole: "manager",
          action: "UPDATE",
          entityType: "flat",
          entityId: "flat-4a",
          oldValue: { rent: 45000 },
          newValue: { rent: 48000 },
          metadata: { note: "Annual review, adjusted for inflation" },
          ipAddress: "103.114.98.22",
        },
        {
          id: "log-2",
          createdAt: new Date("2026-10-18T11:00:00.000Z"),
          actorEmail: "malicious@test.com",
          actorRole: "staff",
          action: "CREATE",
          entityType: "bill",
          entityId: "bill-99",
          oldValue: null,
          newValue: "=SUM(A1:A10)", // Potential CSV injection
          metadata: null,
          ipAddress: null,
        },
      ]);

      const lines = csv.split("\r\n");
      expect(lines.length).toBe(3);
      expect(lines[0]).toContain("Log ID,Timestamp (UTC),Actor Email");
      expect(lines[1]).toContain("manager@bashundhara.com");
      // Must quote values containing commas
      expect(lines[1]).toContain('"Annual review, adjusted for inflation"');
      // Must prefix formulas starting with = with a single quote
      expect(lines[2]).toContain("'=SUM(A1:A10)");
    });
  });
});
