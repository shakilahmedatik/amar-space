/** biome-ignore-all lint/suspicious/noArrayIndexKey: intentionally done */
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CreditCard,
  FileText,
  LogOut,
  Megaphone,
  MessageSquare,
  Phone,
  ShieldCheck,
  Upload,
  User,
  Users,
} from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CurrencyDisplay } from '@/components/ui/currency-display'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import {
  createMaintenanceRequest,
  fetchPortalRenterData,
  portalLogout,
} from '@/lib/api-client'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { AccessCodeInput } from './access-code-input'
import { BuildingInfo } from './building-info'
import { EmergencyContacts } from './emergency-contacts'
import { NoticeBoardSection } from './notice-board-section'

interface PortalOccupiedViewProps {
  flatSlug: string
  className?: string
  emergencyContacts?: Array<{
    name: string
    role: string
    phone: string | null
    type: 'building' | 'nearby'
    order: number
  }>
  rules?: string | null
}

type TabType = 'profile' | 'bills' | 'notices' | 'contacts' | 'maintenance'

export default function PortalOccupiedView({
  flatSlug,
  className,
  emergencyContacts = [],
  rules = null,
}: PortalOccupiedViewProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [feedback, setFeedback] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)

  // Maintenance form states
  const [mTitle, setMTitle] = useState('')
  const [mDescription, setMDescription] = useState('')
  const [mPriority, setMPriority] = useState<
    'low' | 'medium' | 'high' | 'urgent'
  >('medium')
  const [mAttachments, setMAttachments] = useState<File[]>([])
  const [mErrors, setMErrors] = useState<Record<string, string>>({})

  // Query authenticated renter data
  const {
    data: portalData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['portal-renter-data', flatSlug],
    queryFn: () => fetchPortalRenterData(flatSlug),
    retry: false,
  })

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => portalLogout(flatSlug),
    onSuccess: () => {
      queryClient.setQueryData(['portal-renter-data', flatSlug], null)
      queryClient.invalidateQueries({
        queryKey: ['portal-renter-data', flatSlug],
      })
      refetch()
    },
    onError: (err) => {
      setFeedback({
        message: err instanceof Error ? err.message : t('common.error'),
        type: 'error',
      })
    },
  })

  // Maintenance request creation mutation
  const maintenanceMutation = useMutation({
    mutationFn: (fd: {
      title: string
      description: string
      priority: 'low' | 'medium' | 'high' | 'urgent'
      attachments?: File[]
    }) => createMaintenanceRequest(fd),
    onSuccess: () => {
      setFeedback({
        message: t('maintenance.createSuccess') || 'অনুরোধটি সফলভাবে পাঠানো হয়েছে',
        type: 'success',
      })
      setMTitle('')
      setMDescription('')
      setMPriority('medium')
      setMAttachments([])
      setMErrors({})
    },
    onError: (err) => {
      setFeedback({
        message:
          err instanceof Error ? err.message : t('maintenance.createError'),
        type: 'error',
      })
    },
  })

  // Check if we are unauthorized (HTTP 401)
  const isUnauthorized =
    isError &&
    ((error as { status?: number })?.status === 401 ||
      error?.message?.includes('401') ||
      error?.message?.includes('লগইন'))

  if (isLoading) {
    return (
      <div className="w-full py-12">
        <LoadingSkeleton rows={8} showHeader />
      </div>
    )
  }

  // If unauthorized, render the Access Code input
  if (isUnauthorized || !portalData) {
    return (
      <AccessCodeInput
        flatSlug={flatSlug}
        flatStatus="OCCUPIED"
        onSuccess={refetch}
      />
    )
  }

  const { renter, contract, bills, payments, flat } = portalData

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setMAttachments(Array.from(e.target.files))
    }
  }

  function handleMaintenanceSubmit(e: FormEvent) {
    e.preventDefault()
    const errors: Record<string, string> = {}

    if (!mTitle.trim()) {
      errors.title = t('maintenance.titleRequired') || 'শিরোনাম প্রয়োজন'
    } else if (mTitle.trim().length < 5) {
      errors.title =
        t('maintenance.titleMinLength') || 'শিরোনাম কমপক্ষে ৫ অক্ষরের হতে হবে'
    } else if (mTitle.trim().length > 200) {
      errors.title =
        t('maintenance.titleMaxLength') || 'শিরোনাম সর্বোচ্চ ২০০ অক্ষরের হতে হবে'
    }

    if (!mDescription.trim()) {
      errors.description =
        t('maintenance.descriptionRequired') || 'বিবরণ প্রয়োজন'
    } else if (mDescription.trim().length < 10) {
      errors.description =
        t('maintenance.descriptionMinLength') ||
        'বিবরণ কমপক্ষে ১০ অক্ষরের হতে হবে'
    } else if (mDescription.trim().length > 2000) {
      errors.description =
        t('maintenance.descriptionMaxLength') ||
        'বিবরণ সর্বোচ্চ ২০০০ অক্ষরের হতে হবে'
    }

    if (Object.keys(errors).length > 0) {
      setMErrors(errors)
      return
    }

    maintenanceMutation.mutate({
      title: mTitle.trim(),
      description: mDescription.trim(),
      priority: mPriority,
      attachments: mAttachments,
    })
  }

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {feedback && (
        <ErrorFeedback
          message={feedback.message}
          type={feedback.type}
          visible
          onDismiss={() => setFeedback(null)}
        />
      )}

      {/* Renter Portal Dashboard Header */}
      <Card className="overflow-hidden border border-hairline bg-canvas shadow-sm rounded-xl">
        <div className="bg-brand-blue-deep px-6 py-5 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-brand-orange" />
              {renter.fullName}
            </h2>
            <p className="text-sm opacity-90 mt-1">
              {flat.buildingName} • ফ্ল্যাট {flat.flatNumber} (তলা {flat.floor})
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="rounded-full cursor-pointer bg-white/10 hover:bg-white/20 text-white border-white/20 min-h-[44px] gap-2 font-medium"
          >
            <LogOut className="h-4 w-4" />
            {t('common.logout') || 'লগ আউট'}
          </Button>
        </div>
      </Card>

      {/* Tab Buttons */}
      <div className="flex border-b border-hairline gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={cn(
            'px-5 py-3 text-sm font-semibold border-b-2 transition-all min-h-[44px] whitespace-nowrap flex items-center gap-2',
            activeTab === 'profile'
              ? 'border-primary text-primary'
              : 'border-transparent text-steel hover:text-charcoal',
          )}
        >
          <User className="h-4 w-4" />
          {t('renters.personalInfo') || 'আমার প্রোফাইল'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bills')}
          className={cn(
            'px-5 py-3 text-sm font-semibold border-b-2 transition-all min-h-[44px] whitespace-nowrap flex items-center gap-2',
            activeTab === 'bills'
              ? 'border-primary text-primary'
              : 'border-transparent text-steel hover:text-charcoal',
          )}
        >
          <CreditCard className="h-4 w-4" />
          {t('bills.title') || 'বিল ও পেমেন্ট'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('notices')}
          className={cn(
            'px-5 py-3 text-sm font-semibold border-b-2 transition-all min-h-[44px] whitespace-nowrap flex items-center gap-2',
            activeTab === 'notices'
              ? 'border-primary text-primary'
              : 'border-transparent text-steel hover:text-charcoal',
          )}
        >
          <Megaphone className="h-4 w-4" />
          {'নোটিশ বোর্ড'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('contacts')}
          className={cn(
            'px-5 py-3 text-sm font-semibold border-b-2 transition-all min-h-[44px] whitespace-nowrap flex items-center gap-2',
            activeTab === 'contacts'
              ? 'border-primary text-primary'
              : 'border-transparent text-steel hover:text-charcoal',
          )}
        >
          <AlertTriangle className="h-4 w-4" />
          {'জরুরি যোগাযোগ ও নিয়মাবলী'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('maintenance')}
          className={cn(
            'px-5 py-3 text-sm font-semibold border-b-2 transition-all min-h-[44px] whitespace-nowrap flex items-center gap-2',
            activeTab === 'maintenance'
              ? 'border-primary text-primary'
              : 'border-transparent text-steel hover:text-charcoal',
          )}
        >
          <MessageSquare className="h-4 w-4" />
          {t('maintenance.title') || 'সমস্যা রিপোর্ট'}
        </button>
      </div>

      {/* Tab Contents */}
      <div className="transition-all duration-200">
        {activeTab === 'notices' && (
          <div className="bg-canvas border border-hairline p-5 rounded-xl shadow-sm">
            <NoticeBoardSection flatSlug={flatSlug} />
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="flex flex-col gap-6">
            <div className="bg-canvas border border-hairline p-5 rounded-xl shadow-sm">
              <EmergencyContacts
                contacts={emergencyContacts}
                flatSlug={flatSlug}
              />
            </div>
            {rules && (
              <div className="bg-canvas border border-hairline p-5 rounded-xl shadow-sm">
                <BuildingInfo rules={rules} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="grid gap-6 grid-cols-1">
            {/* Personal Details */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <Card className="bg-canvas border border-hairline rounded-xl">
                <CardHeader className="pb-3 border-b border-hairline-soft">
                  <CardTitle className="text-base font-semibold text-ink flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    ব্যক্তিগত তথ্য
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid gap-5 grid-cols-1 sm:grid-cols-2">
                    <ProfileItem
                      label={t('renters.fullName')}
                      value={renter.fullName}
                    />
                    <ProfileItem
                      label={t('renters.phone')}
                      value={renter.phone}
                    />
                    <ProfileItem
                      label={t('renters.nidNumber')}
                      value={renter.nidNumber}
                    />
                    <ProfileItem
                      label={t('renters.occupation')}
                      value={renter.occupation}
                    />
                    <ProfileItem
                      label={t('renters.bloodGroup')}
                      value={renter.bloodGroup}
                    />
                    <ProfileItem
                      label={t('renters.dateOfBirth') || 'জন্ম তারিখ'}
                      value={
                        renter.dateOfBirth
                          ? new Date(renter.dateOfBirth).toLocaleDateString(
                              'en-GB',
                            )
                          : '—'
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Family and Emergency Contacts */}
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
                {/* Family Members */}
                <Card className="bg-canvas border border-hairline rounded-xl">
                  <CardHeader className="pb-3 border-b border-hairline-soft">
                    <CardTitle className="text-base font-semibold text-ink flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      {t('renters.familyMembers') || 'পরিবারের তথ্য'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 flex flex-col gap-3">
                    <div>
                      <span className="text-xs text-steel block">
                        মোট সদস্য সংখ্যা
                      </span>
                      <span className="text-base font-semibold text-ink">
                        {renter.totalFamilyMembers} জন
                      </span>
                    </div>
                    {renter.familyMemberNames &&
                      renter.familyMemberNames.length > 0 && (
                        <div>
                          <span className="text-xs text-steel block mb-1">
                            সদস্যদের নাম
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {renter.familyMemberNames.map((name, i) => (
                              <span
                                key={i}
                                className="text-xs bg-surface px-2.5 py-1 border border-hairline rounded-full text-charcoal"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                  </CardContent>
                </Card>

                {/* Emergency Contact */}
                <Card className="bg-canvas border border-hairline rounded-xl">
                  <CardHeader className="pb-3 border-b border-hairline-soft">
                    <CardTitle className="text-base font-semibold text-ink flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" />
                      {t('renters.emergencyContact') || 'জরুরি যোগাযোগ'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 flex flex-col gap-3">
                    <ProfileItem
                      label={t('renters.emergencyContactName')}
                      value={renter.emergencyContactName}
                    />
                    <ProfileItem
                      label={t('renters.emergencyContactNumber')}
                      value={renter.emergencyContactNumber}
                    />
                    <ProfileItem
                      label={t('renters.emergencyContactRelationship')}
                      value={renter.emergencyContactRelationship}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Uploaded Documents preview */}
              <Card className="bg-canvas border border-hairline rounded-xl">
                <CardHeader className="pb-3 border-b border-hairline-soft">
                  <CardTitle className="text-base font-semibold text-ink flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    সংযুক্ত ফাইলসমূহ
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
                    {/* Selfie Photo */}
                    <div className="flex flex-col items-center p-3 border border-hairline-soft bg-surface rounded-xl text-center">
                      <span className="text-xs font-semibold text-steel mb-2">
                        ভাড়াটিয়ার সেলফি ছবি
                      </span>
                      {renter.selfiePhotoUrl ? (
                        <div className="relative group w-24 h-24 rounded-full overflow-hidden border border-hairline bg-white shadow-sm">
                          {/* biome-ignore lint/performance/noImgElement: public image display */}
                          <img
                            src={renter.selfiePhotoUrl}
                            alt="সেলফি"
                            className="w-full h-full object-cover"
                          />
                          <a
                            href={renter.selfiePhotoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                          >
                            বড় করে দেখুন
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-steel py-8">
                          কোনো ছবি নেই
                        </span>
                      )}
                    </div>

                    {/* NID Card */}
                    <div className="flex flex-col items-center p-3 border border-hairline-soft bg-surface rounded-xl text-center">
                      <span className="text-xs font-semibold text-steel mb-2">
                        জাতীয় পরিচয়পত্র (NID)
                      </span>
                      {renter.nidPhotoUrl ? (
                        <div className="relative group w-full max-w-[140px] aspect-3/2 overflow-hidden rounded-lg border border-hairline bg-white shadow-sm">
                          {/* biome-ignore lint/performance/noImgElement: public image display */}
                          <img
                            src={renter.nidPhotoUrl}
                            alt="NID"
                            className="w-full h-full object-cover"
                          />
                          <a
                            href={renter.nidPhotoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                          >
                            বড় করে দেখুন
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-steel py-8">
                          কোনো ছবি নেই
                        </span>
                      )}
                    </div>

                    {/* Signature */}
                    <div className="flex flex-col items-center p-3 border border-hairline-soft bg-surface rounded-xl text-center">
                      <span className="text-xs font-semibold text-steel mb-2">
                        ডিজিটাল স্বাক্ষর
                      </span>
                      {renter.digitalSignatureUrl ? (
                        <div className="relative group w-full max-w-[140px] h-16 overflow-hidden rounded border border-hairline bg-white shadow-sm p-1">
                          {/* biome-ignore lint/performance/noImgElement: public image display */}
                          <img
                            src={renter.digitalSignatureUrl}
                            alt="স্বাক্ষর"
                            className="w-full h-full object-contain"
                          />
                          <a
                            href={renter.digitalSignatureUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                          >
                            বড় করে দেখুন
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-steel py-8">
                          কোনো ছবি নেই
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contract Info Sidebar */}
            <div>
              <Card className="bg-canvas border border-hairline rounded-xl sticky top-4">
                <CardHeader className="pb-3 border-b border-hairline-soft">
                  <CardTitle className="text-base font-semibold text-ink flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {t('renters.contractInfo') || 'চুক্তি ও ভাড়ার বিবরণ'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex flex-col gap-5">
                  {contract ? (
                    <>
                      <div>
                        <span className="text-xs text-steel block">
                          মাসিক মূল ভাড়া
                        </span>
                        <CurrencyDisplay amount={contract.monthlyRent} large />
                      </div>
                      <div>
                        <span className="text-xs text-steel block">
                          অগ্রিম জমা ব্যালেন্স
                        </span>
                        <CurrencyDisplay amount={contract.depositBalance} />
                      </div>
                      <div>
                        <span className="text-xs text-steel block">
                          ভাড়া শুরুর তারিখ
                        </span>
                        <span className="text-sm font-semibold text-ink">
                          {new Date(contract.startDate).toLocaleDateString(
                            'en-GB',
                          )}
                        </span>
                      </div>
                      {/* Utilities if exist */}
                      <div className="pt-3 border-t border-hairline-soft">
                        <span className="text-xs font-semibold text-steel block mb-2">
                          নির্দিষ্ট মাসিক বিলসমূহ
                        </span>
                        <div className="flex flex-col gap-2">
                          <UtilityItem
                            label="গ্যাস বিল"
                            amount={contract.gasBill}
                          />
                          <UtilityItem
                            label="পানি বিল"
                            amount={contract.waterBill}
                          />
                          <UtilityItem
                            label="সার্ভিস চার্জ"
                            amount={contract.serviceCharge}
                          />
                          <UtilityItem
                            label="অন্যান্য চার্জ"
                            amount={contract.otherCharges}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-steel text-center py-6">
                      কোনো চুক্তির তথ্য পাওয়া যায়নি
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'bills' && (
          <div className="flex flex-col gap-6">
            {/* Bill History List */}
            <Card className="bg-canvas border border-hairline rounded-xl">
              <CardHeader className="pb-3 border-b border-hairline-soft">
                <CardTitle className="text-base font-semibold text-ink flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  বিল ইতিহাস
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {bills.length === 0 ? (
                  <p className="text-sm text-steel text-center py-8">
                    {t('bills.noBills') || 'কোনো বিল পাওয়া যায়নি'}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-hairline bg-surface">
                          <th className="px-5 py-3..5 text-left font-semibold text-xs text-steel uppercase w-[120px]">
                            {t('bills.billMonth')}
                          </th>
                          <th className="px-5 py-3.5 text-left font-semibold text-xs text-steel uppercase w-[100px]">
                            {t('bills.status')}
                          </th>
                          <th className="px-5 py-3.5 text-right font-semibold text-xs text-steel uppercase">
                            {t('bills.totalAmount')}
                          </th>
                          <th className="px-5 py-3.5 text-right font-semibold text-xs text-steel uppercase">
                            {t('bills.paidAmount')}
                          </th>
                          <th className="px-5 py-3.5 text-right font-semibold text-xs text-steel uppercase w-[120px]">
                            বকেয়া
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {bills.map((bill) => {
                          const statusLabel =
                            bill.status === 'paid'
                              ? 'পরিশোধিত'
                              : bill.status === 'partially_paid'
                                ? 'আংশিক পরিশোধিত'
                                : bill.status === 'overdue'
                                  ? 'বকেয়া'
                                  : 'অপরিশোধিত'
                          const statusColor =
                            bill.status === 'paid'
                              ? 'bg-success-bg text-success-text border-success-text/20'
                              : bill.status === 'partially_paid'
                                ? 'bg-info-bg text-info-text border-info-text/20'
                                : 'bg-error-bg text-error-text border-error-text/20'
                          return (
                            <tr
                              key={bill.id}
                              className="border-b border-hairline-soft hover:bg-surface/30"
                            >
                              <td className="px-5 py-3.5 font-semibold text-ink">
                                {bill.billingMonth}
                              </td>
                              <td className="px-5 py-3.5">
                                <span
                                  className={cn(
                                    'text-xs px-2.5 py-0.5 rounded-full border font-medium',
                                    statusColor,
                                  )}
                                >
                                  {statusLabel}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-right font-medium text-ink">
                                ৳
                                {bill.totalAmount.toLocaleString('en-BD', {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                              <td className="px-5 py-3.5 text-right text-success-text">
                                ৳
                                {bill.paidAmount.toLocaleString('en-BD', {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                              <td className="px-5 py-3.5 text-right font-semibold text-error-text">
                                ৳
                                {(
                                  bill.totalAmount - bill.paidAmount
                                ).toLocaleString('en-BD', {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment History List */}
            <Card className="bg-canvas border border-hairline rounded-xl">
              <CardHeader className="pb-3 border-b border-hairline-soft">
                <CardTitle className="text-base font-semibold text-ink flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  পেমেন্ট ইতিহাস
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {payments.length === 0 ? (
                  <p className="text-sm text-steel text-center py-8">
                    {t('payments.noPayments') || 'কোনো পেমেন্ট পাওয়া যায়নি'}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-hairline bg-surface">
                          <th className="px-5 py-3.5 text-left font-semibold text-xs text-steel uppercase">
                            রসিদ নম্বর
                          </th>
                          <th className="px-5 py-3.5 text-left font-semibold text-xs text-steel uppercase w-[120px]">
                            তারিখ
                          </th>
                          <th className="px-5 py-3.5 text-left font-semibold text-xs text-steel uppercase w-[120px]">
                            পদ্ধতি
                          </th>
                          <th className="px-5 py-3.5 text-left font-semibold text-xs text-steel uppercase">
                            নোট
                          </th>
                          <th className="px-5 py-3.5 text-right font-semibold text-xs text-steel uppercase w-[140px]">
                            পরিমাণ
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((pm) => {
                          const methodLabel =
                            pm.paymentMethod === 'cash'
                              ? 'নগদ'
                              : pm.paymentMethod === 'bank_transfer'
                                ? 'ব্যাংক ট্রান্সফার'
                                : pm.paymentMethod === 'mobile_banking'
                                  ? 'মোবাইল ব্যাংকিং'
                                  : pm.paymentMethod
                          return (
                            <tr
                              key={pm.id}
                              className="border-b border-hairline-soft hover:bg-surface/30"
                            >
                              <td className="px-5 py-3.5 font-mono text-xs text-brand-blue-deep font-semibold">
                                {pm.receiptReference}
                              </td>
                              <td className="px-5 py-3.5 text-steel text-xs">
                                {pm.paymentDate}
                              </td>
                              <td className="px-5 py-3.5 text-ink">
                                {methodLabel}
                              </td>
                              <td className="px-5 py-3.5 text-steel italic text-xs">
                                {pm.note || '—'}
                              </td>
                              <td className="px-5 py-3.5 text-right font-semibold text-success-text">
                                ৳
                                {pm.amount.toLocaleString('en-BD', {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <Card className="bg-canvas border border-hairline rounded-xl max-w-2xl">
            <CardHeader className="pb-3 border-b border-hairline-soft">
              <CardTitle className="text-base font-semibold text-ink flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                রক্ষণাবেক্ষণের সমস্যা রিপোর্ট করুন
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form
                onSubmit={handleMaintenanceSubmit}
                className="flex flex-col gap-5"
              >
                <div>
                  <label
                    htmlFor="m-title"
                    className="block text-sm font-semibold text-ink mb-1.5"
                  >
                    সমস্যার শিরোনাম <span className="text-error-text">*</span>
                  </label>
                  <input
                    id="m-title"
                    type="text"
                    value={mTitle}
                    onChange={(e) => {
                      setMTitle(e.target.value)
                      if (mErrors.title)
                        setMErrors((prev) => ({ ...prev, title: '' }))
                    }}
                    placeholder="উদা: ওয়াশরুমের ট্যাপ নষ্ট"
                    className={cn(
                      'w-full px-4 py-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[44px]',
                      mErrors.title ? 'border-error-text' : 'border-hairline',
                    )}
                  />
                  {mErrors.title && (
                    <p className="text-xs text-error-text mt-1">
                      {mErrors.title}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="m-description"
                    className="block text-sm font-semibold text-ink mb-1.5"
                  >
                    বিস্তারিত বিবরণ <span className="text-error-text">*</span>
                  </label>
                  <textarea
                    id="m-description"
                    rows={4}
                    value={mDescription}
                    onChange={(e) => {
                      setMDescription(e.target.value)
                      if (mErrors.description)
                        setMErrors((prev) => ({ ...prev, description: '' }))
                    }}
                    placeholder="সমস্যাটি বিস্তারিত লিখুন যাতে সহজে মেরামত করা যায়..."
                    className={cn(
                      'w-full px-4 py-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[100px]',
                      mErrors.description
                        ? 'border-error-text'
                        : 'border-hairline',
                    )}
                  />
                  {mErrors.description && (
                    <p className="text-xs text-error-text mt-1">
                      {mErrors.description}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="m-priority"
                      className="block text-sm font-semibold text-ink mb-1.5"
                    >
                      অগ্রাধিকার স্তর
                    </label>
                    <select
                      id="m-priority"
                      value={mPriority}
                      onChange={(e) =>
                        setMPriority(
                          e.target.value as
                            | 'low'
                            | 'medium'
                            | 'high'
                            | 'urgent',
                        )
                      }
                      className="w-full px-4 py-2.5 border border-hairline rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[44px]"
                    >
                      <option value="low">কম</option>
                      <option value="medium">মাঝারি</option>
                      <option value="high">উচ্চ</option>
                      <option value="urgent">জরুরি</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="m-files"
                      className="block text-sm font-semibold text-ink mb-1.5"
                    >
                      ছবি বা ফাইল সংযুক্তি (ঐচ্ছিক)
                    </label>
                    <div className="relative">
                      <input
                        id="m-files"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="m-files"
                        className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-hairline rounded-lg text-sm bg-white cursor-pointer hover:bg-surface/50 transition-colors min-h-[44px] justify-center text-steel font-medium"
                      >
                        <Upload className="h-4 w-4" />
                        ফাইল আপলোড করুন ({mAttachments.length})
                      </label>
                    </div>
                  </div>
                </div>

                {mAttachments.length > 0 && (
                  <div className="bg-surface p-3 rounded-lg border border-hairline">
                    <span className="text-xs text-steel font-semibold block mb-1">
                      সংযুক্ত ফাইলসমূহ:
                    </span>
                    <ul className="text-xs text-ink flex flex-col gap-1.5">
                      {mAttachments.map((f, i) => (
                        <li
                          key={i}
                          className="flex justify-between items-center"
                        >
                          <span className="truncate">{f.name}</span>
                          <span className="text-steel font-mono">
                            ({(f.size / 1024).toFixed(1)} KB)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={maintenanceMutation.isPending}
                  className="w-full bg-primary hover:bg-primary/95 text-white font-semibold rounded-lg py-3 text-sm min-h-[44px] flex items-center justify-center gap-2"
                >
                  {maintenanceMutation.isPending
                    ? 'জমা দেওয়া হচ্ছে...'
                    : 'অনুরোধ পাঠান'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-steel font-semibold uppercase mb-1">
        {label}
      </span>
      <span className="text-sm font-medium text-ink">{value || '—'}</span>
    </div>
  )
}

function UtilityItem({
  label,
  amount,
}: {
  label: string
  amount: number | null
}) {
  if (amount === null || amount <= 0) return null
  return (
    <div className="flex justify-between items-center text-sm py-1 border-b border-hairline-soft">
      <span className="text-steel">{label}</span>
      <span className="font-semibold text-ink">
        ৳{amount.toLocaleString('en-BD')}
      </span>
    </div>
  )
}
