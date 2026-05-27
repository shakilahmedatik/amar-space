'use client'

import { useCallback, useRef, useState } from 'react'
import { AuthLayout } from '@/components/layout/auth-layout'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { FormField, FormInput } from '@/components/ui/form-field'
import { signIn } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'

/**
 * Login page — /login
 * Validates: Requirements 2.1, 2.2, 2.3, 20.5
 *
 * - Email + password form with Bangla-first labels
 * - Generic error message on auth failure (Req 2.2)
 * - Rate limit feedback (Req 2.3)
 * - Redirect to dashboard on success (Req 2.1)
 * - Accessible: labels, aria attributes, focus management
 * - Mobile-first, 44x44px touch targets, 16px body text
 */
export default function LoginPage() {
  const { t } = useTranslation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    password?: string
  }>({})
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackType, setFeedbackType] = useState<'error' | 'warning'>('error')
  const [showFeedback, setShowFeedback] = useState(false)

  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const validateForm = useCallback((): boolean => {
    const errors: { email?: string; password?: string } = {}

    if (!email.trim()) {
      errors.email = t('validation.required')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = t('validation.invalidEmail')
    }

    if (!password) {
      errors.password = t('validation.required')
    }

    setFieldErrors(errors)

    // Focus the first field with an error
    if (errors.email) {
      emailRef.current?.focus()
      return false
    }
    if (errors.password) {
      passwordRef.current?.focus()
      return false
    }

    return true
  }, [email, password, t])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!validateForm()) return

      setIsSubmitting(true)
      setShowFeedback(false)

      try {
        const result = await signIn({
          email: email.trim().toLowerCase(),
          password,
        })

        if (result.error) {
          if (result.error.code === 'RATE_LIMIT_EXCEEDED') {
            // Requirement 2.3: rate limit feedback
            setFeedbackMessage(t('auth.rateLimitError'))
            setFeedbackType('warning')
          } else {
            // Requirement 2.2: generic auth failure message
            setFeedbackMessage(t('auth.loginError'))
            setFeedbackType('error')
          }
          setShowFeedback(true)
          // Focus email field for retry
          emailRef.current?.focus()
        } else {
          // Requirement 2.1: redirect to dashboard on success
          window.location.href = '/dashboard'
        }
      } catch {
        setFeedbackMessage(t('common.error'))
        setFeedbackType('error')
        setShowFeedback(true)
      } finally {
        setIsSubmitting(false)
      }
    },
    [email, password, validateForm, t],
  )

  return (
    <AuthLayout>
      <ErrorFeedback
        message={feedbackMessage}
        type={feedbackType}
        visible={showFeedback}
        onDismiss={() => setShowFeedback(false)}
      />

      <h2
        style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          marginBottom: '1.5rem',
          textAlign: 'center',
          color: 'var(--foreground)',
        }}
      >
        {t('auth.loginTitle')}
      </h2>

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          label={t('auth.email')}
          error={fieldErrors.email}
          required
          htmlFor="login-email"
        >
          <FormInput
            ref={emailRef}
            id="login-email"
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: undefined }))
              }
            }}
            hasError={!!fieldErrors.email}
            aria-describedby={
              fieldErrors.email ? 'login-email-error' : undefined
            }
            disabled={isSubmitting}
            placeholder="example@email.com"
          />
        </FormField>

        <FormField
          label={t('auth.password')}
          error={fieldErrors.password}
          required
          htmlFor="login-password"
        >
          <FormInput
            ref={passwordRef}
            id="login-password"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }))
              }
            }}
            hasError={!!fieldErrors.password}
            aria-describedby={
              fieldErrors.password ? 'login-password-error' : undefined
            }
            disabled={isSubmitting}
          />
        </FormField>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            display: 'block',
            width: '100%',
            minHeight: '44px',
            padding: '0.75rem 1rem',
            marginTop: '1.5rem',
            fontSize: '1rem',
            fontWeight: 600,
            color: '#ffffff',
            backgroundColor: isSubmitting ? '#9ca3af' : '#2563eb',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s',
          }}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? t('common.loading') : t('auth.login')}
        </button>
      </form>

      <p
        style={{
          marginTop: '1.5rem',
          textAlign: 'center',
          fontSize: '0.875rem',
          color: '#6b7280',
        }}
      >
        {t('auth.noAccount')}{' '}
        <a
          href="/register"
          style={{
            color: '#2563eb',
            fontWeight: 500,
            textDecoration: 'underline',
          }}
        >
          {t('auth.register')}
        </a>
      </p>
    </AuthLayout>
  )
}
