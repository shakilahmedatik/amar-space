import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { IssueService } from "@/lib/services/issue.service";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { r2Client } from "@/lib/shared/r2";
import { assignIssueSchema } from "@repo/shared/validation";
import { NextResponse } from "next/server";

const issueService = new IssueService(db, auditLogger, r2Client);

export const PUT = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			const body = await req.json();
			const { assigneeId } = assignIssueSchema.parse(body);

			const result = await issueService.assignIssue(requestContext, id, {
				assigneeId,
			});

			return NextResponse.json(result);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
