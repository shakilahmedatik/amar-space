import { withAuth } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { AdminUserService } from "@/lib/services/admin-user";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { NextResponse } from "next/server";

const adminUserService = new AdminUserService(db, auditLogger);

export const PUT = withAuth(
	async (_req, ctx, params) => {
		const { id } = await params;

		try {
			await adminUserService.deactivateUser(ctx.user.id, id);

			return NextResponse.json({
				message: "User account has been deactivated",
			});
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["superadmin"], requireApproval: false },
);
