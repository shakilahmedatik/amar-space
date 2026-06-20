import { withAuth } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { OwnerApprovalService } from "@/lib/services/owner-approval";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { updateApprovalStatusSchema } from "@repo/shared/validation";
import { NextResponse } from "next/server";

const ownerApprovalService = new OwnerApprovalService(db, auditLogger);

export const PUT = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const body = await req.json();
			const { newStatus } = updateApprovalStatusSchema.parse(body);

			await ownerApprovalService.updateApprovalStatus(
				ctx.user.id,
				id,
				newStatus,
			);

			return NextResponse.json({
				message: `Owner approval status updated to ${newStatus}`,
			});
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["superadmin"], requireApproval: false },
);
