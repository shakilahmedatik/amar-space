'use client'

import { useQuery } from '@tanstack/react-query'
import { type AuditLogListParams, fetchAuditLogs } from '@/lib/api-client'
import { DEFAULT_STALE_TIME } from './constants'

/**
 * TanStack Query hook for audit log list with filters and pagination.
 */
export function useAuditLogs(params: AuditLogListParams = {}) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => fetchAuditLogs(params),
    staleTime: DEFAULT_STALE_TIME,
  })
}
