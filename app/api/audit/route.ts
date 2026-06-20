import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { AuditLogQueryService } from "@/lib/services/audit-log-query.service";
import { NextResponse } from "next/server";

const auditLogQueryService = new AuditLogQueryService(db);

export const GET = withAuth(
	async (req, ctx) => {
		const url = new URL(req.url);
		const entityType = url.searchParams.get("entityType") || undefined;
		const entityId = url.searchParams.get("entityId") || undefined;
		const actorUserId = url.searchParams.get("actorUserId") || undefined;
		const actionName = url.searchParams.get("actionName") || undefined;
		const startDate = url.searchParams.get("startDate") || undefined;
		const endDate = url.searchParams.get("endDate") || undefined;
		const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
		const pageSize = Number.parseInt(
			url.searchParams.get("pageSize") || "20",
			10,
		);

		try {
			const requestContext = buildRequestContext(req, ctx);
			const result = await auditLogQueryService.queryLogs(
				requestContext,
				{
					entityType,
					entityId,
					actorUserId,
					actionName,
					startDate,
					endDate,
				},
				{ page, pageSize },
			);

			return NextResponse.json(result);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"] },
);
