'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { createIssue, fetchPortalIssues } from '@/lib/api-client'
import { useTranslation } from '@/lib/i18n'

export type IssueCategory =
  | 'plumbing'
  | 'electrical'
  | 'structural'
  | 'cleaning'
  | 'security'
  | 'other'

export type IssuePriority = 'low' | 'medium' | 'high' | 'urgent'

export function usePortalIssues(flatSlug: string, buildingId: string) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  // Fetch issues list
  const {
    data,
    isLoading,
    isError,
    refetch: refetchIssues,
  } = useQuery({
    queryKey: ['portal-issues', flatSlug],
    queryFn: () => fetchPortalIssues(flatSlug),
    retry: false,
  })

  // Issue creation form state
  const [issueTitle, setIssueTitle] = useState('')
  const [issueDescription, setIssueDescription] = useState('')
  const [issueCategory, setIssueCategory] = useState<IssueCategory>('other')
  const [issuePriority, setIssuePriority] = useState<IssuePriority>('medium')
  const [issueAttachments, setIssueAttachments] = useState<File[]>([])
  const [issueErrors, setIssueErrors] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)

  const createMutation = useMutation({
    mutationFn: () => {
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

    createMutation.mutate()
  }

  const issues = data?.issues ?? []

  return {
    issues,
    isLoading,
    isError,
    refetchIssues,
    form: {
      issueTitle,
      setIssueTitle,
      issueDescription,
      setIssueDescription,
      issueCategory,
      setIssueCategory,
      issuePriority,
      setIssuePriority,
      issueAttachments,
      setIssueAttachments,
      issueErrors,
      setIssueErrors,
    },
    feedback,
    setFeedback,
    isSubmitting: createMutation.isPending,
    handleSubmit: handleIssueSubmit,
  }
}
