import { randomUUID } from "node:crypto";
import { withAuth } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import {
	flats,
	registrationRequests,
	rentalContracts,
	renterAccessCodes,
	renters,
	users,
} from "@/lib/db/schema";
import { handleApiError } from "@/lib/error-handler";
import { FLAT_STATUS } from "@repo/shared/constants";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { validateRegistrationRequestAccess } from "../helpers";

export const POST = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const { ownerAccountId, assignedBuildingIds } = ctx.tenantScope;
			const { role, id: _userId } = ctx.user;

			const body = await req.json();
			const parsedBody = z
				.object({
					monthlyRent: z.number().positive(),
					advanceAmount: z.number().nonnegative(),
					startDate: z.string(),
					gasBill: z.number().nonnegative().optional().default(0),
					waterBill: z.number().nonnegative().optional().default(0),
					serviceCharge: z.number().nonnegative().optional().default(0),
					otherCharges: z.number().nonnegative().optional().default(0),
				})
				.parse(body);

			const { registrationReq, error } =
				await validateRegistrationRequestAccess(
					id,
					ownerAccountId,
					role,
					assignedBuildingIds,
					"অনুমোদন",
				);

			if (error || !registrationReq) {
				return error;
			}

			await db.transaction(async (tx) => {
				const renterEmail = `renter_${registrationReq.phone}@amarspace.local`;
				const renterUserId = randomUUID();

				await tx.insert(users).values({
					id: renterUserId,
					email: renterEmail,
					name: registrationReq.fullName,
					role: "renter",
					ownerAccountId: ownerAccountId,
					phone: registrationReq.phone,
					createdAt: new Date(),
					updatedAt: new Date(),
				});

				const [renter] = await tx
					.insert(renters)
					.values({
						ownerAccountId: ownerAccountId,
						userId: renterUserId,
						fullName: registrationReq.fullName,
						phone: registrationReq.phone,
						nidNumber: registrationReq.nidNumber,
						nidPhotoUrl: registrationReq.nidPhotoUrl,
						occupation: registrationReq.occupation,
						bloodGroup: registrationReq.bloodGroup,
						totalFamilyMembers: registrationReq.familyMembers,
						familyMemberNames: registrationReq.familyMemberNames,
						emergencyContactName:
							registrationReq.emergencyContactName || "জরুরি যোগাযোগ",
						emergencyContactNumber: registrationReq.emergencyContact,
						emergencyContactRelationship:
							registrationReq.emergencyContactRelationship || "অন্যান্য",
						selfiePhotoUrl: registrationReq.selfiePhotoUrl,
						digitalSignatureUrl: registrationReq.digitalSignatureUrl,
						createdAt: new Date(),
						updatedAt: new Date(),
					})
					.returning();

				if (!renter) {
					throw new Error("Failed to create renter record.");
				}

				await tx.insert(rentalContracts).values({
					ownerAccountId: ownerAccountId,
					renterId: renter.id,
					flatId: registrationReq.flatId,
					monthlyRent: parsedBody.monthlyRent.toFixed(2),
					startDate: parsedBody.startDate,
					securityDepositAmount: parsedBody.advanceAmount.toFixed(2),
					remainingDepositBalance: parsedBody.advanceAmount.toFixed(2),
					gasBill: parsedBody.gasBill.toFixed(2),
					waterBill: parsedBody.waterBill.toFixed(2),
					serviceCharge: parsedBody.serviceCharge.toFixed(2),
					otherCharges: parsedBody.otherCharges.toFixed(2),
					status: "active",
					createdAt: new Date(),
					updatedAt: new Date(),
				});

				if (registrationReq.accessCodeHash) {
					await tx.insert(renterAccessCodes).values({
						flatId: registrationReq.flatId,
						renterId: renter.id,
						codeHash: registrationReq.accessCodeHash,
						failedAttempts: 0,
						createdAt: new Date(),
						updatedAt: new Date(),
					});
				}

				await tx
					.update(flats)
					.set({
						status: FLAT_STATUS.OCCUPIED,
						updatedAt: new Date(),
					})
					.where(eq(flats.id, registrationReq.flatId));

				await tx
					.update(registrationRequests)
					.set({
						status: "APPROVED",
						updatedAt: new Date(),
					})
					.where(eq(registrationRequests.id, registrationReq.id));

				// TODO: auditLogger.log
			});

			return NextResponse.json({
				success: true,
				message: "আবেদনটি সফলভাবে অনুমোদন করা হয়েছে।",
			});
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
