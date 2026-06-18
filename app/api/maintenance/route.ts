import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import {
	type FileAttachment,
	MaintenanceService,
} from "@/lib/services/maintenance.service";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { r2Client } from "@/lib/shared/r2";
import { NextResponse } from "next/server";

const maintenanceService = new MaintenanceService(db, auditLogger, r2Client);

export const GET = withAuth(
	async (req, ctx) => {
		const url = new URL(req.url);
		const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
		const pageSize = Number.parseInt(
			url.searchParams.get("pageSize") || "20",
			10,
		);
		const buildingId = url.searchParams.get("buildingId") || undefined;
		const flatId = url.searchParams.get("flatId") || undefined;
		const statusParam = url.searchParams.get("status");
		const priorityParam = url.searchParams.get("priority");

		let status: "open" | "in_progress" | "resolved" | "closed" | undefined =
			undefined;
		if (
			statusParam &&
			["open", "in_progress", "resolved", "closed"].includes(statusParam)
		) {
			status = statusParam as "open" | "in_progress" | "resolved" | "closed";
		}

		let priority: "low" | "medium" | "high" | "urgent" | undefined = undefined;
		if (
			priorityParam &&
			["low", "medium", "high", "urgent"].includes(priorityParam)
		) {
			priority = priorityParam as "low" | "medium" | "high" | "urgent";
		}

		const requestContext = buildRequestContext(req, ctx);
		const result = await maintenanceService.listRequests(
			requestContext,
			{ buildingId, flatId, status, priority },
			{ page, pageSize },
		);

		return NextResponse.json(result);
	},
	{
		roles: ["owner", "manager", "security_guard", "care_taker"],
		requireApproval: true,
	},
);

export const POST = withAuth(
	async (req, ctx) => {
		try {
			const requestContext = buildRequestContext(req, ctx);
			const formData = await req.formData();

			const title = (formData.get("title") as string) || "";
			const description = (formData.get("description") as string) || "";
			const priority = (formData.get("priority") as string) || "";

			const attachments: FileAttachment[] = [];
			const files = formData.getAll("attachments");
			for (const file of files) {
				if (file instanceof File) {
					attachments.push({
						fileName: file.name,
						buffer: Buffer.from(await file.arrayBuffer()),
						mimeType: file.type,
						fileSize: file.size,
					});
				}
			}

			const buildingId = formData.get("buildingId") as string | null;
			const flatId = formData.get("flatId") as string | null;

			const data = {
				title,
				description,
				priority,
				...(buildingId && { buildingId }),
				...(flatId && { flatId }),
			};

			const result = await maintenanceService.createRequest(
				requestContext,
				data,
				attachments,
			);

			return NextResponse.json(result, { status: 201 });
		} catch (e) {
			return handleApiError(e);
		}
	},
	{
		roles: ["owner", "manager", "security_guard", "care_taker"],
		requireApproval: true,
	},
);
