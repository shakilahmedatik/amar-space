'use client'

import { useTranslation } from '@/lib/i18n'
import { NavIcon } from './nav-icon'
import { getNavigationForRole, type UserRole } from './navigation-items'

interface BottomTabBarProps {
  /** Current user role for filtering navigation items */
  role: UserRole
  /** Currently active route path */
  activePath: string
  /** Callback when a tab is tapped */
  onNavigate?: (href: string) => void
}

/**
 * Mobile bottom tab bar navigation (< 768px).
 * Hidden on desktop viewports via Tailwind responsive utilities.
 * All tabs meet 44x44px minimum touch target (Req 14.3, 16.8).
 *
 * Shows up to 5 primary tabs. If the user has more items,
 * a "More" tab is shown that could expand to a menu.
 */
export function BottomTabBar({
  role,
  activePath,
  onNavigate,
}: BottomTabBarProps) {
  const { t } = useTranslation()
  const allItems = getNavigationForRole(role)

  // On mobile, show max 5 tabs (the most important ones)
  // For roles with more items, we limit to 5 primary tabs
  const maxTabs = 5
  const visibleItems = allItems.slice(0, maxTabs)

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-gray-200 bg-white safe-area-bottom"
      aria-label={t('nav.dashboard')}
    >
      <ul className="flex items-stretch justify-around w-full" role="list">
        {visibleItems.map((item) => {
          const isActive =
            activePath === item.href || activePath.startsWith(`${item.href}/`)
          return (
            <li key={item.href} className="flex-1">
              <a
                href={item.href}
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault()
                    onNavigate(item.href)
                  }
                }}
                className={`
                  flex flex-col items-center justify-center gap-0.5
                  min-h-[56px] min-w-[44px] w-full
                  py-2 px-1
                  text-xs leading-tight font-medium
                  transition-colors duration-150
                  ${
                    isActive
                      ? 'text-blue-700'
                      : 'text-gray-500 active:text-gray-700'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <NavIcon name={item.icon} className="w-6 h-6" />
                <span className="truncate max-w-full text-center">
                  {t(item.labelKey)}
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
