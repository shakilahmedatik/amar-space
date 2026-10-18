import { describe, expect, it } from "bun:test";
import { AUDIT_ERROR_CODES } from "@omniheaven/validators";
import { appRouter } from "../routers/app";
import { recordAuditLog } from "../utils/audit";

describe("Domain 06: Audit Logging & Security tRPC Procedures", () => {
  const orgId = "org-bashundhara-tower";
  const ownerUserId = "user-landlord-1";
  const managerUserId = "user-manager-1";
  const staffUserId = "user-staff-1";
  const _memberUserId = "user-renter-1";

  const sampleAuditLogs = [
    {
      id: "audit-1",
      organizationId: orgId,
      actorUserId: ownerUserId,
      actorEmail: "landlord@bashundhara.com",
      actorRole: "owner",
      action: "UPDATE",
      entityType: "flat",
      entityId: "flat-4a",
      oldValue: { baseRent: "45000.00" },
      newValue: { baseRent: "48000.00" },
      metadata: { reason: "Annual contractual rent review" },
      ipAddress: "103.114.98.22",
      userAgent: "Mozilla/5.0",
      createdAt: new Date("2026-10-10T12:00:00Z"),
    },
    {
      id: "audit-2",
      organizationId: orgId,
      actorUserId: managerUserId,
      actorEmail: "manager@bashundhara.com",
      actorRole: "manager",
      action: "ADJUST",
      entityType: "advance_adjustment",
      entityId: "adj-9941",
      oldValue: { remainingDepositBalance: "60000.00" },
      newValue: { remainingDepositBalance: "30000.00" },
      metadata: { note: "Adjusting November rent against deposit" },
      ipAddress: "103.114.98.22",
      userAgent: "Mozilla/5.0",
      createdAt: new Date("2026-10-12T14:22:10Z"),
    },
  ];

  it("rejects unauthenticated requests to listAuditLogs", async () => {
    const caller = appRouter.createCaller({
      db: {} as any,
      session: null,
      organizationId: null,
      requestId: "req-unauth-audit",
    });

    try {
      await caller.audit.listAuditLogs();
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("UNAUTHORIZED");
    }
  });

  it("allows owner and manager to access listAuditLogs", async () => {
    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({ id: "mem-owner", role: "owner" }),
        },
        auditLogs: {
          findMany: async () => sampleAuditLogs,
        },
      },
      select: () => ({
        from: () => ({
          where: async () => [{ value: 2 }],
        }),
      }),
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: { id: ownerUserId, email: "landlord@bashundhara.com" },
        session: { activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-owner-audit",
    });

    const result = await caller.audit.listAuditLogs();
    expect(result.logs.length).toBe(2);
    expect(result.total).toBe(2);
    expect(result.logs[0]?.entityType).toBe("flat");
  });

  it("enforces role restrictions: throws AUDIT_FORBIDDEN when staff or member calls listAuditLogs", async () => {
    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({ id: "mem-staff", role: "staff" }),
        },
      },
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: { id: staffUserId, email: "staff@bashundhara.com" },
        session: { activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-staff-audit",
    });

    try {
      await caller.audit.listAuditLogs();
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("FORBIDDEN");
      expect(err.message).toBe(AUDIT_ERROR_CODES.AUDIT_FORBIDDEN);
    }
  });

  it("filters audit logs by entityType and entityId (Scenario 6.1.1)", async () => {
    let _capturedWhere: any = null;

    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({ id: "mem-mgr", role: "manager" }),
        },
        auditLogs: {
          findMany: async (args: any) => {
            _capturedWhere = args.where;
            return [sampleAuditLogs[1]];
          },
        },
      },
      select: () => ({
        from: () => ({
          where: async () => [{ value: 1 }],
        }),
      }),
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: { id: managerUserId, email: "manager@bashundhara.com" },
        session: { activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-mgr-filter",
    });

    const result = await caller.audit.listAuditLogs({
      entityType: "advance_adjustment",
      entityId: "adj-9941",
    });

    expect(result.logs.length).toBe(1);
    expect(result.logs[0]?.action).toBe("ADJUST");
    expect(result.logs[0]?.entityId).toBe("adj-9941");
  });

  it("getEntityAuditTrail returns chronological timeline for specific entity", async () => {
    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({ id: "mem-mgr", role: "manager" }),
        },
        auditLogs: {
          findMany: async () => [sampleAuditLogs[0]],
        },
      },
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: { id: managerUserId, email: "manager@bashundhara.com" },
        session: { activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-entity-trail",
    });

    const trail = await caller.audit.getEntityAuditTrail({
      entityType: "flat",
      entityId: "flat-4a",
    });

    expect(trail.length).toBe(1);
    expect(trail[0]?.entityType).toBe("flat");
    expect(trail[0]?.entityId).toBe("flat-4a");
  });

  it("exportAuditReportCsv exports certified CSV within 90 days and records audit log", async () => {
    let recordedAuditLog: any = null;

    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({ id: "mem-owner", role: "owner" }),
        },
        auditLogs: {
          findMany: async () => sampleAuditLogs,
        },
      },
      insert: (_table: any) => ({
        values: (val: any) => {
          recordedAuditLog = val;
          return Promise.resolve();
        },
      }),
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: { id: ownerUserId, email: "landlord@bashundhara.com" },
        session: { activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-export-csv",
    });

    const exportResult = await caller.audit.exportAuditReportCsv({
      startDate: "2026-07-01",
      endDate: "2026-09-25",
    });

    expect(exportResult.rowCount).toBe(2);
    expect(exportResult.filename).toContain(
      "audit_report_org-bashundhara-tower_2026-07-01_to_2026-09-25.csv",
    );
    expect(exportResult.csv).toContain("Log ID,Timestamp (UTC),Actor Email");
    expect(exportResult.csv).toContain("landlord@bashundhara.com");

    // Compliance record logged
    expect(recordedAuditLog).not.toBeNull();
    expect(recordedAuditLog.action).toBe("EXPORT");
    expect(recordedAuditLog.entityType).toBe("audit_log");
  });

  it("exportAuditReportCsv rejects ranges exceeding 90 days with INVALID_DATE_RANGE", async () => {
    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({ id: "mem-owner", role: "owner" }),
        },
      },
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: { id: ownerUserId, email: "landlord@bashundhara.com" },
        session: { activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-invalid-range",
    });

    try {
      await caller.audit.exportAuditReportCsv({
        startDate: "2026-01-01",
        endDate: "2026-07-01", // ~180 days
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("BAD_REQUEST");
      expect(err.message).toBe(AUDIT_ERROR_CODES.INVALID_DATE_RANGE);
    }
  });

  it("recordAuditLog helper strips sensitive passwords and secret keys from diffs", async () => {
    let insertedVal: any = null;

    const mockDb = {
      insert: (_table: any) => ({
        values: async (val: any) => {
          insertedVal = val;
        },
      }),
    };

    await recordAuditLog(mockDb as any, {
      orgId,
      actor: { id: "user-1", email: "user@test.com", role: "manager" },
      action: "UPDATE",
      entityType: "renter",
      entityId: "renter-1",
      oldValue: { name: "John", password: "plainPassword123" },
      newValue: { name: "John Doe", password: "newSuperSecretPassword456!" },
      metadata: { apiKey: "secret_live_key" },
    });

    expect(insertedVal).not.toBeNull();
    expect(insertedVal.oldValue.password).toBe("[REDACTED]");
    expect(insertedVal.newValue.password).toBe("[REDACTED]");
    expect(insertedVal.metadata.apiKey).toBe("[REDACTED]");
    expect(insertedVal.oldValue.name).toBe("John");
    expect(insertedVal.newValue.name).toBe("John Doe");
  });

  it("recordAuditLog throws AUDIT_LOG_WRITE_FAILED when throwOnError is true (atomic write guarantee)", async () => {
    const failingDb = {
      insert: () => ({
        values: async () => {
          throw new Error("Simulated disk error or DB constraint violation");
        },
      }),
    };

    try {
      await recordAuditLog(failingDb as any, {
        orgId,
        action: "TERMINATE",
        entityType: "contract",
        entityId: "contract-1",
        throwOnError: true,
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("INTERNAL_SERVER_ERROR");
      expect(err.message).toBe(AUDIT_ERROR_CODES.AUDIT_LOG_WRITE_FAILED);
    }
  });
});
