'use client'

import { useCallback, useState } from 'react'

interface Feedback {
  message: string
  type: 'success' | 'error'
}

interface UsePageFeedbackReturn {
  feedback: Feedback | null
  setSuccess: (message: string) => void
  setError: (message: string) => void
  clearFeedback: () => void
}

export function usePageFeedback(): UsePageFeedbackReturn {
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const setSuccess = useCallback((message: string) => {
    setFeedback({ message, type: 'success' })
  }, [])

  const setError = useCallback((message: string) => {
    setFeedback({ message, type: 'error' })
  }, [])

  const clearFeedback = useCallback(() => setFeedback(null), [])

  return { feedback, setSuccess, setError, clearFeedback }
}
