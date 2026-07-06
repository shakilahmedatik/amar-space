"use client";

import {
	type AddUtilityChargeInput,
	type BillListParams,
	type GenerateBillForContractInput,
	type GenerateBillsInput,
	addUtilityCharge,
	deleteBill,
	fetchBill,
	fetchBills,
	fetchFlats,
	fetchRenterOptions,
	generateBillForContract,
	generateBills,
} from "@/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useBills(params: BillListParams = {}) {
	return useQuery({
		queryKey: ["bills", params],
		queryFn: () => fetchBills(params),
	});
}

export function useBill(id: string) {
	return useQuery({
		queryKey: ["bills", id],
		queryFn: () => fetchBill(id),
		enabled: !!id,
	});
}

export function useGenerateBills() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: GenerateBillsInput) => generateBills(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["bills"] });
		},
	});
}

export function useGenerateBillForContract() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: GenerateBillForContractInput) =>
			generateBillForContract(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["bills"] });
		},
	});
}

export function useAddUtilityCharge(billId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: AddUtilityChargeInput) => addUtilityCharge(billId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["bills", billId] });
			queryClient.invalidateQueries({ queryKey: ["bills"] });
		},
	});
}

export function useDeleteBill() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => deleteBill(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["bills"] });
		},
	});
}
