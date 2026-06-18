import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { BillingService } from "@/lib/services/billing";
import { auditLogger } from "@/lib/services/audit-logger.service";
import type { billStatusEnum } from "@repo/shared/validation";
import { NextResponse } from "next/server";
import type { z } from "zod";

const billingService = new BillingService(db, auditLogger);

export const GET = withAuth(
	async (req, ctx) => {
		const url = new URL(req.url);
		const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
		const pageSize = Number.parseInt(
			url.searchParams.get("pageSize") || "20",
			10,
		);
		const buildingId = url.searchParams.get("buildingId") || undefined;
		const flatId = url.searchParams.get("flatId") || undefined;
		const renterId = url.searchParams.get("renterId") || undefined;
		const contractId = url.searchParams.get("contractId") || undefined;
		const billingMonth = url.searchParams.get("billingMonth") || undefined;
		const statusParam = url.searchParams.getAll("status");

		let status:
			| z.infer<typeof billStatusEnum>
			| z.infer<typeof billStatusEnum>[]
			| undefined = undefined;
		if (statusParam.length > 0) {
			status = (statusParam.length === 1 ? statusParam[0] : statusParam) as
				| z.infer<typeof billStatusEnum>
				| z.infer<typeof billStatusEnum>[];
		}

		const requestContext = buildRequestContext(req, ctx);
		const result = await billingService.listBills(
			requestContext,
			{ buildingId, flatId, renterId, contractId, billingMonth, status },
			{ page, pageSize },
		);

		return NextResponse.json({
			data: result.data.map((bill) => ({
				id: bill.id,
				ownerAccountId: bill.ownerAccountId,
				contractId: bill.contractId,
				flatId: bill.flatId,
				renterId: bill.renterId,
				billingMonth: bill.billingMonth,
				dueDate: bill.dueDate,
				baseRent: Number.parseFloat(bill.baseRent as string),
				rentDays: bill.rentDays,
				totalDaysInMonth: bill.totalDaysInMonth,
				monthlyRent: Number.parseFloat(bill.monthlyRent as string),
				totalAmount: Number.parseFloat(bill.totalAmount as string),
				paidAmount: Number.parseFloat(bill.paidAmount as string),
				status: bill.status,
				flatNumber: bill.flatNumber,
				buildingName: bill.buildingName,
				renterName: bill.renterName,
				createdAt: bill.createdAt,
			})),
			total: result.total,
			page: result.page,
			pageSize: result.pageSize,
		});
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
