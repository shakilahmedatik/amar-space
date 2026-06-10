/** biome-ignore-all lint/suspicious/noArrayIndexKey: intentionally done */
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bug,
  CreditCard,
  FileText,
  Image,
  Phone,
  User,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CurrencyDisplay } from '@/components/ui/currency-display'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { createIssue, fetchPortalRenterData } from '@/lib/api-client'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { AccessCodeInput } from './access-code-input'
import { BuildingInfo } from './building-info'
import { EmergencyContacts } from './emergency-contacts'
import { NoticeBoardSection } from './notice-board-section'
import { PortalIssuesList } from './portal-issues-list'

export type PortalPanelType =
  | 'profile'
  | 'bills'
  | 'notices'
  | 'contacts'
  | 'issues'
  | 'rules'

interface PortalOccupiedViewProps {
  flatSlug: string
  className?: string
  activePanel: PortalPanelType
  emergencyContacts?: Array<{
    name: string
    role: string
    phone: string | null
    type: 'building' | 'nearby'
    order: number
  }>
  rules?: string | null
}

export default function PortalOccupiedView({
  flatSlug,
  className,
  activePanel,
  emergencyContacts = [],
  rules = null,
}: PortalOccupiedViewProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)

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

  // Issues form state — placed before early returns to keep hook order stable
  const [issueTitle, setIssueTitle] = useState('')
  const [issueDescription, setIssueDescription] = useState('')
  const [issueCategory, setIssueCategory] = useState<
    'plumbing' | 'electrical' | 'structural' | 'cleaning' | 'security' | 'other'
  >('other')
  const [issuePriority, setIssuePriority] = useState<
    'low' | 'medium' | 'high' | 'urgent'
  >('medium')
  const [issueAttachments, setIssueAttachments] = useState<File[]>([])
  const [issueErrors, setIssueErrors] = useState<Record<string, string>>({})

  const issueMutation = useMutation({
    mutationFn: () => {
      const buildingId = portalData?.flat.buildingId ?? ''
      return createIssue({
        buildingId,
        title: issueTitle.trim(),
        description: issueDescription.trim(),
        category: issueCategory,
        priority: issuePriority,
        attachments: issueAttachments.length > 0 ? issueAttachments : undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-issues', flatSlug] })
      setFeedback({
        message: t('issues.createSuccess') || 'Issue submitted successfully',
        type: 'success',
      })
      setIssueTitle('')
      setIssueDescription('')
      setIssueCategory('other')
      setIssuePriority('medium')
      setIssueAttachments([])
      setIssueErrors({})
    },
    onError: (err) => {
      setFeedback({
        message: err instanceof Error ? err.message : t('common.error'),
        type: 'error',
      })
    },
  })

  function handleIssueSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errors: Record<string, string> = {}

    if (!issueTitle.trim()) {
      errors.title = t('issues.titleRequired')
    } else if (issueTitle.trim().length < 5) {
      errors.title = t('issues.titleMinLength')
    } else if (issueTitle.trim().length > 200) {
      errors.title = t('issues.titleMaxLength')
    }

    if (!issueDescription.trim()) {
      errors.description = t('issues.descriptionRequired')
    } else if (issueDescription.trim().length < 10) {
      errors.description = t('issues.descriptionMinLength')
    } else if (issueDescription.trim().length > 2000) {
      errors.description = t('issues.descriptionMaxLength')
    }

    if (Object.keys(errors).length > 0) {
      setIssueErrors(errors)
      return
    }

    issueMutation.mutate()
  }

  function handleIssueFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setIssueAttachments(Array.from(e.target.files))
    }
  }

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

  // If unauthorized or no data, render the Access Code input (login gate)
  if (isUnauthorized || !portalData) {
    return (
      <AccessCodeInput
        flatSlug={flatSlug}
        flatStatus="OCCUPIED"
        onSuccess={refetch}
      />
    )
  }

  const { renter, contract, bills, payments } = portalData

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

      {/* Panel Contents — driven by activePanel prop from parent */}
      <div className="transition-all duration-200">
        {activePanel === 'notices' && (
          <div className="bg-canvas border border-hairline p-5 rounded-xl shadow-sm">
            <NoticeBoardSection flatSlug={flatSlug} />
          </div>
        )}

        {activePanel === 'contacts' && (
          <div className="bg-canvas border border-hairline p-5 rounded-xl shadow-sm">
            <EmergencyContacts
              contacts={emergencyContacts}
              flatSlug={flatSlug}
            />
          </div>
        )}

        {activePanel === 'rules' && rules && (
          <div className="bg-canvas border border-hairline p-5 rounded-xl shadow-sm">
            <BuildingInfo rules={rules} />
          </div>
        )}

        {activePanel === 'issues' && (
          <>
            <Card className="bg-canvas border border-hairline rounded-xl">
              <CardHeader className="pb-3 border-b border-hairline-soft">
                <CardTitle className="text-base font-semibold text-ink flex items-center gap-2">
                  <Bug className="h-4 w-4 text-primary" />
                  {t('issues.myIssues')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <PortalIssuesList flatSlug={flatSlug} />
              </CardContent>
            </Card>

            <Card className="bg-canvas border border-hairline rounded-xl max-w-2xl mt-6">
              <CardHeader className="pb-3 border-b border-hairline-soft">
                <CardTitle className="text-base font-semibold text-ink flex items-center gap-2">
                  <Bug className="h-4 w-4 text-primary" />
                  {t('issues.newIssueReport')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form
                  onSubmit={handleIssueSubmit}
                  className="flex flex-col gap-5"
                >
                  <div>
                    <label
                      htmlFor="issue-title"
                      className="block text-sm font-semibold text-ink mb-1.5"
                    >
                      {t('issues.issueTitle')}{' '}
                      <span className="text-error-text">*</span>
                    </label>
                    <input
                      id="issue-title"
                      type="text"
                      value={issueTitle}
                      onChange={(e) => {
                        setIssueTitle(e.target.value)
                        if (issueErrors.title)
                          setIssueErrors((prev) => ({ ...prev, title: '' }))
                      }}
                      placeholder={t('issues.titlePlaceholder')}
                      className={cn(
                        'w-full px-4 py-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-11',
                        issueErrors.title
                          ? 'border-error-text'
                          : 'border-hairline',
                      )}
                    />
                    {issueErrors.title && (
                      <p className="text-xs text-error-text mt-1">
                        {issueErrors.title}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="issue-description"
                      className="block text-sm font-semibold text-ink mb-1.5"
                    >
                      {t('issues.description')}{' '}
                      <span className="text-error-text">*</span>
                    </label>
                    <textarea
                      id="issue-description"
                      rows={4}
                      value={issueDescription}
                      onChange={(e) => {
                        setIssueDescription(e.target.value)
                        if (issueErrors.description)
                          setIssueErrors((prev) => ({
                            ...prev,
                            description: '',
                          }))
                      }}
                      placeholder={t('issues.descriptionPlaceholder')}
                      className={cn(
                        'w-full px-4 py-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-25',
                        issueErrors.description
                          ? 'border-error-text'
                          : 'border-hairline',
                      )}
                    />
                    {issueErrors.description && (
                      <p className="text-xs text-error-text mt-1">
                        {issueErrors.description}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="issue-category"
                        className="block text-sm font-semibold text-ink mb-1.5"
                      >
                        {t('issues.category')}
                      </label>
                      <select
                        id="issue-category"
                        value={issueCategory}
                        onChange={(e) =>
                          setIssueCategory(
                            e.target.value as typeof issueCategory,
                          )
                        }
                        className="w-full px-4 py-2.5 border border-hairline rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-11"
                      >
                        <option value="plumbing">{t('issues.plumbing')}</option>
                        <option value="electrical">
                          {t('issues.electrical')}
                        </option>
                        <option value="structural">
                          {t('issues.structural')}
                        </option>
                        <option value="cleaning">{t('issues.cleaning')}</option>
                        <option value="security">{t('issues.security')}</option>
                        <option value="other">{t('issues.other')}</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="issue-priority"
                        className="block text-sm font-semibold text-ink mb-1.5"
                      >
                        {t('issues.priority')}
                      </label>
                      <select
                        id="issue-priority"
                        value={issuePriority}
                        onChange={(e) =>
                          setIssuePriority(
                            e.target.value as typeof issuePriority,
                          )
                        }
                        className="w-full px-4 py-2.5 border border-hairline rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-11"
                      >
                        <option value="low">{t('issues.low')}</option>
                        <option value="medium">{t('issues.medium')}</option>
                        <option value="high">{t('issues.high')}</option>
                        <option value="urgent">{t('issues.urgent')}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="issue-files"
                      className="block text-sm font-semibold text-ink mb-1.5"
                    >
                      {t('issues.photoUpload')}
                    </label>
                    <div className="relative">
                      <input
                        id="issue-files"
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        capture="environment"
                        onChange={handleIssueFileChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="issue-files"
                        className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-hairline rounded-lg text-sm bg-white cursor-pointer hover:bg-surface/50 transition-colors min-h-11 justify-center text-steel font-medium"
                      >
                        <Image className="h-4 w-4" />
                        {issueAttachments.length > 0
                          ? `${issueAttachments.length}${t('issues.filesSelected')}`
                          : t('issues.selectFiles')}
                      </label>
                    </div>
                    {issueAttachments.length > 0 && (
                      <div className="bg-surface p-3 rounded-lg border border-hairline mt-2">
                        <span className="text-xs text-steel font-semibold block mb-1">
                          {t('issues.attachedFiles')}
                        </span>
                        <ul className="text-xs text-ink flex flex-col gap-1.5">
                          {issueAttachments.map((f, i) => (
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
                  </div>

                  <Button
                    type="submit"
                    disabled={issueMutation.isPending}
                    className="w-full bg-primary hover:bg-primary/95 text-white font-semibold rounded-lg py-3 text-sm min-h-11"
                  >
                    {issueMutation.isPending
                      ? t('issues.submitting')
                      : t('issues.submitReport')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        )}

        {activePanel === 'profile' && (
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
                        ভাড়াটিয়ার সেলফি ছবি
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
                            বড় করে দেখুন
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
                        <div className="relative group w-full max-w-35 aspect-3/2 overflow-hidden rounded-lg border border-hairline bg-white shadow-sm">
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
                            বড় করে দেখুন
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
                        <div className="relative group w-full max-w-35 h-16 overflow-hidden rounded border border-hairline bg-white shadow-sm p-1">
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
                            বড় করে দেখুন
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

            {/* Contract Info */}
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
                          ভাড়া শুরুর তারিখ
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
                      কোনো চুক্তির তথ্য পাওয়া যায়নি
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activePanel === 'bills' && (
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
                    {t('bills.noBills') || 'কোনো বিল পাওয়া যায়নি'}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-hairline bg-surface">
                          <th className="px-5 py-3..5 text-left font-semibold text-xs text-steel uppercase w-30">
                            {t('bills.billMonth')}
                          </th>
                          <th className="px-5 py-3.5 text-left font-semibold text-xs text-steel uppercase w-25">
                            {t('bills.status')}
                          </th>
                          <th className="px-5 py-3.5 text-right font-semibold text-xs text-steel uppercase">
                            {t('bills.totalAmount')}
                          </th>
                          <th className="px-5 py-3.5 text-right font-semibold text-xs text-steel uppercase">
                            {t('bills.paidAmount')}
                          </th>
                          <th className="px-5 py-3.5 text-right font-semibold text-xs text-steel uppercase w-30">
                            বকেয়া
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
                                  ? 'বকেয়া'
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
                    {t('payments.noPayments') || 'কোনো পেমেন্ট পাওয়া যায়নি'}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-hairline bg-surface">
                          <th className="px-5 py-3.5 text-left font-semibold text-xs text-steel uppercase">
                            রসিদ নম্বর
                          </th>
                          <th className="px-5 py-3.5 text-left font-semibold text-xs text-steel uppercase w-30">
                            তারিখ
                          </th>
                          <th className="px-5 py-3.5 text-left font-semibold text-xs text-steel uppercase w-30">
                            পদ্ধতি
                          </th>
                          <th className="px-5 py-3.5 text-left font-semibold text-xs text-steel uppercase">
                            নোট
                          </th>
                          <th className="px-5 py-3.5 text-right font-semibold text-xs text-steel uppercase w-35">
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
