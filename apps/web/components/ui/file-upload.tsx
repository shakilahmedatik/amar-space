'use client'

import { useCallback, useRef, useState } from 'react'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.webp'

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void
  maxFiles?: number
  disabled?: boolean
  error?: string
  className?: string
  accept?: string
  maxSize?: number
}

/**
 * File upload with drag-and-drop, 5MB limit, JPEG/PNG/WebP.
 * Validates: Requirement 16.6
 */
export function FileUpload({
  onFilesSelected,
  maxFiles = 5,
  disabled = false,
  error,
  className = '',
  accept = ACCEPTED_EXTENSIONS,
  maxSize = MAX_FILE_SIZE,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [validationError, setValidationError] = useState('')

  const validateFiles = useCallback(
    (files: FileList | File[]): File[] => {
      const fileArray = Array.from(files)
      const validFiles: File[] = []
      for (const file of fileArray) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          setValidationError(
            `${file.name}: Only JPEG, PNG, and WebP files are accepted`,
          )
          return []
        }
        if (file.size > maxSize) {
          setValidationError(
            `${file.name}: File size exceeds ${Math.round(maxSize / (1024 * 1024))}MB limit`,
          )
          return []
        }
        validFiles.push(file)
      }
      if (validFiles.length > maxFiles) {
        setValidationError(`Maximum ${maxFiles} files allowed`)
        return []
      }
      setValidationError('')
      return validFiles
    },
    [maxFiles, maxSize],
  )

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const validFiles = validateFiles(files)
      if (validFiles.length > 0) {
        setSelectedFiles(validFiles)
        onFilesSelected(validFiles)
      }
    },
    [validateFiles, onFilesSelected],
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) setIsDragOver(true)
    },
    [disabled],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      if (!disabled && e.dataTransfer.files.length > 0)
        handleFiles(e.dataTransfer.files)
    },
    [disabled, handleFiles],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0)
        handleFiles(e.target.files)
    },
    [handleFiles],
  )

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click()
  }, [disabled])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault()
        inputRef.current?.click()
      }
    },
    [disabled],
  )

  const removeFile = useCallback(
    (index: number) => {
      const newFiles = selectedFiles.filter((_, i) => i !== index)
      setSelectedFiles(newFiles)
      onFilesSelected(newFiles)
    },
    [selectedFiles, onFilesSelected],
  )

  const displayError = error || validationError

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-label="Upload files"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem',
          borderRadius: '0.5rem',
          border: `2px dashed ${isDragOver ? '#2563eb' : displayError ? '#dc2626' : '#d1d5db'}`,
          backgroundColor: isDragOver ? '#eff6ff' : 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'border-color 0.15s, background-color 0.15s',
          minHeight: '120px',
        }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: '#9ca3af', marginBottom: '0.75rem' }}
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p
          style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            textAlign: 'center',
          }}
        >
          Drag & drop files here, or click to browse
        </p>
        <p
          style={{
            fontSize: '0.75rem',
            color: '#9ca3af',
            marginTop: '0.25rem',
          }}
        >
          JPEG, PNG, WebP • Max {Math.round(maxSize / (1024 * 1024))}MB • Up to{' '}
          {maxFiles} files
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={maxFiles > 1}
        onChange={handleInputChange}
        disabled={disabled}
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      {displayError && (
        <p
          role="alert"
          style={{
            marginTop: '0.5rem',
            fontSize: '0.75rem',
            color: '#dc2626',
            fontWeight: 500,
          }}
        >
          {displayError}
        </p>
      )}

      {selectedFiles.length > 0 && (
        <ul
          style={{
            marginTop: '0.75rem',
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          {selectedFiles.map((file, index) => (
            <li
              key={`${file.name}-${file.size}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid #e5e7eb',
                fontSize: '0.8125rem',
              }}
            >
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '70%',
                }}
              >
                {file.name}
              </span>
              <span
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                  {(file.size / 1024).toFixed(0)}KB
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(index)
                  }}
                  aria-label={`Remove ${file.name}`}
                  style={{
                    minWidth: '44px',
                    minHeight: '44px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    background: 'transparent',
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                  }}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
