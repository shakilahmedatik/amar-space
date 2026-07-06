import {
	fetchBuildingsList,
	fetchFlats,
	fetchRenterOptions,
} from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { OPTIONS_STALE_TIME } from "./constants";

export function useBuildingOptions() {
	return useQuery({
		queryKey: ["buildings", { type: "options" }],
		queryFn: fetchBuildingsList,
		staleTime: OPTIONS_STALE_TIME,
	});
}

export function useFlatOptions(buildingId?: string) {
	return useQuery({
		queryKey: ["flats", { type: "options", buildingId }],
		queryFn: () => fetchFlats({ pageSize: 100, buildingId }),
		staleTime: OPTIONS_STALE_TIME,
		enabled: buildingId !== undefined ? !!buildingId : true,
	});
}

export function useRenterOptions() {
	return useQuery({
		queryKey: ["renters", { type: "options" }],
		queryFn: () => fetchRenterOptions(),
		staleTime: OPTIONS_STALE_TIME,
	});
}
