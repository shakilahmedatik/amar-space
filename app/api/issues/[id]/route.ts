import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { IssueService } from "@/lib/services/issue.service";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { r2Client } from "@/lib/shared/r2";
import { NextResponse } from "next/server";

const issueService = new IssueService(db, auditLogger, r2Client);

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
			const result = await issueService.getIssue(requestContext, id);

			result.attachments = result.attachments.map((a) => ({
				...a,
				fileUrl: formatR2Url(a.fileUrl) as string,
			}));

			return NextResponse.json(result);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{
		roles: ["owner", "manager", "security_guard", "care_taker"],
		requireApproval: true,
	},
);

export const DELETE = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			await issueService.deleteIssue(requestContext, id);

			return new NextResponse(null, { status: 204 });
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner"], requireApproval: true },
);
