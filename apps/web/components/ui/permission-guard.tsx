'use client'

import type { Permission } from '@repo/shared/constants'
import type { ReactNode } from 'react'
import { usePermissions } from '@/hooks/use-permissions'

interface PermissionGuardProps {
  permission: Permission | Permission[]
  mode?: 'all' | 'any'
  fallback?: ReactNode
  children: ReactNode
}

export function PermissionGuard({
  permission,
  mode = 'all',
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { canAny, canAll, isLoading } = usePermissions()

  if (isLoading) {
    return null
  }

  const perms = Array.isArray(permission) ? permission : [permission]

  const hasAccess = mode === 'any' ? canAny(...perms) : canAll(...perms)

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
