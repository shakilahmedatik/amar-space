import { apiFetch } from "../api";

export type IssueCategory =
	| "plumbing"
	| "electrical"
	| "structural"
	| "cleaning"
	| "security"
	| "other";

export type IssuePriority = "low" | "medium" | "high" | "urgent";

export type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

export interface IssueAttachment {
	id: string;
	fileName: string;
	fileUrl: string;
	fileSize: number;
	mimeType: string;
	createdAt: string;
}

export interface Issue {
	id: string;
	buildingId: string;
	buildingName: string;
	title: string;
	description: string;
	category: IssueCategory;
	priority: IssuePriority;
	status: IssueStatus;
	assigneeId: string | null;
	assigneeName: string | null;
	resolutionNotes: string | null;
	resolvedAt: string | null;
	createdAt: string;
	updatedAt: string;
	attachments: IssueAttachment[];
}

export interface IssueListItem {
	id: string;
	buildingId: string;
	buildingName: string;
	title: string;
	description: string;
	category: IssueCategory;
	priority: IssuePriority;
	status: IssueStatus;
	assigneeId: string | null;
	assigneeName: string | null;
	ownerAccountId: string;
	createdAt: string;
}

export interface IssueListResponse {
	data: IssueListItem[];
	total: number;
	page: number;
	pageSize: number;
}

export interface IssueListParams {
	page?: number;
	pageSize?: number;
	buildingId?: string;
	category?: IssueCategory | "";
	status?: IssueStatus | "";
	priority?: IssuePriority | "";
	assigneeId?: string;
}

export interface CreateIssueInput {
	buildingId: string;
	title: string;
	description: string;
	category: IssueCategory;
	priority: IssuePriority;
	attachments?: File[];
}

export interface UpdateIssueStatusInput {
	status: IssueStatus;
	resolutionNotes?: string;
}

export interface AssignIssueInput {
	assigneeId: string;
}

export interface ManagerOption {
	id: string;
	name: string;
	email: string;
}

export interface ManagerOptionsResponse {
	data: ManagerOption[];
	total: number;
	page: number;
	pageSize: number;
}

export function fetchIssues(
	params: IssueListParams = {},
): Promise<IssueListResponse> {
	const searchParams = new URLSearchParams();
	if (params.page) searchParams.set("page", String(params.page));
	if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
	if (params.buildingId) searchParams.set("buildingId", params.buildingId);
	if (params.category) searchParams.set("category", params.category);
	if (params.status) searchParams.set("status", params.status);
	if (params.priority) searchParams.set("priority", params.priority);
	if (params.assigneeId) searchParams.set("assigneeId", params.assigneeId);
	const query = searchParams.toString();
	return apiFetch<IssueListResponse>(`/api/issues${query ? `?${query}` : ""}`);
}

export function fetchIssue(id: string): Promise<Issue> {
	return apiFetch<Issue>(`/api/issues/${id}`);
}

export function createIssue(data: CreateIssueInput): Promise<Issue> {
	if (data.attachments && data.attachments.length > 0) {
		const formData = new FormData();
		formData.append("buildingId", data.buildingId);
		formData.append("title", data.title);
		formData.append("description", data.description);
		formData.append("category", data.category);
		formData.append("priority", data.priority);
		for (const file of data.attachments) {
			formData.append("attachments", file);
		}
		return apiFetch<Issue>("/api/issues", {
			method: "POST",
			body: formData,
		});
	}

	return apiFetch<Issue>("/api/issues", {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export function updateIssueStatus(
	id: string,
	data: UpdateIssueStatusInput,
): Promise<Issue> {
	return apiFetch<Issue>(`/api/issues/${id}/status`, {
		method: "PUT",
		body: JSON.stringify(data),
	});
}

export function assignIssue(
	id: string,
	data: AssignIssueInput,
): Promise<Issue> {
	return apiFetch<Issue>(`/api/issues/${id}/assign`, {
		method: "PUT",
		body: JSON.stringify(data),
	});
}

export function deleteIssue(id: string): Promise<void> {
	return apiFetch<void>(`/api/issues/${id}`, {
		method: "DELETE",
	});
}

// TODO: Backend needs a GET /api/users?role=manager endpoint to list managers
// Currently no backend endpoint supports filtering users by role
export async function fetchManagerOptions(): Promise<ManagerOptionsResponse> {
	try {
		return await apiFetch<ManagerOptionsResponse>(
			"/api/users?role=manager&pageSize=100",
		);
	} catch {
		return { data: [], total: 0, page: 1, pageSize: 100 };
	}
}
