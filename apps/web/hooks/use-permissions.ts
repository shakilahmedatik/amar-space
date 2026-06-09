'use client'

import { type Permission, ROLE_PERMISSIONS } from '@repo/shared/constants'
import { useCallback, useEffect, useState } from 'react'
import { useSession } from '@/contexts/session-context'
import { apiFetch } from '@/lib/api'

interface PermissionsData {
  role: string
  permissions: string[]
  overrides: Array<{ key: string; effect: 'grant' | 'deny' }>
}

interface UsePermissionsReturn {
  permissions: Set<string>
  isLoading: boolean
  can: (permission: Permission) => boolean
  canAny: (...permissions: Permission[]) => boolean
  canAll: (...permissions: Permission[]) => boolean
  refresh: () => void
}

const defaultPermissions: Record<string, readonly string[]> = ROLE_PERMISSIONS

const cachedPermissions: Map<
  string,
  { data: PermissionsData; timestamp: number }
> = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function usePermissions(): UsePermissionsReturn {
  const { user, role } = useSession()
  const [permissions, setPermissions] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  const loadPermissions = useCallback(async () => {
    if (!user) {
      setPermissions(new Set())
      setIsLoading(false)
      return
    }

    const cacheKey = `${user.id}:${role}`
    const cached = cachedPermissions.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setPermissions(new Set(cached.data.permissions))
      setIsLoading(false)
      return
    }

    try {
      const data = await apiFetch<PermissionsData>('/api/auth/permissions')
      const permSet = new Set(data.permissions)

      // Apply overrides
      for (const override of data.overrides) {
        if (override.effect === 'grant') {
          permSet.add(override.key)
        } else if (override.effect === 'deny') {
          permSet.delete(override.key)
        }
      }

      cachedPermissions.set(cacheKey, { data, timestamp: Date.now() })
      setPermissions(permSet)
    } catch {
      // Fallback to static ROLE_PERMISSIONS
      const fallbackPerms = defaultPermissions[role] ?? []
      setPermissions(new Set(fallbackPerms))
    } finally {
      setIsLoading(false)
    }
  }, [user, role])

  useEffect(() => {
    loadPermissions()
  }, [loadPermissions])

  const can = useCallback(
    (permission: Permission) => permissions.has(permission),
    [permissions],
  )

  const canAny = useCallback(
    (...perms: Permission[]) => perms.some((p) => permissions.has(p)),
    [permissions],
  )

  const canAll = useCallback(
    (...perms: Permission[]) => perms.every((p) => permissions.has(p)),
    [permissions],
  )

  const refresh = useCallback(() => {
    if (user) {
      const cacheKey = `${user.id}:${role}`
      cachedPermissions.delete(cacheKey)
    }
    loadPermissions()
  }, [user, role, loadPermissions])

  return { permissions, isLoading, can, canAny, canAll, refresh }
}
