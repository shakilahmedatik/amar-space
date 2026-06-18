import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { MaintenanceService } from "@/lib/services/maintenance.service";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { r2Client } from "@/lib/shared/r2";
import { updateMaintenanceStatusSchema } from "@repo/shared/validation";
import { NextResponse } from "next/server";

const maintenanceService = new MaintenanceService(db, auditLogger, r2Client);

export const PUT = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			const body = await req.json();
			const { status } = updateMaintenanceStatusSchema.parse(body);

			const result = await maintenanceService.updateRequestStatus(
				requestContext,
				id,
				status,
			);

			return NextResponse.json(result);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{
		roles: ["owner", "manager", "security_guard", "care_taker"],
		requireApproval: true,
	},
);
