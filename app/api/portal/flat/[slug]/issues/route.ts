import { withAuth } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import {
	flatSlugs,
	issueAttachments,
	issues,
	renters,
	users,
} from "@/lib/db/schema";
import { handleApiError } from "@/lib/error-handler";
import type { PortalIssue } from "@/lib/api/portal";
import { isValidFlatSlug } from "@repo/shared/portal";
import { desc, eq, inArray } from "drizzle-orm";
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

			// Find issues created by this renter for this flat
			const userIssues = await db
				.select({
					issue: issues,
					assigneeName: users.name,
				})
				.from(issues)
				.leftJoin(users, eq(issues.assigneeId, users.id))
				.where(eq(issues.renterId, renterRecord.id))
				.orderBy(desc(issues.createdAt));

			const issueIds = userIssues.map((ui) => ui.issue.id);

			let allAttachments: (typeof issueAttachments.$inferSelect)[] = [];
			if (issueIds.length > 0) {
				allAttachments = await db
					.select()
					.from(issueAttachments)
					.where(inArray(issueAttachments.issueId, issueIds));
			}

			const formattedIssues: PortalIssue[] = userIssues.map((ui) => {
				const issue = ui.issue;
				const attachments = allAttachments.filter(
					(a) => a.issueId === issue.id,
				);

				return {
					id: issue.id,
					title: issue.title,
					description: issue.description,
					category: issue.category,
					priority: issue.priority,
					status: issue.status,
					assigneeName: ui.assigneeName,
					resolutionNotes: issue.resolutionNotes,
					resolvedAt: issue.resolvedAt
						? new Date(issue.resolvedAt).toISOString()
						: null,
					createdAt: new Date(issue.createdAt).toISOString(),
					updatedAt: new Date(issue.updatedAt).toISOString(),
					attachments: attachments.map((a) => ({
						id: a.id,
						fileName: a.fileName,
						fileUrl: formatR2Url(a.fileUrl) || a.fileUrl,
						fileSize: a.fileSize,
						mimeType: a.mimeType,
					})),
				};
			});

			return NextResponse.json({ issues: formattedIssues });
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["renter"] },
);
