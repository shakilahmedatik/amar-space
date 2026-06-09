'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { AuthLayout } from '@/components/layout/auth-layout'
import { Button } from '@/components/ui/button'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { FormField, FormInput } from '@/components/ui/form-field'
import { signIn } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'

/**
 * Login page — /login
 *
 * - Email + password form with Bangla-first labels
 * - Generic error message on auth failure
 * - Rate limit feedback
 * - Redirect to dashboard on success
 * - Accessible: labels, aria attributes, focus management
 * - Mobile-first, 44x44px touch targets, 16px body text
 */
export default function LoginPage() {
  const { t } = useTranslation()
  const router = useRouter()

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
            // rate limit feedback
            setFeedbackMessage(t('auth.rateLimitError'))
            setFeedbackType('warning')
          } else {
            // generic auth failure message
            setFeedbackMessage(t('auth.loginError'))
            setFeedbackType('error')
          }
          setShowFeedback(true)
          // Focus email field for retry
          emailRef.current?.focus()
        } else {
          // redirect to dashboard on success
          router.push('/dashboard')
        }
      } catch {
        setFeedbackMessage(t('common.error'))
        setFeedbackType('error')
        setShowFeedback(true)
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      email,
      password,
      validateForm,
      t, // redirect to dashboard on success
      router.push,
    ],
  )

  return (
    <AuthLayout>
      <ErrorFeedback
        message={feedbackMessage}
        type={feedbackType}
        visible={showFeedback}
        onDismiss={() => setShowFeedback(false)}
      />

      <h2 className="text-xl font-semibold mb-6 text-center text-ink">
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

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full min-h-11 rounded-full bg-primary text-on-primary font-semibold mt-6"
          aria-busy={isSubmitting}
        >
          {isSubmitting ? t('common.loading') : t('auth.login')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-steel">
        {t('auth.noAccount')}{' '}
        <Link
          href="/register"
          className="text-brand-blue-deep font-medium underline"
        >
          {t('auth.register')}
        </Link>
      </p>
    </AuthLayout>
  )
}
