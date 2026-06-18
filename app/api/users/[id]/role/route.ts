import { withAuth } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { type Role, assignRole } from "@/lib/services/role-assignment";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { NextResponse } from "next/server";
import { z } from "zod";

export const PUT = withAuth(
	async (req, ctx, params) => {
		const { id } = await params;

		try {
			const body = await req.json();
			const { role, buildingIds } = z
				.object({
					role: z.enum(["owner", "manager"]),
					buildingIds: z.array(z.string().uuid()).optional(),
				})
				.parse(body);

			const result = await assignRole(
				db,
				auditLogger,
				{
					userId: ctx.user.id,
					role: ctx.user.role as Role,
					ownerAccountId: ctx.tenantScope.ownerAccountId,
				},
				{
					userId: id,
					role,
					buildingIds,
				},
			);

			return NextResponse.json(result);
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["owner"] },
);
