/** biome-ignore-all lint/suspicious/noArrayIndexKey: intentionally done */
'use client'

import { Bug, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { usePortalIssues } from '../../hooks/use-portal-issues'
import { PortalIssuesList } from '../sub-components/portal-issues-list'

interface IssuesSectionProps {
  flatSlug: string
  buildingId: string
}

export function IssuesSection({ flatSlug, buildingId }: IssuesSectionProps) {
  const { t } = useTranslation()
  const { form, feedback, setFeedback, isSubmitting, handleSubmit } =
    usePortalIssues(flatSlug, buildingId)

  const handleIssueFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      form.setIssueAttachments(Array.from(e.target.files))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {feedback && (
        <ErrorFeedback
          message={feedback.message}
          type={feedback.type}
          visible
          onDismiss={() => setFeedback(null)}
        />
      )}

      <Card className="bg-canvas border border-hairline rounded-xl">
        <CardHeader className="pb-3 border-b border-hairline-soft">
          <CardTitle className="text-base font-semibold text-ink flex items-center gap-2">
            <Bug className="h-4 w-4 text-primary" />
            {t('issues.myIssues') || 'আমার সমস্যাসমূহ'}
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
            {t('issues.newIssueReport') || 'নতুন সমস্যা রিপোর্ট করুন'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label
                htmlFor="issue-title"
                className="block text-sm font-semibold text-ink mb-1.5"
              >
                {t('issues.issueTitle') || 'শিরোনাম'}{' '}
                <span className="text-error-text">*</span>
              </label>
              <input
                id="issue-title"
                type="text"
                value={form.issueTitle}
                onChange={(e) => {
                  form.setIssueTitle(e.target.value)
                  if (form.issueErrors.title)
                    form.setIssueErrors((prev) => ({ ...prev, title: '' }))
                }}
                placeholder={
                  t('issues.titlePlaceholder') || 'সমস্যার শিরোনাম লিখুন'
                }
                className={cn(
                  'w-full px-4 py-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-11',
                  form.issueErrors.title
                    ? 'border-error-text'
                    : 'border-hairline',
                )}
              />
              {form.issueErrors.title && (
                <p className="text-xs text-error-text mt-1">
                  {form.issueErrors.title}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="issue-description"
                className="block text-sm font-semibold text-ink mb-1.5"
              >
                {t('issues.description') || 'বিবরণ'}{' '}
                <span className="text-error-text">*</span>
              </label>
              <textarea
                id="issue-description"
                rows={4}
                value={form.issueDescription}
                onChange={(e) => {
                  form.setIssueDescription(e.target.value)
                  if (form.issueErrors.description)
                    form.setIssueErrors((prev) => ({
                      ...prev,
                      description: '',
                    }))
                }}
                placeholder={
                  t('issues.descriptionPlaceholder') ||
                  'সমস্যাটি বিস্তারিত বর্ণনা করুন...'
                }
                className={cn(
                  'w-full px-4 py-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-25',
                  form.issueErrors.description
                    ? 'border-error-text'
                    : 'border-hairline',
                )}
              />
              {form.issueErrors.description && (
                <p className="text-xs text-error-text mt-1">
                  {form.issueErrors.description}
                </p>
              )}
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="issue-category"
                  className="block text-sm font-semibold text-ink mb-1.5"
                >
                  {t('issues.category') || 'বিভাগ'}
                </label>
                <select
                  id="issue-category"
                  value={form.issueCategory}
                  onChange={(e) =>
                    form.setIssueCategory(
                      e.target.value as typeof form.issueCategory,
                    )
                  }
                  className="w-full px-4 py-2.5 border border-hairline rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-11"
                >
                  <option value="plumbing">
                    {t('issues.plumbing') || 'প্লাম্বিং'}
                  </option>
                  <option value="electrical">
                    {t('issues.electrical') || 'বৈদ্যুতিক'}
                  </option>
                  <option value="structural">
                    {t('issues.structural') || 'কাঠামোগত'}
                  </option>
                  <option value="cleaning">
                    {t('issues.cleaning') || 'পরিষ্কার'}
                  </option>
                  <option value="security">
                    {t('issues.security') || 'নিরাপত্তা'}
                  </option>
                  <option value="other">{t('issues.other') || 'অন্যান্য'}</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="issue-priority"
                  className="block text-sm font-semibold text-ink mb-1.5"
                >
                  {t('issues.priority') || 'অগ্রাধিকার'}
                </label>
                <select
                  id="issue-priority"
                  value={form.issuePriority}
                  onChange={(e) =>
                    form.setIssuePriority(
                      e.target.value as typeof form.issuePriority,
                    )
                  }
                  className="w-full px-4 py-2.5 border border-hairline rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-11"
                >
                  <option value="low">{t('issues.low') || 'কম'}</option>
                  <option value="medium">{t('issues.medium') || 'মাঝারি'}</option>
                  <option value="high">{t('issues.high') || 'উচ্চ'}</option>
                  <option value="urgent">{t('issues.urgent') || 'জরুরি'}</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="issue-files"
                className="block text-sm font-semibold text-ink mb-1.5"
              >
                {t('issues.photoUpload') || 'ছবি সংযুক্তি (ঐচ্ছিক)'}
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
                  <ImageIcon className="h-4 w-4" />
                  {form.issueAttachments.length > 0
                    ? `${form.issueAttachments.length} ${t('issues.filesSelected') || 'টি ফাইল নির্বাচিত'}`
                    : t('issues.selectFiles') || 'ছবি নির্বাচন করুন'}
                </label>
              </div>
              {form.issueAttachments.length > 0 && (
                <div className="bg-surface p-3 rounded-lg border border-hairline mt-2">
                  <span className="text-xs text-steel font-semibold block mb-1">
                    {t('issues.attachedFiles') || 'সংযুক্ত ফাইল:'}
                  </span>
                  <ul className="text-xs text-ink flex flex-col gap-1.5">
                    {form.issueAttachments.map((f, i) => (
                      <li key={i} className="flex justify-between items-center">
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
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/95 text-white font-semibold rounded-full py-3 text-sm min-h-11 cursor-pointer"
            >
              {isSubmitting
                ? t('issues.submitting') || 'জমা দেওয়া হচ্ছে...'
                : t('issues.submitReport') || 'রিপোর্ট জমা দিন'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
