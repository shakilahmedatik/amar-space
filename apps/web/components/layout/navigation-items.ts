/**
 * Navigation item definitions with role-based visibility.
 * Used by both Sidebar (desktop) and BottomTabBar (mobile).
 */

export type UserRole = 'owner' | 'manager' | 'renter'

export interface NavigationItem {
  /** Translation key for the label (e.g., 'nav.buildings') */
  labelKey: string
  /** Route path */
  href: string
  /** SVG icon identifier */
  icon: string
  /** Roles that can see this item */
  roles: UserRole[]
}

/**
 * All navigation items with role-based visibility rules:
 * - Owner: sees all items
 * - Manager: sees Buildings, Flats, Renters, Bills, Maintenance, Issues, Notices (no Audit)
 * - Renter: sees Dashboard, Bills, Maintenance, Notices only
 */
export const navigationItems: NavigationItem[] = [
  {
    labelKey: 'nav.dashboard',
    href: '/dashboard',
    icon: 'dashboard',
    roles: ['owner', 'manager', 'renter'],
  },
  {
    labelKey: 'nav.buildings',
    href: '/buildings',
    icon: 'buildings',
    roles: ['owner', 'manager'],
  },
  {
    labelKey: 'nav.flats',
    href: '/flats',
    icon: 'flats',
    roles: ['owner', 'manager'],
  },
  {
    labelKey: 'nav.renters',
    href: '/renters',
    icon: 'renters',
    roles: ['owner', 'manager'],
  },
  {
    labelKey: 'nav.bills',
    href: '/bills',
    icon: 'bills',
    roles: ['owner', 'manager', 'renter'],
  },
  {
    labelKey: 'nav.maintenance',
    href: '/maintenance',
    icon: 'maintenance',
    roles: ['owner', 'manager', 'renter'],
  },
  {
    labelKey: 'nav.issues',
    href: '/issues',
    icon: 'issues',
    roles: ['owner', 'manager'],
  },
  {
    labelKey: 'nav.notices',
    href: '/notices',
    icon: 'notices',
    roles: ['owner', 'manager', 'renter'],
  },
  {
    labelKey: 'nav.audit',
    href: '/audit',
    icon: 'audit',
    roles: ['owner'],
  },
]

/**
 * Filter navigation items by user role.
 */
export function getNavigationForRole(role: UserRole): NavigationItem[] {
  return navigationItems.filter((item) => item.roles.includes(role))
}
