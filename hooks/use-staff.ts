"use client";

import {
	type CreateStaffInput,
	type UpdateStaffInput,
	type UpdateStaffPermissionsInput,
	createStaff,
	deactivateStaff,
	fetchStaff,
	fetchStaffMember,
	fetchStaffRoles,
	permanentlyDeleteStaff,
	reactivateStaff,
	updateStaff,
	updateStaffPermissions,
} from "@/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_STALE_TIME, OPTIONS_STALE_TIME } from "./constants";

export function useStaff(page = 1, pageSize = 20, role?: string) {
	return useQuery({
		queryKey: ["staff", { page, pageSize, role }],
		queryFn: () => fetchStaff(page, pageSize, role),
		staleTime: DEFAULT_STALE_TIME,
	});
}

export function useStaffMember(id: string) {
	return useQuery({
		queryKey: ["staff", id],
		queryFn: () => fetchStaffMember(id),
		staleTime: DEFAULT_STALE_TIME,
		enabled: !!id,
	});
}

export function useStaffRoles() {
	return useQuery({
		queryKey: ["staff", "roles"],
		queryFn: fetchStaffRoles,
		staleTime: OPTIONS_STALE_TIME,
	});
}

export function useCreateStaff() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateStaffInput) => createStaff(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["staff"] });
		},
	});
}

export function useUpdateStaff(id: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: UpdateStaffInput) => updateStaff(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["staff"] });
			queryClient.invalidateQueries({ queryKey: ["staff", id] });
		},
	});
}

export function useDeactivateStaff() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => deactivateStaff(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["staff"] });
		},
	});
}

export function useReactivateStaff() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => reactivateStaff(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["staff"] });
		},
	});
}

export function useDeleteStaff() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => permanentlyDeleteStaff(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["staff"] });
		},
	});
}

export function useUpdateStaffPermissions(id: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: UpdateStaffPermissionsInput) =>
			updateStaffPermissions(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["staff", id] });
		},
	});
}
