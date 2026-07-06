"use client";

import { type AuditLogListParams, fetchAuditLogs } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";

/**
 * TanStack Query hook for audit log list with filters and pagination.
 */
export function useAuditLogs(params: AuditLogListParams = {}) {
	return useQuery({
		queryKey: ["audit-logs", params],
		queryFn: () => fetchAuditLogs(params),
	});
}
