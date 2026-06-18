import type { PortalRenterData } from "@/lib/api/portal";
import { withAuth } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import {
	bills,
	flatSlugs,
	payments,
	rentalContracts,
	renters,
} from "@/lib/db/schema";
import { handleApiError } from "@/lib/error-handler";
import { isValidFlatSlug } from "@repo/shared/portal";
import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

const formatR2Url = (key: string | null | undefined) => {
	if (!key) return null;
	if (key.startsWith("http://") || key.startsWith("https://")) return key;
	const r2BaseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "") || "";
	return `${r2BaseUrl}/${key}`;
};

export const GET = withAuth(
	async (req, ctx, params) => {
		const { slug } = await params;

		try {
			if (!isValidFlatSlug(slug)) {
				return NextResponse.json(
					{ error: "INVALID_SLUG", message: "অবৈধ QR কোড" },
					{ status: 400 },
				);
			}

			// Find renter based on auth user
			const renterRecord = await db.query.renters.findFirst({
				where: eq(renters.userId, ctx.user.id),
			});

			if (!renterRecord) {
				return NextResponse.json(
					{ error: "RENTER_NOT_FOUND", message: "ভাড়াটিয়া পাওয়া যায়নি" },
					{ status: 404 },
				);
			}

			// Find flat and active contract
			const flatSlugRecord = await db.query.flatSlugs.findFirst({
				where: eq(flatSlugs.slug, slug),
				with: { flat: { with: { building: true } } },
			});

			if (
				!flatSlugRecord ||
				!flatSlugRecord.flat ||
				!flatSlugRecord.flat.building
			) {
				return NextResponse.json(
					{ error: "FLAT_NOT_FOUND", message: "ফ্ল্যাটটি পাওয়া যায়নি" },
					{ status: 404 },
				);
			}

			const flatRecord = flatSlugRecord.flat;

			const activeContract = await db.query.rentalContracts.findFirst({
				where: and(
					eq(rentalContracts.flatId, flatRecord.id),
					eq(rentalContracts.renterId, renterRecord.id),
					eq(rentalContracts.status, "active"),
				),
			});

			// Fetch latest bills
			let recentBills: any[] = [];
			let recentPayments: any[] = [];

			if (activeContract) {
				recentBills = await db.query.bills.findMany({
					where: eq(bills.contractId, activeContract.id),
					orderBy: [desc(bills.createdAt)],
					limit: 12,
				});

				const billIds = recentBills.map((b) => b.id);
				if (billIds.length > 0) {
					recentPayments = await db.query.payments.findMany({
						where: inArray(payments.billId, billIds),
						orderBy: [desc(payments.paymentDate)],
						limit: 12,
					});
				}
			}

			const responseData: PortalRenterData = {
				renter: {
					id: renterRecord.id,
					fullName: renterRecord.fullName,
					phone: renterRecord.phone,
					nidNumber: renterRecord.nidNumber ?? "",
					nidPhotoUrl: formatR2Url(renterRecord.nidPhotoUrl),
					dateOfBirth: renterRecord.dateOfBirth
						? new Date(renterRecord.dateOfBirth).toISOString()
						: null,
					occupation: renterRecord.occupation ?? "",
					bloodGroup: renterRecord.bloodGroup ?? "",
					totalFamilyMembers: renterRecord.totalFamilyMembers ?? 1,
					familyMemberNames: Array.isArray(renterRecord.familyMemberNames)
						? (renterRecord.familyMemberNames as string[])
						: null,
					emergencyContactName: renterRecord.emergencyContactName ?? "",
					emergencyContactNumber: renterRecord.emergencyContactNumber ?? "",
					emergencyContactRelationship:
						renterRecord.emergencyContactRelationship ?? "",
					digitalSignatureUrl: formatR2Url(renterRecord.digitalSignatureUrl),
					selfiePhotoUrl: formatR2Url(renterRecord.selfiePhotoUrl),
				},
				contract: activeContract
					? {
							id: activeContract.id,
							monthlyRent: Number(activeContract.monthlyRent),
							startDate: new Date(activeContract.startDate).toISOString(),
							depositBalance: Number(activeContract.remainingDepositBalance),
							gasBill: activeContract.gasBill
								? Number(activeContract.gasBill)
								: null,
							waterBill: activeContract.waterBill
								? Number(activeContract.waterBill)
								: null,
							serviceCharge: activeContract.serviceCharge
								? Number(activeContract.serviceCharge)
								: null,
							otherCharges: activeContract.otherCharges
								? Number(activeContract.otherCharges)
								: null,
						}
					: null,
				bills: recentBills.map((b) => ({
					id: b.id,
					billingMonth: b.billingMonth,
					totalAmount: Number(b.totalAmount),
					paidAmount: Number(b.paidAmount),
					status: b.status,
					createdAt: new Date(b.createdAt).toISOString(),
				})),
				payments: recentPayments.map((p) => ({
					id: p.id,
					amount: Number(p.amount),
					paymentDate: new Date(p.paymentDate).toISOString(),
					paymentMethod: p.paymentMethod,
					receiptReference: p.receiptReference,
					note: p.note,
					createdAt: new Date(p.createdAt).toISOString(),
				})),
				flat: {
					buildingId: flatRecord.building.id,
					flatNumber: flatRecord.flatNumber,
					floor: flatRecord.floor,
					buildingName: flatRecord.building.name,
					buildingAddress: flatRecord.building.address,
				},
			};

			return NextResponse.json(responseData);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["renter"] },
);
