/** biome-ignore-all lint/suspicious/noArrayIndexKey: intentionally done */
'use client'

import { FileText, Phone, User, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CurrencyDisplay } from '@/components/ui/currency-display'
import { useTranslation } from '@/lib/i18n'
import type { PortalRenterData } from '../../types'

interface ProfileSectionProps {
  portalData: PortalRenterData
}

export function ProfileSection({ portalData }: ProfileSectionProps) {
  const { t } = useTranslation()
  const { renter, contract } = portalData

  return (
    <div className="grid gap-6 grid-cols-1">
      {/* Personal Details */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <Card className="bg-canvas border border-hairline rounded-xl">
          <CardHeader className="pb-3 border-b border-hairline-soft">
            <CardTitle className="text-base font-semibold text-ink flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              {t('renters.personalInfo') || 'ব্যক্তিগত তথ্য'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2">
              <ProfileItem
                label={t('renters.fullName') || 'পূর্ণ নাম'}
                value={renter.fullName}
              />
              <ProfileItem
                label={t('renters.phone') || 'ফোন নম্বর'}
                value={renter.phone}
              />
              <ProfileItem
                label={t('renters.nidNumber') || 'জাতীয় পরিচয়পত্র নম্বর'}
                value={renter.nidNumber}
              />
              <ProfileItem
                label={t('renters.occupation') || 'পেশা'}
                value={renter.occupation}
              />
              <ProfileItem
                label={t('renters.bloodGroup') || 'রক্তের গ্রুপ'}
                value={renter.bloodGroup}
              />
              <ProfileItem
                label={t('renters.dateOfBirth') || 'জন্ম তারিখ'}
                value={
                  renter.dateOfBirth
                    ? new Date(renter.dateOfBirth).toLocaleDateString('en-GB')
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
                  {t('renters.totalFamilyMembersLabel') || 'মোট সদস্য সংখ্যা'}
                </span>
                <span className="text-sm font-semibold text-ink">
                  {renter.totalFamilyMembers} {t('renters.persons') || 'জন'}
                </span>
              </div>
              {renter.familyMemberNames &&
                renter.familyMemberNames.length > 0 && (
                  <div>
                    <span className="text-xs text-steel block mb-1">
                      {t('renters.familyMemberNames') || 'সদস্যদের নাম'}
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
                label={t('renters.emergencyContactName') || 'জরুরি যোগাযোগের নাম'}
                value={renter.emergencyContactName}
              />
              <ProfileItem
                label={
                  t('renters.emergencyContactNumber') || 'জরুরি যোগাযোগের নম্বর'
                }
                value={renter.emergencyContactNumber}
              />
              <ProfileItem
                label={t('renters.emergencyContactRelationship') || 'সম্পর্ক'}
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
              {t('renters.attachedFilesLabel') || 'সংযুক্ত ফাইলসমূহ'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
              {/* Selfie Photo */}
              <div className="flex flex-col items-center p-3 border border-hairline-soft bg-surface rounded-xl text-center">
                <span className="text-xs font-semibold text-steel mb-2">
                  {t('renters.selfiePhoto') || 'ভাড়াটিয়ার সেলফি ছবি'}
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
                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs cursor-pointer"
                    >
                      {t('issues.view') || 'বড় করে দেখুন'}
                    </a>
                  </div>
                ) : (
                  <span className="text-xs text-steel py-8">
                    {t('renters.noPhoto') || 'কোনো ছবি নেই'}
                  </span>
                )}
              </div>

              {/* NID Card */}
              <div className="flex flex-col items-center p-3 border border-hairline-soft bg-surface rounded-xl text-center">
                <span className="text-xs font-semibold text-steel mb-2">
                  {t('renters.nidPhoto') || 'জাতীয় পরিচয়পত্র (NID)'}
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
                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs cursor-pointer"
                    >
                      {t('issues.view') || 'বড় করে দেখুন'}
                    </a>
                  </div>
                ) : (
                  <span className="text-xs text-steel py-8">
                    {t('renters.noPhoto') || 'কোনো ছবি নেই'}
                  </span>
                )}
              </div>

              {/* Signature */}
              <div className="flex flex-col items-center p-3 border border-hairline-soft bg-surface rounded-xl text-center">
                <span className="text-xs font-semibold text-steel mb-2">
                  {t('renters.digitalSignature') || 'ডিজিটাল স্বাক্ষর'}
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
                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs cursor-pointer"
                    >
                      {t('issues.view') || 'বড় করে দেখুন'}
                    </a>
                  </div>
                ) : (
                  <span className="text-xs text-steel py-8">
                    {t('renters.noPhoto') || 'কোনো ছবি নেই'}
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
                    {t('renters.monthlyRent') || 'মাসিক মূল ভাড়া'}
                  </span>
                  <CurrencyDisplay amount={contract.monthlyRent} large />
                </div>
                <div>
                  <span className="text-xs text-steel block">
                    {t('renters.depositBalance') || 'অগ্রিম জমা ব্যালেন্স'}
                  </span>
                  <CurrencyDisplay amount={contract.depositBalance} />
                </div>
                <div>
                  <span className="text-xs text-steel block">
                    {t('renters.rentalStartDate') || 'ভাড়া শুরুর তারিখ'}
                  </span>
                  <span className="text-sm font-semibold text-ink">
                    {new Date(contract.startDate).toLocaleDateString('en-GB')}
                  </span>
                </div>
                {/* Utilities if exist */}
                <div className="pt-3 border-t border-hairline-soft">
                  <span className="text-xs font-semibold text-steel block mb-2">
                    {t('renters.utilityBillsLabel') || 'নির্দিষ্ট মাসিক বিলসমূহ'}
                  </span>
                  <div className="flex flex-col gap-2">
                    <UtilityItem label="গ্যাস বিল" amount={contract.gasBill} />
                    <UtilityItem label="পানি বিল" amount={contract.waterBill} />
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
                {t('renters.noContractInfo') || 'কোনো চুক্তির তথ্য পাওয়া যায়নি'}
              </p>
            )}
          </CardContent>
        </Card>
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
