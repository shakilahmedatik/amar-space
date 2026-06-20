import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { TerminationService } from "@/lib/services/termination.service";
import { NextResponse } from "next/server";

const terminationService = new TerminationService(db, auditLogger);

export const POST = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			const body = await req.json();

			const result = await terminationService.scheduleTermination(
				requestContext,
				id,
				body,
			);

			return NextResponse.json(result);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
