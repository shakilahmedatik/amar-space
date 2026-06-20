import { randomInt } from "node:crypto";
import { db } from "@/lib/db";
import { registrationRequests } from "@/lib/db/schema";
import { handleApiError } from "@/lib/error-handler";
import { r2Client } from "@/lib/shared/r2";
import { hashAccessCode } from "@/lib/utils/access-code-hash";
import { flatSlugs } from "@repo/db";
import { isValidFlatSlug, validateRegistrationForm } from "@repo/shared/portal";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

function parseBase64Image(dataUrl: string) {
	const [meta, base64Data] = dataUrl.includes(",")
		? dataUrl.split(",")
		: ["", dataUrl];
	const buffer = Buffer.from(base64Data || dataUrl, "base64");
	let mimeType = "image/jpeg";
	if (meta) {
		const match = meta.match(/data:(.*?);/);
		if (match?.[1]) {
			mimeType = match[1];
		}
	}
	return { buffer, mimeType };
}

export const POST = async (
	req: Request,
	context: { params: Promise<{ slug: string }> },
) => {
	const { slug } = await context.params;

	try {
		if (!isValidFlatSlug(slug)) {
			return NextResponse.json(
				{ error: "INVALID_SLUG", message: "অবৈধ QR কোড" },
				{ status: 400 },
			);
		}

		const flatSlugRecord = await db.query.flatSlugs.findFirst({
			where: eq(flatSlugs.slug, slug),
			with: { flat: true },
		});

		if (!flatSlugRecord?.flat) {
			return NextResponse.json(
				{ error: "FLAT_NOT_FOUND", message: "ফ্ল্যাটটি পাওয়া যায়নি" },
				{ status: 404 },
			);
		}

		const { flat } = flatSlugRecord;

		if (flat.status !== "vacant") {
			return NextResponse.json(
				{ error: "NOT_VACANT", message: "এই ফ্ল্যাটটি বর্তমানে ফাঁকা নেই" },
				{ status: 400 },
			);
		}

		const body = await req.json();

		const validation = validateRegistrationForm(body);
		if (!validation.success || !validation.data) {
			return NextResponse.json(
				{
					error: "VALIDATION_ERROR",
					message: "তথ্য সঠিক নয়",
					details: validation.errors,
				},
				{ status: 400 },
			);
		}

		const data = validation.data;

		// Check for existing pending request for this phone and flat
		const existing = await db.query.registrationRequests.findFirst({
			where: and(
				eq(registrationRequests.flatId, flat.id),
				eq(registrationRequests.phone, data.phone),
				eq(registrationRequests.status, "PENDING_APPROVAL"),
			),
		});

		if (existing) {
			return NextResponse.json(
				{
					error: "DUPLICATE",
					message: "এই ফোন নম্বর দিয়ে ইতিমধ্যে একটি অনুরোধ পাঠানো হয়েছে",
				},
				{ status: 400 },
			);
		}

		// Process uploads
		const entityId = flat.id;
		const ownerId = flat.ownerAccountId;

		const nidPhotoParsed = parseBase64Image(data.nidPhoto);
		const selfiePhotoParsed = parseBase64Image(data.selfiePhoto);
		const digitalSignatureParsed = parseBase64Image(data.digitalSignature);

		const [nidPhotoUrl, selfiePhotoUrl, digitalSignatureUrl] =
			await Promise.all([
				r2Client.upload(
					ownerId,
					"registration",
					entityId,
					"nid.jpg",
					nidPhotoParsed.buffer,
					nidPhotoParsed.mimeType,
				),
				r2Client.upload(
					ownerId,
					"registration",
					entityId,
					"selfie.jpg",
					selfiePhotoParsed.buffer,
					selfiePhotoParsed.mimeType,
				),
				r2Client.upload(
					ownerId,
					"registration",
					entityId,
					"signature.png",
					digitalSignatureParsed.buffer,
					digitalSignatureParsed.mimeType,
				),
			]);

		const accessCode = randomInt(100000, 1000000).toString();
		const accessCodeHash = hashAccessCode(accessCode);

		await db.insert(registrationRequests).values({
			flatId: flat.id,
			ownerAccountId: flat.ownerAccountId,
			fullName: data.fullName,
			phone: data.phone,
			nidNumber: data.nidNumber,
			nidPhotoUrl,
			bloodGroup: data.bloodGroup,
			occupation: data.occupation,
			familyMembers: data.familyMembers,
			familyMemberNames: data.familyMemberNames,
			emergencyContactName: data.emergencyContactName,
			emergencyContact: data.emergencyContact,
			emergencyContactRelationship: data.emergencyContactRelationship,
			rentalStartDate: data.rentalStartDate,
			advanceAmount: data.advanceAmount.toString(),
			selfiePhotoUrl,
			digitalSignatureUrl,
			status: "PENDING_APPROVAL",
			accessCode,
			accessCodeHash,
		});

		return NextResponse.json({ success: true, accessCode });
	} catch (e) {
		return handleApiError(e);
	}
};
