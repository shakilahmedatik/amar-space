import { withAuth } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { flatSlugs, notices } from "@/lib/db/schema";
import { handleApiError } from "@/lib/error-handler";
import type { Notice } from "@/app/portal/[flatSlug]/_components/types";
import { isValidFlatSlug } from "@repo/shared/portal";
import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";

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

			// Find flat
			const flatSlugRecord = await db.query.flatSlugs.findFirst({
				where: eq(flatSlugs.slug, slug),
				with: { flat: true },
			});

			if (!flatSlugRecord || !flatSlugRecord.flat) {
				return NextResponse.json(
					{ error: "FLAT_NOT_FOUND", message: "ফ্ল্যাটটি পাওয়া যায়নি" },
					{ status: 404 },
				);
			}

			const flat = flatSlugRecord.flat;
			const now = new Date();

			// Query notices
			const validNotices = await db.query.notices.findMany({
				where: and(
					or(isNull(notices.expiresAt), gt(notices.expiresAt, now)),
					or(
						eq(notices.targetAudience, "all_renters"),
						and(
							eq(notices.targetAudience, "specific_building"),
							eq(notices.targetBuildingId, flat.buildingId),
						),
						and(
							eq(notices.targetAudience, "specific_flat"),
							eq(notices.targetFlatId, flat.id),
						),
					),
				),
				orderBy: [desc(notices.isPinned), desc(notices.createdAt)],
			});

			const formattedNotices: Notice[] = validNotices.map((n) => ({
				id: n.id,
				title: n.title,
				body: n.body,
				createdAt: new Date(n.createdAt).toISOString(),
				isPinned: n.isPinned,
			}));

			return NextResponse.json({ notices: formattedNotices });
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["renter"] },
);
