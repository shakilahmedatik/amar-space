import { apiFetch } from '../api'

export interface StaffMember {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  buildingIds: string[]
  createdAt: string
}

export interface StaffDetail {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  phone: string | null
  buildingIds: string[]
  permissions: string[]
  permissionOverrides: Array<{
    permissionKey: string
    effect: string
  }>
  createdAt: string
  updatedAt: string
}

export interface StaffPaginatedResponse {
  data: StaffMember[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface StaffRoleOption {
  slug: string
  name: string
  description: string | null
  permissions: string[]
}

export interface CreateStaffInput {
  email: string
  password: string
  name: string
  phone?: string | null
  role: string
  buildingIds: string[]
}

export interface CreateStaffResult {
  id: string
  email: string
  name: string
  phone: string | null
  role: string
  buildingIds: string[]
  temporaryPassword: string
}

export interface UpdateStaffInput {
  name?: string
  phone?: string | null
  role?: string
  buildingIds?: string[]
  isActive?: boolean
}

export interface UpdateStaffPermissionsInput {
  overrides: Array<{
    permissionKey: string
    effect: 'grant' | 'deny'
  }>
}

export function fetchStaff(
  page = 1,
  pageSize = 20,
  role?: string,
): Promise<StaffPaginatedResponse> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })
  if (role) params.set('role', role)
  return apiFetch<StaffPaginatedResponse>(`/api/staff?${params.toString()}`)
}

export function fetchStaffMember(id: string): Promise<StaffDetail> {
  return apiFetch<StaffDetail>(`/api/staff/${id}`)
}

export function createStaff(
  data: CreateStaffInput,
): Promise<CreateStaffResult> {
  return apiFetch<CreateStaffResult>('/api/staff', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateStaff(id: string, data: UpdateStaffInput): Promise<null> {
  return apiFetch<null>(`/api/staff/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deactivateStaff(id: string): Promise<null> {
  return apiFetch<null>(`/api/staff/${id}/deactivate`, {
    method: 'PUT',
  })
}

export function reactivateStaff(id: string): Promise<null> {
  return apiFetch<null>(`/api/staff/${id}/reactivate`, {
    method: 'PUT',
  })
}

export function permanentlyDeleteStaff(id: string): Promise<null> {
  return apiFetch<null>(`/api/staff/${id}`, {
    method: 'DELETE',
  })
}

export function updateStaffPermissions(
  id: string,
  data: UpdateStaffPermissionsInput,
): Promise<null> {
  return apiFetch<null>(`/api/staff/${id}/permissions`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function fetchStaffRoles(): Promise<StaffRoleOption[]> {
  return apiFetch<StaffRoleOption[]>('/api/staff/roles')
}
