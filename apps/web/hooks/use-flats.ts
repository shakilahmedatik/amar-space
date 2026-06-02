'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type CreateFlatInput,
  createFlat,
  deleteFlat,
  type FlatListParams,
  type FlatStatus,
  fetchBuildingsList,
  fetchFlat,
  fetchFlats,
  type UpdateFlatInput,
  updateFlat,
} from '@/lib/api-client'
import { DEFAULT_STALE_TIME, OPTIONS_STALE_TIME } from './constants'

/**
 * TanStack Query hook for flat list with filters and pagination.
 */
export function useFlats(params: FlatListParams = {}) {
  return useQuery({
    queryKey: ['flats', params],
    queryFn: () => fetchFlats(params),
    staleTime: DEFAULT_STALE_TIME,
  })
}

/**
 * TanStack Query hook for a single flat detail.
 */
export function useFlat(id: string) {
  return useQuery({
    queryKey: ['flats', id],
    queryFn: () => fetchFlat(id),
    enabled: !!id,
    staleTime: DEFAULT_STALE_TIME,
  })
}

/**
 * TanStack Query hook for buildings list (used in flat creation form).
 */
export function useBuildings() {
  return useQuery({
    queryKey: ['buildings', { type: 'list' }],
    queryFn: fetchBuildingsList,
    staleTime: OPTIONS_STALE_TIME,
  })
}

/**
 * Mutation hook for creating a flat.
 */
export function useCreateFlat() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateFlatInput) => createFlat(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flats'] })
    },
  })
}

/**
 * Mutation hook for updating a flat (including status transitions).
 */
export function useUpdateFlat() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFlatInput }) =>
      updateFlat(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['flats'] })
      queryClient.invalidateQueries({ queryKey: ['flats', variables.id] })
    },
  })
}

/**
 * Mutation hook for deleting a flat (only Vacant flats).
 */
export function useDeleteFlat() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteFlat(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flats'] })
    },
  })
}

/**
 * Helper: Get valid status transitions for a flat.
 * Valid transitions:
 * - Vacant → Occupied (via renter assignment, not manual)
 * - Vacant → Maintenance
 * - Maintenance → Vacant
 * - Occupied → Vacant (via contract end, not manual)
 *
 * For manual status controls (Owner/Manager):
 * - Vacant → Maintenance
 * - Maintenance → Vacant
 */
export function getValidStatusTransitions(
  currentStatus: FlatStatus,
): FlatStatus[] {
  switch (currentStatus) {
    case 'vacant':
      return ['under_maintenance']
    case 'under_maintenance':
      return ['vacant']
    case 'occupied':
      return [] // Status changes from Occupied happen via contract management
    default:
      return []
  }
}
