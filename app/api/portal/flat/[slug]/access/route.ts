import { db } from "@/lib/db";
import {
	flatSlugs,
	portalSessions,
	rentalContracts,
	renterAccessCodes,
} from "@/lib/db/schema";
import { handleApiError } from "@/lib/error-handler";
import { compareAccessCode } from "@/lib/utils/access-code-hash";
import { isValidFlatSlug } from "@repo/shared/portal";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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

		const body = await req.json();
		const code = body.code;

		if (!code || typeof code !== "string" || code.length !== 6) {
			return NextResponse.json(
				{
					error: "INVALID_CODE_FORMAT",
					message: "অ্যাক্সেস কোড ৬ সংখ্যার হতে হবে",
				},
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

		// Find active contract for this flat
		const activeContract = await db.query.rentalContracts.findFirst({
			where: and(
				eq(rentalContracts.flatId, flat.id),
				eq(rentalContracts.status, "active"),
			),
		});

		if (!activeContract) {
			return NextResponse.json(
				{ error: "INVALID_CODE", message: "অবৈধ অ্যাক্সেস কোড" },
				{ status: 401 },
			);
		}

		// Find access code for the active renter
		const accessCodeRecord = await db.query.renterAccessCodes.findFirst({
			where: and(
				eq(renterAccessCodes.renterId, activeContract.renterId),
				eq(renterAccessCodes.flatId, flat.id),
			),
		});

		if (!accessCodeRecord) {
			return NextResponse.json(
				{ error: "INVALID_CODE", message: "অবৈধ অ্যাক্সেস কোড" },
				{ status: 401 },
			);
		}

		// Check if locked
		const now = new Date();
		if (accessCodeRecord.lockedUntil && now < accessCodeRecord.lockedUntil) {
			return NextResponse.json(
				{
					error: "LOCKED",
					message: "অনেক বার ভুল কোড দেওয়া হয়েছে। অনুগ্রহ করে পরে আবার চেষ্টা করুন।",
					lockedUntil: accessCodeRecord.lockedUntil.toISOString(),
				},
				{ status: 429 },
			);
		}

		const isMatch = await compareAccessCode(code, accessCodeRecord.codeHash);

		if (!isMatch) {
			const newFailedAttempts = accessCodeRecord.failedAttempts + 1;
			let lockedUntil = null;

			if (newFailedAttempts >= 5) {
				// Lock for 15 minutes
				lockedUntil = new Date(now.getTime() + 15 * 60 * 1000);
			}

			await db
				.update(renterAccessCodes)
				.set({
					failedAttempts: newFailedAttempts,
					lockedUntil,
				})
				.where(eq(renterAccessCodes.id, accessCodeRecord.id));

			if (lockedUntil) {
				return NextResponse.json(
					{
						error: "LOCKED",
						message: "অনেক বার ভুল কোড দেওয়া হয়েছে। অনুগ্রহ করে পরে আবার চেষ্টা করুন।",
						lockedUntil: lockedUntil.toISOString(),
					},
					{ status: 429 },
				);
			}

			return NextResponse.json(
				{ error: "INVALID_CODE", message: "অবৈধ অ্যাক্সেস কোড" },
				{ status: 401 },
			);
		}

		// Success! Reset failed attempts
		await db
			.update(renterAccessCodes)
			.set({
				failedAttempts: 0,
				lockedUntil: null,
			})
			.where(eq(renterAccessCodes.id, accessCodeRecord.id));

		// Create portal session
		const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
		const [session] = await db
			.insert(portalSessions)
			.values({
				flatId: flat.id,
				renterId: activeContract.renterId,
				expiresAt,
			})
			.returning();

		const cookieStore = await cookies();
		cookieStore.set("portal_session", session.id, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			expires: expiresAt,
			path: "/",
		});

		return NextResponse.json({
			success: true,
			message: "লগইন সফল হয়েছে",
		});
	} catch (e) {
		return handleApiError(e);
	}
};
