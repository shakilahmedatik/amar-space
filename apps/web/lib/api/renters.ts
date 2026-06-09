import { apiFetch, BASE_URL } from '../api'

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
  contractStatus: string | null
  scheduledTerminationDate: string | null
  terminationReason: string | null
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

export interface TerminationResult {
  contractId: string
  status: string
  scheduledTerminationDate: string | null
  noticeGivenAt: string | null
  terminationReason: string | null
}

export interface DepositRefundResult {
  contractId: string
  securityDepositAmount: number
  remainingDepositBalance: number
  outstandingBillTotal: number
  suggestedRefund: number
}

export function scheduleTermination(
  renterId: string,
  data: { terminationMonth: string; reason?: string },
): Promise<TerminationResult> {
  return apiFetch<TerminationResult>(`/api/renters/${renterId}/terminate`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function cancelTermination(
  renterId: string,
): Promise<TerminationResult> {
  return apiFetch<TerminationResult>(`/api/renters/${renterId}/termination`, {
    method: 'DELETE',
  })
}

export function executeTermination(
  renterId: string,
): Promise<TerminationResult> {
  return apiFetch<TerminationResult>(
    `/api/renters/${renterId}/execute-termination`,
    {
      method: 'POST',
    },
  )
}

export function fetchDepositRefund(
  renterId: string,
): Promise<DepositRefundResult> {
  return apiFetch<DepositRefundResult>(
    `/api/renters/${renterId}/deposit-refund`,
  )
}

export function processDepositRefund(
  renterId: string,
  data: { refundAmount: number; note?: string },
): Promise<{
  id: string
  contractId: string
  amount: number
  billId: string | null
  note: string | null
  createdAt: string
}> {
  return apiFetch(`/api/renters/${renterId}/refund-deposit`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
