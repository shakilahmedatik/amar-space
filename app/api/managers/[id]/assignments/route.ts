import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { ManagerService } from "@/lib/services/manager";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const managerService = new ManagerService(db, auditLogger);

export const PUT = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			const body = await req.json();
			const { buildingIds } = z
				.object({
					buildingIds: z.array(z.string().uuid()).min(1).max(20),
				})
				.parse(body);

			await managerService.updateAssignments(requestContext, id, buildingIds);

			return new NextResponse(null, { status: 204 });
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner"], requireApproval: true },
);
