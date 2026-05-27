'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ApplyAdjustmentInput,
  applyAdjustment,
  fetchAdjustmentHistory,
  fetchDeposit,
  fetchUnpaidBillsForContract,
} from '@/lib/api-client'

/**
 * TanStack Query hook for deposit balance info.
 * Validates: Requirements 9.7, 9.12
 */
export function useDeposit(contractId: string) {
  return useQuery({
    queryKey: ['deposits', contractId],
    queryFn: () => fetchDeposit(contractId),
    enabled: !!contractId,
    staleTime: 30 * 1000,
  })
}

/**
 * TanStack Query hook for adjustment history with pagination.
 * Validates: Requirements 9.11
 */
export function useAdjustmentHistory(
  contractId: string,
  page = 1,
  pageSize = 50,
) {
  return useQuery({
    queryKey: ['deposits', contractId, 'history', page, pageSize],
    queryFn: () => fetchAdjustmentHistory(contractId, page, pageSize),
    enabled: !!contractId,
    staleTime: 30 * 1000,
  })
}

/**
 * TanStack Query hook for unpaid bills linked to a contract (for bill link dropdown).
 * Validates: Requirements 9.8
 */
export function useUnpaidBillsForContract(contractId: string) {
  return useQuery({
    queryKey: ['bills', 'unpaid', contractId],
    queryFn: () => fetchUnpaidBillsForContract(contractId),
    enabled: !!contractId,
    staleTime: 30 * 1000,
  })
}

/**
 * Mutation hook for applying a deposit adjustment.
 * Validates: Requirements 9.7, 9.8, 9.9
 */
export function useApplyAdjustment(contractId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ApplyAdjustmentInput) =>
      applyAdjustment(contractId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits', contractId] })
      queryClient.invalidateQueries({
        queryKey: ['deposits', contractId, 'history'],
      })
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['renters'] })
    },
  })
}
