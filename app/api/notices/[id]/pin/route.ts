import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { NoticeService } from "@/lib/services/notice.service";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { NextResponse } from "next/server";

const noticeService = new NoticeService(db, auditLogger);

export const PUT = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			const result = await noticeService.togglePin(requestContext, id);

			return NextResponse.json(result);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
