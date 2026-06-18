import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { TerminationService } from "@/lib/services/termination.service";
import { NextResponse } from "next/server";

const terminationService = new TerminationService(db, auditLogger);

export const DELETE = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);

			const result = await terminationService.cancelTermination(
				requestContext,
				id,
			);

			return NextResponse.json(result);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
