'use client'

import { useQuery } from '@tanstack/react-query'
import {
  fetchManagerDashboard,
  fetchOwnerDashboard,
  fetchRenterDashboard,
} from '@/lib/api-client'

/**
 * TanStack Query hook for Owner dashboard data.
 * Fetches: total buildings, flats, occupancy, unpaid bills, recent maintenance, recent audit.
 * Validates: Requirements 20.1, 20.4
 */
export function useOwnerDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'owner'],
    queryFn: fetchOwnerDashboard,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * TanStack Query hook for Manager dashboard data.
 * Fetches: assigned buildings, flats with occupancy, unpaid bills, pending maintenance.
 * Validates: Requirements 20.2, 20.4
 */
export function useManagerDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'manager'],
    queryFn: fetchManagerDashboard,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * TanStack Query hook for Renter dashboard data.
 * Fetches: flat info, current bill, deposit balance, active maintenance.
 * Validates: Requirements 20.3, 20.4
 */
export function useRenterDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'renter'],
    queryFn: fetchRenterDashboard,
    staleTime: 30 * 1000, // 30 seconds
  })
}
