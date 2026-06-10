'use client'

import type { EmergencyContact } from '../../types'
import { EmergencyContacts } from '../sub-components/emergency-contacts'

interface ContactsSectionProps {
  contacts: EmergencyContact[]
  flatSlug: string
}

export function ContactsSection({ contacts, flatSlug }: ContactsSectionProps) {
  return (
    <div className="bg-canvas border border-hairline p-5 rounded-xl shadow-sm">
      <EmergencyContacts contacts={contacts} flatSlug={flatSlug} />
    </div>
  )
}
