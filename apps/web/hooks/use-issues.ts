'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type AssignIssueInput,
  assignIssue,
  type CreateIssueInput,
  createIssue,
  fetchIssue,
  fetchIssues,
  fetchManagerOptions,
  type IssueListParams,
  type UpdateIssueStatusInput,
  updateIssueStatus,
} from '@/lib/api-client'

/**
 * TanStack Query hook for issue list with filters and pagination.
 * Validates: Requirements 11.6
 */
export function useIssues(params: IssueListParams = {}) {
  return useQuery({
    queryKey: ['issues', params],
    queryFn: () => fetchIssues(params),
    staleTime: 30 * 1000,
  })
}

/**
 * TanStack Query hook for a single issue detail.
 * Validates: Requirements 11.1, 11.4
 */
export function useIssue(id: string) {
  return useQuery({
    queryKey: ['issues', id],
    queryFn: () => fetchIssue(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  })
}

/**
 * Mutation hook for creating an issue.
 * Validates: Requirements 11.1, 11.7
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
 * Validates: Requirements 11.4, 11.5
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
 * Validates: Requirements 11.2
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
 * TanStack Query hook for manager options (for issue assignment).
 * Validates: Requirements 11.2
 */
export function useManagerOptions() {
  return useQuery({
    queryKey: ['managers', 'options'],
    queryFn: () => fetchManagerOptions(),
    staleTime: 60 * 1000,
  })
}
