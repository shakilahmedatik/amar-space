import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { BuildingService } from "@/lib/services/building";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { r2Client } from "@/lib/shared/r2";
import { updateBuildingSchema } from "@repo/shared/validation";
import { NextResponse } from "next/server";

const buildingService = new BuildingService(db, auditLogger, r2Client); // TODO: inject actual audit logger

const formatR2Url = (key: string | null | undefined) => {
	if (!key) return null;
	if (key.startsWith("http://") || key.startsWith("https://")) return key;
	const r2BaseUrl = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/$/, "");
	return `${r2BaseUrl}/${key}`;
};

export const GET = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			const building = await buildingService.getBuilding(requestContext, id);

			return NextResponse.json({
				...building,
				coverImageUrl: formatR2Url(building.coverImageUrl),
				logoUrl: formatR2Url(building.logoUrl),
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
			const input = updateBuildingSchema.parse(body);

			const building = await buildingService.updateBuilding(
				requestContext,
				id,
				input,
			);

			return NextResponse.json({
				...building,
				coverImageUrl: formatR2Url(building.coverImageUrl),
				logoUrl: formatR2Url(building.logoUrl),
			});
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner"], requireApproval: true },
);
