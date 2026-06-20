import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { PaymentService } from "@/lib/services/payment";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { NextResponse } from "next/server";

const paymentService = new PaymentService(db, auditLogger);

export const GET = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			const payment = await paymentService.getPayment(requestContext, id);

			return NextResponse.json({
				id: payment.id,
				billId: payment.billId,
				receiptReference: payment.receiptReference,
				amount: Number.parseFloat(payment.amount as string),
				paymentDate: payment.paymentDate,
				paymentMethod: payment.paymentMethod,
				note: payment.note,
				ownerAccountId: payment.ownerAccountId,
				createdAt: payment.createdAt,
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
			await paymentService.deletePayment(requestContext, id);

			return NextResponse.json({
				success: true,
				message: "পেমেন্টটি সফলভাবে ডিলিট করা হয়েছে।",
			});
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
