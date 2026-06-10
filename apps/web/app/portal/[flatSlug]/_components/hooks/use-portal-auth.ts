'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchPortalRenterData, portalLogout } from '@/lib/api-client'
import type { PortalRenterData } from '../types'

export function usePortalAuth(flatSlug: string, enabled = true) {
  const queryClient = useQueryClient()

  const {
    data: portalData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<PortalRenterData, Error>({
    queryKey: ['portal-renter-data', flatSlug],
    queryFn: () => fetchPortalRenterData(flatSlug),
    retry: false,
    enabled,
  })

  const isLoggedIn = !!portalData

  const logoutMutation = useMutation({
    mutationFn: () => portalLogout(flatSlug),
    onSuccess: () => {
      queryClient.setQueryData(['portal-renter-data', flatSlug], null)
      queryClient.invalidateQueries({
        queryKey: ['portal-renter-data', flatSlug],
      })
    },
  })

  return {
    isLoggedIn,
    portalData,
    isLoading,
    isError,
    error,
    refetch,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  }
}
