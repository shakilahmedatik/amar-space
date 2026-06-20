"use client";

import {
	type AdminOwnerListParams,
	type AdminUserListParams,
	deactivateUser,
	fetchAdminDashboardStats,
	fetchAdminOwners,
	fetchAdminUsers,
	updateOwnerApprovalStatus,
} from "@/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_STALE_TIME } from "./constants";

export function useAdminDashboard() {
	return useQuery({
		queryKey: ["admin", "dashboard"],
		queryFn: fetchAdminDashboardStats,
		staleTime: DEFAULT_STALE_TIME,
	});
}

export function useAdminOwners(params: AdminOwnerListParams = {}) {
	return useQuery({
		queryKey: ["admin", "owners", params],
		queryFn: () => fetchAdminOwners(params),
		staleTime: DEFAULT_STALE_TIME,
	});
}

export function useUpdateOwnerApproval() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			ownerId,
			newStatus,
		}: {
			ownerId: string;
			newStatus: "pending" | "approved" | "rejected";
		}) => updateOwnerApprovalStatus(ownerId, newStatus),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin", "owners"] });
			queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
		},
	});
}

export function useAdminUsers(params: AdminUserListParams = {}) {
	return useQuery({
		queryKey: ["admin", "users", params],
		queryFn: () => fetchAdminUsers(params),
		staleTime: DEFAULT_STALE_TIME,
	});
}

export function useDeactivateUser() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (userId: string) => deactivateUser(userId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
			queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
		},
	});
}
