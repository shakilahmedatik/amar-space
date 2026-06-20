"use client";

import {
	type PaymentListParams,
	type RecordPaymentInput,
	deletePayment,
	fetchPayment,
	fetchPayments,
	fetchRenterOptions,
	fetchUnpaidBills,
	recordPayment,
} from "@/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_STALE_TIME, OPTIONS_STALE_TIME } from "./constants";

/**
 * TanStack Query hook for payment list with filters and pagination.
 */
export function usePayments(params: PaymentListParams = {}) {
	return useQuery({
		queryKey: ["payments", params],
		queryFn: () => fetchPayments(params),
		staleTime: DEFAULT_STALE_TIME,
	});
}

/**
 * TanStack Query hook for a single payment receipt.
 */
export function usePaymentReceipt(id: string) {
	return useQuery({
		queryKey: ["payments", id],
		queryFn: () => fetchPayment(id),
		enabled: !!id,
		staleTime: DEFAULT_STALE_TIME,
	});
}

/**
 * TanStack Query hook for unpaid bills (used in payment recording form).
 */
export function useUnpaidBills() {
	return useQuery({
		queryKey: ["bills", { status: "unpaid" }],
		queryFn: fetchUnpaidBills,
		staleTime: DEFAULT_STALE_TIME,
	});
}

/**
 * TanStack Query hook for renter options (used in payment filters).
 */
export function useRenterOptions() {
	return useQuery({
		queryKey: ["renters", { type: "options" }],
		queryFn: fetchRenterOptions,
		staleTime: OPTIONS_STALE_TIME,
	});
}

/**
 * Mutation hook for recording a payment.
 */
export function useRecordPayment() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: RecordPaymentInput) => recordPayment(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["payments"] });
			queryClient.invalidateQueries({ queryKey: ["bills"] });
		},
	});
}

/**
 * Mutation hook for deleting a payment.
 */
export function useDeletePayment(billId?: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => deletePayment(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["payments"] });
			queryClient.invalidateQueries({ queryKey: ["bills"] });
			if (billId) {
				queryClient.invalidateQueries({ queryKey: ["bills", billId] });
			}
		},
	});
}
