'use client'

import { AlertCircle, CheckCircle2, Copy } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '@/lib/i18n'

interface RegistrationSuccessProps {
  generatedAccessCode: string
}

export function RegistrationSuccess({
  generatedAccessCode,
}: RegistrationSuccessProps) {
  const { t } = useTranslation()
  const [copiedCode, setCopiedCode] = useState(false)

  const handleCopyCode = () => {
    if (generatedAccessCode) {
      navigator.clipboard.writeText(generatedAccessCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  return (
    <section
      aria-label="নিবন্ধন সফল"
      className="flex flex-col items-center gap-4 rounded-xl border border-hairline bg-success-bg p-6 text-center shadow-lg"
    >
      <CheckCircle2 className="h-14 w-14 text-success-text" aria-hidden />
      <h2 className="text-xl font-bold text-success-text">
        {t('renters.registrationSuccessTitle') || 'নিবন্ধন সফল হয়েছে!'}
      </h2>
      <p className="text-base text-ink leading-relaxed">
        {t('renters.registrationSuccessDesc') ||
          'আপনার নিবন্ধন অনুরোধ সফলভাবে জমা হয়েছে। বিল্ডিং ম্যানেজার শীঘ্রই আপনার অনুরোধ পর্যালোচনা করবেন।'}
      </p>

      {generatedAccessCode && (
        <div className="w-full bg-white rounded-lg p-5 border border-success-text/20 shadow-sm mt-2 flex flex-col items-center gap-3">
          <span className="text-base text-steel font-medium">
            {t('renters.saveCodePrompt') ||
              'ভবিষ্যতে লগইনের জন্য এই কোডটি সংরক্ষণ করুন'}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-mono font-bold text-brand-blue-deep tracking-widest px-4 py-2 bg-surface rounded border border-hairline">
              {generatedAccessCode}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center justify-center p-3 rounded-lg bg-surface border border-hairline hover:bg-surface-dark transition-colors active:scale-95 cursor-pointer min-h-11 min-w-11"
              title="কপি করুন"
            >
              {copiedCode ? (
                <CheckCircle2 className="h-5 w-5 text-success-text" />
              ) : (
                <Copy className="h-5 w-5 text-ink" />
              )}
            </button>
          </div>
          {copiedCode && (
            <span className="text-base text-success-text">
              {t('renters.codeCopied') || 'কোডটি কপি করা হয়েছে!'}
            </span>
          )}
          <div className="mt-2 text-base text-warning-text bg-warning-bg p-3 rounded-lg border border-warning-text/20 flex gap-2 items-start text-left">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-warning-text" />
            <span>
              <strong>{t('renters.important') || 'গুরুত্বপূর্ণ'}:</strong>{' '}
              {t('renters.registrationApprovalWarning') ||
                'ম্যানেজার আপনার নিবন্ধন অনুমোদন করলে, ফ্ল্যাটের QR কোড স্ক্যান করে এই ৬-সংখ্যার কোডটি দিয়ে প্রবেশ করতে হবে। কোডটি অন্য কোথাও লিখে বা স্ক্রিনশট দিয়ে রাখুন।'}
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
