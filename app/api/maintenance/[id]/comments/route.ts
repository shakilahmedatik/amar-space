import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { MaintenanceService } from "@/lib/services/maintenance.service";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { r2Client } from "@/lib/shared/r2";
import { addMaintenanceCommentSchema } from "@repo/shared/validation";
import { NextResponse } from "next/server";

const maintenanceService = new MaintenanceService(db, auditLogger, r2Client);

export const POST = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			const body = await req.json();
			const { content } = addMaintenanceCommentSchema.parse(body);

			const result = await maintenanceService.addComment(requestContext, id, {
				content,
			});

			return NextResponse.json(
				{
					id: result.id,
					content: result.content,
					userId: result.authorId,
					maintenanceRequestId: result.requestId,
					createdAt: result.createdAt,
				},
				{ status: 201 },
			);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{
		roles: ["owner", "manager", "security_guard", "care_taker"],
		requireApproval: true,
	},
);
