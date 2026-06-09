/** biome-ignore-all lint/suspicious/noArrayIndexKey: intentionally done */
'use client'

import Image from 'next/image'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FileUpload } from '@/components/ui/file-upload'
import { FormField, FormInput } from '@/components/ui/form-field'
import type { Building } from '@/lib/api-client'
import { useTranslation } from '@/lib/i18n'

interface ContactInput {
  name: string
  role: string
  phone: string
  type: 'building' | 'nearby'
}

interface BuildingEditFormProps {
  building: Building
  onSave: (data: Record<string, unknown>) => Promise<void>
  onCancel: () => void
  isPending: boolean
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}

export function BuildingEditForm({
  building,
  onSave,
  onCancel,
  isPending,
}: BuildingEditFormProps) {
  const { t, locale } = useTranslation()

  const [name, setName] = useState(building.name)
  const [address, setAddress] = useState(building.address)
  const [floors, setFloors] = useState(building.totalFloors?.toString() ?? '')
  const [whatsapp, setWhatsapp] = useState(building.whatsappGroupLink ?? '')
  const [managerPhone, setManagerPhone] = useState(building.managerPhone ?? '')
  const [rules, setRules] = useState(building.rules ?? '')
  const [photo, setPhoto] = useState<string | null | undefined>(undefined)
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    building.coverImageUrl ?? null,
  )
  const [logo, setLogo] = useState<string | null | undefined>(undefined)
  const [logoPreview, setLogoPreview] = useState<string | null>(
    building.logoUrl ?? null,
  )
  const [contacts, setContacts] = useState<ContactInput[]>(
    building.emergencyContacts?.map((c) => ({
      name: c.name,
      role: c.role,
      phone: c.phone ?? '',
      type: c.type,
    })) ?? [],
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) {
      newErrors.name = t('buildings.buildingNameRequired')
    } else if (name.trim().length > 200) {
      newErrors.name = t('buildings.buildingNameMaxLength')
    }
    if (!address.trim()) {
      newErrors.address = t('buildings.addressRequired')
    } else if (address.trim().length > 500) {
      newErrors.address = t('buildings.addressMaxLength')
    }
    if (floors.trim()) {
      const f = Number.parseInt(floors, 10)
      if (Number.isNaN(f) || f < 1 || f > 200) {
        newErrors.totalFloors = t('buildings.totalFloorsRange')
      }
    }
    if (whatsapp.trim() && whatsapp.trim().length > 500) {
      newErrors.whatsappGroupLink = t('buildings.addressMaxLength')
    }
    if (managerPhone.trim() && !/^01\d{9}$/.test(managerPhone.trim())) {
      newErrors.managerPhone = t('buildings.invalidPhoneFormat')
    }
    contacts.forEach((contact, index) => {
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
        setPhoto(base64)
        setPhotoPreview(base64)
      } catch {
        setErrors((prev) => ({ ...prev, photo: 'ফাইলটি আপলোড করা যায়নি' }))
      }
    }
  }

  async function handleLogoSelected(files: File[]) {
    if (files.length > 0 && files[0]) {
      try {
        const base64 = await fileToBase64(files[0])
        setLogo(base64)
        setLogoPreview(base64)
      } catch {
        setErrors((prev) => ({ ...prev, logo: 'লোগো ফাইলটি আপলোড করা যায়নি' }))
      }
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    await onSave({
      name: name.trim(),
      address: address.trim(),
      totalFloors: floors.trim() ? Number.parseInt(floors, 10) : null,
      whatsappGroupLink: whatsapp.trim() || null,
      managerPhone: managerPhone.trim() || null,
      rules: rules.trim() || null,
      buildingPhoto: photo,
      logoPhoto: logo,
      emergencyContacts: contacts.map((c) => ({
        name: c.name.trim(),
        role: c.role.trim(),
        phone: c.phone.trim() || null,
        type: c.type,
      })),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
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
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            value={floors}
            onChange={(e) => setFloors(e.target.value)}
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
          value={address}
          onChange={(e) => setAddress(e.target.value)}
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
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
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
          value={managerPhone}
          onChange={(e) => setManagerPhone(e.target.value)}
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
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          className={`w-full rounded-md border min-h-25 p-3 text-sm bg-white text-ink ${errors.rules ? 'border-error-text' : 'border-hairline'}`}
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
          {logoPreview && (
            <div className="relative w-24 h-24 rounded-full overflow-hidden border border-hairline mt-2">
              <Image
                src={logoPreview}
                alt="Building Logo Preview"
                className="object-cover"
                fill
                unoptimized
              />
              <button
                type="button"
                onClick={() => {
                  setLogo(null)
                  setLogoPreview(null)
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
          {photoPreview && (
            <div className="relative w-full aspect-3/1 rounded-md overflow-hidden border border-hairline mt-2">
              <Image
                src={photoPreview}
                alt="Building Photo Preview"
                className="object-cover"
                fill
                unoptimized
              />
              <button
                type="button"
                onClick={() => {
                  setPhoto(null)
                  setPhotoPreview(null)
                }}
                className="absolute top-2 right-2 bg-error-text text-white px-2 py-1 text-xs rounded shadow-md cursor-pointer hover:bg-error-text/90"
              >
                {t('common.delete')}
              </button>
            </div>
          )}
        </div>
      </FormField>

      <div className="mt-8 border-t border-hairline pt-6">
        <h2 className="text-lg font-semibold text-ink mb-4">
          {t('buildings.emergencyContacts')} ({t('payments.optional')})
        </h2>

        <div className="flex flex-col gap-4">
          {contacts.map((contact, index) => (
            <Card
              key={index}
              className="bg-canvas border-hairline p-4 relative"
            >
              <button
                type="button"
                onClick={() => {
                  setContacts((prev) => prev.filter((_, i) => i !== index))
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
                      const next = [...contacts]
                      next[index]!.name = e.target.value
                      setContacts(next)
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
                        const next = [...contacts]
                        next[index]!.role = e.target.value
                        setContacts(next)
                      }}
                      hasError={!!errors[`contact-${index}-role`]}
                      placeholder={t('buildings.contactRole')}
                    />
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(contact.type === 'building'
                        ? locale === 'en'
                          ? ['Owner', 'Manager', 'Caretaker', 'Security']
                          : ['মালিক', 'ম্যানেজার', 'কেয়ারটেকার', 'সিকিউরিটি']
                        : locale === 'en'
                          ? [
                              'Hospital',
                              'Police Station',
                              'Fire Service',
                              'Ambulance',
                            ]
                          : ['হাসপাতাল', 'পুলিশ স্টেশন', 'ফায়ার সার্ভিস', 'অ্যাম্বুলেন্স']
                      ).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            const next = [...contacts]
                            next[index]!.role = r
                            setContacts(next)
                          }}
                          className="text-xs px-2 py-1 rounded bg-surface border border-hairline text-steel hover:bg-brand-blue-200/20 cursor-pointer"
                        >
                          {r}
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
                      const next = [...contacts]
                      next[index]!.phone = e.target.value
                      setContacts(next)
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
                      const next = [...contacts]
                      next[index]!.type = e.target.value as
                        | 'building'
                        | 'nearby'
                      next[index]!.role = ''
                      setContacts(next)
                    }}
                    className="w-full rounded-md border border-hairline min-h-11 px-3 bg-white text-ink text-sm"
                  >
                    <option value="building">
                      {t('buildings.buildingType')}
                    </option>
                    <option value="nearby">{t('buildings.nearbyType')}</option>
                  </select>
                </FormField>
              </div>
            </Card>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setContacts((prev) => [
                ...prev,
                { name: '', role: '', phone: '', type: 'building' },
              ])
            }}
            className="rounded-full min-h-11 text-brand-blue-deep border-brand-blue-deep border self-start cursor-pointer"
          >
            + {t('buildings.addEmergencyContact')}
          </Button>
        </div>
      </div>

      <div className="flex gap-3 mt-8 border-t border-hairline pt-6">
        <Button
          type="submit"
          disabled={isPending}
          className="rounded-full min-h-11 bg-primary text-on-primary font-semibold cursor-pointer"
        >
          {isPending ? t('common.loading') : t('common.save')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="rounded-full min-h-11 text-charcoal border-hairline cursor-pointer"
        >
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
