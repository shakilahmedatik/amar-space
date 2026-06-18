import type { RequestContext } from "@repo/shared/types";
import type { NextRequest } from "next/server";
import type { AuthContext } from "./auth-guard";

export function buildRequestContext(
	req: NextRequest,
	ctx: AuthContext,
): RequestContext {
	const userAgentHeader = req.headers.get("user-agent");
	return {
		userId: ctx.user.id,
		role: ctx.user.role,
		ownerAccountId: ctx.tenantScope.ownerAccountId,
		assignedBuildingIds: ctx.tenantScope.assignedBuildingIds,
		assignedFlatId: ctx.tenantScope.assignedFlatId,
		ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
		userAgent: userAgentHeader || "",
	};
}
