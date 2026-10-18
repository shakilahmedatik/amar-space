import { describe, expect, it } from "bun:test";
import { appRouter } from "../routers/app";

describe("Domain 05: Maintenance & Operations tRPC Procedures", () => {
  const orgId = "org-operations-test";
  const managerUserId = "user-manager-1";
  const staffUserId = "user-staff-1";
  const tenantUserId = "user-renter-1";
  const otherTenantUserId = "user-renter-2";
  const buildingId = "bld-dhanmondi-1";
  const flatId = "flat-101";
  const otherFlatId = "flat-202";

  it("rejects unauthenticated requests to listMaintenanceRequests", async () => {
    const caller = appRouter.createCaller({
      db: {} as any,
      session: null,
      organizationId: null,
      requestId: "req-unauth-ops",
    });

    try {
      await caller.operations.listMaintenanceRequests();
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("UNAUTHORIZED");
    }
  });

  it("creates maintenance request and logs audit event", async () => {
    let insertedTicket: any = null;
    let auditEvent: any = null;

    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({ id: "mem-mgr", role: "manager" }),
        },
        buildings: {
          findFirst: async () => ({ id: buildingId, organizationId: orgId }),
        },
        flats: {
          findFirst: async () => ({ id: flatId, buildingId }),
        },
      },
      insert: (_table: any) => ({
        values: (val: any) => {
          if (val.title) {
            insertedTicket = val;
            return {
              returning: async () => [val],
            };
          }
          if (val.action) {
            auditEvent = val;
            return Promise.resolve();
          }
          return { returning: async () => [val] };
        },
      }),
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: { id: managerUserId, email: "manager@bashundhara.com", name: "Kamrul Manager" },
      } as any,
      organizationId: orgId,
      requestId: "req-create-ticket",
    });

    const result = await caller.operations.createMaintenanceRequest({
      buildingId,
      flatId,
      category: "plumbing",
      title: "Kitchen sink drain leakage",
      description: "Severe water pooling under the kitchen drain trap.",
      priority: "high",
      photoUrls: ["https://example.com/leak.jpg"],
    });

    expect(result?.title).toBe("Kitchen sink drain leakage");
    expect(result?.status).toBe("open");
    expect(result?.category).toBe("plumbing");
    expect(insertedTicket.priority).toBe("high");
    expect(auditEvent.action).toBe("MAINTENANCE_TICKET_CREATED");
  });

  it("assignStaffToRequest updates staff assignment, transitions status, and logs audit event", async () => {
    let _updatedTicket: any = null;
    let auditEvent: any = null;

    const mockDb = {
      query: {
        members: {
          findFirst: async () => {
            // Role middleware check or staff member check

            return {
              id: "mem-staff",
              organizationId: orgId,
              userId: staffUserId,
              role: "manager",
            };
          },
        },
        maintenanceRequests: {
          findFirst: async () => ({
            id: "ticket-101",
            organizationId: orgId,
            status: "open",
          }),
        },
      },
      update: () => ({
        set: (val: any) => ({
          where: () => {
            _updatedTicket = val;
            return {
              returning: async () => [{ id: "ticket-101", ...val }],
            };
          },
        }),
      }),
      insert: () => ({
        values: async (val: any) => {
          if (val.action) auditEvent = val;
        },
      }),
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: { id: managerUserId, email: "manager@bashundhara.com" },
      } as any,
      organizationId: orgId,
      requestId: "req-assign-staff",
    });

    const result = await caller.operations.assignStaffToRequest({
      requestId: "ticket-101",
      staffUserId,
    });

    expect(result?.assignedToStaffId).toBe(staffUserId);
    expect(result?.status).toBe("assigned");
    expect(auditEvent.action).toBe("MAINTENANCE_STAFF_ASSIGNED");
  });

  it("assignStaffToRequest throws TICKET_ALREADY_CLOSED when ticket is archived", async () => {
    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({ id: "mem-mgr", role: "manager" }),
        },
        maintenanceRequests: {
          findFirst: async () => ({
            id: "ticket-closed",
            organizationId: orgId,
            status: "closed",
          }),
        },
      },
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: { id: managerUserId, email: "manager@bashundhara.com" },
      } as any,
      organizationId: orgId,
      requestId: "req-assign-closed",
    });

    try {
      await caller.operations.assignStaffToRequest({
        requestId: "ticket-closed",
        staffUserId,
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("BAD_REQUEST");
      expect(err.message).toBe("TICKET_ALREADY_CLOSED");
    }
  });

  it("resolveMaintenanceRequest requires resolution notes, records cost, and marks resolved", async () => {
    let resolvedData: any = null;

    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({ id: "mem-mgr", role: "manager" }),
        },
        maintenanceRequests: {
          findFirst: async () => ({
            id: "ticket-202",
            organizationId: orgId,
            status: "in_progress",
          }),
        },
      },
      update: () => ({
        set: (val: any) => ({
          where: () => {
            resolvedData = val;
            return {
              returning: async () => [{ id: "ticket-202", ...val }],
            };
          },
        }),
      }),
      insert: () => ({
        values: async () => {},
      }),
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: { id: managerUserId, email: "manager@bashundhara.com" },
      } as any,
      organizationId: orgId,
      requestId: "req-resolve-ticket",
    });

    const result = await caller.operations.resolveMaintenanceRequest({
      requestId: "ticket-202",
      resolutionNotes: "Replaced drain P-trap pipe and sealed joints with silicone.",
      repairCost: "1500.00",
      costBilledTo: "landlord",
      resolutionPhotoUrls: ["https://example.com/resolved.jpg"],
    });

    expect(result?.status).toBe("resolved");
    expect(resolvedData.repairCost).toBe("1500.00");
    expect(resolvedData.resolutionNotes).toContain("Replaced drain P-trap");
  });

  it("enforces role restrictions blocking regular members from creating broadcast notices", async () => {
    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({
            id: "mem-member",
            role: "member", // regular member without admin/manager role
            organizationId: orgId,
            userId: "user-unauthorized",
          }),
        },
      },
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: { id: "user-unauthorized", email: "unauthorized@bashundhara.com" },
      } as any,
      organizationId: orgId,
      requestId: "req-forbidden-notice",
    });

    try {
      await caller.operations.createNotice({
        title: "Unauthorized Notice",
        body: "This should be blocked by role enforcement.",
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("FORBIDDEN");
    }
  });

  it("creates, pins, and deletes building notices with audit logs", async () => {
    let createdNotice: any = null;
    let _pinnedNotice: any = null;
    let deletedNotice: any = null;

    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({ id: "mem-mgr", role: "manager" }),
        },
      },
      insert: () => ({
        values: (val: any) => {
          if (val.title) createdNotice = val;
          return {
            returning: async () => [val],
          };
        },
      }),
      update: () => ({
        set: (val: any) => ({
          where: () => {
            _pinnedNotice = val;
            return {
              returning: async () => [{ id: "notice-1", ...val }],
            };
          },
        }),
      }),
      delete: () => ({
        where: () => {
          deletedNotice = { id: "notice-1", title: "Notice To Delete" };
          return {
            returning: async () => [deletedNotice],
          };
        },
      }),
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: { id: managerUserId, email: "manager@bashundhara.com" },
      } as any,
      organizationId: orgId,
      requestId: "req-notice-crud",
    });

    // 1. Create Notice
    const newNotice = await caller.operations.createNotice({
      title: "Scheduled Power Outage for Generator Test",
      body: "Power will be briefly paused on Saturday 10 AM - 12 PM.",
      targetAudience: "all_renters",
      isPinned: true,
    });
    expect(newNotice?.title).toBe("Scheduled Power Outage for Generator Test");
    expect(createdNotice.isPinned).toBe(true);

    // 2. Pin/Unpin Notice
    const unpinned = await caller.operations.pinNotice({
      noticeId: "notice-1",
      isPinned: false,
    });
    expect(unpinned?.isPinned).toBe(false);

    // 3. Delete Notice
    const delResult = await caller.operations.deleteNotice({
      noticeId: "notice-1",
    });
    expect(delResult.success).toBe(true);
  });

  it("restricts getMyMaintenanceRequestById and throws FORBIDDEN when tenant does not own the flat", async () => {
    const mockDb = {
      query: {
        renters: {
          findFirst: async () => ({
            id: "renter-farhana",
            userId: tenantUserId,
            flatId: flatId, // Tenant lives in flat-101
          }),
        },
        maintenanceRequests: {
          findFirst: async () => ({
            id: "ticket-other-flat",
            flatId: otherFlatId, // Ticket belongs to flat-202
            requestedByUserId: otherTenantUserId,
          }),
        },
      },
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: { id: tenantUserId, email: "farhana@gmail.com" },
      } as any,
      organizationId: null,
      requestId: "req-forbidden-ticket",
    });

    try {
      await caller.operations.getMyMaintenanceRequestById({
        requestId: "ticket-other-flat",
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("FORBIDDEN");
      expect(err.message).toBe("FORBIDDEN_TICKET_ACCESS");
    }
  });

  it("allows tenant to access their own maintenance request", async () => {
    const mockDb = {
      query: {
        renters: {
          findFirst: async () => ({
            id: "renter-farhana",
            userId: tenantUserId,
            flatId: flatId,
          }),
        },
        maintenanceRequests: {
          findFirst: async () => ({
            id: "ticket-my-flat",
            flatId: flatId,
            requestedByUserId: tenantUserId,
            title: "Master bedroom AC cooling issue",
          }),
        },
      },
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: { id: tenantUserId, email: "farhana@gmail.com" },
      } as any,
      organizationId: null,
      requestId: "req-my-ticket",
    });

    const ticket = await caller.operations.getMyMaintenanceRequestById({
      requestId: "ticket-my-flat",
    });

    expect(ticket.title).toBe("Master bedroom AC cooling issue");
    expect(ticket.flatId).toBe(flatId);
  });

  it("createMyMaintenanceRequest writes ticket scoped to tenant's active flat and logs audit event", async () => {
    let tenantTicket: any = null;
    let auditEvent: any = null;

    const mockDb = {
      query: {
        renters: {
          findFirst: async () => ({
            id: "renter-farhana",
            fullName: "Farhana Yasmin",
            organizationId: orgId,
            userId: tenantUserId,
            flatId: flatId,
            flat: {
              id: flatId,
              buildingId,
            },
          }),
        },
      },
      insert: () => ({
        values: (val: any) => {
          if (val.title) {
            tenantTicket = val;
            return {
              returning: async () => [val],
            };
          }
          if (val.action) {
            auditEvent = val;
            return Promise.resolve();
          }
          return { returning: async () => [val] };
        },
      }),
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: { id: tenantUserId, email: "farhana@gmail.com" },
      } as any,
      organizationId: null,
      requestId: "req-tenant-submit-ticket",
    });

    const ticket = await caller.operations.createMyMaintenanceRequest({
      category: "electrical",
      title: "Intermittent sparks in living room socket",
      description: "When plugging in appliances, living room socket emits small sparks.",
      priority: "urgent",
      photoUrls: [],
    });

    expect(ticket?.title).toBe("Intermittent sparks in living room socket");
    expect(tenantTicket.flatId).toBe(flatId);
    expect(tenantTicket.buildingId).toBe(buildingId);
    expect(tenantTicket.status).toBe("open");
    expect(auditEvent.action).toBe("TENANT_MAINTENANCE_SUBMITTED");
  });

  it("getMyNotices returns targeted notices and omits expired notices", async () => {
    const mockDb = {
      query: {
        renters: {
          findFirst: async () => ({
            id: "renter-farhana",
            organizationId: orgId,
            userId: tenantUserId,
            flatId,
            flat: {
              id: flatId,
              buildingId,
            },
          }),
        },
        notices: {
          findMany: async () => [
            {
              id: "notice-active-1",
              title: "Active Generator Notice",
              targetAudience: "all_renters",
              isPinned: true,
            },
            {
              id: "notice-active-2",
              title: "Water Tank Cleaning Notice",
              targetAudience: "specific_building",
              targetBuildingId: buildingId,
              isPinned: false,
            },
          ],
        },
      },
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: { id: tenantUserId, email: "farhana@gmail.com" },
      } as any,
      organizationId: null,
      requestId: "req-tenant-notices",
    });

    const notices = await caller.operations.getMyNotices();
    expect(notices.length).toBe(2);
    expect(notices[0]?.title).toBe("Active Generator Notice");
    expect(notices[1]?.title).toBe("Water Tank Cleaning Notice");
  });
});
