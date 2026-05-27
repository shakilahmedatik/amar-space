'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchPayment,
  fetchPayments,
  fetchRenterOptions,
  fetchUnpaidBills,
  type PaymentListParams,
  type RecordPaymentInput,
  recordPayment,
} from '@/lib/api-client'

/**
 * TanStack Query hook for payment list with filters and pagination.
 * Validates: Requirements 8.5, 8.9
 */
export function usePayments(params: PaymentListParams = {}) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: () => fetchPayments(params),
    staleTime: 30 * 1000,
  })
}

/**
 * TanStack Query hook for a single payment receipt.
 * Validates: Requirement 8.8
 */
export function usePaymentReceipt(id: string) {
  return useQuery({
    queryKey: ['payments', id],
    queryFn: () => fetchPayment(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  })
}

/**
 * TanStack Query hook for unpaid bills (used in payment recording form).
 * Validates: Requirement 8.1
 */
export function useUnpaidBills() {
  return useQuery({
    queryKey: ['bills', 'unpaid'],
    queryFn: fetchUnpaidBills,
    staleTime: 30 * 1000,
  })
}

/**
 * TanStack Query hook for renter options (used in payment filters).
 */
export function useRenterOptions() {
  return useQuery({
    queryKey: ['renters', 'options'],
    queryFn: fetchRenterOptions,
    staleTime: 60 * 1000,
  })
}

/**
 * Mutation hook for recording a payment.
 * Validates: Requirements 8.1, 8.2, 8.3
 */
export function useRecordPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: RecordPaymentInput) => recordPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['bills'] })
    },
  })
}
