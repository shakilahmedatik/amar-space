import { apiFetch } from '../api'

export type BillStatus =
  | 'unpaid'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'cancelled'

export interface BillListItem {
  id: string
  ownerAccountId: string
  contractId: string
  flatId: string
  renterId: string
  billingMonth: string
  dueDate: string
  baseRent: number
  rentDays: number | null
  totalDaysInMonth: number | null
  monthlyRent: number
  totalAmount: number
  paidAmount: number
  status: BillStatus
  flatNumber: string
  buildingName: string
  renterName: string
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
  paidAt: string
  method: string
  receiptReference: string
  note: string | null
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
  dueDate: string
  baseRent: number
  rentDays: number | null
  totalDaysInMonth: number | null
  monthlyRent: number
  totalAmount: number
  paidAmount: number
  remainingBalance: number
  status: BillStatus
  ownerAccountId: string
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
  contractId?: string
  month?: string
  status?: BillStatus | ''
}

export interface GenerateBillsInput {
  billingMonth: string
}

export interface GenerateBillsResponse {
  generated: number
  skipped: number
  billingMonth: string
}

export interface GenerateBillForContractInput {
  contractId: string
  billingMonth: string
}

export interface AddUtilityChargeInput {
  description: string
  amount: number
}

export function fetchBills(
  params: BillListParams = {},
): Promise<BillListResponse> {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
  if (params.buildingId) searchParams.set('buildingId', params.buildingId)
  if (params.flatId) searchParams.set('flatId', params.flatId)
  if (params.renterId) searchParams.set('renterId', params.renterId)
  if (params.contractId) searchParams.set('contractId', params.contractId)
  if (params.month) searchParams.set('billingMonth', params.month)
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

export function generateBillForContract(
  data: GenerateBillForContractInput,
): Promise<BillListItem> {
  return apiFetch<BillListItem>(`/api/bills/generate/${data.contractId}`, {
    method: 'POST',
    body: JSON.stringify({ billingMonth: data.billingMonth }),
  })
}

export function addUtilityCharge(
  billId: string,
  data: AddUtilityChargeInput,
): Promise<{
  id: string
  billId: string
  description: string
  amount: number
  createdAt: string
}> {
  return apiFetch(`/api/bills/${billId}/charges`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function fetchUnpaidBills(): Promise<BillListResponse> {
  return apiFetch<BillListResponse>('/api/bills?status=unpaid&pageSize=100')
}

export function deleteBill(id: string): Promise<void> {
  return apiFetch<void>(`/api/bills/${id}`, {
    method: 'DELETE',
  })
}
