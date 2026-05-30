// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PortalStatusBadge } from '@/app/f/[flatSlug]/components/status-badge'

afterEach(() => {
  cleanup()
})

describe('PortalStatusBadge', () => {
  it('renders green badge with "খালি" for AVAILABLE status', () => {
    render(<PortalStatusBadge status="AVAILABLE" />)

    const badge = screen.getByRole('status')
    expect(badge).toBeDefined()
    expect(badge.textContent).toContain('খালি')
    expect(badge.getAttribute('aria-label')).toBe('খালি')
    expect(badge.className).toContain('bg-success-bg')
    expect(badge.className).toContain('text-success-text')
  })

  it('renders blue badge with "ভাড়া হয়েছে" for OCCUPIED status', () => {
    render(<PortalStatusBadge status="OCCUPIED" />)

    const badge = screen.getByRole('status')
    expect(badge).toBeDefined()
    expect(badge.textContent).toContain('ভাড়া হয়েছে')
    expect(badge.getAttribute('aria-label')).toBe('ভাড়া হয়েছে')
    expect(badge.className).toContain('bg-brand-blue-200')
    expect(badge.className).toContain('text-brand-blue-deep')
  })

  it('renders orange badge with "রক্ষণাবেক্ষণ" for MAINTENANCE status', () => {
    render(<PortalStatusBadge status="MAINTENANCE" />)

    const badge = screen.getByRole('status')
    expect(badge).toBeDefined()
    expect(badge.textContent).toContain('রক্ষণাবেক্ষণ')
    expect(badge.getAttribute('aria-label')).toBe('রক্ষণাবেক্ষণ')
    expect(badge.className).toContain('bg-warning-bg')
    expect(badge.className).toContain('text-warning-text')
  })

  it('renders grey badge with "অজানা" for unknown status', () => {
    render(<PortalStatusBadge status="SOMETHING_ELSE" />)

    const badge = screen.getByRole('status')
    expect(badge).toBeDefined()
    expect(badge.textContent).toContain('অজানা')
    expect(badge.getAttribute('aria-label')).toBe('অজানা')
    expect(badge.className).toContain('bg-surface')
    expect(badge.className).toContain('text-steel')
  })
})
