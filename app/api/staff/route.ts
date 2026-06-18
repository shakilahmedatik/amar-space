import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { StaffService } from "@/lib/services/staff";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { createStaffSchema } from "@repo/shared/validation";
import { NextResponse } from "next/server";
import { z } from "zod";

const staffRoleEnum = z.enum(["manager", "security_guard", "care_taker"]);
const staffService = new StaffService(db, auditLogger);

export const GET = withAuth(
	async (req, ctx) => {
		const url = new URL(req.url);
		const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
		const pageSize = Number.parseInt(
			url.searchParams.get("pageSize") || "20",
			10,
		);
		const roleParam = url.searchParams.get("role");

		let role: string | undefined;
		if (roleParam) {
			const parsedRole = staffRoleEnum.safeParse(roleParam);
			if (parsedRole.success) {
				role = parsedRole.data;
			}
		}

		const requestContext = buildRequestContext(req, ctx);
		const result = await staffService.listStaff(
			requestContext,
			{ page, pageSize },
			role,
		);

		return NextResponse.json(result);
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);

export const POST = withAuth(
	async (req, ctx) => {
		try {
			const requestContext = buildRequestContext(req, ctx);
			const body = await req.json();
			const input = createStaffSchema.parse(body);

			const result = await staffService.createStaff(requestContext, input);

			return NextResponse.json(result, { status: 201 });
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner"], requireApproval: true },
);
