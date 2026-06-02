'use client'

import { type InputHTMLAttributes, type ReactNode, useId } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  className?: string
  children: ReactNode
  helpText?: string
  htmlFor?: string
  /** Optional icon rendered before the label text */
  icon?: ReactNode
}

/**
 * Form field wrapper with label-above-input pattern.
 */
export function FormField({
  label,
  error,
  required = false,
  className = '',
  children,
  helpText,
  htmlFor,
  icon,
}: FormFieldProps) {
  const generatedId = useId()
  const fieldId = htmlFor || generatedId
  const errorId = `${fieldId}-error`
  const helpId = `${fieldId}-help`

  return (
    <div className={cn('mb-4', className)}>
      <Label htmlFor={fieldId} className="flex items-center gap-1.5 mb-1.5">
        {icon && <span className="shrink-0">{icon}</span>}
        {label}
        {required && (
          <span aria-hidden="true" className="text-error-text ml-1">
            *
          </span>
        )}
      </Label>
      <div
        data-field-id={fieldId}
        data-error-id={error ? errorId : undefined}
        data-help-id={helpText ? helpId : undefined}
      >
        {children}
      </div>
      {helpText && !error && (
        <p id={helpId} className="mt-1 text-xs text-stone">
          {helpText}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1 text-xs text-error-text font-medium"
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
export function FormInput({
  hasError,
  className,
  ref,
  ...props
}: FormInputProps) {
  return (
    <Input
      ref={ref}
      aria-invalid={hasError || undefined}
      className={cn(
        'rounded-md border-hairline min-h-[44px]',
        hasError && 'border-error-text bg-error-bg',
        className,
      )}
      {...props}
    />
  )
}
