import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { DepositService } from "@/lib/services/deposit";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { NextResponse } from "next/server";

const depositService = new DepositService(db, auditLogger);

export const GET = withAuth(
	async (req, ctx, params) => {
		const { contractId } = await params;

		try {
			const url = new URL(req.url);
			const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
			const pageSize = Number.parseInt(
				url.searchParams.get("pageSize") || "20",
				10,
			);

			const requestContext = buildRequestContext(req, ctx);
			const result = await depositService.listAdjustments(
				requestContext,
				contractId,
				{ page, pageSize },
			);

			return NextResponse.json({
				data: result.data.map((adj) => ({
					id: adj.id,
					contractId: adj.contractId,
					amount: Number.parseFloat(adj.amount as string),
					billId: adj.billId,
					note: adj.note,
					createdAt: adj.createdAt,
				})),
				total: result.total,
				page: result.page,
				pageSize: result.pageSize,
			});
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager", "renter"], requireApproval: true },
);
