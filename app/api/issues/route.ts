import { withAuth } from "@/lib/auth-guard";
import { buildRequestContext } from "@/lib/context";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import {
	type FileAttachment,
	IssueService,
} from "@/lib/services/issue.service";
import { auditLogger } from "@/lib/services/audit-logger.service";
import { r2Client } from "@/lib/shared/r2";
import { NextResponse } from "next/server";

const issueService = new IssueService(db, auditLogger, r2Client);

export const GET = withAuth(
	async (req, ctx) => {
		const url = new URL(req.url);
		const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
		const pageSize = Number.parseInt(
			url.searchParams.get("pageSize") || "20",
			10,
		);
		const buildingId = url.searchParams.get("buildingId") || undefined;
		const category = url.searchParams.get("category") || undefined;
		const statusParam = url.searchParams.get("status");
		const status =
			statusParam === "open" ||
			statusParam === "in_progress" ||
			statusParam === "resolved" ||
			statusParam === "closed"
				? statusParam
				: undefined;
		const priority = url.searchParams.get("priority") || undefined;
		const assigneeId = url.searchParams.get("assigneeId") || undefined;

		const requestContext = buildRequestContext(req, ctx);
		const result = await issueService.listIssues(requestContext, {
			buildingId,
			category,
			status,
			priority,
			assigneeId,
			page,
			pageSize,
		});

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
			const contentType = req.headers.get("content-type") || "";

			type IssueData = {
				buildingId: string;
				title: string;
				description: string;
				category:
					| "plumbing"
					| "electrical"
					| "structural"
					| "cleaning"
					| "security"
					| "other";
				priority: "low" | "medium" | "high" | "urgent";
			};
			let data: IssueData;
			let attachments: FileAttachment[] | undefined;

			if (contentType.includes("multipart/")) {
				const formData = await req.formData();
				const fileAttachments: FileAttachment[] = [];

				const files = formData.getAll("attachments");
				for (const file of files) {
					if (file instanceof File) {
						fileAttachments.push({
							fileName: file.name,
							buffer: Buffer.from(await file.arrayBuffer()),
							mimeType: file.type,
							fileSize: file.size,
						});
					}
				}

				data = {
					buildingId: (formData.get("buildingId") as string) || "",
					title: (formData.get("title") as string) || "",
					description: (formData.get("description") as string) || "",
					category: ((formData.get("category") as string) ||
						"other") as IssueData["category"],
					priority: ((formData.get("priority") as string) ||
						"medium") as IssueData["priority"],
				};

				attachments = fileAttachments.length > 0 ? fileAttachments : undefined;
			} else {
				data = (await req.json()) as IssueData;
				attachments = undefined;
			}

			const result = await issueService.createIssue(
				requestContext,
				data,
				attachments,
			);

			return NextResponse.json(result, { status: 201 });
		} catch (e) {
			return handleApiError(e);
		}
	},
	{ roles: ["renter"], requireApproval: true },
);
