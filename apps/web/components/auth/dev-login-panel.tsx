'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { signIn } from '@/lib/auth-client'

const DEV_ACCOUNTS = [
  {
    role: 'superadmin',
    label: 'Super Admin',
    email: 'admin@amarspace.local',
    color:
      'hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:hover:bg-red-950/20 dark:hover:text-red-400 dark:hover:border-red-900',
  },
  {
    role: 'owner',
    label: 'Owner',
    email: 'owner@amarspace.local',
    color:
      'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 dark:hover:bg-blue-950/20 dark:hover:text-blue-400 dark:hover:border-blue-900',
  },
  {
    role: 'manager',
    label: 'Manager',
    email: 'manager@amarspace.local',
    color:
      'hover:bg-green-50 hover:text-green-700 hover:border-green-300 dark:hover:bg-green-950/20 dark:hover:text-green-400 dark:hover:border-green-900',
  },
  {
    role: 'security_guard',
    label: 'Security Guard',
    email: 'guard@amarspace.local',
    color:
      'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 dark:hover:bg-amber-950/20 dark:hover:text-amber-400 dark:hover:border-amber-900',
  },
  {
    role: 'care_taker',
    label: 'Care Taker',
    email: 'caretaker@amarspace.local',
    color:
      'hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 dark:hover:bg-purple-950/20 dark:hover:text-purple-400 dark:hover:border-purple-900',
  },
  {
    role: 'renter',
    label: 'Renter',
    email: 'tenant@amarspace.local',
    color:
      'hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300 dark:hover:bg-slate-950/20 dark:hover:text-slate-400 dark:hover:border-slate-900',
  },
]

export function DevLoginPanel() {
  const router = useRouter()
  const [activeEmail, setActiveEmail] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Guard: only render in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const handleQuickLogin = async (email: string) => {
    setActiveEmail(email)
    setErrorMsg(null)

    try {
      const result = await signIn({
        email,
        password: 'Password123!',
      })

      if (result.error) {
        setErrorMsg(result.error.message || 'Login failed')
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActiveEmail(null)
    }
  }

  return (
    <div className="mt-8 p-5 border border-dashed border-steel/20 rounded-2xl bg-steel/5 dark:bg-steel/10 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-steel">
          Developer Quick Login
        </h3>
        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50">
          Dev Mode Only
        </span>
      </div>

      {errorMsg && (
        <p className="text-xs text-destructive mb-3 font-medium text-center">
          {errorMsg}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {DEV_ACCOUNTS.map((account) => {
          const isLoading = activeEmail === account.email
          return (
            <Button
              key={account.email}
              variant="outline"
              disabled={activeEmail !== null}
              onClick={() => handleQuickLogin(account.email)}
              className={`text-xs justify-start min-h-11 px-3 font-medium border border-input/60 rounded-xl transition-all duration-200 ${account.color}`}
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-current mr-2 opacity-60" />
              )}
              {account.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
