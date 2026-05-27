'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type CreateNoticeInput,
  createNotice,
  deleteNotice,
  fetchNotice,
  fetchNotices,
  type NoticeListParams,
  toggleNoticePin,
  type UpdateNoticeInput,
  updateNotice,
} from '@/lib/api-client'

/**
 * TanStack Query hook for notice list with filters and pagination.
 * Validates: Requirements 12.8
 */
export function useNotices(params: NoticeListParams = {}) {
  return useQuery({
    queryKey: ['notices', params],
    queryFn: () => fetchNotices(params),
    staleTime: 30 * 1000,
  })
}

/**
 * TanStack Query hook for a single notice detail.
 * Validates: Requirements 12.1
 */
export function useNotice(id: string) {
  return useQuery({
    queryKey: ['notices', id],
    queryFn: () => fetchNotice(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  })
}

/**
 * Mutation hook for creating a notice.
 * Validates: Requirements 12.1, 12.3, 12.4
 */
export function useCreateNotice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateNoticeInput) => createNotice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] })
    },
  })
}

/**
 * Mutation hook for updating a notice.
 * Validates: Requirements 12.9
 */
export function useUpdateNotice(noticeId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateNoticeInput) => updateNotice(noticeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices', noticeId] })
      queryClient.invalidateQueries({ queryKey: ['notices'] })
    },
  })
}

/**
 * Mutation hook for deleting a notice.
 * Validates: Requirements 12.9
 */
export function useDeleteNotice(noticeId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => deleteNotice(noticeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] })
    },
  })
}

/**
 * Mutation hook for toggling notice pin status.
 * Validates: Requirements 12.2
 */
export function useToggleNoticePin(noticeId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => toggleNoticePin(noticeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices', noticeId] })
      queryClient.invalidateQueries({ queryKey: ['notices'] })
    },
  })
}
