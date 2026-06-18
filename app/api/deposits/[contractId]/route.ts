import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { DepositService } from "@/lib/services/deposit";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { NextResponse } from "next/server";

const depositService = new DepositService(db, auditLogger);

export const GET = withAuth(
	async (req, ctx, params) => {
		const { contractId } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			const deposit = await depositService.getDeposit(
				requestContext,
				contractId,
			);

			return NextResponse.json({
				contractId: deposit.contractId,
				initialAmount: Number.parseFloat(
					deposit.securityDepositAmount as string,
				),
				remainingBalance: Number.parseFloat(
					deposit.remainingDepositBalance as string,
				),
				totalAdjusted:
					Number.parseFloat(deposit.securityDepositAmount as string) -
					Number.parseFloat(deposit.remainingDepositBalance as string),
			});
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager", "renter"], requireApproval: true },
);
