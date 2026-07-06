"use client";

import {
	type CreateRenterInput,
	createRenter,
	fetchRenter,
	fetchRenters,
	fetchVacantFlats,
	resetRenterAccessCode,
} from "@/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * TanStack Query hook for renter list with pagination.
 */
export function useRenters(
	page = 1,
	pageSize = 50,
	options?: { enabled?: boolean },
) {
	return useQuery({
		queryKey: ["renters", { page, pageSize }],
		queryFn: () => fetchRenters(page, pageSize),
		enabled: options?.enabled,
	});
}

/**
 * TanStack Query hook for a single renter detail.
 */
export function useRenter(id: string) {
	return useQuery({
		queryKey: ["renters", id],
		queryFn: () => fetchRenter(id),
		enabled: !!id,
	});
}

/**
 * TanStack Query hook for vacant flats (used in renter registration form).
 */
export function useVacantFlats() {
	return useQuery({
		queryKey: ["flats", { status: "vacant" }],
		queryFn: fetchVacantFlats,
	});
}

/**
 * Mutation hook for registering a new renter.
 */
export function useCreateRenter() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateRenterInput) => createRenter(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["renters"] });
			queryClient.invalidateQueries({ queryKey: ["flats"] });
		},
	});
}

/**
 * Mutation hook for resetting a renter's access code.
 */
export function useResetRenterAccessCode() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => resetRenterAccessCode(id),
		onSuccess: (_data, id) => {
			queryClient.invalidateQueries({ queryKey: ["renters"] });
			queryClient.invalidateQueries({ queryKey: ["renters", id] });
		},
	});
}
