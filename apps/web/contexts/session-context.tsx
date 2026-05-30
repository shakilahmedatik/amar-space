'use client'

import { useRouter } from 'next/navigation'
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'
import { getSession } from '@/lib/auth-client'

export type UserRole = 'owner' | 'manager' | 'renter'

export interface SessionUser {
  id: string
  email: string
  name?: string
  role: UserRole
}

interface SessionContextValue {
  user: SessionUser | null
  role: UserRole
  isLoading: boolean
}

const SessionContext = createContext<SessionContextValue | null>(null)

/**
 * Provides authenticated session data to all dashboard pages.
 * Redirects to /login if no session is found.
 * Eliminates duplicated session-loading logic across pages.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await getSession()
        if (!session) {
          router.push('/login')
          return
        }
        setUser({
          id: session.id,
          email: session.email,
          name: session.name,
          role: session.role as UserRole,
        })
      } catch {
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }
    loadSession()
  }, [router])

  return (
    <SessionContext.Provider
      value={{
        user,
        role: user?.role ?? 'owner',
        isLoading,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

/**
 * Hook to access the current authenticated session.
 * Must be used within a SessionProvider (i.e., inside the dashboard layout).
 */
export function useSession(): SessionContextValue {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}
