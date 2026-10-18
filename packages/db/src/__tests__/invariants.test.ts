import { describe, expect, it } from "bun:test";
import { DomainInvariantError, ensureOrganizationHasOwner } from "../invariants";

describe("Domain 01: Invariant Checks", () => {
  it("allows removing a non-owner member without error", async () => {
    // Mock db returning a member with 'manager' role
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ role: "manager" }],
          }),
        }),
      }),
    } as any;

    expect(ensureOrganizationHasOwner(mockDb, "org-1", "user-manager")).resolves.toBeUndefined();
  });

  it("throws CANNOT_REMOVE_LAST_OWNER when attempting to remove or demote the sole owner", async () => {
    // Mock db returning target role 'owner' and total owner count of 1
    const mockDb = {
      select: (fields: any) => ({
        from: () => ({
          where: () => {
            // If selecting role
            if ("role" in fields) {
              return {
                limit: async () => [{ role: "owner" }],
              };
            }
            // If selecting count
            return Promise.resolve([{ count: 1 }]);
          },
        }),
      }),
    } as any;

    try {
      await ensureOrganizationHasOwner(mockDb, "org-1", "user-sole-owner");
      expect(true).toBe(false); // Should not reach here
    } catch (err) {
      expect(err).toBeInstanceOf(DomainInvariantError);
      expect((err as DomainInvariantError).code).toBe("CANNOT_REMOVE_LAST_OWNER");
    }
  });

  it("allows removing an owner when multiple owners exist", async () => {
    const mockDb = {
      select: (fields: any) => ({
        from: () => {
          if ("role" in fields) {
            return {
              where: () => ({
                limit: async () => [{ role: "owner" }],
              }),
            };
          }
          return {
            where: () => Promise.resolve([{ count: 2 }]),
          };
        },
      }),
    } as any;

    expect(ensureOrganizationHasOwner(mockDb, "org-1", "user-owner-1")).resolves.toBeUndefined();
  });
});
