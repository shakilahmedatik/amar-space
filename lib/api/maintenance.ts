import { ApiError, BASE_URL, apiFetch } from "../api";

export type MaintenancePriority = "low" | "medium" | "high" | "urgent";
export type MaintenanceStatus = "open" | "in_progress" | "resolved" | "closed";

export interface MaintenanceRequestListItem {
	id: string;
	title: string;
	priority: MaintenancePriority;
	status: MaintenanceStatus;
	flatNumber: string;
	buildingName: string;
	renterName: string;
	createdAt: string;
}

export interface MaintenanceAttachment {
	id: string;
	fileUrl: string;
	fileName: string;
	fileSize: number;
	mimeType: string;
	createdAt: string;
}

export interface MaintenanceComment {
	id: string;
	authorId: string;
	authorName: string;
	content: string;
	createdAt: string;
}

export interface MaintenanceRequestDetail {
	id: string;
	title: string;
	description: string;
	priority: MaintenancePriority;
	status: MaintenanceStatus;
	flatId: string;
	flatNumber: string;
	buildingId: string;
	buildingName: string;
	renterId: string;
	renterName: string;
	attachments: MaintenanceAttachment[];
	comments: MaintenanceComment[];
	createdAt: string;
	updatedAt: string;
}

export interface MaintenanceListResponse {
	data: MaintenanceRequestListItem[];
	total: number;
	page: number;
	pageSize: number;
}

export interface MaintenanceListParams {
	page?: number;
	pageSize?: number;
	buildingId?: string;
	flatId?: string;
	status?: MaintenanceStatus | "";
	priority?: MaintenancePriority | "";
}

export interface CreateMaintenanceRequestInput {
	title: string;
	description: string;
	priority: MaintenancePriority;
	attachments?: File[];
	buildingId?: string;
	flatId?: string | null;
}

export interface UpdateMaintenanceStatusInput {
	status: MaintenanceStatus;
}

export interface AddMaintenanceCommentInput {
	content: string;
}

export function fetchMaintenanceRequests(
	params: MaintenanceListParams = {},
): Promise<MaintenanceListResponse> {
	const searchParams = new URLSearchParams();
	if (params.page) searchParams.set("page", String(params.page));
	if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
	if (params.buildingId) searchParams.set("buildingId", params.buildingId);
	if (params.flatId) searchParams.set("flatId", params.flatId);
	if (params.status) searchParams.set("status", params.status);
	if (params.priority) searchParams.set("priority", params.priority);
	const query = searchParams.toString();
	return apiFetch<MaintenanceListResponse>(
		`/api/maintenance${query ? `?${query}` : ""}`,
	);
}

export function fetchMaintenanceRequest(
	id: string,
): Promise<MaintenanceRequestDetail> {
	return apiFetch<MaintenanceRequestDetail>(`/api/maintenance/${id}`);
}

export async function createMaintenanceRequest(
	data: CreateMaintenanceRequestInput,
): Promise<MaintenanceRequestDetail> {
	const formData = new FormData();
	formData.append("title", data.title);
	formData.append("description", data.description);
	formData.append("priority", data.priority);

	if (data.attachments) {
		for (const file of data.attachments) {
			formData.append("attachments", file);
		}
	}
	if (data.buildingId) {
		formData.append("buildingId", data.buildingId);
	}
	if (data.flatId) {
		formData.append("flatId", data.flatId);
	}

	const headers: Record<string, string> = {};
	if (
		typeof window !== "undefined" &&
		window.location.pathname.startsWith("/portal/")
	) {
		headers["x-portal-request"] = "true";
	}

	const response = await fetch(`${BASE_URL}/api/maintenance`, {
		method: "POST",
		credentials: "include",
		headers,
		body: formData,
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({
			message: "Request failed",
		}));
		throw new ApiError(
			error.message || `HTTP ${response.status}`,
			response.status,
			error.details,
		);
	}

	return response.json();
}

export function updateMaintenanceStatus(
	id: string,
	data: UpdateMaintenanceStatusInput,
): Promise<MaintenanceRequestDetail> {
	return apiFetch<MaintenanceRequestDetail>(`/api/maintenance/${id}/status`, {
		method: "PUT",
		body: JSON.stringify(data),
	});
}

export function addMaintenanceComment(
	id: string,
	data: AddMaintenanceCommentInput,
): Promise<MaintenanceComment> {
	return apiFetch<MaintenanceComment>(`/api/maintenance/${id}/comments`, {
		method: "POST",
		body: JSON.stringify(data),
	});
}
