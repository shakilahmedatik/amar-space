/**
 * Navigation configuration for AmarSpace.
 *
 * Design constraints:
 * - Max 3 navigation levels from dashboard to any feature
 *   Level 1: Dashboard (home)
 *   Level 2: Primary section (e.g., /buildings)
 *   Level 3: Detail/action (e.g., /buildings/[id], /maintenance/new)
 * - One click/tap reaches any primary section from the dashboard
 * - Role-based navigation item visibility
 *
 * Used by both Sidebar (desktop ≥768px) and BottomTabBar (mobile <768px).
 */

export type UserRole =
  | 'owner'
  | 'manager'
  | 'security_guard'
  | 'care_taker'
  | 'renter'
  | 'superadmin'

export interface NavigationItem {
  /** Unique identifier for the navigation item */
  id: string
  /** Translation key for the label (e.g., 'nav.buildings') */
  labelKey: string
  /** Bangla label (primary language) */
  labelBn: string
  /** English label (fallback) */
  labelEn: string
  /** Route path — one click/tap from dashboard */
  href: string
  /** SVG icon identifier */
  icon: string
  /** Roles that can see this item */
  roles: UserRole[]
  /** Whether this item appears in the mobile bottom tab bar (limited space) */
  showInBottomTab: boolean
}

/**
 * All primary navigation sections with role-based visibility:
 *
 * Owner: Dashboard, Buildings, Flats, Renters, Bills, Maintenance, Issues, Notices, Audit, Settings
 * Manager: Dashboard, Buildings, Flats, Renters, Bills, Maintenance, Issues, Notices, Settings
 * Renter: Dashboard, Bills, Maintenance, Notices, Settings
 *
 * Each section is reachable in one click/tap from the dashboard.
 * No section requires more than 3 levels of navigation depth:
 *   /dashboard → /section → /section/[id] or /section/new
 */
export const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    labelKey: 'nav.dashboard',
    labelBn: 'ড্যাশবোর্ড',
    labelEn: 'Dashboard',
    href: '/dashboard',
    icon: 'dashboard',
    roles: ['owner', 'manager'],
    showInBottomTab: true,
  },
  {
    id: 'buildings',
    labelKey: 'nav.buildings',
    labelBn: 'ভবনসমূহ',
    labelEn: 'Buildings',
    href: '/buildings',
    icon: 'buildings',
    roles: ['owner', 'manager'],
    showInBottomTab: true,
  },
  {
    id: 'flats',
    labelKey: 'nav.flats',
    labelBn: 'ফ্ল্যাটসমূহ',
    labelEn: 'Flats',
    href: '/flats',
    icon: 'flats',
    roles: ['owner', 'manager'],
    showInBottomTab: false,
  },
  {
    id: 'renters',
    labelKey: 'nav.renters',
    labelBn: 'ভাড়াটিয়া',
    labelEn: 'Renters',
    href: '/renters',
    icon: 'renters',
    roles: ['owner', 'manager'],
    showInBottomTab: false,
  },
  {
    id: 'bills',
    labelKey: 'nav.bills',
    labelBn: 'বিলসমূহ',
    labelEn: 'Bills',
    href: '/bills',
    icon: 'bills',
    roles: ['owner', 'manager'],
    showInBottomTab: true,
  },
  {
    id: 'payments',
    labelKey: 'nav.payments',
    labelBn: 'পেমেন্ট',
    labelEn: 'Payments',
    href: '/payments',
    icon: 'payments',
    roles: ['owner', 'manager'],
    showInBottomTab: false,
  },
  {
    id: 'maintenance',
    labelKey: 'nav.maintenance',
    labelBn: 'রক্ষণাবেক্ষণ',
    labelEn: 'Maintenance',
    href: '/maintenance',
    icon: 'maintenance',
    roles: ['owner', 'manager', 'security_guard', 'care_taker'],
    showInBottomTab: true,
  },
  {
    id: 'issues',
    labelKey: 'nav.issues',
    labelBn: 'সমস্যা',
    labelEn: 'Issues',
    href: '/issues',
    icon: 'issues',
    roles: ['owner', 'manager', 'security_guard', 'care_taker'],
    showInBottomTab: false,
  },
  {
    id: 'notices',
    labelKey: 'nav.notices',
    labelBn: 'নোটিশ',
    labelEn: 'Notices',
    href: '/notices',
    icon: 'notices',
    roles: ['owner', 'manager'],
    showInBottomTab: true,
  },
  {
    id: 'staff',
    labelKey: 'nav.staff',
    labelBn: 'স্টাফ ব্যবস্থাপনা',
    labelEn: 'Manage Staff',
    href: '/staff',
    icon: 'users',
    roles: ['owner'],
    showInBottomTab: false,
  },
  {
    id: 'audit',
    labelKey: 'nav.audit',
    labelBn: 'অডিট লগ',
    labelEn: 'Audit Log',
    href: '/audit',
    icon: 'audit',
    roles: ['owner'],
    showInBottomTab: false,
  },
  {
    id: 'settings',
    labelKey: 'common.settings',
    labelBn: 'সেটিংস',
    labelEn: 'Settings',
    href: '/settings',
    icon: 'settings',
    roles: ['owner', 'manager'],
    showInBottomTab: false,
  },
]

/**
 * Filter navigation items by user role.
 * Returns all primary sections visible to the given role.
 */
export function getNavigationForRole(role: UserRole): NavigationItem[] {
  return navigationItems.filter((item) => item.roles.includes(role))
}

/**
 * Get navigation items suitable for the mobile bottom tab bar.
 * Limited to items marked with showInBottomTab plus a "More" indicator
 * to keep the tab bar usable on small screens.
 */
export function getBottomTabItems(role: UserRole): NavigationItem[] {
  return navigationItems.filter(
    (item) => item.roles.includes(role) && item.showInBottomTab,
  )
}

/**
 * Get overflow items that don't fit in the bottom tab bar.
 * These are shown in a "More" menu on mobile.
 */
export function getOverflowItems(role: UserRole): NavigationItem[] {
  return navigationItems.filter(
    (item) => item.roles.includes(role) && !item.showInBottomTab,
  )
}

/**
 * Check if a given path matches a navigation item (for active state).
 * Matches exact path or any sub-path (e.g., /buildings/123 matches /buildings).
 */
export function isNavItemActive(
  itemHref: string,
  currentPath: string,
): boolean {
  if (currentPath === itemHref) return true
  // Match sub-paths but not partial matches (e.g., /bills shouldn't match /buildings)
  return currentPath.startsWith(`${itemHref}/`)
}

/**
 * Navigation depth documentation:
 *
 * All features are accessible within max 3 levels from dashboard:
 *
 * Level 1 (Dashboard):
 *   /dashboard
 *
 * Level 2 (Primary sections - one click from dashboard):
 *   /buildings, /flats, /renters, /bills, /payments, /maintenance,
 *   /issues, /notices, /audit, /settings
 *
 * Level 3 (Detail/Action pages - two clicks from dashboard):
 *   /buildings/[id], /flats/[id], /renters/[id], /renters/new,
 *   /bills/[id], /payments/[id], /payments/new, /maintenance/[id],
 *   /maintenance/new, /issues/[id], /issues/new, /notices/[id], /notices/new
 *
 * No feature requires more than 3 levels of navigation.
 */
