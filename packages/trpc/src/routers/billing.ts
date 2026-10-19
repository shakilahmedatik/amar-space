import {
  applyAdvanceAdjustmentSchema,
  billStatusEnum,
  generateMonthlyBillsSchema,
  payBillSchema,
  recordPaymentSchema,
  updateBillUtilitiesSchema,
} from "@omniheaven/validators";
import { z } from "zod";
import * as billingService from "../services/billing.service";
import {
  orgProtectedProcedure,
  protectedProcedure,
  publicProcedure,
  requireRole,
  router,
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

  // 12. Flat Portal: Pay Bill by Access Link / QR Code (Public / Flat-scoped)
  payPortalBill: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/public/portal/bills/pay",
        tags: ["Public Portal"],
        summary: "Pay bill via direct QR / public link",
      },
    })
    .input(payBillSchema)
    .mutation(async ({ ctx, input }) => {
      return billingService.payPortalBill(ctx.db, input);
    }),

  // 13. Flat Portal: Get complete billing, lease, and building metadata by flat slug or identifier
  getPortalFlatBilling: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/public/portal/flats/{flatSlug}/billing",
        tags: ["Public Portal"],
        summary: "Get public flat billing and building metadata",
      },
    })
    .input(z.object({ flatSlug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return billingService.getPortalFlatBilling(ctx.db, input.flatSlug);
    }),
});
