'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ApproveRegistrationInput,
  approveRegistration,
  fetchRegistrationRequests,
  rejectRegistration,
} from '@/lib/api-client'

/**
 * Hook for fetching pending registration requests.
 */
export function useRegistrationRequests() {
  return useQuery({
    queryKey: ['registration-requests'],
    queryFn: fetchRegistrationRequests,
    staleTime: 30 * 1000,
  })
}

/**
 * Mutation hook for approving a registration request.
 */
export function useApproveRegistration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: ApproveRegistrationInput
    }) => approveRegistration(id, data),
    onSuccess: () => {
      // Invalidate both requests and renters list
      queryClient.invalidateQueries({ queryKey: ['registration-requests'] })
      queryClient.invalidateQueries({ queryKey: ['renters'] })
      queryClient.invalidateQueries({ queryKey: ['flats'] })
    },
  })
}

/**
 * Mutation hook for rejecting a registration request.
 */
export function useRejectRegistration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => rejectRegistration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registration-requests'] })
      queryClient.invalidateQueries({ queryKey: ['flats'] })
    },
  })
}
