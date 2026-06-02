'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type CreateBuildingInput,
  createBuilding,
  fetchBuilding,
  fetchBuildings,
  fetchFlatsForBuilding,
  type UpdateBuildingInput,
  updateBuilding,
} from '@/lib/api-client'
import { DEFAULT_STALE_TIME } from './constants'

/**
 * TanStack Query hook for building list with pagination.
 */
export function useBuildings(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: ['buildings', { page, pageSize }],
    queryFn: () => fetchBuildings(page, pageSize),
    staleTime: DEFAULT_STALE_TIME,
  })
}

/**
 * TanStack Query hook for a single building.
 */
export function useBuilding(id: string) {
  return useQuery({
    queryKey: ['buildings', id],
    queryFn: () => fetchBuilding(id),
    staleTime: DEFAULT_STALE_TIME,
    enabled: !!id,
  })
}

/**
 * TanStack Query hook for flats within a building.
 */
export function useBuildingFlats(buildingId: string, page = 1, pageSize = 50) {
  return useQuery({
    queryKey: ['flats', buildingId, page, pageSize],
    queryFn: () => fetchFlatsForBuilding(buildingId, page, pageSize),
    staleTime: DEFAULT_STALE_TIME,
    enabled: !!buildingId,
  })
}

/**
 * Mutation hook for creating a building.
 */
export function useCreateBuilding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateBuildingInput) => createBuilding(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] })
    },
  })
}

/**
 * Mutation hook for updating a building.
 */
export function useUpdateBuilding(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateBuildingInput) => updateBuilding(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] })
      queryClient.invalidateQueries({ queryKey: ['buildings', id] })
    },
  })
}
