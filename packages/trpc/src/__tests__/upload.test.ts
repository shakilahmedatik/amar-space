import { describe, expect, it, spyOn } from "bun:test";
import * as storage from "@omniheaven/storage";
import { renterRouter } from "../routers/renter";
import { uploadRouter } from "../routers/upload";

spyOn(storage, "deleteFile").mockImplementation(async () => {});

describe("Upload & Storage Tenant Isolation Procedures", () => {
  const orgId = "org-storage-test";
  const otherOrgId = "org-other-test";
  const userId = "user-manager-storage";

  const createMockDb = (role = "manager") =>
    ({
      query: {
        organizations: {
          findFirst: async () => ({
            id: orgId,
            status: "active",
          }),
        },
        members: {
          findFirst: async () => ({
            id: "mem-storage-1",
            role,
            organizationId: orgId,
            userId,
          }),
        },
      },
    }) as any;

  it("prefixes fileKey with organizationId in getPresignedUrl when ctx.organizationId is provided", async () => {
    const caller = uploadRouter.createCaller({
      db: createMockDb(),
      session: {
        user: { id: userId, email: "manager@example.com", name: "Storage Manager" },
        session: { id: "sess-1", activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-presigned-org",
    });

    const result = await caller.getPresignedUrl({
      fileName: "lease_agreement.pdf",
      fileType: "application/pdf",
      folder: "contracts",
    });

    expect(result.uploadUrl).toBeDefined();
    expect(result.publicUrl).toBeDefined();
    expect(result.fileKey.startsWith(`${orgId}/contracts/`)).toBe(true);
    expect(result.fileKey).toContain("lease_agreement.pdf");
  });

  it("omits organization prefix in getPresignedUrl when ctx.organizationId is null/omitted", async () => {
    const caller = uploadRouter.createCaller({
      db: {} as any,
      session: {
        user: { id: userId, email: "user@example.com", name: "User" },
        session: { id: "sess-tenantless" },
      } as any,
      organizationId: null,
      requestId: "req-presigned-tenantless",
    });

    const result = await caller.getPresignedUrl({
      fileName: "logo.png",
      fileType: "image/png",
      folder: "logos",
    });

    expect(result.uploadUrl).toBeDefined();
    expect(result.fileKey.startsWith("logos/")).toBe(true);
    expect(result.fileKey).toContain("logo.png");
  });

  it("allows getReadUrl for files belonging to the caller's active organization", async () => {
    const caller = uploadRouter.createCaller({
      db: createMockDb(),
      session: {
        user: { id: userId, email: "manager@example.com", name: "Storage Manager" },
        session: { id: "sess-1", activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-read-own",
    });

    const result = await caller.getReadUrl({
      fileKey: `${orgId}/contracts/12345-agreement.pdf`,
    });

    expect(result.readUrl).toBeDefined();
  });

  it("allows getReadUrl for legacy or tenantless files without an organization prefix", async () => {
    const caller = uploadRouter.createCaller({
      db: createMockDb(),
      session: {
        user: { id: userId, email: "manager@example.com", name: "Storage Manager" },
        session: { id: "sess-1", activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-read-tenantless",
    });

    const result = await caller.getReadUrl({
      fileKey: "contracts/12345-agreement.pdf",
    });

    expect(result.readUrl).toBeDefined();
  });

  it("throws FORBIDDEN in getReadUrl when accessing files belonging to another organization", async () => {
    const caller = uploadRouter.createCaller({
      db: createMockDb(),
      session: {
        user: { id: userId, email: "manager@example.com", name: "Storage Manager" },
        session: { id: "sess-1", activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-read-cross-tenant",
    });

    try {
      await caller.getReadUrl({
        fileKey: `${otherOrgId}/contracts/99999-confidential.pdf`,
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("FORBIDDEN");
      expect(err.message).toContain("other tenants");
    }
  });

  it("allows deleteFile when fileKey belongs to caller's active organization", async () => {
    const caller = uploadRouter.createCaller({
      db: createMockDb("owner"),
      session: {
        user: { id: userId, email: "owner@example.com", name: "Owner" },
        session: { id: "sess-1", activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-delete-own",
    });

    const result = await caller.deleteFile({
      fileKey: `${orgId}/contracts/12345-agreement.pdf`,
    });

    expect(result.success).toBe(true);
  });

  it("throws FORBIDDEN in deleteFile when fileKey does not belong to caller's active organization", async () => {
    const caller = uploadRouter.createCaller({
      db: createMockDb("owner"),
      session: {
        user: { id: userId, email: "owner@example.com", name: "Owner" },
        session: { id: "sess-1", activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-delete-cross-tenant",
    });

    try {
      await caller.deleteFile({
        fileKey: `${otherOrgId}/contracts/99999-other.pdf`,
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("FORBIDDEN");
      expect(err.message).toContain("other tenants");
    }
  });

  it("throws FORBIDDEN in deleteFile when fileKey has no organization prefix while ctx.organizationId is set", async () => {
    const caller = uploadRouter.createCaller({
      db: createMockDb("admin"),
      session: {
        user: { id: userId, email: "admin@example.com", name: "Admin" },
        session: { id: "sess-1", activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-delete-no-prefix",
    });

    try {
      await caller.deleteFile({
        fileKey: "contracts/root-shared.pdf",
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("FORBIDDEN");
      expect(err.message).toContain("other tenants");
    }
  });

  it("renter.createPresignedUploadUrl passes organizationId to storage", async () => {
    const caller = renterRouter.createCaller({
      db: {} as any,
      session: {
        user: { id: userId, email: "renter@example.com", name: "Renter" },
        session: { id: "sess-renter-org", activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-renter-org-upload",
    });

    const result = await caller.createPresignedUploadUrl({
      fileName: "tenant_nid.png",
      fileType: "image/png",
      folder: "nid",
    });

    expect(result.key.startsWith(`${orgId}/nid/`)).toBe(true);
  });
});
