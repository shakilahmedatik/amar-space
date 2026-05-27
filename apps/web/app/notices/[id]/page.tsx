'use client'

import { useParams } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { FormField, FormInput } from '@/components/ui/form-field'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useBuildings } from '@/hooks/use-buildings'
import {
  useDeleteNotice,
  useNotice,
  useToggleNoticePin,
  useUpdateNotice,
} from '@/hooks/use-notices'
import type { NoticeTargetAudience } from '@/lib/api-client'
import { fetchFlats } from '@/lib/api-client'
import { getSession } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'

type UserRole = 'owner' | 'manager' | 'renter'

/**
 * Notice detail page — /notices/[id]
 * Shows notice content with edit/delete (author or Owner) and pin/unpin toggle.
 * Validates: Requirements 12.1, 12.2, 12.9
 */
export default function NoticeDetailPage() {
  const { t } = useTranslation()
  const params = useParams()
  const noticeId = params.id as string

  const [user, setUser] = useState<{ id: string; role: string } | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)

  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editAudience, setEditAudience] = useState<NoticeTargetAudience | ''>(
    '',
  )
  const [editBuildingId, setEditBuildingId] = useState('')
  const [editFlatId, setEditFlatId] = useState('')
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})

  // Flat options for editing
  const [flatOptions, setFlatOptions] = useState<
    Array<{ id: string; flatNumber: string }>
  >([])
  const [loadingFlats, setLoadingFlats] = useState(false)

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [successMessage, setSuccessMessage] = useState('')

  const { data: notice, isLoading, isError, error } = useNotice(noticeId)
  const updateMutation = useUpdateNotice(noticeId)
  const deleteMutation = useDeleteNotice(noticeId)
  const pinMutation = useToggleNoticePin(noticeId)
  const { data: buildingsData } = useBuildings(1, 100)

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await getSession()
        if (!session) {
          window.location.href = '/login'
          return
        }
        setUser(session)
      } catch {
        window.location.href = '/login'
      } finally {
        setIsLoadingSession(false)
      }
    }
    loadSession()
  }, [])

  // Load flats when editing with specific_flat audience
  useEffect(() => {
    async function loadFlats() {
      if (editAudience === 'specific_flat' && editBuildingId) {
        setLoadingFlats(true)
        try {
          const response = await fetchFlats({
            buildingId: editBuildingId,
            pageSize: 100,
          })
          setFlatOptions(
            (response.data ?? []).map((f) => ({
              id: f.id,
              flatNumber: f.flatNumber,
            })),
          )
        } catch {
          setFlatOptions([])
        } finally {
          setLoadingFlats(false)
        }
      }
    }
    loadFlats()
  }, [editAudience, editBuildingId])

  function startEditing() {
    if (!notice) return
    setEditTitle(notice.title)
    setEditBody(notice.body)
    setEditAudience(notice.targetAudience)
    setEditBuildingId(notice.targetBuildingId || '')
    setEditFlatId(notice.targetFlatId || '')
    setEditErrors({})
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setEditErrors({})
  }

  function validateEdit(): boolean {
    const newErrors: Record<string, string> = {}

    if (!editTitle.trim()) {
      newErrors.title = t('notices.titleRequired')
    } else if (editTitle.trim().length > 200) {
      newErrors.title = t('notices.titleMaxLength')
    }

    if (!editBody.trim()) {
      newErrors.body = t('notices.bodyRequired')
    } else if (editBody.trim().length > 5000) {
      newErrors.body = t('notices.bodyMaxLength')
    }

    if (!editAudience) {
      newErrors.targetAudience = t('notices.audienceRequired')
    }

    if (editAudience === 'specific_building' && !editBuildingId) {
      newErrors.targetBuildingId = t('notices.buildingRequired')
    }

    if (editAudience === 'specific_flat') {
      if (!editBuildingId) {
        newErrors.targetBuildingId = t('notices.buildingRequired')
      }
      if (!editFlatId) {
        newErrors.targetFlatId = t('notices.flatRequired')
      }
    }

    setEditErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault()
    if (!validateEdit()) return

    try {
      await updateMutation.mutateAsync({
        title: editTitle.trim(),
        body: editBody.trim(),
        targetAudience: editAudience as NoticeTargetAudience,
        targetBuildingId:
          editAudience === 'specific_building' ||
          editAudience === 'specific_flat'
            ? editBuildingId
            : null,
        targetFlatId: editAudience === 'specific_flat' ? editFlatId : null,
      })
      setIsEditing(false)
      setSuccessMessage(t('notices.updateSuccess'))
    } catch (err) {
      setEditErrors({
        form: err instanceof Error ? err.message : t('notices.updateError'),
      })
    }
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync()
      setSuccessMessage(t('notices.deleteSuccess'))
      setTimeout(() => {
        window.location.href = '/notices'
      }, 1500)
    } catch (err) {
      setSuccessMessage('')
      setEditErrors({
        form: err instanceof Error ? err.message : t('notices.deleteError'),
      })
    }
  }

  async function handleTogglePin() {
    try {
      await pinMutation.mutateAsync()
      setSuccessMessage(t('notices.pinSuccess'))
    } catch (err) {
      setEditErrors({
        form: err instanceof Error ? err.message : t('notices.pinError'),
      })
    }
  }

  if (isLoadingSession || !user) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-50">
        <div className="w-full max-w-md px-4">
          <LoadingSkeleton rows={5} showHeader />
        </div>
      </div>
    )
  }

  const role = user.role as UserRole
  // Owner can edit/delete any notice; Manager can edit/delete only their own
  const canEdit =
    role === 'owner' || (role === 'manager' && notice?.authorId === user.id)
  // Owner and Manager can pin/unpin
  const canPin = role === 'owner' || role === 'manager'

  const audienceLabels: Record<NoticeTargetAudience, string> = {
    all_renters: t('notices.allRenters'),
    specific_building: t('notices.specificBuilding'),
    specific_flat: t('notices.specificFlat'),
    managers_only: t('notices.managersOnly'),
  }

  return (
    <DashboardLayout role={role} activePath="/notices">
      {successMessage && (
        <ErrorFeedback
          message={successMessage}
          type="success"
          visible
          onDismiss={() => setSuccessMessage('')}
        />
      )}
      {isError && (
        <ErrorFeedback
          message={error?.message || t('notices.loadError')}
          type="error"
          visible
        />
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <a
          href="/notices"
          style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            textDecoration: 'none',
          }}
        >
          ← {t('common.back')}
        </a>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} showHeader />
      ) : notice ? (
        <>
          {/* Notice Content */}
          {!isEditing ? (
            <div
              style={{
                padding: '1.5rem',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb',
                backgroundColor: '#ffffff',
                marginBottom: '1.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.25rem',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <h1
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      color: '#111827',
                    }}
                  >
                    {notice.title}
                  </h1>
                  {notice.isPinned && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0.125rem 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        borderRadius: '9999px',
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                      }}
                    >
                      📌 {t('notices.pinned')}
                    </span>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: '1rem',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  marginBottom: '1.25rem',
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: '#6b7280',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {t('notices.targetAudience')}
                  </p>
                  <p style={{ fontSize: '1rem', color: '#111827' }}>
                    {audienceLabels[notice.targetAudience]}
                  </p>
                </div>
                {notice.targetBuildingName && (
                  <div>
                    <p
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: '#6b7280',
                        marginBottom: '0.25rem',
                      }}
                    >
                      {t('notices.building')}
                    </p>
                    <p style={{ fontSize: '1rem', color: '#111827' }}>
                      {notice.targetBuildingName}
                    </p>
                  </div>
                )}
                {notice.targetFlatNumber && (
                  <div>
                    <p
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: '#6b7280',
                        marginBottom: '0.25rem',
                      }}
                    >
                      {t('notices.flat')}
                    </p>
                    <p style={{ fontSize: '1rem', color: '#111827' }}>
                      {notice.targetFlatNumber}
                    </p>
                  </div>
                )}
                <div>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: '#6b7280',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {t('notices.author')}
                  </p>
                  <p style={{ fontSize: '1rem', color: '#111827' }}>
                    {notice.authorName || '—'}
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: '#6b7280',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {t('notices.createdAt')}
                  </p>
                  <p style={{ fontSize: '1rem', color: '#111827' }}>
                    {new Date(notice.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Notice Body */}
              <div style={{ marginBottom: '1rem' }}>
                <p
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: '#6b7280',
                    marginBottom: '0.5rem',
                  }}
                >
                  {t('notices.body')}
                </p>
                <p
                  style={{
                    fontSize: '0.9375rem',
                    color: '#374151',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {notice.body}
                </p>
              </div>
            </div>
          ) : (
            /* Edit Form */
            <div
              style={{
                padding: '1.5rem',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb',
                backgroundColor: '#ffffff',
                marginBottom: '1.5rem',
                maxWidth: '640px',
              }}
            >
              <h2
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: '#111827',
                  marginBottom: '1.25rem',
                }}
              >
                {t('notices.editNotice')}
              </h2>

              {editErrors.form && (
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: '#dc2626',
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    borderRadius: '0.375rem',
                    backgroundColor: '#fef2f2',
                  }}
                >
                  {editErrors.form}
                </p>
              )}

              <form onSubmit={handleUpdate}>
                {/* Title */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <FormField
                    label={t('notices.noticeTitle')}
                    required
                    error={editErrors.title}
                    htmlFor="edit-title"
                  >
                    <FormInput
                      id="edit-title"
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      hasError={!!editErrors.title}
                      maxLength={200}
                      placeholder={t('notices.titlePlaceholder')}
                    />
                  </FormField>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      marginTop: '0.25rem',
                    }}
                  >
                    {editTitle.length}/200
                  </p>
                </div>

                {/* Body */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <FormField
                    label={t('notices.body')}
                    required
                    error={editErrors.body}
                    htmlFor="edit-body"
                  >
                    <textarea
                      id="edit-body"
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      maxLength={5000}
                      rows={8}
                      placeholder={t('notices.bodyPlaceholder')}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.875rem',
                        borderRadius: '0.375rem',
                        border: `1px solid ${editErrors.body ? '#dc2626' : '#d1d5db'}`,
                        minHeight: '44px',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                      }}
                    />
                  </FormField>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      marginTop: '0.25rem',
                    }}
                  >
                    {editBody.length}/5000
                  </p>
                </div>

                {/* Target Audience */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <FormField
                    label={t('notices.targetAudience')}
                    required
                    error={editErrors.targetAudience}
                    htmlFor="edit-audience"
                  >
                    <select
                      id="edit-audience"
                      value={editAudience}
                      onChange={(e) => {
                        setEditAudience(
                          e.target.value as NoticeTargetAudience | '',
                        )
                        setEditBuildingId('')
                        setEditFlatId('')
                        setFlatOptions([])
                      }}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.875rem',
                        borderRadius: '0.375rem',
                        border: `1px solid ${editErrors.targetAudience ? '#dc2626' : '#d1d5db'}`,
                        minHeight: '44px',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <option value="">{t('notices.selectAudience')}</option>
                      <option value="all_renters">
                        {t('notices.allRenters')}
                      </option>
                      <option value="specific_building">
                        {t('notices.specificBuilding')}
                      </option>
                      <option value="specific_flat">
                        {t('notices.specificFlat')}
                      </option>
                      <option value="managers_only">
                        {t('notices.managersOnly')}
                      </option>
                    </select>
                  </FormField>
                </div>

                {/* Building Selection */}
                {(editAudience === 'specific_building' ||
                  editAudience === 'specific_flat') && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <FormField
                      label={t('notices.building')}
                      required
                      error={editErrors.targetBuildingId}
                      htmlFor="edit-building"
                    >
                      <select
                        id="edit-building"
                        value={editBuildingId}
                        onChange={(e) => {
                          setEditBuildingId(e.target.value)
                          setEditFlatId('')
                          setFlatOptions([])
                        }}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          fontSize: '0.875rem',
                          borderRadius: '0.375rem',
                          border: `1px solid ${editErrors.targetBuildingId ? '#dc2626' : '#d1d5db'}`,
                          minHeight: '44px',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <option value="">{t('notices.selectBuilding')}</option>
                        {(buildingsData?.data ?? []).map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>
                )}

                {/* Flat Selection */}
                {editAudience === 'specific_flat' && editBuildingId && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <FormField
                      label={t('notices.flat')}
                      required
                      error={editErrors.targetFlatId}
                      htmlFor="edit-flat"
                    >
                      <select
                        id="edit-flat"
                        value={editFlatId}
                        onChange={(e) => setEditFlatId(e.target.value)}
                        disabled={loadingFlats}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          fontSize: '0.875rem',
                          borderRadius: '0.375rem',
                          border: `1px solid ${editErrors.targetFlatId ? '#dc2626' : '#d1d5db'}`,
                          minHeight: '44px',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <option value="">{t('notices.selectFlat')}</option>
                        {flatOptions.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.flatNumber}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>
                )}

                {/* Submit/Cancel */}
                <div
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    justifyContent: 'flex-end',
                  }}
                >
                  <button
                    type="button"
                    onClick={cancelEditing}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '44px',
                      minHeight: '44px',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      borderRadius: '0.375rem',
                      backgroundColor: 'transparent',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      cursor: 'pointer',
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '44px',
                      minHeight: '44px',
                      padding: '0.5rem 1.25rem',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      borderRadius: '0.375rem',
                      backgroundColor: updateMutation.isPending
                        ? '#93c5fd'
                        : '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      cursor: updateMutation.isPending
                        ? 'not-allowed'
                        : 'pointer',
                    }}
                  >
                    {updateMutation.isPending
                      ? t('common.loading')
                      : t('common.save')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Action Controls */}
          {(canEdit || canPin) && !isEditing && (
            <div
              style={{
                padding: '1.5rem',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb',
                backgroundColor: '#ffffff',
                marginBottom: '1.5rem',
              }}
            >
              <h2
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: '#111827',
                  marginBottom: '1rem',
                }}
              >
                {t('notices.actions')}
              </h2>

              {editErrors.form && (
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: '#dc2626',
                    marginBottom: '0.75rem',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    backgroundColor: '#fef2f2',
                  }}
                >
                  {editErrors.form}
                </p>
              )}

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                {/* Pin/Unpin Toggle */}
                {canPin && (
                  <button
                    type="button"
                    onClick={handleTogglePin}
                    disabled={pinMutation.isPending}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '44px',
                      minHeight: '44px',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      borderRadius: '0.375rem',
                      backgroundColor: pinMutation.isPending
                        ? '#e5e7eb'
                        : 'transparent',
                      color: '#f59e0b',
                      border: '1px solid #f59e0b',
                      cursor: pinMutation.isPending ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {notice.isPinned ? t('notices.unpin') : t('notices.pin')}
                  </button>
                )}

                {/* Edit Button */}
                {canEdit && (
                  <button
                    type="button"
                    onClick={startEditing}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '44px',
                      minHeight: '44px',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      borderRadius: '0.375rem',
                      backgroundColor: 'transparent',
                      color: '#2563eb',
                      border: '1px solid #2563eb',
                      cursor: 'pointer',
                    }}
                  >
                    {t('common.edit')}
                  </button>
                )}

                {/* Delete Button */}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '44px',
                      minHeight: '44px',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      borderRadius: '0.375rem',
                      backgroundColor: 'transparent',
                      color: '#dc2626',
                      border: '1px solid #dc2626',
                      cursor: 'pointer',
                    }}
                  >
                    {t('common.delete')}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Delete Confirmation Dialog */}
          <ConfirmDialog
            open={showDeleteConfirm}
            title={t('notices.deleteConfirmTitle')}
            description={t('notices.deleteConfirmDescription')}
            onConfirm={handleDelete}
            onClose={() => setShowDeleteConfirm(false)}
            loading={deleteMutation.isPending}
          />
        </>
      ) : null}
    </DashboardLayout>
  )
}
