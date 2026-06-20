import { withAuth } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { registrationRequests } from "@/lib/db/schema";
import { handleApiError } from "@/lib/error-handler";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { validateRegistrationRequestAccess } from "../helpers";

export const POST = withAuth(
	async (_req, ctx, params) => {
		const { id } = await params;

		try {
			const { ownerAccountId, assignedBuildingIds } = ctx.tenantScope;
			const { role } = ctx.user;

			const { registrationReq, error } =
				await validateRegistrationRequestAccess(
					id,
					ownerAccountId,
					role,
					assignedBuildingIds,
					"বাতিল",
				);

			if (error || !registrationReq) {
				return error;
			}

			await db
				.update(registrationRequests)
				.set({
					status: "REJECTED",
					updatedAt: new Date(),
				})
				.where(eq(registrationRequests.id, registrationReq.id));

			return NextResponse.json({
				success: true,
				message: "আবেদনটি বাতিল করা হয়েছে।",
			});
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
