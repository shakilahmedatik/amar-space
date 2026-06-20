import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { buildings, flats, flatSlugs } from "@/lib/db/schema";
import { handleApiError } from "@/lib/error-handler";
import { FlatRepository } from "@/lib/repositories/flat.repository";
import { QrCodeService } from "@/lib/services/qr-code";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { Readable } from "node:stream";

export const GET = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;
		const searchParams = req.nextUrl.searchParams;
		const sizeParam = searchParams.get("size");
		const size = sizeParam ? Number.parseInt(sizeParam, 10) : 300;

		try {
			const requestContext = buildRequestContext(req, ctx);

			// Verify building ownership/assignment
			const building = await db.query.buildings.findFirst({
				where: and(
					eq(buildings.id, id),
					eq(buildings.ownerAccountId, requestContext.ownerAccountId),
				),
			});

			if (!building) {
				return NextResponse.json(
					{ error: "Not Found", message: "Building not found" },
					{ status: 404 },
				);
			}

			// Fetch all flats for the building
			const buildingFlats = await db.query.flats.findMany({
				where: eq(flats.buildingId, id),
				with: {
					flatSlug: {
						columns: { slug: true },
					},
				},
			});

			if (buildingFlats.length === 0) {
				return NextResponse.json(
					{ error: "Not Found", message: "No flats found in this building" },
					{ status: 404 },
				);
			}

			const flatRepo = new FlatRepository(db);
			const formattedFlats = [];

			for (const flat of buildingFlats) {
				let slug = flat.flatSlug?.slug;
				if (!slug) {
					// Auto-heal missing slugs
					slug = randomBytes(6).toString("hex");
					await flatRepo.createSlug({
						flatId: flat.id,
						slug,
					});
				}

				formattedFlats.push({
					id: flat.id,
					flatNumber: flat.flatNumber,
					slug,
				});
			}

			const frontendUrl =
				process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
			const qrCodeService = new QrCodeService(frontendUrl);

			const passThroughStream = await qrCodeService.generateBulkZipStream(
				formattedFlats,
				building.name,
				{ size },
			);

			// Convert Node.js Readable stream to Web ReadableStream for Next.js response
			const webStream = Readable.toWeb(passThroughStream) as ReadableStream;

			return new NextResponse(webStream, {
				headers: {
					"Content-Type": "application/zip",
					"Content-Disposition": `attachment; filename="${building.name.replace(
						/[^a-zA-Z0-9]/g,
						"_",
					)}_QRCodes.zip"`,
					"Cache-Control": "no-cache",
				},
			});
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
