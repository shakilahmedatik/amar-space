/**
 * Emergency contact sorting utility.
 * Sorts building contacts by role order: Owner → Manager → Caretaker → Security,
 * then appends nearby contacts sorted by their original order.
 *
 * Validates: Requirements 5.1
 */

export interface EmergencyContact {
  name: string
  role: string
  phone: string | null
  type: 'building' | 'nearby'
  order: number
}

/**
 * Role ordering for building contacts.
 * মালিক (Owner) → ম্যানেজার (Manager) → কেয়ারটেকার (Caretaker) → সিকিউরিটি (Security)
 */
export const ROLE_ORDER: Record<string, number> = {
  মালিক: 0,
  ম্যানেজার: 1,
  কেয়ারটেকার: 2,
  সিকিউরিটি: 3,
}

/**
 * Sorts emergency contacts by type (building first, then nearby)
 * and within building contacts by role order: Owner → Manager → Caretaker → Security.
 * Contacts with the same role maintain their original relative order (stable sort by `order` field).
 * Contacts with unrecognized roles are placed after known roles.
 */
export function sortContacts(contacts: EmergencyContact[]): EmergencyContact[] {
  const buildingContacts = contacts.filter((c) => c.type === 'building')
  const nearbyContacts = contacts.filter((c) => c.type === 'nearby')

  buildingContacts.sort((a, b) => {
    const orderA = ROLE_ORDER[a.role] ?? 999
    const orderB = ROLE_ORDER[b.role] ?? 999
    if (orderA !== orderB) return orderA - orderB
    return a.order - b.order
  })

  nearbyContacts.sort((a, b) => a.order - b.order)

  return [...buildingContacts, ...nearbyContacts]
}
