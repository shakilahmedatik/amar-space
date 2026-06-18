import { db } from "@/lib/db";
import { registrationRequests } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function validateRegistrationRequestAccess(
	id: string,
	ownerAccountId: string,
	role: string,
	assignedBuildingIds?: string[],
	actionName = "অনুমোদন",
) {
	const registrationReq = await db.query.registrationRequests.findFirst({
		where: and(
			eq(registrationRequests.id, id),
			eq(registrationRequests.ownerAccountId, ownerAccountId),
			eq(registrationRequests.status, "PENDING_APPROVAL"),
		),
		with: { flat: true },
	});

	if (!registrationReq) {
		return {
			error: NextResponse.json(
				{
					error: "Not Found",
					message: "আবেদনটি খুঁজে পাওয়া যায়নি অথবা ইতিমধ্যে এটি প্রসেস করা হয়েছে।",
				},
				{ status: 404 },
			),
		};
	}

	if (role === "manager" && assignedBuildingIds) {
		if (
			!registrationReq.flat ||
			!assignedBuildingIds.includes(registrationReq.flat.buildingId)
		) {
			return {
				error: NextResponse.json(
					{
						error: "Forbidden",
						message: `এই ফ্ল্যাটের আবেদন ${actionName} করার অনুমতি আপনার নেই।`,
					},
					{ status: 403 },
				),
			};
		}
	}

	return { registrationReq };
}
