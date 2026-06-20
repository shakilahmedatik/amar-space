import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { BillingService } from "@/lib/services/billing";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { NextResponse } from "next/server";

const billingService = new BillingService(db, auditLogger);

export const GET = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			const bill = await billingService.getBill(requestContext, id);
			const totalAmount = Number.parseFloat(bill.totalAmount as string);
			const paidAmount = Number.parseFloat(bill.paidAmount as string);

			return NextResponse.json({
				id: bill.id,
				contractId: bill.contractId,
				billingMonth: bill.billingMonth,
				dueDate: bill.dueDate,
				baseRent: Number.parseFloat(bill.baseRent as string),
				rentDays: bill.rentDays,
				totalDaysInMonth: bill.totalDaysInMonth,
				monthlyRent: Number.parseFloat(bill.monthlyRent as string),
				totalAmount,
				paidAmount,
				remainingBalance: totalAmount - paidAmount,
				status: bill.status,
				flatId: bill.flatId,
				flatNumber: bill.flatNumber,
				buildingName: bill.buildingName,
				renterId: bill.renterId,
				renterName: bill.renterName,
				ownerAccountId: bill.ownerAccountId,
				createdAt: bill.createdAt,
				updatedAt: bill.updatedAt,
				lineItems: bill.lineItems.map((item) => ({
					id: item.id,
					description: item.description,
					amount: Number.parseFloat(item.amount as string),
					createdAt: item.createdAt,
				})),
				payments: bill.payments.map((payment) => ({
					id: payment.id,
					amount: Number.parseFloat(payment.amount as string),
					paidAt: new Date(payment.paymentDate),
					method: payment.paymentMethod,
					receiptReference: payment.receiptReference,
					note: payment.note,
				})),
			});
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager", "renter"], requireApproval: true },
);

export const DELETE = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			await billingService.deleteBill(requestContext, id);

			return NextResponse.json({
				success: true,
				message:
					"\u09AC\u09BF\u09B2\u099F\u09BF \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09A1\u09BF\u09B2\u09BF\u099F \u0995\u09B0\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964",
			});
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
