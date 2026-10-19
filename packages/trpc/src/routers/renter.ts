import { getPresignedUploadUrl } from "@omniheaven/storage";
import {
  contractStatusEnum,
  createContractSchema,
  createRenterSchema,
  submitNoticePeriodSchema,
  terminateContractSchema,
  updateRenterSchema,
} from "@omniheaven/validators";
import { z } from "zod";
import * as renterService from "../services/renter.service";
import { orgProtectedProcedure, protectedProcedure, requireRole, router } from "../trpc";

export const renterRouter = router({
  // 1. List Renters (KYC Directory) with search and pagination
  listRenters: orgProtectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/renters",
        tags: ["Renter"],
        summary: "List all renters with KYC details and pagination",
      },
    })
    .input(
      z
        .object({
          search: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return renterService.listRenters(ctx.db, ctx.organizationId, input);
    }),

  // 2. Get Renter by ID with contracts and flat history
  getRenterById: orgProtectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/renters/{renterId}",
        tags: ["Renter"],
        summary: "Get renter profile by ID with contract history",
      },
    })
    .input(z.object({ renterId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return renterService.getRenterById(ctx.db, ctx.organizationId, input.renterId);
    }),

  // 3. Create Renter (KYC Onboarding)
  createRenter: requireRole(["owner", "admin", "manager"])
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/renters",
        tags: ["Renter"],
        summary: "Create new renter KYC profile",
      },
    })
    .input(createRenterSchema)
    .mutation(async ({ ctx, input }) => {
      return renterService.createRenter(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email },
        input,
      );
    }),

  // 4. Update Renter Profile
  updateRenter: requireRole(["owner", "admin", "manager"])
    .meta({
      openapi: {
        method: "PATCH",
        path: "/v1/renters/{id}",
        tags: ["Renter"],
        summary: "Update renter profile and contact information",
      },
    })
    .input(updateRenterSchema)
    .mutation(async ({ ctx, input }) => {
      return renterService.updateRenter(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email },
        input,
      );
    }),

  // 5. List Tenancy Contracts
  listContracts: orgProtectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/renters/contracts",
        tags: ["Renter"],
        summary: "List tenancy contracts with status filter",
      },
    })
    .input(
      z
        .object({
          status: contractStatusEnum.optional(),
          flatId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return renterService.listContracts(ctx.db, ctx.organizationId, input);
    }),

  // 6. Get Contract by ID
  getContractById: orgProtectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/renters/contracts/{contractId}",
        tags: ["Renter"],
        summary: "Get contract details and associated bills",
      },
    })
    .input(z.object({ contractId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return renterService.getContractById(ctx.db, ctx.organizationId, input.contractId);
    }),

  // 7. Create Contract (Draft Agreement)
  createContract: requireRole(["owner", "admin", "manager"])
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/renters/contracts",
        tags: ["Renter"],
        summary: "Draft a new tenancy contract",
      },
    })
    .input(createContractSchema)
    .mutation(async ({ ctx, input }) => {
      return renterService.createContract(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email },
        input,
      );
    }),

  // 8. Activate Contract (Atomic transaction: set active, occupied, and link renter)
  activateContract: requireRole(["owner", "admin", "manager"])
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/renters/contracts/{contractId}/activate",
        tags: ["Renter"],
        summary: "Activate contract, lock flat, and bind renter",
      },
    })
    .input(
      z.object({
        contractId: z.string().min(1),
        initialDepositReceived: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return renterService.activateContract(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email },
        input,
      );
    }),

  // 9. Submit Notice Period
  submitNoticePeriod: requireRole(["owner", "admin", "manager"])
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/renters/contracts/{contractId}/notice",
        tags: ["Renter"],
        summary: "Submit departure notice period for tenancy",
      },
    })
    .input(submitNoticePeriodSchema)
    .mutation(async ({ ctx, input }) => {
      return renterService.submitNoticePeriod(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email },
        input,
      );
    }),

  // 10. Terminate Tenancy Contract (Checkout Handover & Flat Status sync)
  terminateContract: requireRole(["owner", "admin", "manager"])
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/renters/contracts/{contractId}/terminate",
        tags: ["Renter"],
        summary: "Terminate contract with deposit deduction and inspection",
      },
    })
    .input(terminateContractSchema)
    .mutation(async ({ ctx, input }) => {
      return renterService.terminateContract(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email },
        input,
      );
    }),

  // 11. Get Current User's Renter Profile (Renter Portal, scoped to session.user.id)
  getMyProfile: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/portal/profile",
        tags: ["Tenant Portal"],
        summary: "Get current user's renter profile",
      },
    })
    .query(async ({ ctx }) => {
      return renterService.getMyProfile(ctx.db, ctx.user.id);
    }),

  // 12. Get Current User's Active Tenancy Contract (Renter Portal, scoped to session.user.id)
  getMyActiveContract: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/portal/active-contract",
        tags: ["Tenant Portal"],
        summary: "Get current user's active lease contract",
      },
    })
    .query(async ({ ctx }) => {
      return renterService.getMyActiveContract(ctx.db, ctx.user.id);
    }),

  // 13. Get Single Tenancy Contract by ID with strict Tenant Ownership Verification
  getMyContractById: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/portal/contracts/{contractId}",
        tags: ["Tenant Portal"],
        summary: "Get tenant-owned contract details",
      },
    })
    .input(z.object({ contractId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return renterService.getMyContractById(ctx.db, ctx.user.id, input.contractId);
    }),

  // 14. Create Presigned Upload URL for KYC NID and Leases (SeaweedFS / S3 / R2)
  createPresignedUploadUrl: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/storage/presigned-url",
        tags: ["Storage"],
        summary: "Generate presigned upload URL for documents",
      },
    })
    .input(
      z.object({
        fileName: z.string().min(1),
        fileType: z.string().min(1),
        folder: z.enum(["nid", "signatures", "contracts", "receipts"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const res = await getPresignedUploadUrl(
        input.folder,
        input.fileName,
        input.fileType,
        600,
        ctx.organizationId ?? undefined,
      );
      return {
        uploadUrl: res.uploadUrl,
        publicUrl: res.publicUrl,
        key: res.fileKey,
      };
    }),
});
