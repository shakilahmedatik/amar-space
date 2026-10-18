import { describe, expect, it } from "bun:test";
import { appRouter } from "../routers/app";

describe("Domain 02: Property & Unit Hierarchy tRPC Procedures", () => {
  const orgId = "org-building-test";
  const managerUserId = "user-manager-1";
  const buildingId = "bld-test-01";

  it("rejects unauthenticated requests to listBuildings", async () => {
    const caller = appRouter.createCaller({
      db: {} as any,
      session: null,
      organizationId: null,
      requestId: "req-prop-unauth",
    });

    try {
      await caller.property.listBuildings();
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("UNAUTHORIZED");
    }
  });

  it("throws FLAT_DUPLICATE_NUMBER when creating a flat with existing flatNumber in same building", async () => {
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
        buildings: {
          findFirst: async () => ({
            id: buildingId,
            organizationId: orgId,
            name: "Test Building",
          }),
        },
        flats: {
          findFirst: async () => ({
            id: "flat-existing",
            buildingId,
            flatNumber: "4A",
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
      requestId: "req-dup-flat",
    });

    try {
      await caller.property.createFlat({
        buildingId,
        flatNumber: "4A",
        floor: 4,
        unitType: "residential",
        bedrooms: 3,
        bathrooms: 2,
        balconies: 1,
        defaultRentAmount: 30000,
        defaultServiceCharge: 5000,
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("CONFLICT");
      expect(err.message).toContain("FLAT_DUPLICATE_NUMBER");
    }
  });

  it("throws BUILDING_HAS_ACTIVE_UNITS when attempting to delete a building with occupied flats", async () => {
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
        buildings: {
          findFirst: async () => ({
            id: buildingId,
            organizationId: orgId,
            name: "Test Building",
            flats: [
              { id: "flat-1", status: "occupied" },
              { id: "flat-2", status: "vacant" },
            ],
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
      requestId: "req-del-building",
    });

    try {
      await caller.property.deleteBuilding({ id: buildingId });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("BAD_REQUEST");
      expect(err.message).toContain("BUILDING_HAS_ACTIVE_UNITS");
    }
  });

  it("bulk generates 20 flats within a single transaction in < 200ms", async () => {
    let transactionExecuted = false;
    const insertedRecords: any[] = [];

    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({
            id: "mem-1",
            role: "admin",
            organizationId: orgId,
            userId: managerUserId,
          }),
        },
      },
      transaction: async (callback: any) => {
        transactionExecuted = true;
        const txMock = {
          query: {
            buildings: {
              findFirst: async () => ({
                id: buildingId,
                organizationId: orgId,
                name: "Highrise Residency",
              }),
            },
            flats: {
              findMany: async () => [], // No duplicates
            },
          },
          insert: () => ({
            values: (val: any) => {
              if (Array.isArray(val)) {
                insertedRecords.push(...val);
              }
              return {
                returning: async () => val,
              };
            },
          }),
        };
        return await callback(txMock);
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: managerUserId, email: "admin@example.com", name: "Admin" },
        session: { id: "sess-1", activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-bulk-test",
    });

    const start = performance.now();
    const result = await caller.property.bulkCreateFlats({
      buildingId,
      floorStart: 1,
      floorEnd: 10,
      letters: ["A", "B"], // 10 floors * 2 flats = 20 flats
      unitType: "residential",
      bedrooms: 3,
      bathrooms: 2,
      defaultRentAmount: 35000,
      defaultServiceCharge: 5000,
    });
    const elapsedMs = performance.now() - start;

    expect(transactionExecuted).toBe(true);
    expect(result.count).toBe(20);
    expect(result.flats.length).toBe(20);
    expect(insertedRecords.length).toBe(20);
    expect(result.flats[0]?.flatNumber).toBe("1A");
    expect(result.flats[19]?.flatNumber).toBe("10B");
    expect(elapsedMs).toBeLessThan(200); // Meets < 200ms performance criterion
  });

  it("throws FLAT_OCCUPIED_STATUS_LOCKED when attempting to unlock occupied flat directly", async () => {
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
        flats: {
          findFirst: async () => ({
            id: "flat-occupied-1",
            status: "occupied",
            organizationId: orgId,
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
      requestId: "req-status-locked",
    });

    try {
      await caller.property.updateFlatStatus({
        flatId: "flat-occupied-1",
        status: "vacant",
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("BAD_REQUEST");
      expect(err.message).toContain("FLAT_OCCUPIED_STATUS_LOCKED");
    }
  });

  it("enforces role restrictions blocking read-only members from creating buildings", async () => {
    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({
            id: "mem-viewer",
            role: "member", // Read only!
            organizationId: orgId,
            userId: "user-viewer-1",
          }),
        },
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: "user-viewer-1", email: "viewer@example.com", name: "Viewer" },
        session: { id: "sess-1", activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-role-fail",
    });

    try {
      await caller.property.createBuilding({
        name: "Unauthorized Tower",
        address: "Nowhere",
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("FORBIDDEN");
      expect(err.message).toContain("requires one of the following roles");
    }
  });
});
