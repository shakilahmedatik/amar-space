'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type AddUtilityChargeInput,
  addUtilityCharge,
  type BillListParams,
  deleteBill,
  fetchBill,
  fetchBills,
  fetchFlats,
  fetchRenterOptions,
  type GenerateBillForContractInput,
  type GenerateBillsInput,
  generateBillForContract,
  generateBills,
} from '@/lib/api-client'
import { DEFAULT_STALE_TIME, OPTIONS_STALE_TIME } from './constants'

export function useBills(params: BillListParams = {}) {
  return useQuery({
    queryKey: ['bills', params],
    queryFn: () => fetchBills(params),
    staleTime: DEFAULT_STALE_TIME,
  })
}

export function useBill(id: string) {
  return useQuery({
    queryKey: ['bills', id],
    queryFn: () => fetchBill(id),
    enabled: !!id,
    staleTime: DEFAULT_STALE_TIME,
  })
}

export function useGenerateBills() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: GenerateBillsInput) => generateBills(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
    },
  })
}

export function useGenerateBillForContract() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: GenerateBillForContractInput) =>
      generateBillForContract(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
    },
  })
}

export function useAddUtilityCharge(billId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AddUtilityChargeInput) => addUtilityCharge(billId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', billId] })
      queryClient.invalidateQueries({ queryKey: ['bills'] })
    },
  })
}

export function useFlatOptions() {
  return useQuery({
    queryKey: ['flats', { type: 'options' }],
    queryFn: () => fetchFlats({ pageSize: 100 }),
    staleTime: OPTIONS_STALE_TIME,
  })
}

export function useRenterOptions() {
  return useQuery({
    queryKey: ['renters', { type: 'options' }],
    queryFn: () => fetchRenterOptions(),
    staleTime: OPTIONS_STALE_TIME,
  })
}

export function useDeleteBill() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteBill(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
    },
  })
}
