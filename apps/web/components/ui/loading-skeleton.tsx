/** biome-ignore-all lint/suspicious/noArrayIndexKey: intentionally done */
'use client'

interface LoadingSkeletonProps {
  rows?: number
  rowHeight?: number
  showHeader?: boolean
  className?: string
}

/**
 * Content placeholder skeleton during data loading.
 * Validates: Requirement 16.7
 */
export function LoadingSkeleton({
  rows = 3,
  rowHeight = 20,
  showHeader = true,
  className = '',
}: LoadingSkeletonProps) {
  return (
    <div
      className={className}
      role="status"
      aria-label="Loading"
      style={{ minHeight: '48px' }}
    >
      {showHeader && (
        <div
          style={{
            height: '1.5rem',
            width: '40%',
            backgroundColor: '#e5e7eb',
            borderRadius: '0.25rem',
            marginBottom: '1rem',
            animation: 'skeletonPulse 1.5s ease-in-out infinite',
          }}
        />
      )}
      {Array.from({ length: rows }, (_, i) => `row-${i}`).map((id, i) => (
        <div
          key={id}
          style={{
            height: `${rowHeight}px`,
            width: i === rows - 1 ? '60%' : '100%',
            backgroundColor: '#e5e7eb',
            borderRadius: '0.25rem',
            marginBottom: '0.75rem',
            animation: 'skeletonPulse 1.5s ease-in-out infinite',
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
      <style>{`@keyframes skeletonPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )
}

interface SkeletonTableProps {
  columns?: number
  rows?: number
  className?: string
}

/**
 * Table-shaped loading skeleton for DataTable loading states.
 */
export function SkeletonTable({
  columns = 4,
  rows = 5,
  className = '',
}: SkeletonTableProps) {
  return (
    <div
      className={className}
      role="status"
      aria-label="Loading table"
      style={{ minHeight: '48px' }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: '1rem',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={`h-${i}`}
            style={{
              height: '1rem',
              backgroundColor: '#d1d5db',
              borderRadius: '0.25rem',
              animation: 'skeletonPulse 1.5s ease-in-out infinite',
            }}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`r-${rowIdx}`}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: '1rem',
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #f3f4f6',
          }}
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div
              key={`c-${rowIdx}-${colIdx}`}
              style={{
                height: '0.875rem',
                width: colIdx === 0 ? '80%' : '60%',
                backgroundColor: '#e5e7eb',
                borderRadius: '0.25rem',
                animation: 'skeletonPulse 1.5s ease-in-out infinite',
                animationDelay: `${(rowIdx * columns + colIdx) * 0.05}s`,
              }}
            />
          ))}
        </div>
      ))}
      <style>{`@keyframes skeletonPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )
}
