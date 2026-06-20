import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { NoticeTemplateRepository } from "@/lib/repositories/notice-template.repository";
import { NoticeTemplateService } from "@/lib/services/notice-template.service";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { updateNoticeTemplateSchema } from "@repo/shared/validation";
import { NextResponse } from "next/server";

const repo = new NoticeTemplateRepository(db);
const templateService = new NoticeTemplateService(auditLogger, repo);

export const GET = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			const result = await templateService.getTemplate(requestContext, id);

			return NextResponse.json(result);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);

export const PUT = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			const body = await req.json();
			const input = updateNoticeTemplateSchema.parse(body);

			const result = await templateService.updateTemplate(
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
			await templateService.deleteTemplate(requestContext, id);

			return new NextResponse(null, { status: 204 });
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
