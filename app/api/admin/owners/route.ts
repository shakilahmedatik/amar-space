import { withAuth } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { OwnerApprovalService } from "@/lib/services/owner-approval";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { NextResponse } from "next/server";

const ownerApprovalService = new OwnerApprovalService(db, auditLogger);

export const GET = withAuth(
	async (req, _ctx) => {
		const url = new URL(req.url);
		const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
		const pageSize = Number.parseInt(
			url.searchParams.get("pageSize") || "20",
			10,
		);
		const statusParam = url.searchParams.get("status");

		let status: "pending" | "approved" | "rejected" | undefined = undefined;
		if (
			statusParam === "pending" ||
			statusParam === "approved" ||
			statusParam === "rejected"
		) {
			status = statusParam;
		}

		try {
			const result = await ownerApprovalService.listOwners({
				page,
				pageSize,
				status,
			});
			return NextResponse.json(result);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["superadmin"], requireApproval: false },
);
