import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import {
	type RenterFileUpload,
	RenterRegistrationService,
} from "@/lib/services/renter-registration";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { r2Client } from "@/lib/shared/r2";
import { NextResponse } from "next/server";

const renterService = new RenterRegistrationService(db, auditLogger, r2Client);

export const GET = withAuth(
	async (req, ctx) => {
		const url = new URL(req.url);
		const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
		const pageSize = Number.parseInt(
			url.searchParams.get("pageSize") || "20",
			10,
		);

		const requestContext = buildRequestContext(req, ctx);
		const result = await renterService.listRenters(requestContext, {
			page,
			pageSize,
		});

		return NextResponse.json(result);
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);

export const POST = withAuth(
	async (req, ctx) => {
		try {
			const requestContext = buildRequestContext(req, ctx);
			const formData = await req.formData();

			let nidPhoto: RenterFileUpload | undefined;
			let digitalSignature: RenterFileUpload | undefined;

			const nidPhotoFile = formData.get("nidPhoto") as File | null;
			if (nidPhotoFile) {
				nidPhoto = {
					filename: nidPhotoFile.name,
					buffer: Buffer.from(await nidPhotoFile.arrayBuffer()),
					mimeType: nidPhotoFile.type,
					fileSize: nidPhotoFile.size,
				};
			}

			const digitalSignatureFile = formData.get(
				"digitalSignature",
			) as File | null;
			if (digitalSignatureFile) {
				digitalSignature = {
					filename: digitalSignatureFile.name,
					buffer: Buffer.from(await digitalSignatureFile.arrayBuffer()),
					mimeType: digitalSignatureFile.type,
					fileSize: digitalSignatureFile.size,
				};
			}

			const data = {
				fullName: (formData.get("fullName") as string) || "",
				phone: (formData.get("phone") as string) || "",
				nidNumber: (formData.get("nidNumber") as string) || "",
				occupation: (formData.get("occupation") as string) || "",
				bloodGroup:
					(formData.get("bloodGroup") as
						| "A+"
						| "A-"
						| "B+"
						| "B-"
						| "AB+"
						| "AB-"
						| "O+"
						| "O-") || "A+",
				totalFamilyMembers: Number(formData.get("totalFamilyMembers") || 0),
				emergencyContactName:
					(formData.get("emergencyContactName") as string) || "",
				emergencyContactNumber:
					(formData.get("emergencyContactNumber") as string) || "",
				emergencyContactRelationship:
					(formData.get("emergencyContactRelationship") as string) || "",
				flatId: (formData.get("flatId") as string) || "",
				monthlyRent: Number(formData.get("monthlyRent") || 0),
				startDate: (formData.get("startDate") as string) || "",
				advanceAmount: Number(formData.get("advanceAmount") || 0),
				dateOfBirth: (formData.get("dateOfBirth") as string) || undefined,
				familyMemberNames: formData.get("familyMemberNames")
					? JSON.parse(formData.get("familyMemberNames") as string)
					: undefined,
				nidPhoto,
				digitalSignature,
			};

			const result = await renterService.registerRenter(requestContext, data);

			return NextResponse.json(
				{
					id: result.renter.id,
					fullName: result.renter.fullName,
					phone: result.renter.phone,
					nidNumber: result.renter.nidNumber,
					flatId: result.contract.flatId,
					ownerAccountId: result.renter.ownerAccountId,
					createdAt: result.renter.createdAt,
				},
				{ status: 201 },
			);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
