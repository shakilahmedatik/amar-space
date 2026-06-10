'use client'

import { useQuery } from '@tanstack/react-query'
import { BASE_URL } from '@/lib/api'
import type { Notice } from '../types'

async function fetchNotices(slug: string): Promise<Notice[]> {
  const res = await fetch(`${BASE_URL}/api/portal/flat/${slug}/notices`, {
    credentials: 'include',
  })
  if (!res.ok) return []
  const data = (await res.json()) as { notices?: Notice[] }
  return data.notices ?? []
}

export function usePortalNotices(flatSlug: string) {
  const { data: notices = [], isLoading } = useQuery<Notice[], Error>({
    queryKey: ['portal-notices', flatSlug],
    queryFn: () => fetchNotices(flatSlug),
    staleTime: 60_000,
  })

  return {
    notices,
    isLoading,
  }
}
