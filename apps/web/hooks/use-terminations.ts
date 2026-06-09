'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelTermination,
  type DepositRefundResult,
  executeTermination,
  fetchDepositRefund,
  processDepositRefund,
  scheduleTermination,
} from '@/lib/api-client'
import { DEFAULT_STALE_TIME } from './constants'

export function useScheduleTermination() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      renterId,
      terminationMonth,
      reason,
    }: {
      renterId: string
      terminationMonth: string
      reason?: string
    }) => scheduleTermination(renterId, { terminationMonth, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renters'] })
      queryClient.invalidateQueries({ queryKey: ['flats'] })
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['deposits'] })
    },
  })
}

export function useCancelTermination() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (renterId: string) => cancelTermination(renterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renters'] })
      queryClient.invalidateQueries({ queryKey: ['flats'] })
      queryClient.invalidateQueries({ queryKey: ['bills'] })
    },
  })
}

export function useExecuteTermination() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (renterId: string) => executeTermination(renterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renters'] })
      queryClient.invalidateQueries({ queryKey: ['flats'] })
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['deposits'] })
    },
  })
}

export function useDepositRefund(renterId: string, enabled = true) {
  return useQuery<DepositRefundResult>({
    queryKey: ['deposit-refund', renterId],
    queryFn: () => fetchDepositRefund(renterId),
    enabled: enabled && !!renterId,
    staleTime: DEFAULT_STALE_TIME,
  })
}

export function useRefundDeposit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      renterId,
      refundAmount,
      note,
    }: {
      renterId: string
      refundAmount: number
      note?: string
    }) => processDepositRefund(renterId, { refundAmount, note }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['deposit-refund', variables.renterId],
      })
      queryClient.invalidateQueries({ queryKey: ['deposits'] })
      queryClient.invalidateQueries({ queryKey: ['renters'] })
      queryClient.invalidateQueries({ queryKey: ['bills'] })
    },
  })
}
