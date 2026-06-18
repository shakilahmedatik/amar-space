import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { BillingService } from "@/lib/services/billing";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { generateBillsSchema } from "@repo/shared/validation";
import { NextResponse } from "next/server";

const billingService = new BillingService(db, auditLogger);

export const POST = withAuth(
	async (req, ctx) => {
		try {
			const requestContext = buildRequestContext(req, ctx);
			const body = await req.json();
			const { billingMonth } = generateBillsSchema.parse(body);

			const result = await billingService.generateBills(
				requestContext,
				billingMonth,
			);

			return NextResponse.json(
				{
					generated: result.generated,
					skipped: result.skipped.length,
					billingMonth,
				},
				{ status: 201 },
			);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
