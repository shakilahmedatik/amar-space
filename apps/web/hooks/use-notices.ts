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
import { DEFAULT_STALE_TIME } from './constants'

/**
 * TanStack Query hook for notice list with filters and pagination.
 */
export function useNotices(params: NoticeListParams = {}) {
  return useQuery({
    queryKey: ['notices', params],
    queryFn: () => fetchNotices(params),
    staleTime: DEFAULT_STALE_TIME,
  })
}

/**
 * TanStack Query hook for a single notice detail.
 */
export function useNotice(id: string) {
  return useQuery({
    queryKey: ['notices', id],
    queryFn: () => fetchNotice(id),
    enabled: !!id,
    staleTime: DEFAULT_STALE_TIME,
  })
}

/**
 * Mutation hook for creating a notice.
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
