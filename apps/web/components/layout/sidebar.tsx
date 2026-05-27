'use client'

import { useTranslation } from '@/lib/i18n'
import { NavIcon } from './nav-icon'
import { getNavigationForRole, type UserRole } from './navigation-items'

interface SidebarProps {
  role: UserRole
  activePath: string
  onNavigate?: (href: string) => void
}

export function Sidebar({ role, activePath, onNavigate }: SidebarProps) {
  const { t } = useTranslation()
  const items = getNavigationForRole(role)

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
          {items.map((item) => {
            const isActive =
              activePath === item.href || activePath.startsWith(`${item.href}/`)
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
      <div className="border-t border-gray-200 px-3 py-3">
        <a
          href="/settings"
          onClick={(e) => {
            if (onNavigate) {
              e.preventDefault()
              onNavigate('/settings')
            }
          }}
          className={[
            'flex items-center gap-3 px-3 rounded-lg min-h-11 min-w-11 text-base leading-relaxed font-medium transition-colors duration-150',
            activePath === '/settings'
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
          ].join(' ')}
          aria-current={activePath === '/settings' ? 'page' : undefined}
        >
          <NavIcon name="settings" />
          <span>{t('common.settings')}</span>
        </a>
      </div>
    </aside>
  )
}
