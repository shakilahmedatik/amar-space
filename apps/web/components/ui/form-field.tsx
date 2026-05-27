'use client'

import { type InputHTMLAttributes, type ReactNode, useId } from 'react'

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  className?: string
  children: ReactNode
  helpText?: string
  htmlFor?: string
}

/**
 * Form field wrapper with label-above-input pattern.
 * Validates: Requirement 16.3
 */
export function FormField({
  label,
  error,
  required = false,
  className = '',
  children,
  helpText,
  htmlFor,
}: FormFieldProps) {
  const generatedId = useId()
  const fieldId = htmlFor || generatedId
  const errorId = `${fieldId}-error`
  const helpId = `${fieldId}-help`

  return (
    <div className={className} style={{ marginBottom: '1rem' }}>
      <label
        htmlFor={fieldId}
        style={{
          display: 'block',
          marginBottom: '0.375rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          color: 'var(--foreground)',
        }}
      >
        {label}
        {required && (
          <span
            aria-hidden="true"
            style={{ color: '#dc2626', marginLeft: '0.25rem' }}
          >
            *
          </span>
        )}
      </label>
      <div
        data-field-id={fieldId}
        data-error-id={error ? errorId : undefined}
        data-help-id={helpText ? helpId : undefined}
      >
        {children}
      </div>
      {helpText && !error && (
        <p
          id={helpId}
          style={{
            marginTop: '0.25rem',
            fontSize: '0.75rem',
            color: '#6b7280',
          }}
        >
          {helpText}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          style={{
            marginTop: '0.25rem',
            fontSize: '0.75rem',
            color: '#dc2626',
            fontWeight: 500,
          }}
        >
          {error}
        </p>
      )}
    </div>
  )
}

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean
  ref?: React.Ref<HTMLInputElement>
}

/**
 * Styled input component that integrates with FormField.
 */
export function FormInput({ hasError, style, ref, ...props }: FormInputProps) {
  return (
    <input
      ref={ref}
      {...props}
      style={{
        display: 'block',
        width: '100%',
        padding: '0.625rem 0.75rem',
        fontSize: '1rem',
        lineHeight: '1.5',
        borderRadius: '0.375rem',
        border: `1px solid ${hasError ? '#dc2626' : '#d1d5db'}`,
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
        outline: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        minHeight: '44px',
        ...style,
      }}
      aria-invalid={hasError || undefined}
    />
  )
}
