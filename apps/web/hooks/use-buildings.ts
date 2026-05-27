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

/**
 * TanStack Query hook for building list with pagination.
 * Validates: Requirements 5.7, 5.8
 */
export function useBuildings(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: ['buildings', page, pageSize],
    queryFn: () => fetchBuildings(page, pageSize),
    staleTime: 30 * 1000,
  })
}

/**
 * TanStack Query hook for a single building.
 * Validates: Requirements 5.4, 5.5
 */
export function useBuilding(id: string) {
  return useQuery({
    queryKey: ['buildings', id],
    queryFn: () => fetchBuilding(id),
    staleTime: 30 * 1000,
    enabled: !!id,
  })
}

/**
 * TanStack Query hook for flats within a building.
 * Validates: Requirement 5.8
 */
export function useBuildingFlats(buildingId: string, page = 1, pageSize = 50) {
  return useQuery({
    queryKey: ['flats', buildingId, page, pageSize],
    queryFn: () => fetchFlatsForBuilding(buildingId, page, pageSize),
    staleTime: 30 * 1000,
    enabled: !!buildingId,
  })
}

/**
 * Mutation hook for creating a building.
 * Validates: Requirements 5.1, 5.2
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
 * Validates: Requirement 5.4
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
