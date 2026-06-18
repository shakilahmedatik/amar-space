import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { RenterRegistrationService } from "@/lib/services/renter-registration";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { r2Client } from "@/lib/shared/r2";
import { NextResponse } from "next/server";

const renterService = new RenterRegistrationService(db, auditLogger, r2Client);

export const POST = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			const result = await renterService.resetAccessCode(requestContext, id);

			return NextResponse.json({
				success: true,
				message: "নতুন অ্যাক্সেস কোড তৈরি করা হয়েছে।",
				code: result.code,
			});
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
