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
import { DEFAULT_STALE_TIME } from './constants'

/**
 * TanStack Query hook for renter list with pagination.
 */
export function useRenters(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: ['renters', { page, pageSize }],
    queryFn: () => fetchRenters(page, pageSize),
    staleTime: DEFAULT_STALE_TIME,
  })
}

/**
 * TanStack Query hook for a single renter detail.
 */
export function useRenter(id: string) {
  return useQuery({
    queryKey: ['renters', id],
    queryFn: () => fetchRenter(id),
    enabled: !!id,
    staleTime: DEFAULT_STALE_TIME,
  })
}

/**
 * TanStack Query hook for vacant flats (used in renter registration form).
 */
export function useVacantFlats() {
  return useQuery({
    queryKey: ['flats', { status: 'vacant' }],
    queryFn: fetchVacantFlats,
    staleTime: DEFAULT_STALE_TIME,
  })
}

/**
 * Mutation hook for registering a new renter.
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
