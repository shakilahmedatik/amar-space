import { apiFetch } from "../api";

export interface EmergencyContactInput {
	name: string;
	role: string;
	phone?: string | null;
	type: "building" | "nearby";
}

export interface EmergencyContact {
	id: string;
	buildingId: string;
	ownerAccountId: string;
	name: string;
	role: string;
	phone: string | null;
	type: "building" | "nearby";
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

export interface Building {
	id: string;
	name: string;
	address: string;
	totalFloors: number | null;
	whatsappGroupLink?: string | null;
	managerPhone?: string | null;
	coverImageUrl?: string | null;
	logoUrl?: string | null;
	rules?: string | null;
	createdAt: string;
	updatedAt: string;
	emergencyContacts?: EmergencyContact[];
}

export interface BuildingPaginatedResponse {
	data: Building[];
	total: number;
	page: number;
	pageSize: number;
}

export interface CreateBuildingInput {
	name: string;
	address: string;
	totalFloors?: number | null;
	whatsappGroupLink?: string | null;
	managerPhone?: string | null;
	buildingPhoto?: string | null;
	logoPhoto?: string | null;
	rules?: string | null;
	emergencyContacts?: EmergencyContactInput[];
}

export interface UpdateBuildingInput {
	name?: string;
	address?: string;
	totalFloors?: number | null;
	whatsappGroupLink?: string | null;
	managerPhone?: string | null;
	buildingPhoto?: string | null;
	logoPhoto?: string | null;
	rules?: string | null;
	emergencyContacts?: EmergencyContactInput[];
}

export function fetchBuildings(
	page = 1,
	pageSize = 50,
): Promise<BuildingPaginatedResponse> {
	return apiFetch<BuildingPaginatedResponse>(
		`/api/buildings?page=${page}&pageSize=${pageSize}`,
	);
}

export function fetchBuilding(id: string): Promise<Building> {
	return apiFetch<Building>(`/api/buildings/${id}`);
}

export function createBuilding(data: CreateBuildingInput): Promise<Building> {
	return apiFetch<Building>("/api/buildings", {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export function updateBuilding(
	id: string,
	data: UpdateBuildingInput,
): Promise<Building> {
	return apiFetch<Building>(`/api/buildings/${id}`, {
		method: "PUT",
		body: JSON.stringify(data),
	});
}
