import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { FlatService } from "@/lib/services/flat";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { createFlatSchema, flatStatusEnum } from "@repo/shared/validation";
import { NextResponse } from "next/server";
import type { z } from "zod";

const flatService = new FlatService(db, auditLogger); // TODO: inject actual audit logger

export const GET = withAuth(
	async (req, ctx) => {
		const url = new URL(req.url);
		const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
		const pageSize = Number.parseInt(
			url.searchParams.get("pageSize") || "20",
			10,
		);
		const buildingId = url.searchParams.get("buildingId") || undefined;
		const statusParam = url.searchParams.get("status");

		let status: z.infer<typeof flatStatusEnum> | undefined;
		if (statusParam) {
			const parsedStatus = flatStatusEnum.safeParse(statusParam);
			if (parsedStatus.success) {
				status = parsedStatus.data;
			}
		}

		const requestContext = buildRequestContext(req, ctx);
		const result = await flatService.listFlats(requestContext, {
			buildingId,
			status,
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
			const body = await req.json();
			const input = createFlatSchema.parse(body);

			const flat = await flatService.createFlat(requestContext, input);

			return NextResponse.json(flat, { status: 201 });
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
