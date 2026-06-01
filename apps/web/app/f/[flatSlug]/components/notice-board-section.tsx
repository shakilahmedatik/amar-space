'use client'

import { useQuery } from '@tanstack/react-query'
import { Megaphone } from 'lucide-react'
import { BASE_URL } from '@/lib/api'
import { NoticeBoard } from './notice-board'

interface Notice {
  id: string
  title: string
  body: string
  createdAt: string
  isPinned: boolean
}

interface NoticeBoardSectionProps {
  flatSlug: string
}

async function fetchNotices(slug: string): Promise<Notice[]> {
  const res = await fetch(`${BASE_URL}/api/portal/flat/${slug}/notices`, {
    credentials: 'include',
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.notices ?? []
}

/**
 * Client component that fetches and renders the notice board for the portal.
 * Uses TanStack Query for data fetching with a 60s stale time.
 */
export function NoticeBoardSection({ flatSlug }: NoticeBoardSectionProps) {
  const { data: notices = [], isLoading } = useQuery({
    queryKey: ['portal-notices', flatSlug],
    queryFn: () => fetchNotices(flatSlug),
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 animate-pulse">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-steel" />
          <div className="h-5 w-24 bg-surface rounded" />
        </div>
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-surface border border-hairline"
            />
          ))}
        </div>
      </div>
    )
  }

  return <NoticeBoard notices={notices} flatSlug={flatSlug} />
}
