/**
 * API client for communicating with the Fastify backend.
 * All fetch calls include credentials for session cookie.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

/**
 * Generic fetch wrapper with error handling.
 */
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: 'Request failed',
    }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }

  return response.json()
}

// --- Building API Types ---

export interface Building {
  id: string
  name: string
  address: string
  totalFloors: number | null
  createdAt: string
  updatedAt: string
}

export interface BuildingPaginatedResponse {
  data: Building[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
  }
}

export interface CreateBuildingInput {
  name: string
  address: string
  totalFloors?: number | null
}

export interface UpdateBuildingInput {
  name?: string
  address?: string
  totalFloors?: number | null
}

export interface FlatSummary {
  id: string
  flatNumber: string
  floor: number
  status: 'vacant' | 'occupied' | 'under_maintenance'
}

export interface FlatPaginatedResponse {
  data: FlatSummary[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
  }
}

// --- Building API Functions ---

export function fetchBuildings(
  page = 1,
  pageSize = 50,
): Promise<BuildingPaginatedResponse> {
  return apiFetch<BuildingPaginatedResponse>(
    `/api/buildings?page=${page}&pageSize=${pageSize}`,
  )
}

export function fetchBuilding(id: string): Promise<Building> {
  return apiFetch<Building>(`/api/buildings/${id}`)
}

