import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { NoticeTemplateRepository } from "@/lib/repositories/notice-template.repository";
import { NoticeTemplateService } from "@/lib/services/notice-template.service";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { createNoticeTemplateSchema } from "@repo/shared/validation";
import { NextResponse } from "next/server";

const repo = new NoticeTemplateRepository(db);
const templateService = new NoticeTemplateService(auditLogger, repo);

export const GET = withAuth(
	async (req, ctx) => {
		try {
			const requestContext = buildRequestContext(req, ctx);
			const result = await templateService.listTemplates(requestContext);

			return NextResponse.json(result);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);

export const POST = withAuth(
	async (req, ctx) => {
		try {
			const requestContext = buildRequestContext(req, ctx);
			const body = await req.json();
			const input = createNoticeTemplateSchema.parse(body);

			const result = await templateService.createTemplate(
				requestContext,
				input,
			);

			return NextResponse.json(result, { status: 201 });
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
