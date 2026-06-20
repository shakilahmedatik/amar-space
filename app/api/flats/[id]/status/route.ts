import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { FlatService } from "@/lib/services/flat";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { flatStatusEnum } from "@repo/shared/validation";
import { NextResponse } from "next/server";
import { z } from "zod";

const flatService = new FlatService(db, auditLogger);

export const PUT = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const requestContext = buildRequestContext(req, ctx);
			const body = await req.json();
			const { status } = z.object({ status: flatStatusEnum }).parse(body);

			const flat = await flatService.transitionStatus(
				requestContext,
				id,
				status,
			);

			return NextResponse.json(flat);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner", "manager"], requireApproval: true },
);
