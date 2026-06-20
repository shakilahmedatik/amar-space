import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { StaffService } from "@/lib/services/staff";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { NextResponse } from "next/server";

const staffService = new StaffService(db, auditLogger);

export const GET = withAuth(
	async (req, ctx) => {
		const requestContext = buildRequestContext(req, ctx);
		const roles = await staffService.listRoles(requestContext);
		return NextResponse.json(roles);
	},
	{ roles: ["owner"], requireApproval: true },
);
