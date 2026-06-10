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

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    ctx.scale(dpr, dpr)

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, rect.width, rect.height)

    ctx.strokeStyle = 'rgb(26, 26, 26)'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const observer = new ResizeObserver((entries) => {
      if (entries.length > 0) {
        initCanvas()
      }
    })
    observer.observe(canvas)

    window.addEventListener('resize', initCanvas)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', initCanvas)
    }
  }, [initCanvas])

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

    exportSignature()
  }

  function exportSignature() {
    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL('image/png')
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
    onChange?.(base64)
  }

  function handleClear() {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    ctx.clearRect(0, 0, rect.width * dpr, rect.height * dpr)
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, rect.width, rect.height)

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
