'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type CreateRenterInput,
  createRenter,
  fetchRenter,
  fetchRenters,
  fetchVacantFlats,
  resetRenterAccessCode,
} from '@/lib/api-client'

/**
 * TanStack Query hook for renter list with pagination.
 * Validates: Requirements 4.1
 */
export function useRenters(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: ['renters', page, pageSize],
    queryFn: () => fetchRenters(page, pageSize),
    staleTime: 30 * 1000,
  })
}

/**
 * TanStack Query hook for a single renter detail.
 * Validates: Requirements 4.1, 9.12
 */
export function useRenter(id: string) {
  return useQuery({
    queryKey: ['renters', id],
    queryFn: () => fetchRenter(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  })
}

/**
 * TanStack Query hook for vacant flats (used in renter registration form).
 * Validates: Requirement 4.9
 */
export function useVacantFlats() {
  return useQuery({
    queryKey: ['flats', 'vacant'],
    queryFn: fetchVacantFlats,
    staleTime: 30 * 1000,
  })
}

/**
 * Mutation hook for registering a new renter.
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.9, 4.11, 4.12
 */
export function useCreateRenter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateRenterInput) => createRenter(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renters'] })
      queryClient.invalidateQueries({ queryKey: ['flats'] })
    },
  })
}

/**
 * Mutation hook for resetting a renter's access code.
 */
export function useResetRenterAccessCode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => resetRenterAccessCode(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['renters'] })
      queryClient.invalidateQueries({ queryKey: ['renters', id] })
    },
  })
}
