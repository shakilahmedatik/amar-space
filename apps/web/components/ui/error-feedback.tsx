'use client'

import { useCallback, useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

type FeedbackType = 'error' | 'success' | 'warning' | 'info'

interface ErrorFeedbackProps {
  message: string
  type?: FeedbackType
  visible: boolean
  onDismiss?: () => void
  duration?: number
  className?: string
}

/**
 * Top-of-viewport feedback message. Auto-dismisses after 5s.
 * Minimum height 48px for accessibility.
 * Validates: Requirement 16.7
 */
export function ErrorFeedback({
  message,
  type = 'error',
  visible,
  onDismiss,
  duration = 5000,
  className = '',
}: ErrorFeedbackProps) {
  const [isShowing, setIsShowing] = useState(visible)

  useEffect(() => {
    setIsShowing(visible)
  }, [visible])

  useEffect(() => {
    if (!isShowing || duration <= 0) return
    const timer = setTimeout(() => {
      setIsShowing(false)
      onDismiss?.()
    }, duration)
    return () => clearTimeout(timer)
  }, [isShowing, duration, onDismiss])

  const handleDismiss = useCallback(() => {
    setIsShowing(false)
    onDismiss?.()
  }, [onDismiss])

  if (!isShowing) return null

  const config = getTypeConfig(type)

  return (
    <>
      <style>{`@keyframes feedbackSlideDown { from { transform: translateX(-50%) translateY(-100%); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }`}</style>
      <Alert
        aria-live="assertive"
        className={cn(
          'fixed top-4 left-1/2 z-9999 flex min-h-section-sm min-w-[280px] max-w-[calc(100vw-2rem)] w-auto -translate-x-1/2 items-center gap-3 px-4 py-3 text-sm font-medium shadow-md',
          'animate-[feedbackSlideDown_0.2s_ease-out]',
          config.classes,
          className,
        )}
      >
        <span aria-hidden="true" className="text-lg shrink-0">
          {config.icon}
        </span>
        <AlertDescription className="flex-1 text-inherit">
          {message}
        </AlertDescription>
        {onDismiss && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded border-none bg-transparent text-xl font-bold text-inherit cursor-pointer"
          >
            ×
          </button>
        )}
      </Alert>
    </>
  )
}

function getTypeConfig(type: FeedbackType): { classes: string; icon: string } {
  switch (type) {
    case 'error':
      return {
        classes: 'bg-error-bg text-error-text border-error-text/30 rounded-lg',
        icon: '⚠',
      }
    case 'success':
      return {
        classes:
          'bg-success-bg text-success-text border-success-text/30 rounded-lg',
        icon: '✓',
      }
    case 'warning':
      return {
        classes:
          'bg-warning-bg text-warning-text border-warning-text/30 rounded-lg',
        icon: '⚡',
      }
    case 'info':
      return {
        classes:
          'bg-brand-blue-200 text-brand-blue-deep border-brand-blue-deep/30 rounded-lg',
        icon: 'ℹ',
      }
  }
}
