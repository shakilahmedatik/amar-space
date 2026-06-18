import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { BuildingService } from "@/lib/services/building";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { r2Client } from "@/lib/shared/r2";
import { createBuildingSchema } from "@repo/shared/validation";
import { NextResponse } from "next/server";

const buildingService = new BuildingService(db, auditLogger, r2Client); // TODO: inject actual audit logger

const formatR2Url = (key: string | null | undefined) => {
	if (!key) return null;
	if (key.startsWith("http://") || key.startsWith("https://")) return key;
	const r2BaseUrl = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/$/, "");
	return `${r2BaseUrl}/${key}`;
};

export const GET = withAuth(
	async (req, ctx) => {
		const url = new URL(req.url);
		const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
		const pageSize = Number.parseInt(
			url.searchParams.get("pageSize") || "20",
			10,
		);

		const requestContext = buildRequestContext(req, ctx);
		const result = await buildingService.listBuildings(requestContext, {
			page,
			pageSize,
		});

		const formattedData = result.data.map((b) => ({
			...b,
			coverImageUrl: formatR2Url(b.coverImageUrl),
		}));

		return NextResponse.json({ ...result, data: formattedData });
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);

export const POST = withAuth(
	async (req, ctx) => {
		try {
			const requestContext = buildRequestContext(req, ctx);
			const body = await req.json();
			const input = createBuildingSchema.parse(body);

			const building = await buildingService.createBuilding(
				requestContext,
				input,
			);

			return NextResponse.json(
				{
					...building,
					coverImageUrl: formatR2Url(building.coverImageUrl),
					logoUrl: formatR2Url(building.logoUrl),
				},
				{ status: 201 },
			);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner"], requireApproval: true },
);
