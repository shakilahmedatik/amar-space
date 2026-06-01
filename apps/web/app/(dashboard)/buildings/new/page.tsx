/** biome-ignore-all lint/suspicious/noArrayIndexKey: intentionally done */
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { FileUpload } from '@/components/ui/file-upload'
import { FormField, FormInput } from '@/components/ui/form-field'
import { useCreateBuilding } from '@/hooks/use-buildings'
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
 * Building creation page — /buildings/new
 * Form with name, address, whatsapp link, cover photo, and emergency contacts.
 * Only accessible by Owner role.
 */
export default function NewBuildingPage() {
  const { t, locale } = useTranslation()
  const router = useRouter()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [totalFloors, setTotalFloors] = useState('')
  const [whatsappGroupLink, setWhatsappGroupLink] = useState('')
  const [managerPhone, setManagerPhone] = useState('')
  const [buildingPhoto, setBuildingPhoto] = useState<string | null>(null)
  const [logoPhoto, setLogoPhoto] = useState<string | null>(null)
  const [rules, setRules] = useState('')
  const [emergencyContacts, setEmergencyContacts] = useState<
    Array<{
      name: string
      role: string
      phone: string
      type: 'building' | 'nearby'
    }>
  >([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  const createMutation = useCreateBuilding()

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

    if (totalFloors.trim()) {
      const floors = Number.parseInt(totalFloors, 10)
      if (Number.isNaN(floors) || floors < 1 || floors > 200) {
        newErrors.totalFloors = t('buildings.totalFloorsRange')
      }
    }

    if (whatsappGroupLink.trim() && whatsappGroupLink.trim().length > 500) {
      newErrors.whatsappGroupLink = t('buildings.addressMaxLength')
    }

    if (managerPhone.trim() && !/^01\d{9}$/.test(managerPhone.trim())) {
      newErrors.managerPhone = t('buildings.invalidPhoneFormat')
    }

    if (rules.trim().length > 5000) {
      newErrors.rules = 'নিয়মাবলী সর্বোচ্চ ৫০০০ অক্ষরের হতে পারে'
    }

    emergencyContacts.forEach((contact, index) => {
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
        setBuildingPhoto(base64)
      } catch (_err) {
        setErrors((prev) => ({ ...prev, photo: 'ফাইলটি আপলোড করা যায়নি' }))
      }
    } else {
      setBuildingPhoto(null)
    }
  }

  async function handleLogoSelected(files: File[]) {
    if (files.length > 0 && files[0]) {
      try {
        const base64 = await fileToBase64(files[0])
        setLogoPhoto(base64)
      } catch (_err) {
        setErrors((prev) => ({ ...prev, logo: 'ফাইলটি আপলোড করা যায়নি' }))
      }
    } else {
      setLogoPhoto(null)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        address: address.trim(),
        totalFloors: totalFloors.trim()
          ? Number.parseInt(totalFloors, 10)
          : null,
        whatsappGroupLink: whatsappGroupLink.trim() || null,
        managerPhone: managerPhone.trim() || null,
        buildingPhoto,
        logoPhoto,
        rules: rules.trim() || null,
        emergencyContacts: emergencyContacts.map((c) => ({
          name: c.name.trim(),
          role: c.role.trim(),
          phone: c.phone.trim() || null,
          type: c.type,
        })),
      })
      setSuccessMessage(t('buildings.createSuccess'))
      // Redirect to buildings list after short delay
      setTimeout(() => {
        router.push('/buildings')
      }, 1000)
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : t('buildings.saveError'),
      })
    }
  }

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

      <div className="mb-6">
        <Link
          href="/buildings"
          className="text-sm text-steel no-underline hover:underline"
        >
          ← {t('common.back')}
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-ink mb-6">
        {t('buildings.createBuilding')}
      </h1>

      <Card className="max-w-2xl bg-canvas border-hairline">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label={t('buildings.buildingName')}
                required
                error={errors.name}
                htmlFor="building-name"
              >
                <FormInput
                  id="building-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  hasError={!!errors.name}
                  maxLength={200}
                  autoFocus
                />
              </FormField>

              <FormField
                label={t('buildings.totalFloors')}
                error={errors.totalFloors}
                htmlFor="building-floors"
              >
                <FormInput
                  id="building-floors"
                  type="number"
                  value={totalFloors}
                  onChange={(e) => setTotalFloors(e.target.value)}
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
              htmlFor="building-address"
            >
              <FormInput
                id="building-address"
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
              htmlFor="building-whatsapp"
            >
              <FormInput
                id="building-whatsapp"
                type="text"
                placeholder={t('buildings.whatsappGroupLinkPlaceholder')}
                value={whatsappGroupLink}
                onChange={(e) => setWhatsappGroupLink(e.target.value)}
                hasError={!!errors.whatsappGroupLink}
                maxLength={500}
              />
            </FormField>

            <FormField
              label={t('buildings.managerPhone')}
              error={errors.managerPhone}
              htmlFor="building-manager-phone"
            >
              <FormInput
                id="building-manager-phone"
                type="text"
                placeholder={t('buildings.managerPhonePlaceholder')}
                value={managerPhone}
                onChange={(e) => setManagerPhone(e.target.value)}
                hasError={!!errors.managerPhone}
                maxLength={20}
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label={t('buildings.buildingPhoto')}
                error={errors.photo}
                htmlFor="building-photo"
              >
                <div className="flex flex-col gap-3">
                  <FileUpload
                    maxFiles={1}
                    onFilesSelected={handlePhotoSelected}
                    error={errors.photo}
                  />
                  {buildingPhoto && (
                    <div className="relative w-full aspect-3/1 rounded-md overflow-hidden border border-hairline mt-2">
                      <Image
                        src={buildingPhoto}
                        alt="Building Photo Preview"
                        className="object-cover"
                        fill
                        unoptimized
                      />
                    </div>
                  )}
                </div>
              </FormField>

              <FormField
                label={t('buildings.buildingLogo')}
                error={errors.logo}
                htmlFor="building-logo"
              >
                <div className="flex flex-col gap-3">
                  <FileUpload
                    maxFiles={1}
                    onFilesSelected={handleLogoSelected}
                    error={errors.logo}
                  />
                  {logoPhoto && (
                    <div className="relative w-20 h-20 rounded-md overflow-hidden border border-hairline mt-2">
                      <Image
                        src={logoPhoto}
                        alt="Building Logo Preview"
                        className="object-contain"
                        fill
                        unoptimized
                      />
                    </div>
                  )}
                </div>
              </FormField>
            </div>

            <FormField
              label={t('buildings.buildingRules')}
              error={errors.rules}
              htmlFor="building-rules"
            >
              <textarea
                id="building-rules"
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder={t('buildings.buildingRulesPlaceholder')}
                maxLength={5000}
                rows={5}
                className={`w-full rounded-md border px-3 py-2 text-sm bg-canvas text-ink placeholder:text-steel focus:outline-none focus:ring-2 focus:ring-brand/50 resize-y ${errors.rules ? 'border-error-text' : 'border-hairline'}`}
              />
              <p className="text-xs text-steel mt-1">{rules.length}/5000</p>
            </FormField>

            {/* Emergency Contacts Section */}
            <div className="mt-8 border-t border-hairline pt-6">
              <h2 className="text-lg font-semibold text-ink mb-4">
                {t('buildings.emergencyContacts')} ({t('payments.optional')})
              </h2>

              <div className="flex flex-col gap-4">
                {emergencyContacts.map((contact, index) => (
                  <Card
                    key={index}
                    className="bg-canvas border-hairline p-4 relative"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setEmergencyContacts((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }}
                      className="absolute top-2 right-2 text-error-text hover:text-error-text/80 text-sm font-medium"
                    >
                      {t('common.delete')}
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <FormField
                        label={t('buildings.contactName')}
                        required
                        error={errors[`contact-${index}-name`]}
                        htmlFor={`contact-${index}-name`}
                      >
                        <FormInput
                          id={`contact-${index}-name`}
                          type="text"
                          value={contact.name}
                          onChange={(e) => {
                            const newContacts = [...emergencyContacts]
                            newContacts[index]!.name = e.target.value
                            setEmergencyContacts(newContacts)
                          }}
                          hasError={!!errors[`contact-${index}-name`]}
                        />
                      </FormField>

                      <FormField
                        label={t('buildings.contactRole')}
                        required
                        error={errors[`contact-${index}-role`]}
                        htmlFor={`contact-${index}-role`}
                      >
                        <div className="flex flex-col gap-1.5">
                          <FormInput
                            id={`contact-${index}-role`}
                            type="text"
                            value={contact.role}
                            onChange={(e) => {
                              const newContacts = [...emergencyContacts]
                              newContacts[index]!.role = e.target.value
                              setEmergencyContacts(newContacts)
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
                                  : ['মালিক', 'ম্যানেজার', 'কেয়ারটেকার', 'সিকিউরিটি']
                                ).map((role) => (
                                  <button
                                    key={role}
                                    type="button"
                                    onClick={() => {
                                      const newContacts = [...emergencyContacts]
                                      newContacts[index]!.role = role
                                      setEmergencyContacts(newContacts)
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
                                      const newContacts = [...emergencyContacts]
                                      newContacts[index]!.role = role
                                      setEmergencyContacts(newContacts)
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
                        htmlFor={`contact-${index}-phone`}
                      >
                        <FormInput
                          id={`contact-${index}-phone`}
                          type="text"
                          value={contact.phone}
                          onChange={(e) => {
                            const newContacts = [...emergencyContacts]
                            newContacts[index]!.phone = e.target.value
                            setEmergencyContacts(newContacts)
                          }}
                          hasError={!!errors[`contact-${index}-phone`]}
                        />
                      </FormField>

                      <FormField
                        label={t('buildings.contactType')}
                        htmlFor={`contact-${index}-type`}
                      >
                        <select
                          id={`contact-${index}-type`}
                          value={contact.type}
                          onChange={(e) => {
                            const newContacts = [...emergencyContacts]
                            newContacts[index]!.type = e.target.value as
                              | 'building'
                              | 'nearby'
                            newContacts[index]!.role = ''
                            setEmergencyContacts(newContacts)
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
                    setEmergencyContacts((prev) => [
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
                disabled={createMutation.isPending}
                className="rounded-full min-h-[44px] bg-primary text-on-primary font-semibold cursor-pointer"
              >
                {createMutation.isPending
                  ? t('common.loading')
                  : t('common.create')}
              </Button>

              <Button
                asChild
                variant="outline"
                className="rounded-full min-h-[44px] text-charcoal border-hairline cursor-pointer"
              >
                <Link href="/buildings">{t('common.cancel')}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
