import { apiFetch } from "../api";

export type NoticeTargetAudience =
	| "all_renters"
	| "specific_building"
	| "specific_flat"
	| "managers_only";

export interface Notice {
	id: string;
	authorId: string;
	authorName?: string;
	title: string;
	body: string;
	targetAudience: NoticeTargetAudience;
	targetBuildingId: string | null;
	targetBuildingName?: string | null;
	targetFlatId: string | null;
	targetFlatNumber?: string | null;
	isPinned: boolean;
	pinnedAt: string | null;
	expiresAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface NoticeListItem {
	id: string;
	authorName: string;
	title: string;
	body: string;
	targetAudience: NoticeTargetAudience;
	targetBuildingName: string | null;
	targetFlatNumber: string | null;
	isPinned: boolean;
	expiresAt: string | null;
	createdAt: string;
}

export interface NoticeListResponse {
	data: NoticeListItem[];
	total: number;
	page: number;
	pageSize: number;
}

export interface NoticeListParams {
	page?: number;
	pageSize?: number;
	targetAudience?: NoticeTargetAudience | "";
	pinned?: boolean | "";
	status?: "active" | "archived" | "all";
}

export interface CreateNoticeInput {
	title: string;
	body: string;
	targetAudience: NoticeTargetAudience;
	targetBuildingId?: string;
	targetFlatId?: string;
	expiresAt?: string;
}

export interface UpdateNoticeInput {
	title?: string;
	body?: string;
	targetAudience?: NoticeTargetAudience;
	targetBuildingId?: string | null;
	targetFlatId?: string | null;
	expiresAt?: string | null;
}

export function fetchNotices(
	params: NoticeListParams = {},
): Promise<NoticeListResponse> {
	const searchParams = new URLSearchParams();
	if (params.page) searchParams.set("page", String(params.page));
	if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
	if (params.targetAudience)
		searchParams.set("targetAudience", params.targetAudience);
	if (params.pinned !== undefined && params.pinned !== "")
		searchParams.set("pinned", String(params.pinned));
	if (params.status) searchParams.set("status", params.status);
	const query = searchParams.toString();
	return apiFetch<NoticeListResponse>(
		`/api/notices${query ? `?${query}` : ""}`,
	);
}

export function fetchNotice(id: string): Promise<Notice> {
	return apiFetch<Notice>(`/api/notices/${id}`);
}

export function createNotice(data: CreateNoticeInput): Promise<Notice> {
	return apiFetch<Notice>("/api/notices", {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export function updateNotice(
	id: string,
	data: UpdateNoticeInput,
): Promise<Notice> {
	return apiFetch<Notice>(`/api/notices/${id}`, {
		method: "PUT",
		body: JSON.stringify(data),
	});
}

export function deleteNotice(id: string): Promise<void> {
	return apiFetch<void>(`/api/notices/${id}`, {
		method: "DELETE",
	});
}

export function toggleNoticePin(id: string): Promise<Notice> {
	return apiFetch<Notice>(`/api/notices/${id}/pin`, {
		method: "PUT",
	});
}
