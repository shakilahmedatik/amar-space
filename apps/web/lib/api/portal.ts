import { apiFetch } from '../api'

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
    buildingId: string
    flatNumber: string
    floor: number
    buildingName: string
    buildingAddress: string
  }
}

export function fetchPortalRenterData(slug: string): Promise<PortalRenterData> {
  return apiFetch<PortalRenterData>(`/api/portal/flat/${slug}/renter-data`)
}

export interface PortalIssue {
  id: string
  title: string
  description: string
  category: string
  priority: string
  status: string
  assigneeName: string | null
  resolutionNotes: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  attachments: Array<{
    id: string
    fileName: string
    fileUrl: string
    fileSize: number
    mimeType: string
  }>
}

export interface PortalIssuesResponse {
  issues: PortalIssue[]
}

export function fetchPortalIssues(slug: string): Promise<PortalIssuesResponse> {
  return apiFetch<PortalIssuesResponse>(`/api/portal/flat/${slug}/issues`)
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
