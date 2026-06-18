import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { DepositService } from "@/lib/services/deposit";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { applyAdjustmentSchema } from "@repo/shared/validation";
import { NextResponse } from "next/server";

const depositService = new DepositService(db, auditLogger);

export const POST = withAuth(
	async (req, ctx, params) => {
		const { contractId } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			const body = await req.json();
			const input = applyAdjustmentSchema.parse(body);

			const adjustment = await depositService.applyAdjustment(
				requestContext,
				contractId,
				input,
			);

			return NextResponse.json(
				{
					id: adjustment.id,
					contractId: adjustment.contractId,
					amount: Number.parseFloat(adjustment.amount as string),
					billId: adjustment.billId,
					note: adjustment.note,
					createdAt: adjustment.createdAt,
				},
				{ status: 201 },
			);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner"], requireApproval: true },
);
