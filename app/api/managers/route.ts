import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { ManagerService } from "@/lib/services/manager";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { createManagerSchema } from "@repo/shared/validation";
import { NextResponse } from "next/server";

const managerService = new ManagerService(db, auditLogger); // TODO: inject actual audit logger

export const GET = withAuth(
	async (req, ctx) => {
		const url = new URL(req.url);
		const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
		const pageSize = Number.parseInt(
			url.searchParams.get("pageSize") || "20",
			10,
		);

		const requestContext = buildRequestContext(req, ctx);
		const result = await managerService.listManagers(requestContext, {
			page,
			pageSize,
		});

		return NextResponse.json(result);
	},
	{ roles: ["owner"], requireApproval: true },
);

export const POST = withAuth(
	async (req, ctx) => {
		try {
			const requestContext = buildRequestContext(req, ctx);
			const body = await req.json();
			const input = createManagerSchema.parse(body);

			const result = await managerService.createManager(requestContext, input);

			return NextResponse.json(result, { status: 201 });
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner"], requireApproval: true },
);
