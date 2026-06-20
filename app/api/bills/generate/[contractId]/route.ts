import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { BillingService } from "@/lib/services/billing";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { generateBillForContractSchema } from "@repo/shared/validation";
import { NextResponse } from "next/server";

const billingService = new BillingService(db, auditLogger);

export const POST = withAuth(
	async (req, ctx, params) => {
		const { contractId } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			const body = await req.json();
			const { billingMonth } = generateBillForContractSchema.parse(body);

			const bill = await billingService.generateBillForContract(
				requestContext,
				contractId,
				billingMonth,
			);

			return NextResponse.json(
				{
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
				},
				{ status: 201 },
			);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
