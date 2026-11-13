import { useEffect, useState } from 'react'
import { customerApiError } from '../../services/customer.service'

type Result<T> = { data: T; error?: undefined } | { data?: undefined; error: string }

export function useCustomerQuery<T>(load: (signal: AbortSignal) => Promise<T>, fallback: string) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ load: typeof load; attempt: number; value: Result<T> }>()

  useEffect(() => {
    const request = new AbortController()
    load(request.signal).then(
      data => {
        if (!request.signal.aborted) setResult({ load, attempt, value: { data } })
      },
      (error: unknown) => {
        if (!request.signal.aborted) {
          setResult({ load, attempt, value: { error: customerApiError(error, fallback).message } })
        }
      },
    )
    return () => request.abort()
  }, [load, fallback, attempt])

  const current = result?.load === load && result.attempt === attempt ? result.value : undefined
  return {
    data: current?.data,
    error: current?.error,
    loading: current === undefined,
    reload: () => setAttempt(previous => previous + 1),
  }
}
