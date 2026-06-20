import { apiFetch } from "../api";

export interface FlatSummary {
	id: string;
	flatNumber: string;
	floor: number;
	status: "vacant" | "occupied" | "under_maintenance";
}

export interface FlatPaginatedResponse {
	data: FlatSummary[];
	total: number;
	page: number;
	pageSize: number;
}

export function fetchFlatsForBuilding(
	buildingId: string,
	page = 1,
	pageSize = 50,
): Promise<FlatPaginatedResponse> {
	return apiFetch<FlatPaginatedResponse>(
		`/api/flats?buildingId=${buildingId}&page=${page}&pageSize=${pageSize}`,
	);
}

export type FlatStatus = "vacant" | "occupied" | "under_maintenance";

export interface Flat {
	id: string;
	flatNumber: string;
	floor: number;
	status: FlatStatus;
	buildingId: string;
	buildingName?: string;
	createdAt: string;
	updatedAt: string;
	portalUrl?: string;
}

export interface FlatListResponse {
	data: Flat[];
	total: number;
	page: number;
	pageSize: number;
}

export interface CreateFlatInput {
	flatNumber: string;
	floor: number;
	buildingId: string;
}

export interface UpdateFlatInput {
	flatNumber?: string;
	floor?: number;
	status?: FlatStatus;
}

export interface FlatListParams {
	page?: number;
	pageSize?: number;
	status?: FlatStatus | "";
	buildingId?: string;
}

export function fetchFlats(
	params: FlatListParams = {},
): Promise<FlatListResponse> {
	const searchParams = new URLSearchParams();
	if (params.page) searchParams.set("page", String(params.page));
	if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
	if (params.status) searchParams.set("status", params.status);
	if (params.buildingId) searchParams.set("buildingId", params.buildingId);
	const query = searchParams.toString();
	return apiFetch<FlatListResponse>(`/api/flats${query ? `?${query}` : ""}`);
}

export function fetchFlat(id: string): Promise<Flat> {
	return apiFetch<Flat>(`/api/flats/${id}`);
}

export function createFlat(data: CreateFlatInput): Promise<Flat> {
	return apiFetch<Flat>("/api/flats", {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export function updateFlat(id: string, data: UpdateFlatInput): Promise<Flat> {
	return apiFetch<Flat>(`/api/flats/${id}`, {
		method: "PUT",
		body: JSON.stringify(data),
	});
}

export function deleteFlat(id: string): Promise<void> {
	return apiFetch<void>(`/api/flats/${id}`, {
		method: "DELETE",
	});
}

export interface BuildingOption {
	id: string;
	name: string;
}

export interface BuildingListResponse {
	data: BuildingOption[];
	total: number;
	page: number;
	pageSize: number;
}

export function fetchBuildingsList(): Promise<BuildingListResponse> {
	return apiFetch<BuildingListResponse>("/api/buildings?pageSize=50");
}

export interface VacantFlat {
	id: string;
	flatNumber: string;
	floor: number;
	buildingId: string;
	buildingName?: string;
}

export interface VacantFlatsResponse {
	data: VacantFlat[];
}

export function fetchVacantFlats(): Promise<VacantFlatsResponse> {
	return apiFetch<VacantFlatsResponse>("/api/flats?status=vacant&pageSize=100");
}
