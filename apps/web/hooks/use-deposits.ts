'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ApplyAdjustmentInput,
  applyAdjustment,
  fetchAdjustmentHistory,
  fetchDeposit,
  fetchUnpaidBillsForContract,
} from '@/lib/api-client'
import { DEFAULT_STALE_TIME } from './constants'

/**
 * TanStack Query hook for deposit balance info.
 */
export function useDeposit(contractId: string) {
  return useQuery({
    queryKey: ['deposits', contractId],
    queryFn: () => fetchDeposit(contractId),
    enabled: !!contractId,
    staleTime: DEFAULT_STALE_TIME,
  })
}

/**
 * TanStack Query hook for adjustment history with pagination.
 */
export function useAdjustmentHistory(
  contractId: string,
  page = 1,
  pageSize = 50,
) {
  return useQuery({
    queryKey: ['deposits', contractId, { type: 'history', page, pageSize }],
    queryFn: () => fetchAdjustmentHistory(contractId, page, pageSize),
    enabled: !!contractId,
    staleTime: DEFAULT_STALE_TIME,
  })
}

/**
 * TanStack Query hook for unpaid bills linked to a contract (for bill link dropdown).
 */
export function useUnpaidBillsForContract(contractId: string) {
  return useQuery({
    queryKey: ['bills', { status: 'unpaid', contractId }],
    queryFn: () => fetchUnpaidBillsForContract(contractId),
    enabled: !!contractId,
    staleTime: DEFAULT_STALE_TIME,
  })
}

/**
 * Mutation hook for applying a deposit adjustment.
 */
export function useApplyAdjustment(contractId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ApplyAdjustmentInput) =>
      applyAdjustment(contractId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits', contractId] })
      queryClient.invalidateQueries({
        queryKey: ['deposits', contractId, { type: 'history' }],
      })
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['renters'] })
    },
  })
}
