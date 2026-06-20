"use client";

import { fetchManagerDashboard, fetchOwnerDashboard } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { DEFAULT_STALE_TIME } from "./constants";

/**
 * TanStack Query hook for Owner dashboard data.
 * Fetches: total buildings, flats, occupancy, unpaid bills, recent maintenance, recent audit.
 */
export function useOwnerDashboard() {
	return useQuery({
		queryKey: ["dashboard", "owner"],
		queryFn: fetchOwnerDashboard,
		staleTime: DEFAULT_STALE_TIME,
	});
}

/**
 * TanStack Query hook for Manager dashboard data.
 * Fetches: assigned buildings, flats with occupancy, unpaid bills, pending maintenance.
 */
export function useManagerDashboard() {
	return useQuery({
		queryKey: ["dashboard", "manager"],
		queryFn: fetchManagerDashboard,
		staleTime: DEFAULT_STALE_TIME,
	});
}
