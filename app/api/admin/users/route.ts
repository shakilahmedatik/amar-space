import { withAuth } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { AdminUserService } from "@/lib/services/admin-user";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { NextResponse } from "next/server";

const adminUserService = new AdminUserService(db, auditLogger);

export const GET = withAuth(
	async (req, _ctx) => {
		const url = new URL(req.url);
		const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
		const pageSize = Number.parseInt(
			url.searchParams.get("pageSize") || "50",
			10,
		);
		const role = url.searchParams.get("role") || undefined;

		try {
			const result = await adminUserService.listUsers({ page, pageSize, role });
			return NextResponse.json(result);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["superadmin"], requireApproval: false },
);
