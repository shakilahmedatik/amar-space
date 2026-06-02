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
  type GenerateBillsInput,
  generateBills,
} from '@/lib/api-client'
import { DEFAULT_STALE_TIME, OPTIONS_STALE_TIME } from './constants'

/**
 * TanStack Query hook for bill list with filters and pagination.
 */
export function useBills(params: BillListParams = {}) {
  return useQuery({
    queryKey: ['bills', params],
    queryFn: () => fetchBills(params),
    staleTime: DEFAULT_STALE_TIME,
  })
}

/**
 * TanStack Query hook for a single bill detail with line items and payments.
 */
export function useBill(id: string) {
  return useQuery({
    queryKey: ['bills', id],
    queryFn: () => fetchBill(id),
    enabled: !!id,
    staleTime: DEFAULT_STALE_TIME,
  })
}

/**
 * Mutation hook for generating monthly bills.
 */
export function useGenerateBills() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: GenerateBillsInput) => generateBills(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
    },
  })
}

/**
 * Mutation hook for adding a utility charge to a bill.
 */
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

/**
 * TanStack Query hook for flat options (used in bill list filter).
 * Returns all flats for the filter dropdown.
 */
export function useFlatOptions() {
  return useQuery({
    queryKey: ['flats', { type: 'options' }],
    queryFn: () => fetchFlats({ pageSize: 100 }),
    staleTime: OPTIONS_STALE_TIME,
  })
}

/**
 * TanStack Query hook for renter options (used in bill list filter).
 * Returns all renters for the filter dropdown.
 */
export function useRenterOptions() {
  return useQuery({
    queryKey: ['renters', { type: 'options' }],
    queryFn: () => fetchRenterOptions(),
    staleTime: OPTIONS_STALE_TIME,
  })
}

/**
 * Mutation hook for deleting a bill.
 */
export function useDeleteBill() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteBill(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
    },
  })
}
