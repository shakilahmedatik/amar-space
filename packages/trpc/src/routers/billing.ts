import { RATE_LIMIT_PRESETS } from "@omniheaven/rate-limit";
import {
  applyAdvanceAdjustmentSchema,
  billStatusEnum,
  generateMonthlyBillsSchema,
  payBillSchema,
  portalAuthSchema,
  recordPaymentSchema,
  updateBillUtilitiesSchema,
  verifyPaymentSchema,
} from "@omniheaven/validators";
import { z } from "zod";
import * as billingService from "../services/billing.service";
import { authenticatePortal } from "../services/portal-auth.service";
import {
  orgProtectedProcedure,
  portalProcedure,
  protectedProcedure,
  publicProcedure,
  publicRateLimitKey,
  requireRole,
  router,
  trpcRateLimit,
} from "../trpc";

export const billingRouter = router({
  // 1. List Bills with Filters & Financial Metrics
  listBills: orgProtectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/billing/bills",
        tags: ["Billing"],
        summary: "List invoices with financial metrics",
      },
    })
    .input(
      z
        .object({
          billingMonth: z.string().optional(),
          status: billStatusEnum.optional(),
          flatId: z.string().optional(),
          buildingId: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return billingService.listBills(ctx.db, ctx.organizationId, input);
    }),

  // 2. Get Single Bill by ID
  getBillById: orgProtectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/billing/bills/{billId}",
        tags: ["Billing"],
        summary: "Get single invoice with payment and adjustment history",
      },
    })
    .input(z.object({ billId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return billingService.getBillById(ctx.db, ctx.organizationId, input.billId);
    }),

  // 3. Batch Generate Monthly Invoices (Idempotent per contract per month)
  generateMonthlyBills: requireRole(["owner", "admin", "manager"])
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/billing/bills/generate",
        tags: ["Billing"],
        summary: "Batch generate monthly bills for a building",
      },
    })
    .input(generateMonthlyBillsSchema)
    .mutation(async ({ ctx, input }) => {
      return billingService.generateMonthlyBills(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email },
        input,
      );
    }),

  // 4. Update Bill Utilities & Recalculate Balance
  updateBillUtilities: requireRole(["owner", "admin", "manager"])
    .meta({
      openapi: {
        method: "PATCH",
        path: "/v1/billing/bills/{billId}/utilities",
        tags: ["Billing"],
        summary: "Update meter utilities and recalculate bill balance",
      },
    })
    .input(updateBillUtilitiesSchema)
    .mutation(async ({ ctx, input }) => {
      return billingService.updateBillUtilities(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email },
        input,
      );
    }),

  // 5. Apply Advance Security Deposit Adjustment (Atomic Drawdown Ledger)
  applyAdvanceAdjustment: requireRole(["owner", "admin", "manager"])
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/billing/advance-adjustments",
        tags: ["Billing"],
        summary: "Apply advance deposit adjustment to unpaid bill",
      },
    })
    .input(applyAdvanceAdjustmentSchema)
    .mutation(async ({ ctx, input }) => {
      return billingService.applyAdvanceAdjustment(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email },
        input,
      );
    }),

  // 6. List Advance Adjustments for a Tenancy Contract
  listAdvanceAdjustments: orgProtectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/billing/advance-adjustments/{contractId}",
        tags: ["Billing"],
        summary: "List deposit adjustment history for a contract",
      },
    })
    .input(z.object({ contractId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return billingService.listAdvanceAdjustments(ctx.db, ctx.organizationId, input.contractId);
    }),

  // 7. Record Payment & Issue Immutable Receipt
  recordPayment: requireRole(["owner", "admin", "manager"])
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/billing/payments",
        tags: ["Billing"],
        summary: "Record payment and issue immutable receipt",
      },
    })
    .input(recordPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      return billingService.recordPayment(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email },
        input,
      );
    }),

  // 8. Get Receipt by Payment ID
  getReceiptById: orgProtectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/billing/receipts/{paymentId}",
        tags: ["Billing"],
        summary: "Get payment receipt details",
      },
    })
    .input(z.object({ paymentId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return billingService.getReceiptById(ctx.db, ctx.organizationId, input.paymentId);
    }),

  // 9. Renter Portal: Get Current User's Bills (Scoped strictly to session.user.id)
  getMyBills: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/portal/bills",
        tags: ["Tenant Portal"],
        summary: "Get current tenant's bills",
      },
    })
    .query(async ({ ctx }) => {
      return billingService.getMyBills(ctx.db, ctx.user.id);
    }),

  // 10. Renter Portal: Get Single Bill by ID with Tenant Ownership Verification
  getMyBillById: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/portal/bills/{billId}",
        tags: ["Tenant Portal"],
        summary: "Get tenant bill details",
      },
    })
    .input(z.object({ billId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return billingService.getMyBillById(ctx.db, ctx.user.id, input.billId);
    }),

  // 11. Renter Portal: Pay My Bill (Authenticated Tenant self-service)
  payMyBill: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/portal/bills/pay",
        tags: ["Tenant Portal"],
        summary: "Pay tenant bill directly",
      },
    })
    .input(payBillSchema)
    .mutation(async ({ ctx, input }) => {
      return billingService.payMyBill(ctx.db, { id: ctx.user.id, email: ctx.user.email }, input);
    }),

  // 12. Flat Portal: Exchange flat identifier + access code for a scoped token
  portalAuthenticate: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/public/portal/authenticate",
        tags: ["Public Portal"],
        summary: "Exchange flat identifier and access code for a scoped portal token",
      },
    })
    .use(
      trpcRateLimit({
        config: RATE_LIMIT_PRESETS.AUTH_SENSITIVE,
        keyGenerator: (ctx) => publicRateLimitKey(ctx, "portal-auth"),
      }),
    )
    .input(portalAuthSchema)
    .mutation(async ({ ctx, input }) => {
      return authenticatePortal(ctx.db, input.flatSlug, input.accessCode);
    }),

  // 13. Flat Portal: Pay Bill by Access Link / QR Code (Flat-scoped)
  payPortalBill: portalProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/public/portal/bills/pay",
        tags: ["Public Portal"],
        summary: "Submit a bill payment claim for staff verification",
      },
    })
    .use(
      trpcRateLimit({
        config: RATE_LIMIT_PRESETS.MUTATIONS_STANDARD,
        keyGenerator: (ctx) => publicRateLimitKey(ctx, "portal-pay"),
      }),
    )
    .input(payBillSchema)
    .mutation(async ({ ctx, input }) => {
      return billingService.payPortalBill(ctx.db, ctx.portal, input);
    }),

  // 14. Flat Portal: Get billing, lease and building metadata for the scoped flat
  getPortalFlatBilling: portalProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/public/portal/billing",
        tags: ["Public Portal"],
        summary: "Get billing, lease and building metadata for the authenticated portal flat",
      },
    })
    .use(
      trpcRateLimit({
        config: RATE_LIMIT_PRESETS.PUBLIC_READ,
        keyGenerator: (ctx) => publicRateLimitKey(ctx, "portal-billing"),
      }),
    )
    .query(async ({ ctx }) => {
      return billingService.getPortalFlatBilling(ctx.db, ctx.portal);
    }),

  // 15. Staff: Approve or reject a pending self-service payment claim
  verifyPayment: requireRole(["owner", "admin", "manager"])
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/billing/payments/{paymentId}/verify",
        tags: ["Billing"],
        summary: "Approve or reject a pending payment before it affects the bill",
      },
    })
    .input(verifyPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      return billingService.verifyPayment(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email },
        input,
      );
    }),
});
