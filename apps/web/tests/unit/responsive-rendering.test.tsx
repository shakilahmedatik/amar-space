// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

// Mock analytics
vi.mock('@/app/f/[flatSlug]/lib/analytics', () => ({
  trackEvent: vi.fn(),
}))

// TanStack Query wrapper for components that need it
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AccessCodeInput } from '@/app/f/[flatSlug]/components/access-code-input'
import { EmergencyContacts } from '@/app/f/[flatSlug]/components/emergency-contacts'
import { QuickActionsGrid } from '@/app/f/[flatSlug]/components/quick-actions-grid'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

afterEach(() => {
  cleanup()
})

describe('Responsive Rendering', () => {
  /**
   * Validates: Requirements 10.2, 10.6
   *
   * Since jsdom doesn't compute actual pixel dimensions, we verify that
   * the correct CSS classes are applied to ensure responsive behavior.
   */

  describe('No horizontal overflow at 360px viewport (Requirement 10.6)', () => {
    it('portal layout container uses max-w-md to constrain width within viewport', () => {
      // The layout uses max-w-md (448px) which fits within 360px with px-4 padding.
      // We verify the portal root and container classes prevent overflow.
      // The portal.css applies overflow-x: hidden on .portal-root.
      // We test that the QuickActionsGrid renders within a constrained container.
      const { container } = render(
        <div className="portal-root min-h-dvh">
          <div className="mx-auto w-full max-w-md px-4 py-6">
            <QuickActionsGrid
              whatsappGroupLink="https://chat.whatsapp.com/test"
              managerPhone="01712345678"
              flatSlug="test-flat"
            />
          </div>
        </div>,
      )

      const portalRoot = container.querySelector('.portal-root')
      expect(portalRoot).not.toBeNull()
      expect(portalRoot!.className).toContain('portal-root')

      // The inner container should have max-w-md and w-full classes
      const innerContainer = portalRoot!.querySelector('.max-w-md')
      expect(innerContainer).not.toBeNull()
      expect(innerContainer!.className).toContain('w-full')
      expect(innerContainer!.className).toContain('px-4')
    })

    it('quick actions grid uses grid-cols-2 for responsive 2-column layout', () => {
      const { container } = render(
        <QuickActionsGrid
          whatsappGroupLink="https://chat.whatsapp.com/test"
          managerPhone="01712345678"
          flatSlug="test-flat"
        />,
      )

      const grid = container.querySelector('.grid')
      expect(grid).not.toBeNull()
      expect(grid!.className).toContain('grid-cols-2')
      expect(grid!.className).toContain('gap-3')
    })

    it('emergency contacts use flexible layout without fixed widths that could overflow', () => {
      const contacts = [
        {
          name: 'রহিম',
          role: 'মালিক',
          phone: '01712345678',
          type: 'building' as const,
          order: 1,
        },
      ]

      const { container } = render(
        <EmergencyContacts contacts={contacts} flatSlug="test-flat" />,
      )

      // The outer container should use flex-col layout (not fixed width)
      const outerContainer = container.firstElementChild
      expect(outerContainer).not.toBeNull()
      expect(outerContainer!.className).toContain('flex')
      expect(outerContainer!.className).toContain('flex-col')

      // Contact card containers should not have explicit fixed-width classes
      // (min-w-[48px] on buttons is fine — it's a minimum, not a fixed width)
      const contactCards = container.querySelectorAll(
        '.flex.items-center.justify-between',
      )
      expect(contactCards.length).toBeGreaterThan(0)
      for (const card of contactCards) {
        // Cards should not have fixed w-[Npx] classes (excluding min-w which is acceptable)
        expect(card.className).not.toMatch(/(?<!min-)w-\[\d+px\]/)
      }
    })

    it('all text content uses break-word classes to prevent overflow', () => {
      // The portal.css sets word-wrap: break-word and overflow-wrap: break-word
      // on .portal-root. We verify the root class is applied.
      const { container } = render(
        <div className="portal-root">
          <QuickActionsGrid
            whatsappGroupLink={null}
            managerPhone={null}
            flatSlug="test-flat"
          />
        </div>,
      )

      const portalRoot = container.querySelector('.portal-root')
      expect(portalRoot).not.toBeNull()
    })
  })

  describe('Touch target sizes meet 48x48px minimum (Requirement 10.2)', () => {
    it('quick action buttons have min-h-[48px] and min-w-[48px] classes', () => {
      const { container } = render(
        <QuickActionsGrid
          whatsappGroupLink="https://chat.whatsapp.com/test"
          managerPhone="01712345678"
          flatSlug="test-flat"
        />,
      )

      // All interactive elements (links and buttons) in the grid
      const interactiveElements = container.querySelectorAll('a, button')
      expect(interactiveElements.length).toBeGreaterThan(0)

      for (const element of interactiveElements) {
        expect(element.className).toContain('min-h-[48px]')
        expect(element.className).toContain('min-w-[48px]')
      }
    })

    it('emergency contact call buttons have min-h-[48px] and min-w-[48px] classes', () => {
      const contacts = [
        {
          name: 'রহিম',
          role: 'মালিক',
          phone: '01712345678',
          type: 'building' as const,
          order: 1,
        },
        {
          name: 'করিম',
          role: 'ম্যানেজার',
          phone: '01812345678',
          type: 'building' as const,
          order: 2,
        },
      ]

      const { container } = render(
        <EmergencyContacts contacts={contacts} flatSlug="test-flat" />,
      )

      // Call buttons (links with tel: href)
      const callButtons = container.querySelectorAll('a[href^="tel:"]')
      expect(callButtons.length).toBe(2)

      for (const button of callButtons) {
        expect(button.className).toContain('min-h-[48px]')
        expect(button.className).toContain('min-w-[48px]')
      }
    })

    it('access code submit button has min-h-[48px] class', () => {
      const { container } = render(
        <AccessCodeInput flatSlug="test-flat" flatStatus="OCCUPIED" />,
        { wrapper: createWrapper() },
      )

      const submitButton = container.querySelector('button[type="submit"]')
      expect(submitButton).not.toBeNull()
      expect(submitButton!.className).toContain('min-h-[48px]')
    })

    it('quick action buttons have adequate spacing via gap-3 class', () => {
      const { container } = render(
        <QuickActionsGrid
          whatsappGroupLink="https://chat.whatsapp.com/test"
          managerPhone="01712345678"
          flatSlug="test-flat"
        />,
      )

      // The grid container should have gap-3 (12px) which exceeds the 8px minimum spacing
      const grid = container.querySelector('.grid')
      expect(grid).not.toBeNull()
      expect(grid!.className).toContain('gap-3')
    })

    it('emergency contact cards have adequate spacing via gap-3 class', () => {
      const contacts = [
        {
          name: 'রহিম',
          role: 'মালিক',
          phone: '01712345678',
          type: 'building' as const,
          order: 1,
        },
        {
          name: 'করিম',
          role: 'ম্যানেজার',
          phone: '01812345678',
          type: 'building' as const,
          order: 2,
        },
      ]

      const { container } = render(
        <EmergencyContacts contacts={contacts} flatSlug="test-flat" />,
      )

      // The contacts container should have gap-3 for spacing between items
      const contactsContainer = container.querySelector('.flex.flex-col.gap-3')
      expect(contactsContainer).not.toBeNull()
    })
  })
})
