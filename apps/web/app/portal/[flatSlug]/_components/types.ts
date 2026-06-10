export type FlatStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'

export type PortalPanelType =
  | 'profile'
  | 'bills'
  | 'notices'
  | 'contacts'
  | 'issues'
  | 'rules'

export type ActivePanel = 'register' | PortalPanelType | null

export interface EmergencyContact {
  name: string
  role: string
  phone: string | null
  type: 'building' | 'nearby'
  order: number
}

export interface Notice {
  id: string
  title: string
  body: string
  createdAt: string
  isPinned: boolean
}

export interface PortalPageData {
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
    status: FlatStatus
    slug: string
  }
  emergencyContacts: EmergencyContact[]
  hasPendingRegistration: boolean
}

// Re-export core API types for local convenience
export type {
  PortalIssue,
  PortalIssuesResponse,
  PortalRenterData,
} from '@/lib/api/portal'
