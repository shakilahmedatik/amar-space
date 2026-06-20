import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { flats } from "@/lib/db/schema";
import { handleApiError } from "@/lib/error-handler";
import { FlatService } from "@/lib/services/flat";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { updateFlatSchema } from "@repo/shared/validation";
import { FlatRepository } from "@/lib/repositories/flat.repository";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

const flatService = new FlatService(db, auditLogger);

export const GET = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

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
				slug = randomBytes(6).toString("hex");
				const flatRepo = new FlatRepository(db);
				await flatRepo.createSlug({
					flatId: flat.id,
					slug,
				});
			}

			return NextResponse.json({
				...flat,
				buildingName: flat.building?.name ?? null,
				portalUrl: `/portal/${slug}`,
				building: undefined,
				flatSlug: undefined,
			});
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);

export const PUT = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			const body = await req.json();
			const input = updateFlatSchema.parse(body);

			const flat = await flatService.updateFlat(requestContext, id, input);

			return NextResponse.json(flat);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner"], requireApproval: true },
);

export const DELETE = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			await flatService.deleteFlat(requestContext, id);

			return new NextResponse(null, { status: 204 });
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner"], requireApproval: true },
);
