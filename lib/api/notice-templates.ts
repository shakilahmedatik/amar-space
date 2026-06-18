import { apiFetch } from "../api";

export interface NoticeTemplate {
	id: string;
	name: string;
	title: string;
	body: string;
	targetAudience: string;
	createdAt: string;
	updatedAt: string;
}

export interface NoticeTemplateListResponse {
	data: NoticeTemplate[];
	total: number;
}

export interface CreateNoticeTemplateInput {
	name: string;
	title: string;
	body: string;
	targetAudience: string;
}

export interface UpdateNoticeTemplateInput {
	name?: string;
	title?: string;
	body?: string;
	targetAudience?: string;
}

export function fetchNoticeTemplates(): Promise<NoticeTemplateListResponse> {
	return apiFetch<NoticeTemplateListResponse>("/api/notice-templates");
}

export function fetchNoticeTemplate(id: string): Promise<NoticeTemplate> {
	return apiFetch<NoticeTemplate>(`/api/notice-templates/${id}`);
}

export function createNoticeTemplate(
	data: CreateNoticeTemplateInput,
): Promise<NoticeTemplate> {
	return apiFetch<NoticeTemplate>("/api/notice-templates", {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export function updateNoticeTemplate(
	id: string,
	data: UpdateNoticeTemplateInput,
): Promise<NoticeTemplate> {
	return apiFetch<NoticeTemplate>(`/api/notice-templates/${id}`, {
		method: "PUT",
		body: JSON.stringify(data),
	});
}

export function deleteNoticeTemplate(id: string): Promise<void> {
	return apiFetch<void>(`/api/notice-templates/${id}`, {
		method: "DELETE",
	});
}
