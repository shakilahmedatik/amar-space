import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { rentalContracts } from "@/lib/db/schema";
import { handleApiError } from "@/lib/error-handler";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { DepositService } from "@/lib/services/deposit";
import { NotFoundError } from "@repo/shared/errors";
import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

const depositService = new DepositService(db, auditLogger);

export const POST = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			const body = await req.json();
			const { refundAmount, note } = body;

			const contract = await db.query.rentalContracts.findFirst({
				where: and(
					eq(rentalContracts.renterId, id),
					eq(rentalContracts.ownerAccountId, requestContext.ownerAccountId),
					inArray(rentalContracts.status, [
						"terminated",
						"pending_termination",
					]),
				),
				orderBy: [desc(rentalContracts.createdAt)],
			});

			if (!contract) {
				throw new NotFoundError("Contract");
			}

			const result = await depositService.processDepositRefund(
				requestContext,
				contract.id,
				refundAmount,
				note,
			);

			return NextResponse.json(result);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner"], requireApproval: true },
);
