import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { RenterRegistrationService } from "@/lib/services/renter-registration";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { r2Client } from "@/lib/shared/r2";
import { NextResponse } from "next/server";

const renterService = new RenterRegistrationService(db, auditLogger, r2Client);

const formatR2Url = (key: string | null | undefined) => {
	if (!key) return null;
	if (key.startsWith("http://") || key.startsWith("https://")) return key;
	const r2BaseUrl = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/$/, "");
	return `${r2BaseUrl}/${key}`;
};

export const GET = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			const renter = await renterService.getRenter(requestContext, id);

			return NextResponse.json({
				...renter,
				nidPhotoUrl: formatR2Url(renter.nidPhotoUrl),
				digitalSignatureUrl: formatR2Url(renter.digitalSignatureUrl),
				selfiePhotoUrl: formatR2Url(renter.selfiePhotoUrl),
			});
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
