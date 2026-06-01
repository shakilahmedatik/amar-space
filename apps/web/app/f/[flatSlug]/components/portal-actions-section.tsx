'use client'

import { useQuery } from '@tanstack/react-query'
import { ClipboardList, Eye, FileText, ShieldCheck, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchPortalRenterData } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import PortalOccupiedView from './portal-occupied-view'
import { RegistrationForm } from './registration-form'

interface PortalActionsSectionProps {
  flatSlug: string
  flatStatus: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'
  hasPendingRegistration: boolean
  emergencyContacts?: Array<{
    name: string
    role: string
    phone: string | null
    type: 'building' | 'nearby'
    order: number
  }>
  rules?: string | null
}

/**
 * Portal actions section — renders two action cards:
 * - "রেন্টার নিবন্ধন" — shown for AVAILABLE flats; clicking reveals the registration form
 * - "আমার তথ্য দেখুন" — always visible; clicking reveals the portal view (with login gate for OCCUPIED)
 *
 * The form/portal view opens inline below the cards when the respective card is clicked.
 */
export function PortalActionsSection({
  flatSlug,
  flatStatus,
  hasPendingRegistration,
  emergencyContacts,
  rules,
}: PortalActionsSectionProps) {
  const [activePanel, setActivePanel] = useState<'register' | 'portal' | null>(
    null,
  )
  const [prevHasData, setPrevHasData] = useState(false)

  const isOccupied = flatStatus === 'OCCUPIED'
  const isMaintenance = flatStatus === 'MAINTENANCE'

  const { data: portalData } = useQuery({
    queryKey: ['portal-renter-data', flatSlug],
    queryFn: () => fetchPortalRenterData(flatSlug),
    retry: false,
    enabled: isOccupied,
  })

  useEffect(() => {
    if (portalData) {
      setActivePanel('portal')
      setPrevHasData(true)
    } else if (prevHasData && !portalData) {
      setActivePanel(null)
      setPrevHasData(false)
    }
  }, [portalData, prevHasData])

  function toggle(panel: 'register' | 'portal') {
    setActivePanel((prev) => (prev === panel ? null : panel))
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Action Cards */}
      <div className="grid gap-3 grid-cols-2">
        {/* Register Card — always shown */}
        <button
          type="button"
          onClick={() => !isMaintenance && toggle('register')}
          disabled={isMaintenance}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-xl border p-5 text-center transition-all min-h-[90px]',
            isMaintenance
              ? 'border-hairline bg-surface opacity-60 cursor-not-allowed'
              : activePanel === 'register'
                ? 'border-brand-blue-deep bg-brand-blue-deep text-white shadow-md scale-[0.99]'
                : 'border-hairline bg-white shadow-sm hover:border-brand-blue-deep hover:shadow active:scale-[0.99]',
          )}
          aria-expanded={activePanel === 'register'}
          aria-label="ভাড়াটিয়া নিবন্ধন"
        >
          {activePanel === 'register' ? (
            <X className="h-6 w-6" aria-hidden />
          ) : (
            <ClipboardList
              className={cn(
                'h-6 w-6',
                isMaintenance ? 'text-steel' : 'text-brand-blue-deep',
              )}
              aria-hidden
            />
          )}
          <span
            className={cn(
              'text-sm font-semibold',
              activePanel === 'register'
                ? 'text-white'
                : isMaintenance
                  ? 'text-steel'
                  : 'text-ink',
            )}
          >
            {isMaintenance ? 'রক্ষণাবেক্ষণ চলছে' : 'ভাড়াটিয়া নিবন্ধন'}
          </span>
          {!isMaintenance && !activePanel && (
            <span className="text-xs text-steel">
              {hasPendingRegistration
                ? 'আবেদন পেন্ডিং'
                : isOccupied
                  ? 'ইতিমধ্যে বুকড'
                  : 'নিবন্ধন করুন'}
            </span>
          )}
        </button>

        {/* View My Info Card — always shown */}
        <button
          type="button"
          onClick={() => toggle('portal')}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-xl border p-5 text-center transition-all min-h-[90px]',
            activePanel === 'portal'
              ? 'border-brand-blue-deep bg-brand-blue-deep text-white shadow-md scale-[0.99]'
              : 'border-hairline bg-white shadow-sm hover:border-brand-blue-deep hover:shadow active:scale-[0.99]',
          )}
          aria-expanded={activePanel === 'portal'}
          aria-label="আমার তথ্য দেখুন"
        >
          {activePanel === 'portal' ? (
            <X className="h-6 w-6 text-white" aria-hidden />
          ) : (
            <ShieldCheck className="h-6 w-6 text-brand-blue-deep" aria-hidden />
          )}
          <span
            className={cn(
              'text-sm font-semibold',
              activePanel === 'portal' ? 'text-white' : 'text-ink',
            )}
          >
            আমার তথ্য দেখুন
          </span>
          {activePanel !== 'portal' && (
            <span className="text-xs text-steel">পোর্টালে প্রবেশ করুন</span>
          )}
        </button>
      </div>

      {/* Registration Panel */}
      {activePanel === 'register' && (
        <div
          className="rounded-xl border border-hairline shadow-sm overflow-hidden bg-white"
          id="registration-panel"
        >
          <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-hairline bg-surface">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-blue-deep" aria-hidden />
              <span className="text-sm font-semibold text-ink">
                ভাড়াটিয়া নিবন্ধন ফর্ম
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActivePanel(null)}
              className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-surface-dark transition-colors"
              aria-label="বন্ধ করুন"
            >
              <X className="h-4 w-4 text-steel" />
            </button>
          </div>
          <div className="p-1">
            <RegistrationForm
              flatSlug={flatSlug}
              flatStatus={flatStatus}
              hasPendingRegistration={hasPendingRegistration}
            />
          </div>
        </div>
      )}

      {/* Portal / Login Panel */}
      {activePanel === 'portal' && (
        <div
          className="rounded-xl border border-hairline shadow-sm overflow-hidden bg-white"
          id="portal-panel"
        >
          <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-hairline bg-surface">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-brand-blue-deep" aria-hidden />
              <span className="text-sm font-semibold text-ink">
                ভাড়াটিয়া পোর্টাল
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActivePanel(null)}
              className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-surface-dark transition-colors"
              aria-label="বন্ধ করুন"
            >
              <X className="h-4 w-4 text-steel" />
            </button>
          </div>
          <div className="p-1">
            <PortalOccupiedView
              flatSlug={flatSlug}
              emergencyContacts={emergencyContacts}
              rules={rules}
            />
          </div>
        </div>
      )}
    </div>
  )
}
