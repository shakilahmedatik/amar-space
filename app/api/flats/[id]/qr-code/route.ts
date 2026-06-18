import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { flats } from "@/lib/db/schema";
import { handleApiError } from "@/lib/error-handler";
import { FlatRepository } from "@/lib/repositories/flat.repository";
import { QrCodeService } from "@/lib/services/qr-code";
import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const GET = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;
		const searchParams = req.nextUrl.searchParams;
		const sizeParam = searchParams.get("size");
		const size = sizeParam ? Number.parseInt(sizeParam, 10) : 300;

		try {
			const requestContext = buildRequestContext(req, ctx);

			const flat = await db.query.flats.findFirst({
				where: and(
					eq(flats.id, id),
					eq(flats.ownerAccountId, requestContext.ownerAccountId),
				),
				with: {
					building: {
						columns: { name: true },
					},
					flatSlug: {
						columns: { slug: true },
					},
				},
			});

			if (!flat) {
				return NextResponse.json(
					{ error: "Not Found", message: "Flat not found" },
					{ status: 404 },
				);
			}

			let slug = flat.flatSlug?.slug;
			if (!slug) {
				// Fallback: generate and save a slug if the flat doesn't have one
				slug = randomBytes(6).toString("hex");
				const flatRepo = new FlatRepository(db);
				await flatRepo.createSlug({
					flatId: flat.id,
					slug,
				});
			}

			const frontendUrl =
				process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
			const qrCodeService = new QrCodeService(frontendUrl);

			const buffer = await qrCodeService.generateQrCode(slug, {
				size,
			});

			return new NextResponse(buffer as unknown as BodyInit, {
				headers: {
					"Content-Type": "image/png",
					"Cache-Control": "public, max-age=86400", // Cache for 24 hours
				},
			});
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
