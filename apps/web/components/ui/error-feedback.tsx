'use client'

import { useCallback, useEffect, useState } from 'react'

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
    <div
      role="alert"
      aria-live="assertive"
      className={className}
      style={{
        position: 'fixed',
        top: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        minHeight: '48px',
        padding: '0.75rem 1rem',
        borderRadius: '0.5rem',
        border: `1px solid ${config.border}`,
        backgroundColor: config.bg,
        color: config.text,
        fontSize: '0.875rem',
        fontWeight: 500,
        boxShadow:
          '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
        maxWidth: 'calc(100vw - 2rem)',
        width: 'auto',
        minWidth: '280px',
        animation: 'feedbackSlideDown 0.2s ease-out',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: '1.125rem' }}>
        {config.icon}
      </span>
      <span style={{ flex: 1 }}>{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          style={{
            minWidth: '44px',
            minHeight: '44px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            color: config.text,
            cursor: 'pointer',
            fontSize: '1.25rem',
            fontWeight: 700,
            borderRadius: '0.25rem',
          }}
        >
          ×
        </button>
      )}
      <style>{`@keyframes feedbackSlideDown { from { transform: translateX(-50%) translateY(-100%); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }`}</style>
    </div>
  )
}

function getTypeConfig(type: FeedbackType) {
  switch (type) {
    case 'error':
      return { bg: '#fef2f2', text: '#991b1b', border: '#fecaca', icon: '⚠' }
    case 'success':
      return { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0', icon: '✓' }
    case 'warning':
      return { bg: '#fffbeb', text: '#92400e', border: '#fde68a', icon: '⚡' }
    case 'info':
      return { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe', icon: 'ℹ' }
  }
}
