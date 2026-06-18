import { withAuth } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { flats, registrationRequests } from "@/lib/db/schema";
import { handleApiError } from "@/lib/error-handler";
import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

const formatR2Url = (key: string | null | undefined) => {
	if (!key) return null;
	if (key.startsWith("http://") || key.startsWith("https://")) return key;
	const r2BaseUrl = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/$/, "");
	return `${r2BaseUrl}/${key}`;
};

export const GET = withAuth(
	async (_req, ctx) => {
		try {
			const { ownerAccountId, assignedBuildingIds } = ctx.tenantScope;
			const { role } = ctx.user;

			const conditions = [
				eq(registrationRequests.ownerAccountId, ownerAccountId),
				eq(registrationRequests.status, "PENDING_APPROVAL"),
			];

			if (
				role === "manager" &&
				assignedBuildingIds &&
				assignedBuildingIds.length > 0
			) {
				const scopedFlats = await db
					.select({ id: flats.id })
					.from(flats)
					.where(inArray(flats.buildingId, assignedBuildingIds));
				const flatIds = scopedFlats.map((f) => f.id);
				if (flatIds.length === 0) {
					return NextResponse.json({ data: [] });
				}
				conditions.push(inArray(registrationRequests.flatId, flatIds));
			} else if (role === "manager") {
				return NextResponse.json({ data: [] });
			}

			const requests = await db.query.registrationRequests.findMany({
				where: and(...conditions),
				with: {
					flat: {
						with: { building: true },
					},
				},
				orderBy: desc(registrationRequests.createdAt),
			});

			const data = requests.map((req) => ({
				id: req.id,
				fullName: req.fullName,
				phone: req.phone,
				nidNumber: req.nidNumber,
				nidPhotoUrl: formatR2Url(req.nidPhotoUrl),
				bloodGroup: req.bloodGroup,
				occupation: req.occupation,
				familyMembers: req.familyMembers,
				familyMemberNames: req.familyMemberNames as string[] | null,
				emergencyContactName: req.emergencyContactName,
				emergencyContact: req.emergencyContact,
				emergencyContactRelationship: req.emergencyContactRelationship,
				selfiePhotoUrl: formatR2Url(req.selfiePhotoUrl),
				rentalStartDate: req.rentalStartDate,
				advanceAmount: req.advanceAmount,
				digitalSignatureUrl: formatR2Url(req.digitalSignatureUrl),
				flatId: req.flatId,
				flatNumber: req.flat?.flatNumber,
				buildingName: req.flat?.building?.name,
				createdAt: req.createdAt,
			}));

			return NextResponse.json({ data });
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
