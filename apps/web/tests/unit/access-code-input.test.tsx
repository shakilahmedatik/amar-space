// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock analytics
vi.mock('@/app/f/[flatSlug]/lib/analytics', () => ({
  trackEvent: vi.fn(),
}))

import { AccessCodeInput } from '@/app/f/[flatSlug]/components/access-code-input'

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
  vi.restoreAllMocks()
  mockPush.mockReset()
})

describe('AccessCodeInput', () => {
  describe('Conditional rendering', () => {
    it('renders nothing when flatStatus is AVAILABLE', () => {
      const { container } = render(
        <AccessCodeInput flatSlug="test-flat" flatStatus="AVAILABLE" />,
        { wrapper: createWrapper() },
      )
      expect(container.innerHTML).toBe('')
    })

    it('renders nothing when flatStatus is MAINTENANCE', () => {
      const { container } = render(
        <AccessCodeInput flatSlug="test-flat" flatStatus="MAINTENANCE" />,
        { wrapper: createWrapper() },
      )
      expect(container.innerHTML).toBe('')
    })

    it('renders the access code input when flatStatus is OCCUPIED', () => {
      render(<AccessCodeInput flatSlug="test-flat" flatStatus="OCCUPIED" />, {
        wrapper: createWrapper(),
      })
      expect(screen.getByLabelText('অ্যাক্সেস কোড')).toBeDefined()
    })
  })

  describe('Numeric-only filtering', () => {
    it('accepts numeric characters', () => {
      render(<AccessCodeInput flatSlug="test-flat" flatStatus="OCCUPIED" />, {
        wrapper: createWrapper(),
      })
      const input = screen.getByLabelText('অ্যাক্সেস কোড') as HTMLInputElement
      fireEvent.change(input, { target: { value: '123456' } })
      expect(input.value).toBe('123456')
    })

    it('filters out alphabetic characters', () => {
      render(<AccessCodeInput flatSlug="test-flat" flatStatus="OCCUPIED" />, {
        wrapper: createWrapper(),
      })
      const input = screen.getByLabelText('অ্যাক্সেস কোড') as HTMLInputElement
      fireEvent.change(input, { target: { value: 'abc123' } })
      expect(input.value).toBe('123')
    })

    it('filters out special characters', () => {
      render(<AccessCodeInput flatSlug="test-flat" flatStatus="OCCUPIED" />, {
        wrapper: createWrapper(),
      })
      const input = screen.getByLabelText('অ্যাক্সেস কোড') as HTMLInputElement
      fireEvent.change(input, { target: { value: '12!@#3' } })
      expect(input.value).toBe('123')
    })

    it('filters out spaces and whitespace', () => {
      render(<AccessCodeInput flatSlug="test-flat" flatStatus="OCCUPIED" />, {
        wrapper: createWrapper(),
      })
      const input = screen.getByLabelText('অ্যাক্সেস কোড') as HTMLInputElement
      fireEvent.change(input, { target: { value: '1 2 3 4 5 6' } })
      expect(input.value).toBe('123456')
    })

    it('limits input to 6 digits maximum', () => {
      render(<AccessCodeInput flatSlug="test-flat" flatStatus="OCCUPIED" />, {
        wrapper: createWrapper(),
      })
      const input = screen.getByLabelText('অ্যাক্সেস কোড') as HTMLInputElement
      fireEvent.change(input, { target: { value: '12345678' } })
      expect(input.value).toBe('123456')
    })

    it('filters mixed non-numeric and limits to 6 digits', () => {
      render(<AccessCodeInput flatSlug="test-flat" flatStatus="OCCUPIED" />, {
        wrapper: createWrapper(),
      })
      const input = screen.getByLabelText('অ্যাক্সেস কোড') as HTMLInputElement
      fireEvent.change(input, { target: { value: 'a1b2c3d4e5f6g7h8' } })
      expect(input.value).toBe('123456')
    })
  })

  describe('Lockout display logic', () => {
    it('displays lockout message when locked', async () => {
      // Mock fetch to return a 429 lockout response
      const lockedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString()
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: () =>
          Promise.resolve({
            error: 'LOCKED',
            message: 'অ্যাক্সেস কোড লক করা হয়েছে',
            lockedUntil,
          }),
      })

      render(<AccessCodeInput flatSlug="test-flat" flatStatus="OCCUPIED" />, {
        wrapper: createWrapper(),
      })

      const input = screen.getByLabelText('অ্যাক্সেস কোড') as HTMLInputElement
      fireEvent.change(input, { target: { value: '123456' } })

      const form = input.closest('form')!
      await act(async () => {
        fireEvent.submit(form)
      })

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert')
        const lockoutAlert = alerts.find((el) =>
          el.textContent?.includes('অ্যাক্সেস কোড লক করা হয়েছে'),
        )
        expect(lockoutAlert).toBeDefined()
      })
    })

    it('disables input when locked', async () => {
      const lockedUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString()
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: () =>
          Promise.resolve({
            error: 'LOCKED',
            message: 'অ্যাক্সেস কোড লক করা হয়েছে',
            lockedUntil,
          }),
      })

      render(<AccessCodeInput flatSlug="test-flat" flatStatus="OCCUPIED" />, {
        wrapper: createWrapper(),
      })

      const input = screen.getByLabelText('অ্যাক্সেস কোড') as HTMLInputElement
      fireEvent.change(input, { target: { value: '123456' } })

      const form = input.closest('form')!
      await act(async () => {
        fireEvent.submit(form)
      })

      await waitFor(() => {
        expect(input.disabled).toBe(true)
      })
    })

    it('shows countdown time in lockout message', async () => {
      // Lock for 2 minutes and 30 seconds
      const lockedUntil = new Date(Date.now() + 150 * 1000).toISOString()
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: () =>
          Promise.resolve({
            error: 'LOCKED',
            message: 'অ্যাক্সেস কোড লক করা হয়েছে',
            lockedUntil,
          }),
      })

      render(<AccessCodeInput flatSlug="test-flat" flatStatus="OCCUPIED" />, {
        wrapper: createWrapper(),
      })

      const input = screen.getByLabelText('অ্যাক্সেস কোড') as HTMLInputElement
      fireEvent.change(input, { target: { value: '123456' } })

      const form = input.closest('form')!
      await act(async () => {
        fireEvent.submit(form)
      })

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert')
        const lockoutAlert = alerts.find((el) =>
          el.textContent?.includes('মিনিট'),
        )
        expect(lockoutAlert).toBeDefined()
      })
    })
  })

  describe('Input clearing on failure', () => {
    it('clears input when access code is invalid (401)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            error: 'INVALID_CODE',
            message: 'অবৈধ অ্যাক্সেস কোড',
            attemptsRemaining: 4,
          }),
      })

      render(<AccessCodeInput flatSlug="test-flat" flatStatus="OCCUPIED" />, {
        wrapper: createWrapper(),
      })

      const input = screen.getByLabelText('অ্যাক্সেস কোড') as HTMLInputElement
      fireEvent.change(input, { target: { value: '999999' } })
      expect(input.value).toBe('999999')

      const form = input.closest('form')!
      await act(async () => {
        fireEvent.submit(form)
      })

      await waitFor(() => {
        expect(input.value).toBe('')
      })
    })

    it('displays Bangla error message on failed attempt', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            error: 'INVALID_CODE',
            message: 'অবৈধ অ্যাক্সেস কোড',
            attemptsRemaining: 3,
          }),
      })

      render(<AccessCodeInput flatSlug="test-flat" flatStatus="OCCUPIED" />, {
        wrapper: createWrapper(),
      })

      const input = screen.getByLabelText('অ্যাক্সেস কোড') as HTMLInputElement
      fireEvent.change(input, { target: { value: '111111' } })

      const form = input.closest('form')!
      await act(async () => {
        fireEvent.submit(form)
      })

      await waitFor(() => {
        const errorEl = screen.getByRole('alert')
        expect(errorEl.textContent).toContain('অবৈধ অ্যাক্সেস কোড')
      })
    })

    it('shows validation error for incomplete code (less than 6 digits)', () => {
      render(<AccessCodeInput flatSlug="test-flat" flatStatus="OCCUPIED" />, {
        wrapper: createWrapper(),
      })

      const input = screen.getByLabelText('অ্যাক্সেস কোড') as HTMLInputElement
      fireEvent.change(input, { target: { value: '123' } })

      const form = input.closest('form')!
      fireEvent.submit(form)

      // Should show validation error for incomplete code
      const errorEl = screen.getByRole('alert')
      expect(errorEl.textContent).toContain('৬ সংখ্যার কোড')
    })
  })
})
