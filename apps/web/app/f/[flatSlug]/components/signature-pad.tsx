'use client'

import { PenLine, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface SignaturePadProps {
  onChange?: (signatureBase64: string | null) => void
  className?: string
  label?: string
}

/**
 * Signature pad component — touch-based signature capture using HTML5 Canvas.
 *
 * Features:
 * - Touch and mouse-based drawing on canvas
 * - Exports signature as base64 PNG string
 * - Validates minimum 1 stroke before exporting
 * - Clear button to reset the canvas
 * - Calls onChange callback with base64 data when user finishes drawing
 * - Mobile-optimized with touch event handling
 */
export function SignaturePad({
  onChange,
  className,
  label = 'স্বাক্ষর',
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [strokeCount, setStrokeCount] = useState(0)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  /**
   * Initialize canvas with white background and proper resolution.
   */
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas resolution based on device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    ctx.scale(dpr, dpr)

    // Fill with white background
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Set drawing styles
    ctx.strokeStyle = 'rgb(26, 26, 26)'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Observe layout sizing dynamically (e.g. after flex elements align)
    const observer = new ResizeObserver((entries) => {
      if (entries.length > 0) {
        initCanvas()
      }
    })
    observer.observe(canvas)

    // Fallback resize listener
    window.addEventListener('resize', initCanvas)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', initCanvas)
    }
  }, [initCanvas])

  /**
   * Get the position of a touch or mouse event relative to the canvas.
   */
  function getEventPosition(
    e:
      | React.TouchEvent<HTMLCanvasElement>
      | React.MouseEvent<HTMLCanvasElement>,
  ): { x: number; y: number } {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()

    if ('touches' in e && e.touches.length > 0) {
      const touch = e.touches[0]
      if (touch) {
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        }
      }
    }

    if ('clientX' in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }

    return { x: 0, y: 0 }
  }

  /**
   * Start a new stroke.
   */
  function handleStart(
    e:
      | React.TouchEvent<HTMLCanvasElement>
      | React.MouseEvent<HTMLCanvasElement>,
  ) {
    e.preventDefault()
    const pos = getEventPosition(e)
    lastPointRef.current = pos
    setIsDrawing(true)

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  /**
   * Continue drawing the current stroke.
   */
  function handleMove(
    e:
      | React.TouchEvent<HTMLCanvasElement>
      | React.MouseEvent<HTMLCanvasElement>,
  ) {
    if (!isDrawing) return
    e.preventDefault()

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const pos = getEventPosition(e)
    const lastPoint = lastPointRef.current

    if (lastPoint) {
      ctx.beginPath()
      ctx.moveTo(lastPoint.x, lastPoint.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }

    lastPointRef.current = pos
  }

  /**
   * End the current stroke and export signature.
   */
  function handleEnd(
    e:
      | React.TouchEvent<HTMLCanvasElement>
      | React.MouseEvent<HTMLCanvasElement>,
  ) {
    if (!isDrawing) return
    e.preventDefault()

    setIsDrawing(false)
    lastPointRef.current = null

    const newStrokeCount = strokeCount + 1
    setStrokeCount(newStrokeCount)

    // Export signature as base64 PNG
    exportSignature()
  }

  /**
   * Export the canvas content as a base64 PNG string.
   * Only exports if at least 1 stroke has been drawn.
   */
  function exportSignature() {
    const canvas = canvasRef.current
    if (!canvas) return

    // strokeCount + 1 because state hasn't updated yet in the same call
    const dataUrl = canvas.toDataURL('image/png')
    // Remove the data:image/png;base64, prefix
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
    onChange?.(base64)
  }

  /**
   * Clear the canvas and reset stroke count.
   */
  function handleClear() {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    // Clear and refill with white
    ctx.clearRect(0, 0, rect.width * dpr, rect.height * dpr)
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Reset drawing styles
    ctx.strokeStyle = 'rgb(26, 26, 26)'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    setStrokeCount(0)
    onChange?.(null)
  }

  const hasSignature = strokeCount > 0

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-base font-medium text-ink">
          <PenLine className="h-4 w-4" aria-hidden />
          {label}
        </span>
        {hasSignature && (
          <button
            type="button"
            onClick={handleClear}
            className="flex min-h-[48px] min-w-[48px] items-center gap-1.5 rounded-md px-3 py-2 text-base text-steel transition-colors hover:text-ink active:text-ink"
            aria-label="স্বাক্ষর মুছুন"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            মুছুন
          </button>
        )}
      </div>

      <div
        className={cn(
          'relative overflow-hidden rounded-lg border-2 border-dashed',
          hasSignature ? 'border-ink/30' : 'border-steel/40',
        )}
      >
        <canvas
          ref={canvasRef}
          className="h-[160px] w-full cursor-crosshair touch-none"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          aria-label="স্বাক্ষর ক্যানভাস — আঙুল বা কলম দিয়ে স্বাক্ষর করুন"
          role="img"
        />

        {!hasSignature && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-base text-steel/60">এখানে আঙুল দিয়ে স্বাক্ষর করুন</p>
          </div>
        )}
      </div>

      {!hasSignature && (
        <p className="text-base text-steel" aria-live="polite">
          ন্যূনতম ১টি স্ট্রোক প্রয়োজন
        </p>
      )}
    </div>
  )
}
