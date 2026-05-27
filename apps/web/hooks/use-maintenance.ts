'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type AddMaintenanceCommentInput,
  addMaintenanceComment,
  type CreateMaintenanceRequestInput,
  createMaintenanceRequest,
  fetchMaintenanceRequest,
  fetchMaintenanceRequests,
  type MaintenanceListParams,
  type UpdateMaintenanceStatusInput,
  updateMaintenanceStatus,
} from '@/lib/api-client'

/**
 * TanStack Query hook for maintenance request list with filters and pagination.
 * Validates: Requirements 10.6, 10.7, 10.8, 10.10
 */
export function useMaintenanceRequests(params: MaintenanceListParams = {}) {
  return useQuery({
    queryKey: ['maintenance', params],
    queryFn: () => fetchMaintenanceRequests(params),
    staleTime: 30 * 1000,
  })
}

/**
 * TanStack Query hook for a single maintenance request detail.
 * Validates: Requirements 10.1, 10.2, 10.5
 */
export function useMaintenanceRequest(id: string) {
  return useQuery({
    queryKey: ['maintenance', id],
    queryFn: () => fetchMaintenanceRequest(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  })
}

/**
 * Mutation hook for creating a new maintenance request.
 * Validates: Requirements 10.1, 10.2
 */
export function useCreateMaintenanceRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateMaintenanceRequestInput) =>
      createMaintenanceRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] })
    },
  })
}

/**
 * Mutation hook for updating maintenance request status.
 * Validates: Requirements 10.5, 10.6, 10.7
 */
export function useUpdateMaintenanceStatus(requestId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateMaintenanceStatusInput) =>
      updateMaintenanceStatus(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', requestId] })
      queryClient.invalidateQueries({ queryKey: ['maintenance'] })
    },
  })
}

/**
 * Mutation hook for adding a comment to a maintenance request.
 * Validates: Requirements 10.8
 */
export function useAddMaintenanceComment(requestId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AddMaintenanceCommentInput) =>
      addMaintenanceComment(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', requestId] })
    },
  })
}
