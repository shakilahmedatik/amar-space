'use client'

import { useQuery } from '@tanstack/react-query'
import { type AuditLogListParams, fetchAuditLogs } from '@/lib/api-client'

/**
 * TanStack Query hook for audit log list with filters and pagination.
 * Validates: Requirements 13.3, 13.4, 13.5
 */
export function useAuditLogs(params: AuditLogListParams = {}) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => fetchAuditLogs(params),
    staleTime: 30 * 1000,
  })
}
