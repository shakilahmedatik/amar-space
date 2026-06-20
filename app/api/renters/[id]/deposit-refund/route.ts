import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { rentalContracts } from "@/lib/db/schema";
import { handleApiError } from "@/lib/error-handler";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { TerminationService } from "@/lib/services/termination.service";
import { NotFoundError } from "@repo/shared/errors";
import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

const terminationService = new TerminationService(db, auditLogger);

export const GET = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);

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

			const result = await terminationService.getDepositRefund(
				requestContext,
				contract.id,
			);

			return NextResponse.json(result);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
