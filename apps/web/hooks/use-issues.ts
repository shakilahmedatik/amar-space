'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type AssignIssueInput,
  assignIssue,
  type CreateIssueInput,
  createIssue,
  deleteIssue,
  fetchIssue,
  fetchIssues,
  fetchManagerOptions,
  type IssueListParams,
  type UpdateIssueStatusInput,
  updateIssueStatus,
} from '@/lib/api-client'
import { DEFAULT_STALE_TIME, OPTIONS_STALE_TIME } from './constants'

/**
 * TanStack Query hook for issue list with filters and pagination.
 */
export function useIssues(params: IssueListParams = {}) {
  return useQuery({
    queryKey: ['issues', params],
    queryFn: () => fetchIssues(params),
    staleTime: DEFAULT_STALE_TIME,
  })
}

/**
 * TanStack Query hook for a single issue detail.
 */
export function useIssue(id: string) {
  return useQuery({
    queryKey: ['issues', id],
    queryFn: () => fetchIssue(id),
    enabled: !!id,
    staleTime: DEFAULT_STALE_TIME,
  })
}

/**
 * Mutation hook for creating an issue.
 */
export function useCreateIssue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateIssueInput) => createIssue(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
    },
  })
}

/**
 * Mutation hook for updating issue status.
 */
export function useUpdateIssueStatus(issueId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateIssueStatusInput) =>
      updateIssueStatus(issueId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', issueId] })
      queryClient.invalidateQueries({ queryKey: ['issues'] })
    },
  })
}

/**
 * Mutation hook for assigning an issue.
 */
export function useAssignIssue(issueId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AssignIssueInput) => assignIssue(issueId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', issueId] })
      queryClient.invalidateQueries({ queryKey: ['issues'] })
    },
  })
}

/**
 * Mutation hook for deleting an issue. Owner only.
 */
export function useDeleteIssue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteIssue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
    },
  })
}

/**
 * TanStack Query hook for manager options (for issue assignment).
 */
export function useManagerOptions() {
  return useQuery({
    queryKey: ['managers', { type: 'options' }],
    queryFn: () => fetchManagerOptions(),
    staleTime: OPTIONS_STALE_TIME,
  })
}
