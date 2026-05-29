'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import { NavIcon } from './nav-icon'
import {
  getBottomTabItems,
  getOverflowItems,
  isNavItemActive,
  type UserRole,
} from './navigation-items'

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
 *
 * Features:
 * - Shows primary tabs (max 5) for quick one-tap access
 * - "More" menu for overflow items (Flats, Renters, Issues, Audit, Settings)
 * - Role-based item visibility
 * - Active route highlighting
 * - All tabs meet 44x44px minimum touch target (Req 14.3, 16.8)
 * - One click/tap to reach any primary section (Req 20.5)
 *
 * Requirements: 14.3, 16.3, 16.8, 20.5, 20.6
 */
export function BottomTabBar({
  role,
  activePath,
  onNavigate,
}: BottomTabBarProps) {
  const { t } = useTranslation()
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const primaryItems = getBottomTabItems(role)
  const overflowItems = getOverflowItems(role)
  const hasOverflow = overflowItems.length > 0

  // Check if any overflow item is currently active
  const isOverflowActive = overflowItems.some((item) =>
    isNavItemActive(item.href, activePath),
  )

  // Close menu when clicking outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setMoreMenuOpen(false)
    }
  }, [])

  useEffect(() => {
    if (moreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [moreMenuOpen, handleClickOutside])

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-canvas border-t border-hairline-soft h-16 safe-area-bottom"
      aria-label={t('nav.dashboard')}
    >
      {/* Overflow "More" menu popup */}
      {moreMenuOpen && hasOverflow && (
        <div
          ref={menuRef}
          className="absolute bottom-full right-2 mb-2 bg-canvas border border-hairline rounded-xl shadow-lg py-2 min-w-[180px] z-50"
          role="menu"
          aria-label={t('common.more')}
        >
          {overflowItems.map((item) => {
            const isActive = isNavItemActive(item.href, activePath)
            return (
              <a
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault()
                    onNavigate(item.href)
                  }
                  setMoreMenuOpen(false)
                }}
                className={`
                  flex items-center gap-3 px-4 min-h-11
                  text-sm font-medium transition-colors duration-150
                  ${
                    isActive
                      ? 'text-brand-green bg-surface'
                      : 'text-stone hover:bg-surface'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <NavIcon name={item.icon} className="w-5 h-5" />
                <span>{t(item.labelKey)}</span>
              </a>
            )
          })}
        </div>
      )}

      <ul className="flex items-stretch justify-around w-full">
        {primaryItems.map((item) => {
          const isActive = isNavItemActive(item.href, activePath)
          return (
            <li key={item.href} className="flex-1">
              <a
                href={item.href}
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault()
                    onNavigate(item.href)
                  }
                  setMoreMenuOpen(false)
                }}
                className={`
                  flex flex-col items-center justify-center gap-0.5
                  min-h-[44px] min-w-[44px] w-full
                  py-2 px-1
                  text-xs leading-tight font-medium
                  transition-colors duration-150
                  ${
                    isActive ? 'text-brand-green' : 'text-stone active:text-ink'
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

        {/* "More" tab for overflow items */}
        {hasOverflow && (
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreMenuOpen((prev) => !prev)}
              className={`
                flex flex-col items-center justify-center gap-0.5
                min-h-[44px] min-w-[44px] w-full
                py-2 px-1
                text-xs leading-tight font-medium
                transition-colors duration-150
                ${
                  isOverflowActive || moreMenuOpen
                    ? 'text-brand-green'
                    : 'text-stone active:text-ink'
                }
              `}
              aria-expanded={moreMenuOpen}
              aria-haspopup="menu"
              aria-label={t('common.more')}
            >
              <svg
                className="w-6 h-6 shrink-0"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
              <span className="truncate max-w-full text-center">
                {t('common.more')}
              </span>
            </button>
          </li>
        )}
      </ul>
    </nav>
  )
}
