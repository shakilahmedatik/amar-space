import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { PaymentService } from "@/lib/services/payment";
import { auditLogger } from "@/lib/services/audit-logger.service";
import {
	paymentMethodEnum,
	recordPaymentSchema,
} from "@repo/shared/validation";
import { NextResponse } from "next/server";
import type z from "zod";

const paymentService = new PaymentService(db, auditLogger);

export const GET = withAuth(
	async (req, ctx) => {
		const url = new URL(req.url);
		const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
		const pageSize = Number.parseInt(
			url.searchParams.get("pageSize") || "20",
			10,
		);
		const billId = url.searchParams.get("billId") || undefined;
		const renterId = url.searchParams.get("renterId") || undefined;
		const startDate = url.searchParams.get("startDate") || undefined;
		const endDate = url.searchParams.get("endDate") || undefined;
		const paymentMethodParam = url.searchParams.get("paymentMethod");

		let paymentMethod: z.infer<typeof paymentMethodEnum> | undefined;
		if (paymentMethodParam) {
			const parsed = paymentMethodEnum.safeParse(paymentMethodParam);
			if (parsed.success) {
				paymentMethod = parsed.data;
			}
		}

		const requestContext = buildRequestContext(req, ctx);
		const result = await paymentService.listPayments(
			requestContext,
			{ billId, renterId, startDate, endDate, paymentMethod },
			{ page, pageSize },
		);

		return NextResponse.json({
			data: result.data.map((p) => ({
				id: p.id,
				billId: p.billId,
				receiptReference: p.receiptReference,
				amount: Number.parseFloat(p.amount as string),
				paymentDate: p.paymentDate,
				paymentMethod: p.paymentMethod,
				note: p.note,
				ownerAccountId: p.ownerAccountId,
				createdAt: p.createdAt,
				renterName: p.renterName,
				flatNumber: p.flatNumber,
				buildingName: p.buildingName,
				billingMonth: p.billingMonth,
			})),
			total: result.total,
			page: result.page,
			pageSize: result.pageSize,
		});
	},
	{ roles: ["owner", "manager", "renter"], requireApproval: true },
);

export const POST = withAuth(
	async (req, ctx) => {
		try {
			const requestContext = buildRequestContext(req, ctx);
			const body = await req.json();
			const input = recordPaymentSchema.parse(body);

			const payment = await paymentService.recordPayment(requestContext, input);

			return NextResponse.json(
				{
					id: payment.id,
					billId: payment.billId,
					receiptReference: payment.receiptReference,
					amount: Number.parseFloat(payment.amount as string),
					paymentDate: payment.paymentDate,
					paymentMethod: payment.paymentMethod,
					note: payment.note,
					ownerAccountId: payment.ownerAccountId,
					createdAt: payment.createdAt,
				},
				{ status: 201 },
			);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
