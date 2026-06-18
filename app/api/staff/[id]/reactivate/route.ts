import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { StaffService } from "@/lib/services/staff";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { NextResponse } from "next/server";

const staffService = new StaffService(db, auditLogger);

export const PUT = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			await staffService.reactivateStaff(requestContext, id);

			return new NextResponse(null, { status: 204 });
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner"], requireApproval: true },
);
