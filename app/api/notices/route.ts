import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { NoticeService } from "@/lib/services/notice.service";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { createNoticeSchema } from "@repo/shared/validation";
import { NextResponse } from "next/server";

const noticeService = new NoticeService(db, auditLogger);

export const GET = withAuth(
	async (req, ctx) => {
		const url = new URL(req.url);
		const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
		const pageSize = Number.parseInt(
			url.searchParams.get("pageSize") || "20",
			10,
		);
		const targetParam = url.searchParams.get("targetAudience");
		const targetAudience =
			targetParam === "all_renters" ||
			targetParam === "specific_building" ||
			targetParam === "specific_flat" ||
			targetParam === "managers_only"
				? targetParam
				: undefined;
		const isPinnedParam = url.searchParams.get("isPinned");
		const statusParam = url.searchParams.get("status");

		let isPinned: boolean | undefined = undefined;
		if (isPinnedParam === "true") isPinned = true;
		else if (isPinnedParam === "false") isPinned = false;

		let status: "active" | "archived" | "all" | undefined = undefined;
		if (
			statusParam === "active" ||
			statusParam === "archived" ||
			statusParam === "all"
		) {
			status = statusParam;
		}

		const requestContext = buildRequestContext(req, ctx);
		const result = await noticeService.listNotices(requestContext, {
			targetAudience,
			isPinned,
			status,
			page,
			pageSize,
		});

		return NextResponse.json(result);
	},
	{ roles: ["owner", "manager", "renter"], requireApproval: true },
);

export const POST = withAuth(
	async (req, ctx) => {
		try {
			const requestContext = buildRequestContext(req, ctx);
			const body = await req.json();
			const input = createNoticeSchema.parse(body);

			const result = await noticeService.createNotice(requestContext, input);

			return NextResponse.json(result, { status: 201 });
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
