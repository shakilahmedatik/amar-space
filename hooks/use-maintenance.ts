"use client";

import {
	type AddMaintenanceCommentInput,
	type CreateMaintenanceRequestInput,
	type MaintenanceListParams,
	type UpdateMaintenanceStatusInput,
	addMaintenanceComment,
	createMaintenanceRequest,
	fetchMaintenanceRequest,
	fetchMaintenanceRequests,
	updateMaintenanceStatus,
} from "@/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * TanStack Query hook for maintenance request list with filters and pagination.
 */
export function useMaintenanceRequests(params: MaintenanceListParams = {}) {
	return useQuery({
		queryKey: ["maintenance", params],
		queryFn: () => fetchMaintenanceRequests(params),
	});
}

/**
 * TanStack Query hook for a single maintenance request detail.
 */
export function useMaintenanceRequest(id: string) {
	return useQuery({
		queryKey: ["maintenance", id],
		queryFn: () => fetchMaintenanceRequest(id),
		enabled: !!id,
	});
}

/**
 * Mutation hook for creating a new maintenance request.
 */
export function useCreateMaintenanceRequest() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateMaintenanceRequestInput) =>
			createMaintenanceRequest(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["maintenance"] });
		},
	});
}

/**
 * Mutation hook for updating maintenance request status.
 */
export function useUpdateMaintenanceStatus(requestId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: UpdateMaintenanceStatusInput) =>
			updateMaintenanceStatus(requestId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["maintenance", requestId] });
			queryClient.invalidateQueries({ queryKey: ["maintenance"] });
		},
	});
}

/**
 * Mutation hook for adding a comment to a maintenance request.
 */
export function useAddMaintenanceComment(requestId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: AddMaintenanceCommentInput) =>
			addMaintenanceComment(requestId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["maintenance", requestId] });
		},
	});
}
