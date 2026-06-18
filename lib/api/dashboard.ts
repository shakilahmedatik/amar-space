import { apiFetch } from "../api";

export interface OwnerDashboardData {
	totalBuildings: number;
	totalFlats: number;
	occupiedFlats: number;
	vacantFlats: number;
	unpaidBillsTotal: number;
	recentMaintenance: MaintenanceRequestSummary[];
	recentAudit: AuditEntrySummary[];
}

export interface ManagerDashboardData {
	assignedBuildings: BuildingSummary[];
	flats: FlatWithOccupancy[];
	unpaidBillsTotal: number;
	pendingMaintenance: MaintenanceRequestSummary[];
}

export interface BuildingSummary {
	id: string;
	name: string;
	address: string;
	totalFlats: number;
}

export interface FlatWithOccupancy {
	id: string;
	flatNumber: string;
	floor: number;
	buildingName: string;
	status: "vacant" | "occupied" | "under_maintenance";
}

export interface MaintenanceRequestSummary {
	id: string;
	title: string;
	priority: "low" | "medium" | "high" | "urgent";
	status: "open" | "in_progress" | "resolved" | "closed";
	createdAt: string;
	flatNumber?: string;
	buildingName?: string;
}

export interface AuditEntrySummary {
	id: string;
	action: string;
	entityType: string;
	entityId: string;
	actorName: string;
	createdAt: string;
}

export function fetchOwnerDashboard(): Promise<OwnerDashboardData> {
	return apiFetch<OwnerDashboardData>("/api/dashboard/owner");
}

export function fetchManagerDashboard(): Promise<ManagerDashboardData> {
	return apiFetch<ManagerDashboardData>("/api/dashboard/manager");
}
