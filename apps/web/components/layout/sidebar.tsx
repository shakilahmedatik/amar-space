'use client'

import { useTranslation } from '@/lib/i18n'
import { NavIcon } from './nav-icon'
import {
  getNavigationForRole,
  isNavItemActive,
  type UserRole,
} from './navigation-items'

interface SidebarProps {
  role: UserRole
  activePath: string
  onNavigate?: (href: string) => void
}

/**
 * Desktop sidebar navigation (≥ 768px).
 * Hidden on mobile viewports via Tailwind responsive utilities.
 *
 * Features:
 * - Role-based navigation item visibility
 * - Active route highlighting (exact match + sub-path match)
 * - One click to reach any primary section
 * - Bangla labels as primary with English fallback via i18n
 * - 44x44px minimum touch targets (min-h-11 min-w-11)
 * - Settings shown at the bottom, separated by a border
 *
 * Requirements: 16.3, 20.5, 20.6
 */
export function Sidebar({ role, activePath, onNavigate }: SidebarProps) {
  const { t } = useTranslation()
  const allItems = getNavigationForRole(role)

  // Separate settings from main navigation for visual grouping
  const mainItems = allItems.filter((item) => item.id !== 'settings')
  const settingsItem = allItems.find((item) => item.id === 'settings')

  return (
    <aside
      className="hidden md:flex md:flex-col md:w-64 md:shrink-0 border-r border-gray-200 bg-white h-full"
      aria-label={t('nav.dashboard')}
    >
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-200">
        <span className="text-xl font-bold text-gray-900">
          {t('common.appName')}
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {mainItems.map((item) => {
            const isActive = isNavItemActive(item.href, activePath)
            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={(e) => {
                    if (onNavigate) {
                      e.preventDefault()
                      onNavigate(item.href)
                    }
                  }}
                  className={[
                    'flex items-center gap-3 px-3 rounded-lg min-h-11 min-w-11 text-base leading-relaxed font-medium transition-colors duration-150',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
                  ].join(' ')}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <NavIcon name={item.icon} />
                  <span>{t(item.labelKey)}</span>
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
      {settingsItem && (
        <div className="border-t border-gray-200 px-3 py-3">
          <a
            href={settingsItem.href}
            onClick={(e) => {
              if (onNavigate) {
                e.preventDefault()
                onNavigate(settingsItem.href)
              }
            }}
            className={[
              'flex items-center gap-3 px-3 rounded-lg min-h-11 min-w-11 text-base leading-relaxed font-medium transition-colors duration-150',
              isNavItemActive(settingsItem.href, activePath)
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
            ].join(' ')}
            aria-current={
              isNavItemActive(settingsItem.href, activePath)
                ? 'page'
                : undefined
            }
          >
            <NavIcon name={settingsItem.icon} />
            <span>{t(settingsItem.labelKey)}</span>
          </a>
        </div>
      )}
    </aside>
  )
}
