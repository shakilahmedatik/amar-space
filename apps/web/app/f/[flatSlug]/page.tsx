import { isValidFlatSlug } from '@repo/shared'
import { AlertCircle } from 'lucide-react'
import { Suspense } from 'react'
import { BASE_URL } from '@/lib/api'
import { AccessCodeInput } from './components/access-code-input'
import { BuildingInfo } from './components/building-info'
import { PortalHeader } from './components/portal-header'
import { QuickActionsGrid } from './components/quick-actions-grid'
import { RegistrationForm } from './components/registration-form'
import { SessionExpiredBanner } from './components/session-expired-banner'

/**
 * Portal flat response shape from GET /api/portal/flat/:slug.
 */
interface PortalFlatResponse {
  building: {
    name: string
    logoUrl: string | null
    coverImageUrl: string | null
    whatsappGroupLink: string | null
    managerPhone: string | null
    rules: string | null
  }
  flat: {
    flatNumber: string
    status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'
    slug: string
  }
  emergencyContacts: Array<{
    name: string
    role: string
    phone: string | null
    type: 'building' | 'nearby'
    order: number
  }>
  hasPendingRegistration: boolean
}

interface PortalPageProps {
  params: Promise<{ flatSlug: string }>
}

/**
 * Fetches portal data from the API.
 * Returns null if the flat is not found (404).
 * Throws on other errors.
 */
async function getPortalData(slug: string): Promise<PortalFlatResponse | null> {
  const response = await fetch(`${BASE_URL}/api/portal/flat/${slug}`, {
    next: { revalidate: 60 },
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error('সার্ভারে সমস্যা হয়েছে')
  }

  return response.json()
}

/**
 * Portal page — server component at /f/[flatSlug].
 * Validates the slug format, fetches portal data from the API,
 * and renders the portal sections.
 *
 * Requirements: 1.1, 1.4, 11.1, 11.5
 */
export default async function PortalPage({ params }: PortalPageProps) {
  const { flatSlug } = await params

  // Client-side slug validation — reject invalid slugs without DB lookup
  if (!isValidFlatSlug(flatSlug)) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 rounded-lg border border-hairline bg-error-bg p-8 text-center"
        role="alert"
      >
        <AlertCircle className="h-12 w-12 text-error-text" aria-hidden />
        <h1 className="text-lg font-semibold text-error-text">অবৈধ QR কোড</h1>
        <p className="text-base text-steel">
          এই QR কোডটি সঠিক নয়। অনুগ্রহ করে সঠিক QR কোড স্ক্যান করুন।
        </p>
      </div>
    )
  }

  // Fetch portal data from the API
  const data = await getPortalData(flatSlug)

  if (!data) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 rounded-lg border border-hairline bg-error-bg p-8 text-center"
        role="alert"
      >
        <AlertCircle className="h-12 w-12 text-error-text" aria-hidden />
        <h1 className="text-lg font-semibold text-error-text">
          ফ্ল্যাটটি পাওয়া যায়নি
        </h1>
        <p className="text-base text-steel">এই ঠিকানায় কোনো ফ্ল্যাট নিবন্ধিত নেই।</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Session expired banner — shown when redirected due to session expiry */}
      <Suspense fallback={null}>
        <SessionExpiredBanner />
      </Suspense>

      {/* Portal Header Section */}
      <PortalHeader building={data.building} flat={data.flat} />

      {/* Placeholder sections — will be implemented in subsequent tasks */}
      <section aria-label="দ্রুত কার্যক্রম">
        <QuickActionsGrid
          whatsappGroupLink={data.building.whatsappGroupLink}
          managerPhone={data.building.managerPhone}
          flatSlug={data.flat.slug}
        />
      </section>

      <section id="notice-board" aria-label="নোটিশ বোর্ড">
        {/* Notice board — Task 7.2 */}
      </section>

      <section id="emergency-contacts" aria-label="জরুরি যোগাযোগ">
        {/* Emergency contacts — Task 7.3 */}
      </section>

      {/* Registration form — shown when flat is AVAILABLE */}
      {data.flat.status === 'AVAILABLE' && (
        <RegistrationForm
          flatSlug={data.flat.slug}
          flatStatus={data.flat.status}
          hasPendingRegistration={data.hasPendingRegistration}
        />
      )}

      {/* Access code input — shown when flat is OCCUPIED */}
      {data.flat.status === 'OCCUPIED' && (
        <AccessCodeInput
          flatSlug={data.flat.slug}
          flatStatus={data.flat.status}
        />
      )}

      {/* Building info — renders only if rules are configured */}
      <BuildingInfo rules={data.building.rules} />
    </div>
  )
}
