import { isValidFlatSlug } from '@repo/shared'
import { AlertCircle } from 'lucide-react'
import { Suspense } from 'react'
import { BASE_URL } from '@/lib/api'
import {
  PortalActionsSection,
  PortalHeader,
  QuickActionsGrid,
  SessionExpiredBanner,
} from './_components'
import type { PortalPageData } from './_components/types'

interface PortalPageProps {
  params: Promise<{ flatSlug: string }>
}

async function getPortalData(slug: string): Promise<PortalPageData | null> {
  const response = await fetch(`${BASE_URL}/api/portal/flat/${slug}`, {
    next: { revalidate: 60 },
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error('সার্ভারে সমস্যা হয়েছে')
  }

  return response.json() as Promise<PortalPageData>
}

export default async function PortalPage({ params }: PortalPageProps) {
  const { flatSlug } = await params

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
    <div className="flex flex-col gap-5">
      <Suspense fallback={null}>
        <SessionExpiredBanner />
      </Suspense>

      <PortalHeader building={data.building} flat={data.flat} />

      {(data.building.rules || data.building.managerPhone) && (
        <section aria-label="দ্রুত কার্যক্রম">
          <QuickActionsGrid
            whatsappGroupLink={data.building.whatsappGroupLink}
            managerPhone={data.building.managerPhone}
            flatSlug={data.flat.slug}
            rules={data.building.rules}
          />
        </section>
      )}

      <section aria-label="ভাড়াটিয়া কার্যক্রম">
        <PortalActionsSection
          flatSlug={data.flat.slug}
          flatStatus={data.flat.status}
          hasPendingRegistration={data.hasPendingRegistration}
          whatsappGroupLink={data.building.whatsappGroupLink}
          emergencyContacts={data.emergencyContacts}
          rules={data.building.rules}
        />
      </section>
    </div>
  )
}