export function createBuilding(data: CreateBuildingInput): Promise<Building> {
  return apiFetch<Building>('/api/buildings', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateBuilding(
  id: string,
  data: UpdateBuildingInput,
): Promise<Building> {
  return apiFetch<Building>(`/api/buildings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function fetchFlatsForBuilding(
  buildingId: string,
  page = 1,
  pageSize = 50,
): Promise<FlatPaginatedResponse> {
  return apiFetch<FlatPaginatedResponse>(
    `/api/flats?buildingId=${buildingId}&page=${page}&pageSize=${pageSize}`,
  )
}

// --- Flat API Types ---

export type FlatStatus = 'vacant' | 'occupied' | 'under_maintenance'

export interface Flat {
  id: string
  flatNumber: string
  floor: number
  status: FlatStatus
  buildingId: string
  buildingName?: string
  createdAt: string
  updatedAt: string
}

export interface FlatListResponse {
  data: Flat[]
  total: number
  page: number
  pageSize: number
}

export interface CreateFlatInput {
  flatNumber: string
  floor: number
  buildingId: string
}

export interface UpdateFlatInput {
  flatNumber?: string
  floor?: number
  status?: FlatStatus
}

export interface FlatListParams {
  page?: number
  pageSize?: number
  status?: FlatStatus | ''
  buildingId?: string
}

// --- Flat API Functions ---

export function fetchFlats(
  params: FlatListParams = {},
): Promise<FlatListResponse> {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
  if (params.status) searchParams.set('status', params.status)
  if (params.buildingId) searchParams.set('buildingId', params.buildingId)
  const query = searchParams.toString()
  return apiFetch<FlatListResponse>(`/api/flats${query ? `?${query}` : ''}`)
}

export function fetchFlat(id: string): Promise<Flat> {
  return apiFetch<Flat>(`/api/flats/${id}`)
}

export function createFlat(data: CreateFlatInput): Promise<Flat> {
  return apiFetch<Flat>('/api/flats', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateFlat(id: string, data: UpdateFlatInput): Promise<Flat> {
  return apiFetch<Flat>(`/api/flats/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteFlat(id: string): Promise<void> {
  return apiFetch<void>(`/api/flats/${id}`, {
    method: 'DELETE',
  })
}

// --- Building List for Flat Forms ---

export interface BuildingOption {
  id: string
  name: string
}

export interface BuildingListResponse {
  data: BuildingOption[]
  total: number
  page: number
  pageSize: number
}

export function fetchBuildingsList(): Promise<BuildingListResponse> {
  return apiFetch<BuildingListResponse>('/api/buildings?pageSize=100')
}

// --- Renter API Types ---

export interface Renter {
  id: string
  fullName: string
  phone: string
  nidNumber: string
  nidPhotoUrl: string | null
  dateOfBirth: string | null
  occupation: string
  bloodGroup: string
  totalFamilyMembers: number
  familyMemberNames: string[] | null
  emergencyContactName: string
  emergencyContactNumber: string
  emergencyContactRelationship: string
  digitalSignatureUrl: string | null
  flatId: string
  flatNumber: string
  buildingName: string
  contractId: string
  monthlyRent: number
  startDate: string
  depositBalance: number
  createdAt: string
  updatedAt: string
}

export interface RenterListItem {
  id: string
  fullName: string
  phone: string
  flatNumber: string
  buildingName: string
  status: string
  createdAt: string
}

export interface RenterListResponse {
  data: RenterListItem[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
  }
}

export interface CreateRenterInput {
  fullName: string
  phone: string
  nidNumber: string
  occupation: string
  bloodGroup: string
  totalFamilyMembers: number
  emergencyContactName: string
  emergencyContactNumber: string
  emergencyContactRelationship: string
  rentalStartDate: string
  advanceAmountPaid: number
  flatId: string
  monthlyRentAmount: number
  dateOfBirth?: string
  familyMemberNames?: string[]
  nidPhoto?: File
  digitalSignature?: File
}

export interface VacantFlat {
  id: string
  flatNumber: string
  floor: number
  buildingId: string
  buildingName?: string
}

export interface VacantFlatsResponse {
  data: VacantFlat[]
}

// --- Renter API Functions ---

export function fetchRenters(
  page = 1,
  pageSize = 50,
): Promise<RenterListResponse> {
  return apiFetch<RenterListResponse>(
    `/api/renters?page=${page}&pageSize=${pageSize}`,
  )
}

export function fetchRenter(id: string): Promise<Renter> {
  return apiFetch<Renter>(`/api/renters/${id}`)
}

export function fetchVacantFlats(): Promise<VacantFlatsResponse> {
  return apiFetch<VacantFlatsResponse>('/api/flats?status=vacant&pageSize=100')
}

export async function createRenter(data: CreateRenterInput): Promise<Renter> {
  const formData = new FormData()

  // Required fields
  formData.append('fullName', data.fullName)
  formData.append('phone', data.phone)
  formData.append('nidNumber', data.nidNumber)
  formData.append('occupation', data.occupation)
  formData.append('bloodGroup', data.bloodGroup)
  formData.append('totalFamilyMembers', String(data.totalFamilyMembers))
  formData.append('emergencyContactName', data.emergencyContactName)
  formData.append('emergencyContactNumber', data.emergencyContactNumber)
  formData.append(
    'emergencyContactRelationship',
    data.emergencyContactRelationship,
  )
  formData.append('rentalStartDate', data.rentalStartDate)
  formData.append('advanceAmountPaid', String(data.advanceAmountPaid))
  formData.append('flatId', data.flatId)
  formData.append('monthlyRentAmount', String(data.monthlyRentAmount))

  // Optional fields
  if (data.dateOfBirth) formData.append('dateOfBirth', data.dateOfBirth)
  if (data.familyMemberNames && data.familyMemberNames.length > 0) {
    formData.append('familyMemberNames', JSON.stringify(data.familyMemberNames))
  }
  if (data.nidPhoto) formData.append('nidPhoto', data.nidPhoto)
  if (data.digitalSignature)
    formData.append('digitalSignature', data.digitalSignature)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const response = await fetch(`${API_URL}/api/renters`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: 'Request failed',
    }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }

  return response.json()
}

// --- Dashboard API Types ---

export interface OwnerDashboardData {
  totalBuildings: number
  totalFlats: number
  occupiedFlats: number
  vacantFlats: number
  unpaidBillsTotal: number
  recentMaintenance: MaintenanceRequestSummary[]
  recentAudit: AuditEntrySummary[]
}

export interface ManagerDashboardData {
  assignedBuildings: BuildingSummary[]
  flats: FlatWithOccupancy[]
  unpaidBillsTotal: number
  pendingMaintenance: MaintenanceRequestSummary[]
}

export interface RenterDashboardData {
  flat: RenterFlatInfo | null
  currentBill: RenterBillInfo | null
  depositBalance: number
  activeMaintenanceRequests: MaintenanceRequestSummary[]
}

export interface BuildingSummary {
  id: string
  name: string
  address: string
  totalFlats: number
}

export interface FlatWithOccupancy {
  id: string
  flatNumber: string
  floor: number
  buildingName: string
  status: 'vacant' | 'occupied' | 'under_maintenance'
}

export interface MaintenanceRequestSummary {
  id: string
  title: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  createdAt: string
  flatNumber?: string
  buildingName?: string
}

export interface AuditEntrySummary {
  id: string
  action: string
  entityType: string
  entityId: string
  actorName: string
  createdAt: string
}

export interface RenterFlatInfo {
  flatNumber: string
  floor: number
  buildingName: string
  buildingAddress: string
}

export interface RenterBillInfo {
  id: string
  billingMonth: string
  totalAmount: number
  paidAmount: number
  status: 'unpaid' | 'partially_paid' | 'paid' | 'overdue'
}

// --- Dashboard API Functions ---

export function fetchOwnerDashboard(): Promise<OwnerDashboardData> {
  return apiFetch<OwnerDashboardData>('/api/dashboard/owner')
}

export function fetchManagerDashboard(): Promise<ManagerDashboardData> {
  return apiFetch<ManagerDashboardData>('/api/dashboard/manager')
}

export function fetchRenterDashboard(): Promise<RenterDashboardData> {
  return apiFetch<RenterDashboardData>('/api/dashboard/renter')
}
