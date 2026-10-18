import { describe, expect, it } from "bun:test";
import { appRouter } from "../routers/app";

describe("Domain 03: Renter Lifecycle & Contracts tRPC Procedures", () => {
  const orgId = "org-renter-test";
  const managerUserId = "user-manager-1";
  const flatId = "flat-101";
  const renterId = "renter-farhana-test";
  const contractId = "contract-101-test";

  it("rejects unauthenticated requests to listRenters", async () => {
    const caller = appRouter.createCaller({
      db: {} as any,
      session: null,
      organizationId: null,
      requestId: "req-unauth-renter",
    });

    try {
      await caller.renter.listRenters();
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("UNAUTHORIZED");
    }
  });

  it("throws NID_ALREADY_EXISTS when creating renter with existing NID in organization", async () => {
    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({
            id: "mem-1",
            role: "manager",
            organizationId: orgId,
            userId: managerUserId,
          }),
        },
        renters: {
          findFirst: async () => ({
            id: "renter-existing",
            organizationId: orgId,
            nidNumber: "19922612345678901",
          }),
        },
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: managerUserId, email: "manager@example.com", name: "Manager" },
        session: { id: "sess-1", activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-dup-nid",
    });

    try {
      await caller.renter.createRenter({
        fullName: "Duplicate NID Tenant",
        phone: "01712345678",
        nidNumber: "19922612345678901",
        occupation: "Engineer",
        bloodGroup: "B+",
        totalFamilyMembers: 2,
        emergencyContactName: "Father",
        emergencyContactNumber: "01812345678",
        emergencyContactRelationship: "Father",
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("CONFLICT");
      expect(err.message).toBe("NID_ALREADY_EXISTS");
    }
  });

  it("throws FLAT_ALREADY_OCCUPIED when creating contract on a flat that already has active lease", async () => {
    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({
            id: "mem-1",
            role: "owner",
            organizationId: orgId,
            userId: managerUserId,
          }),
        },
        renters: {
          findFirst: async () => ({
            id: renterId,
            organizationId: orgId,
            fullName: "Prospective Tenant",
          }),
        },
        flats: {
          findFirst: async () => ({
            id: flatId,
            organizationId: orgId,
            flatNumber: "2A",
          }),
        },
        rentalContracts: {
          findFirst: async () => ({
            id: "contract-active-existing",
            flatId,
            status: "active",
          }),
        },
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: managerUserId, email: "owner@example.com", name: "Owner" },
        session: { id: "sess-1", activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-occupied-flat",
    });

    try {
      await caller.renter.createContract({
        renterId,
        flatId,
        monthlyRent: 28000,
        serviceCharge: 5000,
        securityDepositAmount: 56000,
        startDate: "2025-02-01",
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("CONFLICT");
      expect(err.message).toBe("FLAT_ALREADY_OCCUPIED");
    }
  });

  it("activating a contract sets flat status to occupied in atomic transaction", async () => {
    let updatedFlatStatus = "";
    let updatedContractStatus = "";
    let linkedRenterFlatId = "";
    let auditLogRecorded = false;

    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({
            id: "mem-1",
            role: "manager",
            organizationId: orgId,
            userId: managerUserId,
          }),
        },
        rentalContracts: {
          findFirst: async () => ({
            id: contractId,
            organizationId: orgId,
            flatId,
            renterId,
            status: "draft",
            securityDepositAmount: "56000.00",
          }),
        },
      },
      transaction: async (callback: any) => {
        const txMock = {
          query: {
            rentalContracts: {
              findFirst: async () => null, // No conflicting active lease
            },
          },
          update: () => ({
            set: (data: any) => ({
              where: () => {
                if (data.status === "active") updatedContractStatus = data.status;
                if (data.status === "occupied") updatedFlatStatus = data.status;
                if (data.flatId) linkedRenterFlatId = data.flatId;
                const p = Promise.resolve([]) as any;
                p.returning = async () => {
                  if (data.status === "active") {
                    return [
                      {
                        id: contractId,
                        status: "active",
                        remainingDepositBalance: "56000.00",
                      },
                    ];
                  }
                  return [];
                };
                return p;
              },
            }),
          }),
          insert: () => ({
            values: async () => {
              auditLogRecorded = true;
              return [];
            },
          }),
        };
        return await callback(txMock);
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: managerUserId, email: "manager@example.com", name: "Manager" },
        session: { id: "sess-1", activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-activate-contract",
    });

    const result = await caller.renter.activateContract({
      contractId,
      initialDepositReceived: true,
    });

    expect(result.status).toBe("active");
    expect(updatedContractStatus).toBe("active");
    expect(updatedFlatStatus).toBe("occupied");
    expect(linkedRenterFlatId).toBe(flatId);
    expect(auditLogRecorded).toBe(true);
  });

  it("submitting notice period transitions status to notice_period", async () => {
    let recordedAudit = false;
    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({
            id: "mem-1",
            role: "manager",
            organizationId: orgId,
            userId: managerUserId,
          }),
        },
        rentalContracts: {
          findFirst: async () => ({
            id: contractId,
            organizationId: orgId,
            flatId,
            renterId,
            status: "active",
          }),
        },
      },
      update: () => ({
        set: (data: any) => ({
          where: () => ({
            returning: async () => [
              {
                id: contractId,
                status: data.status,
                terminationDate: data.terminationDate,
                terminationReason: data.terminationReason,
              },
            ],
          }),
        }),
      }),
      insert: () => ({
        values: async () => {
          recordedAudit = true;
          return [];
        },
      }),
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: managerUserId, email: "manager@example.com", name: "Manager" },
        session: { id: "sess-1", activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-notice-period",
    });

    const result = await caller.renter.submitNoticePeriod({
      contractId,
      expectedDepartureDate: "2026-11-30",
      reason: "Relocating for job",
    });

    expect(result.status).toBe("notice_period");
    expect(result.terminationDate).toBe("2026-11-30");
    expect(recordedAudit).toBe(true);
  });

  it("terminating a contract sets flat status back to vacant and preserves audit logs", async () => {
    let nextFlatStatus = "";
    let finalContractStatus = "";
    let unlinkedRenter = false;
    let terminationAuditRecorded = false;

    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({
            id: "mem-1",
            role: "manager",
            organizationId: orgId,
            userId: managerUserId,
          }),
        },
        rentalContracts: {
          findFirst: async () => ({
            id: contractId,
            organizationId: orgId,
            flatId,
            renterId,
            status: "notice_period",
            remainingDepositBalance: "56000.00",
          }),
        },
      },
      transaction: async (callback: any) => {
        const txMock = {
          update: () => ({
            set: (data: any) => ({
              where: () => {
                if (data.status === "terminated") finalContractStatus = data.status;
                if (data.status === "vacant" || data.status === "under_maintenance")
                  nextFlatStatus = data.status;
                if (data.flatId === null) unlinkedRenter = true;
                const p = Promise.resolve([]) as any;
                p.returning = async () => {
                  if (data.status === "terminated") {
                    return [
                      {
                        id: contractId,
                        status: "terminated",
                        remainingDepositBalance: data.remainingDepositBalance,
                      },
                    ];
                  }
                  return [];
                };
                return p;
              },
            }),
          }),
          insert: () => ({
            values: async () => {
              terminationAuditRecorded = true;
              return [];
            },
          }),
        };
        return await callback(txMock);
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: managerUserId, email: "manager@example.com", name: "Manager" },
        session: { id: "sess-1", activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-terminate-contract",
    });

    const result = await caller.renter.terminateContract({
      contractId,
      terminationDate: "2026-11-30",
      terminationReason: "Handover complete",
      deductions: 4000,
      refundAmount: 52000,
      nextFlatStatus: "vacant",
      inspectionNotes: "Repainted walls; all good",
    });

    expect(result.status).toBe("terminated");
    expect(finalContractStatus).toBe("terminated");
    expect(nextFlatStatus).toBe("vacant");
    expect(unlinkedRenter).toBe(true);
    expect(terminationAuditRecorded).toBe(true);
  });

  it("enforces role restrictions blocking non-management members from creating renters", async () => {
    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({
            id: "mem-guest",
            role: "member", // regular member without manager/admin/owner permissions
            organizationId: orgId,
            userId: "user-read-only",
          }),
        },
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: "user-read-only", email: "guest@example.com", name: "Guest" },
        session: { id: "sess-2", activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-unauthorized-renter",
    });

    try {
      await caller.renter.createRenter({
        fullName: "Unauthorized Attempt",
        phone: "01712345678",
        nidNumber: "19922612345678901",
        occupation: "Guest",
        bloodGroup: "O+",
        totalFamilyMembers: 1,
        emergencyContactName: "Relative",
        emergencyContactNumber: "01812345678",
        emergencyContactRelationship: "Relative",
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("FORBIDDEN");
    }
  });

  it("retrieves current user renter profile scoped strictly to session.user.id", async () => {
    const mockDb = {
      query: {
        renters: {
          findFirst: async () => {
            return {
              id: "renter-farhana-1",
              userId: "user-tenant-1",
              fullName: "Farhana Yasmin",
              phone: "01711223344",
              nidNumber: "19902612345678901",
              bloodGroup: "B+",
            };
          },
        },
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: "user-tenant-1", email: "tenant@example.com", name: "Farhana" },
        session: { id: "sess-tenant" },
      } as any,
      organizationId: null,
      requestId: "req-my-profile",
    });

    const profile = await caller.renter.getMyProfile();
    expect(profile.id).toBe("renter-farhana-1");
    expect(profile.fullName).toBe("Farhana Yasmin");
  });

  it("restricts getMyContractById and throws FORBIDDEN when user does not own the lease", async () => {
    const contractUuid = "11111111-2222-3333-4444-555555555555";
    const mockDb = {
      query: {
        rentalContracts: {
          findFirst: async () => ({
            id: contractUuid,
            renterId: "renter-other",
            renter: {
              id: "renter-other",
              userId: "different-user-999", // Different user!
            },
            flat: {
              id: "flat-202",
              building: { name: "Lakeview" },
            },
          }),
        },
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: "user-tenant-1", email: "tenant@example.com", name: "Farhana" },
        session: { id: "sess-tenant" },
      } as any,
      organizationId: null,
      requestId: "req-unauthorized-contract-view",
    });

    try {
      await caller.renter.getMyContractById({ contractId: contractUuid });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("FORBIDDEN");
    }
  });

  it("generates presigned upload URL for S3/SeaweedFS storage", async () => {
    const caller = appRouter.createCaller({
      db: {} as any,
      session: {
        user: { id: "user-tenant-1", email: "tenant@example.com", name: "Farhana" },
        session: { id: "sess-tenant" },
      } as any,
      organizationId: null,
      requestId: "req-upload-url",
    });

    const result = await caller.renter.createPresignedUploadUrl({
      fileName: "nid_front.jpg",
      fileType: "image/jpeg",
      folder: "nid",
    });

    expect(result.uploadUrl).toBeDefined();
    expect(result.publicUrl).toBeDefined();
    expect(result.key).toContain("nid/");
    expect(result.key).toContain("nid_front.jpg");
  });
});
