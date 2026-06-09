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
  capture?: 'environment' | 'user'
}

/**
 * File upload with drag-and-drop, 5MB limit, JPEG/PNG/WebP.
 */
export function FileUpload({
  onFilesSelected,
  maxFiles = 5,
  disabled = false,
  error,
  className = '',
  accept = ACCEPTED_EXTENSIONS,
  maxSize = MAX_FILE_SIZE,
  capture,
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
      <button
        type="button"
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={disabled}
        aria-label="Upload files"
        className={[
          'flex flex-col items-center justify-center',
          'w-full min-h-30 px-4 py-8',
          'rounded-md bg-surface',
          'border-2 border-dashed',
          isDragOver
            ? 'border-brand-blue bg-brand-blue-200/20'
            : displayError
              ? 'border-error-text'
              : 'border-hairline',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          'transition-[border-color,background-color] duration-150',
        ].join(' ')}
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
          className="text-muted mb-3"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p className="text-sm text-steel text-center">
          Drag &amp; drop files here, or{' '}
          <span className="text-brand-blue-deep font-medium">
            click to browse
          </span>
        </p>
        <p className="text-xs text-stone mt-1">
          JPEG, PNG, WebP • Max {Math.round(maxSize / (1024 * 1024))}MB • Up to{' '}
          {maxFiles} files
        </p>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={maxFiles > 1}
        onChange={handleInputChange}
        disabled={disabled}
        className="hidden"
        tabIndex={-1}
        capture={capture}
      />

      {displayError && (
        <p role="alert" className="mt-2 text-xs text-error-text font-medium">
          {displayError}
        </p>
      )}

      {selectedFiles.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2 list-none">
          {selectedFiles.map((file, index) => (
            <li
              key={`${file.name}-${file.size}`}
              className="flex items-center justify-between px-3 py-2 rounded-md border border-hairline text-[0.8125rem]"
            >
              <span className="overflow-hidden text-ellipsis whitespace-nowrap max-w-[70%]">
                {file.name}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-stone text-xs">
                  {(file.size / 1024).toFixed(0)}KB
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(index)
                  }}
                  aria-label={`Remove ${file.name}`}
                  className="min-w-[44px] min-h-11 inline-flex items-center justify-center border-none bg-transparent text-error-text cursor-pointer text-xl font-bold"
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
