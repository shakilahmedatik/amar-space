import { apiFetch } from "../api";

export interface AuditLogEntry {
	id: string;
	action: string;
	entityType: string;
	entityId: string;
	actorId: string;
	actorName: string;
	oldValues: Record<string, unknown> | null;
	newValues: Record<string, unknown> | null;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: string;
}

export interface AuditLogListResponse {
	data: AuditLogEntry[];
	total: number;
	page: number;
	pageSize: number;
}

export interface AuditLogListParams {
	page?: number;
	pageSize?: number;
	entityType?: string;
	entityId?: string;
	actorId?: string;
	action?: string;
	startDate?: string;
	endDate?: string;
}

export function fetchAuditLogs(
	params: AuditLogListParams = {},
): Promise<AuditLogListResponse> {
	const searchParams = new URLSearchParams();
	if (params.page) searchParams.set("page", String(params.page));
	if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
	if (params.entityType) searchParams.set("entityType", params.entityType);
	if (params.entityId) searchParams.set("entityId", params.entityId);
	if (params.actorId) searchParams.set("actorId", params.actorId);
	if (params.action) searchParams.set("action", params.action);
	if (params.startDate) searchParams.set("startDate", params.startDate);
	if (params.endDate) searchParams.set("endDate", params.endDate);
	const query = searchParams.toString();
	return apiFetch<AuditLogListResponse>(
		`/api/audit${query ? `?${query}` : ""}`,
	);
}
