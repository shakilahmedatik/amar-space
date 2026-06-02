import { apiFetch } from '../api'

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
