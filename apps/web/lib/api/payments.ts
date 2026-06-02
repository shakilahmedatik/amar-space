import { apiFetch } from '../api'

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

export function deletePayment(id: string): Promise<void> {
  return apiFetch<void>(`/api/payments/${id}`, {
    method: 'DELETE',
  })
}
