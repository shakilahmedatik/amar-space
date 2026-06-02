/**
 * API client for communicating with the Fastify backend.
 * All fetch calls include credentials for session cookie.
 */

import { apiFetch, BASE_URL } from './api'

export { apiFetch }

// --- Building API Types ---

export interface EmergencyContactInput {
  name: string
  role: string
  phone?: string | null
  type: 'building' | 'nearby'
}

export interface EmergencyContact {
  id: string
  buildingId: string
  ownerAccountId: string
  name: string
  role: string
  phone: string | null
  type: 'building' | 'nearby'
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface Building {
  id: string
  name: string
  address: string
  totalFloors: number | null
  whatsappGroupLink?: string | null
  managerPhone?: string | null
  coverImageUrl?: string | null
  logoUrl?: string | null
  rules?: string | null
  createdAt: string
  updatedAt: string
  emergencyContacts?: EmergencyContact[]
}

export interface BuildingPaginatedResponse {
  data: Building[]
  total: number
  page: number
  pageSize: number
}

export interface CreateBuildingInput {
  name: string
  address: string
  totalFloors?: number | null
  whatsappGroupLink?: string | null
  managerPhone?: string | null
  buildingPhoto?: string | null
  logoPhoto?: string | null
  rules?: string | null
  emergencyContacts?: EmergencyContactInput[]
}

export interface UpdateBuildingInput {
  name?: string
  address?: string
  totalFloors?: number | null
  whatsappGroupLink?: string | null
  managerPhone?: string | null
  buildingPhoto?: string | null
  logoPhoto?: string | null
  rules?: string | null
  emergencyContacts?: EmergencyContactInput[]
}

export interface FlatSummary {
  id: string
  flatNumber: string
  floor: number
  status: 'vacant' | 'occupied' | 'under_maintenance'
}

export interface FlatPaginatedResponse {
  data: FlatSummary[]
  total: number
  page: number
  pageSize: number
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
  return apiFetch<BuildingListResponse>('/api/buildings?pageSize=50')
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
  selfiePhotoUrl: string | null
  flatId: string
  flatNumber: string
  buildingName: string
  contractId: string
  monthlyRent: number
  startDate: string
  depositBalance: number
  accessCode: string | null
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
  total: number
  page: number
  pageSize: number
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

export function resetRenterAccessCode(
  id: string,
): Promise<{ success: boolean; message: string; code: string }> {
  return apiFetch<{ success: boolean; message: string; code: string }>(
    `/api/renters/${id}/reset-code`,
    {
      method: 'POST',
    },
  )
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
  formData.append('startDate', data.rentalStartDate)
  formData.append('advanceAmount', String(data.advanceAmountPaid))
  formData.append('flatId', data.flatId)
  formData.append('monthlyRent', String(data.monthlyRentAmount))

  // Optional fields
  if (data.dateOfBirth) formData.append('dateOfBirth', data.dateOfBirth)
  if (data.familyMemberNames && data.familyMemberNames.length > 0) {
    formData.append('familyMemberNames', JSON.stringify(data.familyMemberNames))
  }
  if (data.nidPhoto) formData.append('nidPhoto', data.nidPhoto)
  if (data.digitalSignature)
    formData.append('digitalSignature', data.digitalSignature)

  const response = await fetch(`${BASE_URL}/api/renters`, {
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

// --- Deposit API Types ---

export interface DepositInfo {
  contractId: string
  securityDepositAmount: number
  remainingDepositBalance: number
  renterName: string
  flatNumber: string
}

export interface AdvanceAdjustment {
  id: string
  contractId: string
  amount: number
  billId: string | null
  note: string | null
  adjustedBy: string
  adjustedByName: string
  createdAt: string
}

export interface AdjustmentListResponse {
  data: AdvanceAdjustment[]
  total: number
  page: number
  pageSize: number
}

export interface ApplyAdjustmentInput {
  amount: number
  billId?: string
  note?: string
}

export interface BillOption {
  id: string
  billingMonth: string
  totalAmount: number
  paidAmount: number
  outstanding: number
}

export interface BillOptionsResponse {
  data: BillOption[]
}

// --- Deposit API Functions ---

export function fetchDeposit(contractId: string): Promise<DepositInfo> {
  return apiFetch<DepositInfo>(`/api/deposits/${contractId}`)
}

export function fetchAdjustmentHistory(
  contractId: string,
  page = 1,
  pageSize = 50,
): Promise<AdjustmentListResponse> {
  return apiFetch<AdjustmentListResponse>(
    `/api/deposits/${contractId}/history?page=${page}&pageSize=${pageSize}`,
  )
}

export function applyAdjustment(
  contractId: string,
  data: ApplyAdjustmentInput,
): Promise<AdvanceAdjustment> {
  return apiFetch<AdvanceAdjustment>(`/api/deposits/${contractId}/adjust`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function fetchUnpaidBillsForContract(
  contractId: string,
): Promise<BillOptionsResponse> {
  return apiFetch<BillOptionsResponse>(
    `/api/bills?contractId=${contractId}&status=unpaid&status=partially_paid&status=overdue&pageSize=50`,
  )
}

// --- Bill API Types ---

export type BillStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue'

export interface BillListItem {
  id: string
  flatNumber: string
  buildingName: string
  renterName: string
  billingMonth: string
  baseRent: number
  totalAmount: number
  paidAmount: number
  status: BillStatus
  createdAt: string
}

export interface BillLineItem {
  id: string
  description: string
  amount: number
  createdAt: string
}

export interface BillPayment {
  id: string
  amount: number
  paymentDate: string
  paymentMethod: string
  receiptReference: string
  note: string | null
  createdAt: string
}

export interface BillDetail {
  id: string
  contractId: string
  flatId: string
  flatNumber: string
  buildingName: string
  renterId: string
  renterName: string
  billingMonth: string
  baseRent: number
  totalAmount: number
  paidAmount: number
  status: BillStatus
  lineItems: BillLineItem[]
  payments: BillPayment[]
  createdAt: string
  updatedAt: string
}

export interface BillListResponse {
  data: BillListItem[]
  total: number
  page: number
  pageSize: number
}

export interface BillListParams {
  page?: number
  pageSize?: number
  buildingId?: string
  flatId?: string
  renterId?: string
  month?: string
  status?: BillStatus | ''
}

export interface GenerateBillsInput {
  billingMonth: string // YYYY-MM
}

export interface GenerateBillsResponse {
  generated: number
  skipped: number
  errors: string[]
}

export interface AddUtilityChargeInput {
  description: string
  amount: number
}

// --- Bill API Functions ---

export function fetchBills(
  params: BillListParams = {},
): Promise<BillListResponse> {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
  if (params.buildingId) searchParams.set('buildingId', params.buildingId)
  if (params.flatId) searchParams.set('flatId', params.flatId)
  if (params.renterId) searchParams.set('renterId', params.renterId)
  if (params.month) searchParams.set('month', params.month)
  if (params.status) searchParams.set('status', params.status)
  const query = searchParams.toString()
  return apiFetch<BillListResponse>(`/api/bills${query ? `?${query}` : ''}`)
}

export function fetchBill(id: string): Promise<BillDetail> {
  return apiFetch<BillDetail>(`/api/bills/${id}`)
}

export function generateBills(
  data: GenerateBillsInput,
): Promise<GenerateBillsResponse> {
  return apiFetch<GenerateBillsResponse>('/api/bills/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function addUtilityCharge(
  billId: string,
  data: AddUtilityChargeInput,
): Promise<BillDetail> {
  return apiFetch<BillDetail>(`/api/bills/${billId}/charges`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// --- Payment API Types ---

export type PaymentMethod = 'cash' | 'bank_transfer' | 'mobile_banking'

export interface Payment {
  id: string
  billId: string
  receiptReference: string
  amount: number
  paymentDate: string
  paymentMethod: PaymentMethod
  note: string | null
  createdAt: string
  renterName?: string
  flatNumber?: string
  buildingName?: string
  billingMonth?: string
}

export interface PaymentListResponse {
  data: Payment[]
  total: number
  page: number
  pageSize: number
}

export interface PaymentListParams {
  page?: number
  pageSize?: number
  billId?: string
  renterId?: string
  startDate?: string
  endDate?: string
  method?: PaymentMethod | ''
}

export interface RecordPaymentInput {
  billId: string
  amount: number
  paymentDate: string
  paymentMethod: PaymentMethod
  note?: string
}

export interface PaymentReceipt {
  id: string
  receiptReference: string
  amount: number
  paymentDate: string
  paymentMethod: PaymentMethod
  note: string | null
  createdAt: string
  billId: string
  billingMonth: string
  renterName: string
  flatNumber: string
  buildingName: string
  totalBillAmount: number
  paidAmount: number
  remainingBalance: number
}

// --- Payment API Functions ---

export function fetchPayments(
  params: PaymentListParams = {},
): Promise<PaymentListResponse> {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
  if (params.billId) searchParams.set('billId', params.billId)
  if (params.renterId) searchParams.set('renterId', params.renterId)
  if (params.startDate) searchParams.set('startDate', params.startDate)
  if (params.endDate) searchParams.set('endDate', params.endDate)
  if (params.method) searchParams.set('method', params.method)
  const query = searchParams.toString()
  return apiFetch<PaymentListResponse>(
    `/api/payments${query ? `?${query}` : ''}`,
  )
}

export function fetchPayment(id: string): Promise<PaymentReceipt> {
  return apiFetch<PaymentReceipt>(`/api/payments/${id}`)
}

export function recordPayment(data: RecordPaymentInput): Promise<Payment> {
  return apiFetch<Payment>('/api/payments', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// --- Bill Utility Functions ---

export function fetchUnpaidBills(): Promise<BillListResponse> {
  return apiFetch<BillListResponse>('/api/bills?status=unpaid&pageSize=100')
}

// --- Renter List for Filters ---

export interface RenterOption {
  id: string
  fullName: string
}

export interface RenterOptionsResponse {
  data: RenterOption[]
  total: number
  page: number
  pageSize: number
}

export function fetchRenterOptions(): Promise<RenterOptionsResponse> {
  return apiFetch<RenterOptionsResponse>('/api/renters?pageSize=100')
}

// --- Issue API Types ---

export type IssueCategory =
  | 'plumbing'
  | 'electrical'
  | 'structural'
  | 'cleaning'
  | 'security'
  | 'other'

export type IssuePriority = 'low' | 'medium' | 'high' | 'urgent'

export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface Issue {
  id: string
  buildingId: string
  buildingName?: string
  title: string
  description: string
  category: IssueCategory
  priority: IssuePriority
  status: IssueStatus
  assigneeId: string | null
  assigneeName?: string | null
  resolutionNotes: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface IssueListItem {
  id: string
  buildingName: string
  title: string
  category: IssueCategory
  priority: IssuePriority
  status: IssueStatus
  assigneeName: string | null
  createdAt: string
}

export interface IssueListResponse {
  data: IssueListItem[]
  total: number
  page: number
  pageSize: number
}

export interface IssueListParams {
  page?: number
  pageSize?: number
  buildingId?: string
  category?: IssueCategory | ''
  status?: IssueStatus | ''
  priority?: IssuePriority | ''
  assigneeId?: string
}

export interface CreateIssueInput {
  buildingId: string
  title: string
  description: string
  category: IssueCategory
  priority: IssuePriority
}

export interface UpdateIssueStatusInput {
  status: IssueStatus
  resolutionNotes?: string
}

export interface AssignIssueInput {
  assigneeId: string
}

export interface ManagerOption {
  id: string
  name: string
  email: string
}

export interface ManagerOptionsResponse {
  data: ManagerOption[]
  total: number
  page: number
  pageSize: number
}

// --- Issue API Functions ---

export function fetchIssues(
  params: IssueListParams = {},
): Promise<IssueListResponse> {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
  if (params.buildingId) searchParams.set('buildingId', params.buildingId)
  if (params.category) searchParams.set('category', params.category)
  if (params.status) searchParams.set('status', params.status)
  if (params.priority) searchParams.set('priority', params.priority)
  if (params.assigneeId) searchParams.set('assigneeId', params.assigneeId)
  const query = searchParams.toString()
  return apiFetch<IssueListResponse>(`/api/issues${query ? `?${query}` : ''}`)
}

export function fetchIssue(id: string): Promise<Issue> {
  return apiFetch<Issue>(`/api/issues/${id}`)
}

export function createIssue(data: CreateIssueInput): Promise<Issue> {
  return apiFetch<Issue>('/api/issues', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateIssueStatus(
  id: string,
  data: UpdateIssueStatusInput,
): Promise<Issue> {
  return apiFetch<Issue>(`/api/issues/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function assignIssue(
  id: string,
  data: AssignIssueInput,
): Promise<Issue> {
  return apiFetch<Issue>(`/api/issues/${id}/assign`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// TODO: Backend needs a GET /api/users?role=manager endpoint to list managers
// Currently no backend endpoint supports filtering users by role
export async function fetchManagerOptions(): Promise<ManagerOptionsResponse> {
  try {
    return await apiFetch<ManagerOptionsResponse>(
      '/api/users?role=manager&pageSize=100',
    )
  } catch {
    return { data: [], total: 0, page: 1, pageSize: 100 }
  }
}

// --- Maintenance API Types ---

export type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent'
export type MaintenanceStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface MaintenanceRequestListItem {
  id: string
  title: string
  priority: MaintenancePriority
  status: MaintenanceStatus
  flatNumber: string
  buildingName: string
  renterName: string
  createdAt: string
}

export interface MaintenanceAttachment {
  id: string
  fileUrl: string
  fileName: string
  fileSize: number
  mimeType: string
  createdAt: string
}

export interface MaintenanceComment {
  id: string
  authorId: string
  authorName: string
  content: string
  createdAt: string
}

export interface MaintenanceRequestDetail {
  id: string
  title: string
  description: string
  priority: MaintenancePriority
  status: MaintenanceStatus
  flatId: string
  flatNumber: string
  buildingId: string
  buildingName: string
  renterId: string
  renterName: string
  attachments: MaintenanceAttachment[]
  comments: MaintenanceComment[]
  createdAt: string
  updatedAt: string
}

export interface MaintenanceListResponse {
  data: MaintenanceRequestListItem[]
  total: number
  page: number
  pageSize: number
}

export interface MaintenanceListParams {
  page?: number
  pageSize?: number
  buildingId?: string
  flatId?: string
  status?: MaintenanceStatus | ''
  priority?: MaintenancePriority | ''
}

export interface CreateMaintenanceRequestInput {
  title: string
  description: string
  priority: MaintenancePriority
  attachments?: File[]
}

export interface UpdateMaintenanceStatusInput {
  status: MaintenanceStatus
}

export interface AddMaintenanceCommentInput {
  content: string
}

// --- Maintenance API Functions ---

export function fetchMaintenanceRequests(
  params: MaintenanceListParams = {},
): Promise<MaintenanceListResponse> {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
  if (params.buildingId) searchParams.set('buildingId', params.buildingId)
  if (params.flatId) searchParams.set('flatId', params.flatId)
  if (params.status) searchParams.set('status', params.status)
  if (params.priority) searchParams.set('priority', params.priority)
  const query = searchParams.toString()
  return apiFetch<MaintenanceListResponse>(
    `/api/maintenance${query ? `?${query}` : ''}`,
  )
}

export function fetchMaintenanceRequest(
  id: string,
): Promise<MaintenanceRequestDetail> {
  return apiFetch<MaintenanceRequestDetail>(`/api/maintenance/${id}`)
}

export async function createMaintenanceRequest(
  data: CreateMaintenanceRequestInput,
): Promise<MaintenanceRequestDetail> {
  const formData = new FormData()
  formData.append('title', data.title)
  formData.append('description', data.description)
  formData.append('priority', data.priority)

  if (data.attachments) {
    for (const file of data.attachments) {
      formData.append('attachments', file)
    }
  }

  const headers: Record<string, string> = {}
  if (
    typeof window !== 'undefined' &&
    window.location.pathname.startsWith('/f/')
  ) {
    headers['x-portal-request'] = 'true'
  }

  const response = await fetch(`${BASE_URL}/api/maintenance`, {
    method: 'POST',
    credentials: 'include',
    headers,
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

export function updateMaintenanceStatus(
  id: string,
  data: UpdateMaintenanceStatusInput,
): Promise<MaintenanceRequestDetail> {
  return apiFetch<MaintenanceRequestDetail>(`/api/maintenance/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function addMaintenanceComment(
  id: string,
  data: AddMaintenanceCommentInput,
): Promise<MaintenanceComment> {
  return apiFetch<MaintenanceComment>(`/api/maintenance/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// --- Audit Log API Types ---

export interface AuditLogEntry {
  id: string
  action: string
  entityType: string
  entityId: string
  actorId: string
  actorName: string
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export interface AuditLogListResponse {
  data: AuditLogEntry[]
  total: number
  page: number
  pageSize: number
}

export interface AuditLogListParams {
  page?: number
  pageSize?: number
  entityType?: string
  entityId?: string
  actorId?: string
  action?: string
  startDate?: string
  endDate?: string
}

// --- Audit Log API Functions ---

export function fetchAuditLogs(
  params: AuditLogListParams = {},
): Promise<AuditLogListResponse> {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
  if (params.entityType) searchParams.set('entityType', params.entityType)
  if (params.entityId) searchParams.set('entityId', params.entityId)
  if (params.actorId) searchParams.set('actorId', params.actorId)
  if (params.action) searchParams.set('action', params.action)
  if (params.startDate) searchParams.set('startDate', params.startDate)
  if (params.endDate) searchParams.set('endDate', params.endDate)
  const query = searchParams.toString()
  return apiFetch<AuditLogListResponse>(`/api/audit${query ? `?${query}` : ''}`)
}

// --- Notice API Types ---

export type NoticeTargetAudience =
  | 'all_renters'
  | 'specific_building'
  | 'specific_flat'
  | 'managers_only'

export interface Notice {
  id: string
  authorId: string
  authorName?: string
  title: string
  body: string
  targetAudience: NoticeTargetAudience
  targetBuildingId: string | null
  targetBuildingName?: string | null
  targetFlatId: string | null
  targetFlatNumber?: string | null
  isPinned: boolean
  pinnedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface NoticeListItem {
  id: string
  authorName: string
  title: string
  targetAudience: NoticeTargetAudience
  targetBuildingName: string | null
  targetFlatNumber: string | null
  isPinned: boolean
  createdAt: string
}

export interface NoticeListResponse {
  data: NoticeListItem[]
  total: number
  page: number
  pageSize: number
}

export interface NoticeListParams {
  page?: number
  pageSize?: number
  targetAudience?: NoticeTargetAudience | ''
  pinned?: boolean | ''
}

export interface CreateNoticeInput {
  title: string
  body: string
  targetAudience: NoticeTargetAudience
  targetBuildingId?: string
  targetFlatId?: string
}

export interface UpdateNoticeInput {
  title?: string
  body?: string
  targetAudience?: NoticeTargetAudience
  targetBuildingId?: string | null
  targetFlatId?: string | null
}

// --- Notice API Functions ---

export function fetchNotices(
  params: NoticeListParams = {},
): Promise<NoticeListResponse> {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
  if (params.targetAudience)
    searchParams.set('targetAudience', params.targetAudience)
  if (params.pinned !== undefined && params.pinned !== '')
    searchParams.set('pinned', String(params.pinned))
  const query = searchParams.toString()
  return apiFetch<NoticeListResponse>(`/api/notices${query ? `?${query}` : ''}`)
}

export function fetchNotice(id: string): Promise<Notice> {
  return apiFetch<Notice>(`/api/notices/${id}`)
}

export function createNotice(data: CreateNoticeInput): Promise<Notice> {
  return apiFetch<Notice>('/api/notices', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateNotice(
  id: string,
  data: UpdateNoticeInput,
): Promise<Notice> {
  return apiFetch<Notice>(`/api/notices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteNotice(id: string): Promise<void> {
  return apiFetch<void>(`/api/notices/${id}`, {
    method: 'DELETE',
  })
}

export function toggleNoticePin(id: string): Promise<Notice> {
  return apiFetch<Notice>(`/api/notices/${id}/pin`, {
    method: 'PUT',
  })
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

// --- Settings API Types ---

export interface UserProfile {
  id: string
  email: string
  name: string
  role: string
  phone: string | null
  languagePreference: string
  createdAt: string
}

export interface UpdateLanguageResponse {
  success: boolean
  language: string
}

// --- Settings API Functions ---

export function fetchUserProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/api/settings/profile')
}

export function updateLanguagePreference(
  language: 'bn' | 'en',
): Promise<UpdateLanguageResponse> {
  return apiFetch<UpdateLanguageResponse>('/api/settings/language', {
    method: 'PUT',
    body: JSON.stringify({ language }),
  })
}

// --- Registration Requests API Types ---

export interface RegistrationRequest {
  id: string
  fullName: string
  phone: string
  nidNumber: string
  nidPhotoUrl: string | null
  bloodGroup: string
  occupation: string
  familyMembers: number
  familyMemberNames: string[] | null
  emergencyContactName: string | null
  emergencyContact: string
  emergencyContactRelationship: string | null
  selfiePhotoUrl: string | null
  rentalStartDate: string
  advanceAmount: string
  digitalSignatureUrl: string
  flatId: string
  flatNumber?: string
  buildingName?: string
  createdAt: string
}

export interface RegistrationRequestListResponse {
  data: RegistrationRequest[]
}

export interface ApproveRegistrationInput {
  monthlyRent: number
  advanceAmount: number
  startDate: string
  gasBill?: number
  waterBill?: number
  serviceCharge?: number
  otherCharges?: number
}

// --- Registration Requests API Functions ---

export function fetchRegistrationRequests(): Promise<RegistrationRequestListResponse> {
  return apiFetch<RegistrationRequestListResponse>('/api/registration-requests')
}

export function approveRegistration(
  id: string,
  data: ApproveRegistrationInput,
): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>(
    `/api/registration-requests/${id}/approve`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  )
}

export function rejectRegistration(
  id: string,
): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>(
    `/api/registration-requests/${id}/reject`,
    {
      method: 'POST',
    },
  )
}

// --- Deletion API Functions ---

export function deleteBill(id: string): Promise<void> {
  return apiFetch<void>(`/api/bills/${id}`, {
    method: 'DELETE',
  })
}

export function deletePayment(id: string): Promise<void> {
  return apiFetch<void>(`/api/payments/${id}`, {
    method: 'DELETE',
  })
}

// --- Portal Renter Data & Logout ---

export interface PortalRenterData {
  renter: {
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
    selfiePhotoUrl: string | null
  }
  contract: {
    id: string
    monthlyRent: number
    startDate: string
    depositBalance: number
    gasBill: number | null
    waterBill: number | null
    serviceCharge: number | null
    otherCharges: number | null
  } | null
  bills: Array<{
    id: string
    billingMonth: string
    totalAmount: number
    paidAmount: number
    status: string
    createdAt: string
  }>
  payments: Array<{
    id: string
    amount: number
    paymentDate: string
    paymentMethod: string
    receiptReference: string
    note: string | null
    createdAt: string
  }>
  flat: {
    flatNumber: string
    floor: number
    buildingName: string
    buildingAddress: string
  }
}

export function fetchPortalRenterData(slug: string): Promise<PortalRenterData> {
  return apiFetch<PortalRenterData>(`/api/portal/flat/${slug}/renter-data`)
}

export function portalLogout(
  slug: string,
): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>(
    `/api/portal/flat/${slug}/logout`,
    {
      method: 'DELETE',
    },
  )
}
