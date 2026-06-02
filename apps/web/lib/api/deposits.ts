import { apiFetch } from '../api'

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
