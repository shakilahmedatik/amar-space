'use client'

import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { DashboardLayout } from '@/components/layout'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { SessionProvider, useSession } from '@/contexts/session-context'

/**
 * Shared layout for all authenticated dashboard pages.
 * Renders the sidebar/navbar once — only the content area swaps on navigation.
 * This eliminates full-page re-renders when clicking sidebar links.
 */
function DashboardLayoutInner({ children }: { children: ReactNode }) {
  const { user, role, isLoading } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  if (isLoading || !user) {
    return (
      <div className="flex h-dvh items-center justify-center bg-surface">
        <div className="w-full max-w-md px-4">
          <LoadingSkeleton rows={5} showHeader />
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout
      role={role}
      activePath={pathname}
      onNavigate={(href) => router.push(href)}
    >
      {children}
    </DashboardLayout>
  )
}

export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <SessionProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </SessionProvider>
  )
}
