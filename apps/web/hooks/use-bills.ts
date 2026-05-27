'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type AddUtilityChargeInput,
  addUtilityCharge,
  type BillListParams,
  fetchBill,
  fetchBills,
  fetchFlats,
  fetchRenterOptions,
  type GenerateBillsInput,
  generateBills,
} from '@/lib/api-client'

/**
 * TanStack Query hook for bill list with filters and pagination.
 * Validates: Requirements 7.6, 7.7, 7.8, 7.11
 */
export function useBills(params: BillListParams = {}) {
  return useQuery({
    queryKey: ['bills', params],
    queryFn: () => fetchBills(params),
    staleTime: 30 * 1000,
  })
}

/**
 * TanStack Query hook for a single bill detail with line items and payments.
 * Validates: Requirements 7.1, 7.2
 */
export function useBill(id: string) {
  return useQuery({
    queryKey: ['bills', id],
    queryFn: () => fetchBill(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  })
}

/**
 * Mutation hook for generating monthly bills.
 * Validates: Requirements 7.1, 7.6
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
 * Validates: Requirements 7.2, 7.7
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
    queryKey: ['flats', 'options'],
    queryFn: () => fetchFlats({ pageSize: 100 }),
    staleTime: 60 * 1000,
  })
}

/**
 * TanStack Query hook for renter options (used in bill list filter).
 * Returns all renters for the filter dropdown.
 */
export function useRenterOptions() {
  return useQuery({
    queryKey: ['renters', 'options'],
    queryFn: () => fetchRenterOptions(),
    staleTime: 60 * 1000,
  })
}
