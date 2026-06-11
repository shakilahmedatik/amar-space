import { apiFetch } from '../api'

export interface AdminDashboardStats {
  usersByRole: {
    owner: number
    manager: number
  }
  pendingApprovals: number
  activeSessions: number
}

export interface AdminOwnerListItem {
  id: string
  name: string
  email: string
  approvalStatus: string | null
  createdAt: string
}

export interface AdminOwnerListResponse {
  data: AdminOwnerListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface AdminOwnerListParams {
  page?: number
  pageSize?: number
  status?: 'pending' | 'approved' | 'rejected'
}

export interface AdminUserListItem {
  id: string
  name: string
  email: string
  role: string
  approvalStatus: string | null
  createdAt: string
}

export interface AdminUserListResponse {
  data: AdminUserListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface AdminUserListParams {
  page?: number
  pageSize?: number
  role?: 'superadmin' | 'owner' | 'manager'
}

export function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  return apiFetch<AdminDashboardStats>('/api/admin/dashboard')
}

export function fetchAdminOwners(
  params: AdminOwnerListParams = {},
): Promise<AdminOwnerListResponse> {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
  if (params.status) searchParams.set('status', params.status)
  const query = searchParams.toString()
  return apiFetch<AdminOwnerListResponse>(
    `/api/admin/owners${query ? `?${query}` : ''}`,
  )
}

export function updateOwnerApprovalStatus(
  ownerId: string,
  newStatus: 'pending' | 'approved' | 'rejected',
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/admin/owners/${ownerId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ newStatus }),
  })
}

export function fetchAdminUsers(
  params: AdminUserListParams = {},
): Promise<AdminUserListResponse> {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
  if (params.role) searchParams.set('role', params.role)
  const query = searchParams.toString()
  return apiFetch<AdminUserListResponse>(
    `/api/admin/users${query ? `?${query}` : ''}`,
  )
}

export function deactivateUser(userId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(
    `/api/admin/users/${userId}/deactivate`,
    {
      method: 'PUT',
    },
  )
}
