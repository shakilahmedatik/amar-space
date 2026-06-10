'use client'

import {
  Bug,
  ClipboardList,
  CreditCard,
  FileText,
  Megaphone,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { AccessCodeInput } from '../auth/access-code-input'
import { usePortalAuth } from '../hooks/use-portal-auth'
import { RegistrationForm } from '../registration/registration-form'
import type {
  ActivePanel,
  EmergencyContact,
  FlatStatus,
  PortalPanelType,
} from '../types'
import { PortalOccupiedView } from './portal-occupied-view'
import { RenterHeader } from './renter-header'

interface PortalActionsSectionProps {
  flatSlug: string
  flatStatus: FlatStatus
  hasPendingRegistration: boolean
  whatsappGroupLink?: string | null
  emergencyContacts?: EmergencyContact[]
  rules?: string | null
}

export function PortalActionsSection({
  flatSlug,
  flatStatus,
  hasPendingRegistration,
  whatsappGroupLink,
  emergencyContacts = [],
  rules,
}: PortalActionsSectionProps) {
  const { t } = useTranslation()
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)

  const isOccupied = flatStatus === 'OCCUPIED'
  const isMaintenance = flatStatus === 'MAINTENANCE'

  // Fetch portal auth state
  const { isLoggedIn, portalData, refetch, logout, isLoggingOut } =
    usePortalAuth(flatSlug, isOccupied)

  function toggle(panel: ActivePanel) {
    setActivePanel((prev) => (prev === panel ? null : panel))
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Registration button (non-occupied flats only) ─────────────────── */}
      {!isOccupied && (
        <div className="grid gap-3 grid-cols-1">
          <button
            type="button"
            onClick={() => !isMaintenance && toggle('register')}
            disabled={isMaintenance}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-xl border p-5 text-center transition-all min-h-[90px] cursor-pointer',
              isMaintenance
                ? 'border-hairline bg-surface opacity-60 cursor-not-allowed'
                : activePanel === 'register'
                  ? 'border-brand-blue-deep bg-brand-blue-deep text-white shadow-md scale-[0.99]'
                  : 'border-hairline bg-white shadow-sm hover:border-brand-blue-deep hover:shadow active:scale-[0.99]',
            )}
            aria-expanded={activePanel === 'register'}
            aria-label="ভাড়াটিয়া রেজিস্ট্রেশন"
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
              {isMaintenance
                ? t('renters.maintenanceWarning') || 'রক্ষণাবেক্ষণ চলছে'
                : t('renters.registerRenter') || 'ভাড়াটিয়া রেজিস্ট্রেশন ফর্ম'}
            </span>
            {!isMaintenance && !activePanel && (
              <span className="text-xs text-steel">
                {hasPendingRegistration
                  ? t('renters.pending') || 'আবেদন পেন্ডিং'
                  : t('renters.register') || 'রেজিস্ট্রেশন করুন'}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ── Occupied flat — not logged in: show login gate ────────────────── */}
      {isOccupied && !isLoggedIn && (
        <AccessCodeInput
          flatSlug={flatSlug}
          flatStatus="OCCUPIED"
          onSuccess={refetch}
        />
      )}

      {/* ── Occupied flat — logged in ─────────────────────────────────────── */}
      {isOccupied && isLoggedIn && portalData && (
        <>
          {/* Renter header — persistent above the action buttons */}
          <RenterHeader
            fullName={portalData.renter.fullName}
            buildingName={portalData.flat.buildingName}
            flatNumber={portalData.flat.flatNumber}
            floor={portalData.flat.floor}
            onLogout={logout}
            isLoggingOut={isLoggingOut}
          />

          {/* Action buttons grid */}
          <div className="grid gap-3 grid-cols-2">
            <ActionButton
              panel="profile"
              activePanel={activePanel}
              onToggle={toggle}
              icon={
                <User className="h-6 w-6 text-brand-blue-deep" aria-hidden />
              }
              label={t('renters.personalInfo') || 'নিজের তথ্য দেখুন'}
              ariaLabel="নিজের তথ্য দেখুন"
            />

            <ActionButton
              panel="bills"
              activePanel={activePanel}
              onToggle={toggle}
              icon={
                <CreditCard
                  className="h-6 w-6 text-brand-blue-deep"
                  aria-hidden
                />
              }
              label={t('bills.title') || 'বিল ও পেমেন্ট'}
              ariaLabel="বিল ও পেমেন্ট"
            />

            <ActionButton
              panel="notices"
              activePanel={activePanel}
              onToggle={toggle}
              icon={
                <Megaphone
                  className="h-6 w-6 text-brand-blue-deep"
                  aria-hidden
                />
              }
              label={t('notices.title') || 'নোটিশ বোর্ড'}
              ariaLabel="নোটিশ বোর্ড"
            />

            <ActionButton
              panel="issues"
              activePanel={activePanel}
              onToggle={toggle}
              icon={
                <Bug className="h-6 w-6 text-brand-blue-deep" aria-hidden />
              }
              label={t('issues.title') || 'সমস্যা রিপোর্ট'}
              ariaLabel="সমস্যা রিপোর্ট"
            />

            <ActionButton
              panel="contacts"
              activePanel={activePanel}
              onToggle={toggle}
              icon={
                <ShieldAlert
                  className="h-6 w-6 text-brand-blue-deep"
                  aria-hidden
                />
              }
              label={t('buildings.emergencyContacts') || 'জরুরি যোগাযোগ'}
              ariaLabel="জরুরি যোগাযোগ"
            />

            {/* WhatsApp Group — shown inside logged in action buttons area */}
            {whatsappGroupLink ? (
              <a
                href={whatsappGroupLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('WhatsApp Clicked', flatSlug)}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-hairline bg-white p-5 text-center shadow-sm transition-all min-h-[90px] hover:border-green-300 hover:shadow active:scale-[0.99] cursor-pointer"
                aria-label="হোয়াটসঅ্যাপ গ্রুপে যোগ দিন"
              >
                <MessageCircle className="h-6 w-6 text-green-600" aria-hidden />
                <span className="text-sm font-semibold text-ink">
                  {t('buildings.whatsappGroupLink') || 'হোয়াটসঅ্যাপ গ্রুপ'}
                </span>
              </a>
            ) : null}
          </div>

          {/* Active section panel */}
          {activePanel && activePanel !== 'register' && (
            <div
              className="rounded-xl border border-hairline shadow-sm overflow-hidden bg-white"
              id="portal-panel"
            >
              <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-hairline bg-surface">
                <div className="flex items-center gap-2">
                  <ShieldCheck
                    className="h-4 w-4 text-brand-blue-deep"
                    aria-hidden
                  />
                  <span className="text-sm font-semibold text-ink">
                    {t('common.appName') || 'আমারস্পেস'} -{' '}
                    {t('settings.roleRenter') || 'ভাড়াটিয়া পোর্টাল'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePanel(null)}
                  className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-surface-dark transition-colors cursor-pointer"
                  aria-label="বন্ধ করুন"
                >
                  <X className="h-4 w-4 text-steel" />
                </button>
              </div>
              <div className="p-1">
                <PortalOccupiedView
                  flatSlug={flatSlug}
                  activePanel={activePanel as PortalPanelType}
                  portalData={portalData}
                  emergencyContacts={emergencyContacts}
                  rules={rules}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Registration panel ────────────────────────────────────────────── */}
      {activePanel === 'register' && (
        <div
          className="rounded-xl border border-hairline shadow-sm overflow-hidden bg-white"
          id="registration-panel"
        >
          <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-hairline bg-surface">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-blue-deep" aria-hidden />
              <span className="text-sm font-semibold text-ink">
                {t('renters.registerRenter') || 'ভাড়াটিয়া নিবন্ধন ফর্ম'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActivePanel(null)}
              className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-surface-dark transition-colors cursor-pointer"
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
    </div>
  )
}

// ─── Helper sub-component ────────────────────────────────────────────────────

interface ActionButtonProps {
  panel: PortalPanelType
  activePanel: ActivePanel
  onToggle: (panel: PortalPanelType) => void
  icon: React.ReactNode
  label: string
  ariaLabel: string
}

function ActionButton({
  panel,
  activePanel,
  onToggle,
  icon,
  label,
  ariaLabel,
}: ActionButtonProps) {
  const isActive = activePanel === panel
  return (
    <button
      type="button"
      onClick={() => onToggle(panel)}
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-xl border p-5 text-center transition-all min-h-[90px] cursor-pointer',
        isActive
          ? 'border-brand-blue-deep bg-brand-blue-deep text-white shadow-md scale-[0.99]'
          : 'border-hairline bg-white shadow-sm hover:border-brand-blue-deep hover:shadow active:scale-[0.99]',
      )}
      aria-expanded={isActive}
      aria-label={ariaLabel}
    >
      {isActive ? <X className="h-6 w-6 text-white" aria-hidden /> : icon}
      <span
        className={cn(
          'text-sm font-semibold',
          isActive ? 'text-white' : 'text-ink',
        )}
      >
        {label}
      </span>
    </button>
  )
}
