import { withAuth } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { AdminUserService } from "@/lib/services/admin-user";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { NextResponse } from "next/server";

const adminUserService = new AdminUserService(db, auditLogger);

export const GET = withAuth(
	async (_req, _ctx) => {
		try {
			const stats = await adminUserService.getDashboardStats();
			return NextResponse.json(stats);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["superadmin"], requireApproval: false },
);
