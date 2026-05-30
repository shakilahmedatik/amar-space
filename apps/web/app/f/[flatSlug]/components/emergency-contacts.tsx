'use client'

import { AlertTriangle, Building2, MapPin, Phone } from 'lucide-react'
import { trackEvent } from '../lib/analytics'
import {
  type EmergencyContact,
  sortContacts,
} from '../lib/sort-emergency-contacts'

interface EmergencyContactsProps {
  contacts: EmergencyContact[]
  flatSlug: string
}

/**
 * Emergency contacts component for the portal.
 * Displays building contacts (Owner, Manager, Caretaker, Security) followed by
 * nearby services (Hospital, Police, Fire Service).
 * Each contact with a phone number shows a "কল করুন" (Call) button.
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
export function EmergencyContacts({
  contacts,
  flatSlug,
}: EmergencyContactsProps) {
  if (!contacts || contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-hairline bg-surface p-8 text-center">
        <AlertTriangle className="h-10 w-10 text-steel" aria-hidden="true" />
        <p className="text-base text-steel">কোনো জরুরি যোগাযোগ নেই</p>
      </div>
    )
  }

  const sortedContacts = sortContacts(contacts)

  function handleCallClick(contact: EmergencyContact) {
    trackEvent('Emergency Contact Clicked', flatSlug, {
      contactName: contact.name,
      contactRole: contact.role,
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {sortedContacts.map((contact) => (
        <div
          key={`${contact.name}-${contact.role}-${contact.phone ?? 'no-phone'}`}
          className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-surface p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue-200">
              {contact.type === 'building' ? (
                <Building2
                  className="h-5 w-5 text-brand-blue-deep"
                  aria-hidden="true"
                />
              ) : (
                <MapPin
                  className="h-5 w-5 text-brand-blue-deep"
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-base font-medium text-ink">
                {contact.name}
              </span>
              <span className="text-base text-steel">{contact.role}</span>
            </div>
          </div>

          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              onClick={() => handleCallClick(contact)}
              className="inline-flex min-h-[48px] min-w-[48px] items-center gap-2 rounded-lg bg-brand-blue-deep px-4 py-2 text-base font-medium text-white transition-colors hover:bg-brand-blue-deep/90 active:bg-brand-blue-deep/80"
              aria-label={`${contact.name} কে কল করুন`}
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              <span>কল করুন</span>
            </a>
          )}
        </div>
      ))}
    </div>
  )
}
