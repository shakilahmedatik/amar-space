import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { NoticeService } from "@/lib/services/notice.service";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { updateNoticeSchema } from "@repo/shared/validation";
import { NextResponse } from "next/server";

const noticeService = new NoticeService(db, auditLogger);

export const GET = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			const result = await noticeService.getNotice(requestContext, id);

			return NextResponse.json(result);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager", "renter"], requireApproval: true },
);

export const PUT = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			const body = await req.json();
			const input = updateNoticeSchema.parse(body);

			const result = await noticeService.updateNotice(
				requestContext,
				id,
				input,
			);

			return NextResponse.json(result);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);

export const DELETE = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			await noticeService.deleteNotice(requestContext, id);

			return new NextResponse(null, { status: 204 });
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
