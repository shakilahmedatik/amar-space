/** biome-ignore-all lint/suspicious/noArrayIndexKey: intentionally done */
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import { BulkQrDownloadButton } from '@/components/qr-code/bulk-qr-download-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { FileUpload } from '@/components/ui/file-upload'
import { FormField, FormInput } from '@/components/ui/form-field'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { useSession } from '@/contexts/session-context'
import {
  useBuilding,
  useBuildingFlats,
  useUpdateBuilding,
} from '@/hooks/use-buildings'
import type { FlatSummary } from '@/lib/api-client'
import { useTranslation } from '@/lib/i18n'

/**
 * Helper to convert File to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}

/**
 * Building detail page — /buildings/[id]
 * Shows building info with flat list, whatsapp link, cover photo, and emergency contacts.
 * Owner can edit building, Manager can only view.
 */
export default function BuildingDetailPage() {
  const { role } = useSession()
  const { t, locale } = useTranslation()
  const params = useParams()
  const _router = useRouter()
  const buildingId = params.id as string
  const [isEditing, setIsEditing] = useState(false)
  const [flatPage, setFlatPage] = useState(1)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editFloors, setEditFloors] = useState('')
  const [editWhatsapp, setEditWhatsapp] = useState('')
  const [editManagerPhone, setEditManagerPhone] = useState('')
  const [editRules, setEditRules] = useState('')
  const [editPhoto, setEditPhoto] = useState<string | null | undefined>(
    undefined,
  ) // undefined = no change, null = remove, string = new photo
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null)
  const [editLogo, setEditLogo] = useState<string | null | undefined>(undefined) // undefined = no change, null = remove, string = new logo
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null)
  const [editEmergencyContacts, setEditEmergencyContacts] = useState<
    Array<{
      name: string
      role: string
      phone: string
      type: 'building' | 'nearby'
    }>
  >([])

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  const { data: building, isLoading, isError, error } = useBuilding(buildingId)
  const { data: flatsData, isLoading: isLoadingFlats } = useBuildingFlats(
    buildingId,
    flatPage,
    50,
  )
  const updateMutation = useUpdateBuilding(buildingId)

  // Populate edit form when building data loads
  useEffect(() => {
    if (building) {
      setEditName(building.name)
      setEditAddress(building.address)
      setEditFloors(building.totalFloors?.toString() ?? '')
      setEditWhatsapp(building.whatsappGroupLink ?? '')
      setEditPhotoPreview(building.coverImageUrl ?? null)
      setEditPhoto(undefined)
      setEditManagerPhone(building.managerPhone ?? '')
      setEditRules(building.rules ?? '')
      setEditLogoPreview(building.logoUrl ?? null)
      setEditLogo(undefined)
      setEditEmergencyContacts(
        building.emergencyContacts?.map((c) => ({
          name: c.name,
          role: c.role,
          phone: c.phone ?? '',
          type: c.type,
        })) ?? [],
      )
    }
  }, [building])

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!editName.trim()) {
      newErrors.name = t('buildings.buildingNameRequired')
    } else if (editName.trim().length > 200) {
      newErrors.name = t('buildings.buildingNameMaxLength')
    }

    if (!editAddress.trim()) {
      newErrors.address = t('buildings.addressRequired')
    } else if (editAddress.trim().length > 500) {
      newErrors.address = t('buildings.addressMaxLength')
    }

    if (editFloors.trim()) {
      const floors = Number.parseInt(editFloors, 10)
      if (Number.isNaN(floors) || floors < 1 || floors > 200) {
        newErrors.totalFloors = t('buildings.totalFloorsRange')
      }
    }

    if (editWhatsapp.trim() && editWhatsapp.trim().length > 500) {
      newErrors.whatsappGroupLink = t('buildings.addressMaxLength')
    }

    if (editManagerPhone.trim() && !/^01\d{9}$/.test(editManagerPhone.trim())) {
      newErrors.managerPhone = t('buildings.invalidPhoneFormat')
    }

    editEmergencyContacts.forEach((contact, index) => {
      if (!contact.name.trim()) {
        newErrors[`contact-${index}-name`] = t('validation.required')
      }
      if (!contact.role.trim()) {
        newErrors[`contact-${index}-role`] = t('validation.required')
      }
      if (contact.phone.trim() && !/^01\d{9}$/.test(contact.phone.trim())) {
        newErrors[`contact-${index}-phone`] = t('buildings.invalidPhoneFormat')
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handlePhotoSelected(files: File[]) {
    if (files.length > 0 && files[0]) {
      try {
        const base64 = await fileToBase64(files[0])
        setEditPhoto(base64)
        setEditPhotoPreview(base64)
      } catch (_err) {
        setErrors((prev) => ({ ...prev, photo: 'ফাইলটি আপলোড করা যায়নি' }))
      }
    }
  }

  async function handleLogoSelected(files: File[]) {
    if (files.length > 0 && files[0]) {
      try {
        const base64 = await fileToBase64(files[0])
        setEditLogo(base64)
        setEditLogoPreview(base64)
      } catch (_err) {
        setErrors((prev) => ({ ...prev, logo: 'লোগো ফাইলটি আপলোড করা যায়নি' }))
      }
    }
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return

    try {
      await updateMutation.mutateAsync({
        name: editName.trim(),
        address: editAddress.trim(),
        totalFloors: editFloors.trim() ? Number.parseInt(editFloors, 10) : null,
        whatsappGroupLink: editWhatsapp.trim() || null,
        managerPhone: editManagerPhone.trim() || null,
        rules: editRules.trim() || null,
        buildingPhoto: editPhoto,
        logoPhoto: editLogo,
        emergencyContacts: editEmergencyContacts.map((c) => ({
          name: c.name.trim(),
          role: c.role.trim(),
          phone: c.phone.trim() || null,
          type: c.type,
        })),
      })
      setSuccessMessage(t('buildings.updateSuccess'))
      setIsEditing(false)
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : t('buildings.saveError'),
      })
    }
  }

  const isOwner = role === 'owner'
  const isOwnerOrManager = role === 'owner' || role === 'manager'

  const flatColumns: DataTableColumn<FlatSummary>[] = [
    {
      key: 'flatNumber',
      header: t('flats.flatNumber'),
      render: (row) => (
        <Link
          href={`/flats/${row.id}`}
          className="text-brand-blue-deep font-medium no-underline hover:underline"
        >
          {row.flatNumber}
        </Link>
      ),
    },
    {
      key: 'floor',
      header: t('flats.floor'),
      render: (row) => <span>{row.floor}</span>,
      width: '100px',
    },
    {
      key: 'status',
      header: t('flats.status'),
      render: (row) => <StatusBadge status={row.status} />,
      width: '160px',
    },
  ]

  return (
    <>
      {successMessage && (
        <ErrorFeedback
          message={successMessage}
          type="success"
          visible
          onDismiss={() => setSuccessMessage('')}
        />
      )}
      {errors.form && (
        <ErrorFeedback
          message={errors.form}
          type="error"
          visible
          onDismiss={() => setErrors((prev) => ({ ...prev, form: '' }))}
        />
      )}
      {isError && (
        <ErrorFeedback
          message={error?.message || t('buildings.loadError')}
          type="error"
          visible
        />
      )}

      <div className="mb-6">
        <Link
          href="/buildings"
          className="text-sm text-steel no-underline hover:underline"
        >
          ← {t('common.back')}
        </Link>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={6} showHeader />
      ) : building ? (
        <>
          {/* Building Info Section */}
          <Card className="bg-canvas border-hairline mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <h1 className="text-2xl font-bold text-ink">
                  {isEditing
                    ? t('buildings.editBuilding')
                    : t('buildings.buildingDetail')}
                </h1>

                {isOwner && !isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="rounded-full min-h-[44px] text-brand-blue-deep border-brand-blue-deep cursor-pointer"
                  >
                    {t('common.edit')}
                  </Button>
                )}

                {isOwnerOrManager && !isEditing && (
                  <BulkQrDownloadButton
                    buildingId={buildingId}
                    buildingName={building.name}
                  />
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleUpdate} className="max-w-2xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      label={t('buildings.buildingName')}
                      required
                      error={errors.name}
                      htmlFor="edit-building-name"
                    >
                      <FormInput
                        id="edit-building-name"
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        hasError={!!errors.name}
                        maxLength={200}
                      />
                    </FormField>

                    <FormField
                      label={t('buildings.totalFloors')}
                      error={errors.totalFloors}
                      htmlFor="edit-building-floors"
                    >
                      <FormInput
                        id="edit-building-floors"
                        type="number"
                        value={editFloors}
                        onChange={(e) => setEditFloors(e.target.value)}
                        hasError={!!errors.totalFloors}
                        min={1}
                        max={200}
                      />
                    </FormField>
                  </div>

                  <FormField
                    label={t('buildings.address')}
                    required
                    error={errors.address}
                    htmlFor="edit-building-address"
                  >
                    <FormInput
                      id="edit-building-address"
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      hasError={!!errors.address}
                      maxLength={500}
                    />
                  </FormField>

                  <FormField
                    label={t('buildings.whatsappGroupLink')}
                    error={errors.whatsappGroupLink}
                    htmlFor="edit-building-whatsapp"
                  >
                    <FormInput
                      id="edit-building-whatsapp"
                      type="text"
                      placeholder={t('buildings.whatsappGroupLinkPlaceholder')}
                      value={editWhatsapp}
                      onChange={(e) => setEditWhatsapp(e.target.value)}
                      hasError={!!errors.whatsappGroupLink}
                      maxLength={500}
                    />
                  </FormField>

                  <FormField
                    label={t('buildings.managerPhone')}
                    error={errors.managerPhone}
                    htmlFor="edit-manager-phone"
                  >
                    <FormInput
                      id="edit-manager-phone"
                      type="text"
                      placeholder={t('buildings.managerPhonePlaceholder')}
                      value={editManagerPhone}
                      onChange={(e) => setEditManagerPhone(e.target.value)}
                      hasError={!!errors.managerPhone}
                      maxLength={20}
                    />
                  </FormField>

                  <FormField
                    label={t('buildings.buildingRules')}
                    error={errors.rules}
                    htmlFor="edit-building-rules"
                  >
                    <textarea
                      id="edit-building-rules"
                      placeholder={t('buildings.buildingRulesPlaceholder')}
                      value={editRules}
                      onChange={(e) => setEditRules(e.target.value)}
                      className={`w-full rounded-md border min-h-[100px] p-3 text-sm bg-white text-ink ${
                        errors.rules ? 'border-error-text' : 'border-hairline'
                      }`}
                    />
                  </FormField>

                  <FormField
                    label={t('buildings.buildingLogo')}
                    error={errors.logo}
                    htmlFor="edit-building-logo"
                  >
                    <div className="flex flex-col gap-3">
                      <FileUpload
                        maxFiles={1}
                        onFilesSelected={handleLogoSelected}
                        error={errors.logo}
                      />
                      {editLogoPreview && (
                        <div className="relative w-24 h-24 rounded-full overflow-hidden border border-hairline mt-2">
                          <Image
                            src={editLogoPreview}
                            alt="Building Logo Preview"
                            className="object-cover"
                            fill
                            unoptimized
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setEditLogo(null)
                              setEditLogoPreview(null)
                            }}
                            className="absolute inset-0 bg-black/60 text-white flex items-center justify-center text-xs font-semibold opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  </FormField>

                  <FormField
                    label={t('buildings.buildingPhoto')}
                    error={errors.photo}
                    htmlFor="edit-building-photo"
                  >
                    <div className="flex flex-col gap-3">
                      <FileUpload
                        maxFiles={1}
                        onFilesSelected={handlePhotoSelected}
                        error={errors.photo}
                      />
                      {editPhotoPreview && (
                        <div className="relative w-full aspect-3/1 rounded-md overflow-hidden border border-hairline mt-2">
                          <Image
                            src={editPhotoPreview}
                            alt="Building Photo Preview"
                            className="object-cover"
                            fill
                            unoptimized
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setEditPhoto(null)
                              setEditPhotoPreview(null)
                            }}
                            className="absolute top-2 right-2 bg-error-text text-white px-2 py-1 text-xs rounded shadow-md cursor-pointer hover:bg-error-text/90"
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  </FormField>

                  {/* Emergency Contacts Edit Section */}
                  <div className="mt-8 border-t border-hairline pt-6">
                    <h2 className="text-lg font-semibold text-ink mb-4">
                      {t('buildings.emergencyContacts')} (
                      {t('payments.optional')})
                    </h2>

                    <div className="flex flex-col gap-4">
                      {editEmergencyContacts.map((contact, index) => (
                        <Card
                          key={index}
                          className="bg-canvas border-hairline p-4 relative"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setEditEmergencyContacts((prev) =>
                                prev.filter((_, i) => i !== index),
                              )
                            }}
                            className="absolute top-2 right-2 text-error-text hover:text-error-text/80 text-sm font-medium cursor-pointer"
                          >
                            {t('common.delete')}
                          </button>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <FormField
                              label={t('buildings.contactName')}
                              required
                              error={errors[`contact-${index}-name`]}
                              htmlFor={`edit-contact-${index}-name`}
                            >
                              <FormInput
                                id={`edit-contact-${index}-name`}
                                type="text"
                                value={contact.name}
                                onChange={(e) => {
                                  const newContacts = [...editEmergencyContacts]
                                  newContacts[index]!.name = e.target.value
                                  setEditEmergencyContacts(newContacts)
                                }}
                                hasError={!!errors[`contact-${index}-name`]}
                              />
                            </FormField>

                            <FormField
                              label={t('buildings.contactRole')}
                              required
                              error={errors[`contact-${index}-role`]}
                              htmlFor={`edit-contact-${index}-role`}
                            >
                              <div className="flex flex-col gap-1.5">
                                <FormInput
                                  id={`edit-contact-${index}-role`}
                                  type="text"
                                  value={contact.role}
                                  onChange={(e) => {
                                    const newContacts = [
                                      ...editEmergencyContacts,
                                    ]
                                    newContacts[index]!.role = e.target.value
                                    setEditEmergencyContacts(newContacts)
                                  }}
                                  hasError={!!errors[`contact-${index}-role`]}
                                  placeholder={t('buildings.contactRole')}
                                />
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {contact.type === 'building'
                                    ? (locale === 'en'
                                        ? [
                                            'Owner',
                                            'Manager',
                                            'Caretaker',
                                            'Security',
                                          ]
                                        : [
                                            'মালিক',
                                            'ম্যানেজার',
                                            'কেয়ারটেকার',
                                            'সিকিউরিটি',
                                          ]
                                      ).map((role) => (
                                        <button
                                          key={role}
                                          type="button"
                                          onClick={() => {
                                            const newContacts = [
                                              ...editEmergencyContacts,
                                            ]
                                            newContacts[index]!.role = role
                                            setEditEmergencyContacts(
                                              newContacts,
                                            )
                                          }}
                                          className="text-xs px-2 py-1 rounded bg-surface border border-hairline text-steel hover:bg-brand-blue-200/20 cursor-pointer"
                                        >
                                          {role}
                                        </button>
                                      ))
                                    : (locale === 'en'
                                        ? [
                                            'Hospital',
                                            'Police Station',
                                            'Fire Service',
                                            'Ambulance',
                                          ]
                                        : [
                                            'হাসপাতাল',
                                            'পুলিশ স্টেশন',
                                            'ফায়ার সার্ভিস',
                                            'অ্যাম্বুলেন্স',
                                          ]
                                      ).map((role) => (
                                        <button
                                          key={role}
                                          type="button"
                                          onClick={() => {
                                            const newContacts = [
                                              ...editEmergencyContacts,
                                            ]
                                            newContacts[index]!.role = role
                                            setEditEmergencyContacts(
                                              newContacts,
                                            )
                                          }}
                                          className="text-xs px-2 py-1 rounded bg-surface border border-hairline text-steel hover:bg-brand-blue-200/20 cursor-pointer"
                                        >
                                          {role}
                                        </button>
                                      ))}
                                </div>
                              </div>
                            </FormField>

                            <FormField
                              label={t('buildings.contactPhone')}
                              error={errors[`contact-${index}-phone`]}
                              htmlFor={`edit-contact-${index}-phone`}
                            >
                              <FormInput
                                id={`edit-contact-${index}-phone`}
                                type="text"
                                value={contact.phone}
                                onChange={(e) => {
                                  const newContacts = [...editEmergencyContacts]
                                  newContacts[index]!.phone = e.target.value
                                  setEditEmergencyContacts(newContacts)
                                }}
                                hasError={!!errors[`contact-${index}-phone`]}
                              />
                            </FormField>

                            <FormField
                              label={t('buildings.contactType')}
                              htmlFor={`edit-contact-${index}-type`}
                            >
                              <select
                                id={`edit-contact-${index}-type`}
                                value={contact.type}
                                onChange={(e) => {
                                  const newContacts = [...editEmergencyContacts]
                                  newContacts[index]!.type = e.target.value as
                                    | 'building'
                                    | 'nearby'
                                  newContacts[index]!.role = ''
                                  setEditEmergencyContacts(newContacts)
                                }}
                                className="w-full rounded-md border border-hairline min-h-[44px] px-3 bg-white text-ink text-sm"
                              >
                                <option value="building">
                                  {t('buildings.buildingType')}
                                </option>
                                <option value="nearby">
                                  {t('buildings.nearbyType')}
                                </option>
                              </select>
                            </FormField>
                          </div>
                        </Card>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditEmergencyContacts((prev) => [
                            ...prev,
                            { name: '', role: '', phone: '', type: 'building' },
                          ])
                        }}
                        className="rounded-full min-h-[44px] text-brand-blue-deep border-brand-blue-deep border self-start cursor-pointer"
                      >
                        + {t('buildings.addEmergencyContact')}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-8 border-t border-hairline pt-6">
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                      className="rounded-full min-h-[44px] bg-primary text-on-primary font-semibold cursor-pointer"
                    >
                      {updateMutation.isPending
                        ? t('common.loading')
                        : t('common.save')}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false)
                        setErrors({})
                        if (building) {
                          setEditName(building.name)
                          setEditAddress(building.address)
                          setEditFloors(building.totalFloors?.toString() ?? '')
                          setEditWhatsapp(building.whatsappGroupLink ?? '')
                          setEditPhotoPreview(building.coverImageUrl ?? null)
                          setEditPhoto(undefined)
                          setEditManagerPhone(building.managerPhone ?? '')
                          setEditRules(building.rules ?? '')
                          setEditLogoPreview(building.logoUrl ?? null)
                          setEditLogo(undefined)
                          setEditEmergencyContacts(
                            building.emergencyContacts?.map((c) => ({
                              name: c.name,
                              role: c.role,
                              phone: c.phone ?? '',
                              type: c.type,
                            })) ?? [],
                          )
                        }
                      }}
                      className="rounded-full min-h-[44px] text-charcoal border-hairline cursor-pointer"
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-6">
                  {building.coverImageUrl && (
                    <div className="relative w-full aspect-3/1 rounded-lg overflow-hidden border border-hairline">
                      <Image
                        src={building.coverImageUrl}
                        alt={`${building.name} Cover`}
                        className="object-cover"
                        fill
                        unoptimized
                      />
                    </div>
                  )}

                  <div className="flex items-start gap-6 flex-col sm:flex-row">
                    {building.logoUrl && (
                      <div className="relative w-20 h-20 rounded-full overflow-hidden border border-hairline shrink-0 bg-white shadow-sm">
                        <Image
                          src={building.logoUrl}
                          alt={`${building.name} Logo`}
                          className="object-cover"
                          fill
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))] flex-1 w-full">
                      <div>
                        <p className="text-xs font-medium text-steel mb-1">
                          {t('buildings.buildingName')}
                        </p>
                        <p className="text-base font-semibold text-ink">
                          {building.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-steel mb-1">
                          {t('buildings.address')}
                        </p>
                        <p className="text-base text-ink">{building.address}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-steel mb-1">
                          {t('buildings.totalFloors')}
                        </p>
                        <p className="text-base text-ink">
                          {building.totalFloors ?? '—'}
                        </p>
                      </div>
                      {building.whatsappGroupLink && (
                        <div>
                          <p className="text-xs font-medium text-steel mb-1">
                            {t('buildings.whatsappGroupLink')}
                          </p>
                          <a
                            href={building.whatsappGroupLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-blue-deep font-semibold text-sm hover:underline inline-flex items-center gap-1 break-all"
                          >
                            {building.whatsappGroupLink}
                          </a>
                        </div>
                      )}
                      {building.managerPhone && (
                        <div>
                          <p className="text-xs font-medium text-steel mb-1">
                            {t('buildings.managerPhone')}
                          </p>
                          <a
                            href={`tel:${building.managerPhone}`}
                            className="text-brand-blue-deep font-semibold text-sm hover:underline inline-flex items-center gap-1"
                          >
                            {building.managerPhone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {building.rules && (
                    <div className="border-t border-hairline pt-6">
                      <h2 className="text-lg font-semibold text-ink mb-2">
                        {t('buildings.buildingRules')}
                      </h2>
                      <p className="text-sm text-charcoal whitespace-pre-line leading-relaxed">
                        {building.rules}
                      </p>
                    </div>
                  )}

                  {/* Emergency Contacts View Mode */}
                  {building.emergencyContacts &&
                    building.emergencyContacts.length > 0 && (
                      <div className="border-t border-hairline pt-6">
                        <h2 className="text-lg font-semibold text-ink mb-4">
                          {t('buildings.emergencyContacts')}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {building.emergencyContacts.map((contact) => (
                            <div
                              key={contact.id}
                              className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-surface p-4"
                            >
                              <div className="flex flex-col">
                                <span className="text-base font-medium text-ink">
                                  {contact.name}
                                </span>
                                <span className="text-xs text-steel">
                                  {contact.role} •{' '}
                                  {contact.type === 'building'
                                    ? t('buildings.buildingType')
                                    : t('buildings.nearbyType')}
                                </span>
                              </div>
                              {contact.phone && (
                                <a
                                  href={`tel:${contact.phone}`}
                                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-brand-blue-deep px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-blue-deep/90"
                                >
                                  {contact.phone}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Flats Section */}
          <div>
            <h2 className="text-xl font-semibold text-ink mb-4">
              {t('buildings.flatsInBuilding')}
            </h2>

            {isLoadingFlats ? (
              <LoadingSkeleton rows={5} showHeader />
            ) : (
              <DataTable<FlatSummary>
                columns={flatColumns}
                data={flatsData?.data ?? []}
                getRowKey={(row) => row.id}
                pagination={
                  flatsData
                    ? {
                        total: flatsData.total,
                        page: flatsData.page,
                        pageSize: flatsData.pageSize,
                      }
                    : undefined
                }
                onPageChange={setFlatPage}
                loading={isLoadingFlats}
                emptyMessage={t('flats.noFlats')}
              />
            )}
          </div>
        </>
      ) : null}
    </>
  )
}
