import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { BillingService } from "@/lib/services/billing";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { addUtilityChargeSchema } from "@repo/shared/validation";
import { NextResponse } from "next/server";

const billingService = new BillingService(db, auditLogger);

export const POST = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			const body = await req.json();
			const charge = addUtilityChargeSchema.parse(body);

			const lineItem = await billingService.addUtilityCharge(
				requestContext,
				id,
				charge,
			);

			return NextResponse.json(
				{
					id: lineItem.id,
					billId: lineItem.billId,
					description: lineItem.description,
					amount: Number.parseFloat(lineItem.amount as string),
					createdAt: lineItem.createdAt,
				},
				{ status: 201 },
			);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
