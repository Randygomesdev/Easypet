import { useCallback, useEffect, useState } from 'react'

type QueryResult<T> = { status: 'ready'; data: T } | { status: 'error'; cause: unknown }

export function usePanelQuery<T>(load: (signal: AbortSignal) => Promise<T>, enabled = true) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ load: typeof load; attempt: number; value: QueryResult<T> }>()

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    load(controller.signal).then(
      data => { if (!controller.signal.aborted) setResult({ load, attempt, value: { status: 'ready', data } }) },
      cause => { if (!controller.signal.aborted) setResult({ load, attempt, value: { status: 'error', cause } }) },
    )
    return () => controller.abort()
  }, [load, attempt, enabled])

  const current = enabled && result?.load === load && result.attempt === attempt ? result.value : undefined
  const reload = useCallback(() => setAttempt(value => value + 1), [])
  return { result: current, reload }
}
