import { useEffect, useState } from 'react'

type Result<T> = { data: T } | { error: unknown }

export function useCashierQuery<T>(load: () => Promise<T>, revision = 0, enabled = true) {
  const [result, setResult] = useState<{ load: typeof load; revision: number; result: Result<T> }>()
  const [retryCount, setRetryCount] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let active = true
    load().then(
      data => { if (active) setResult({ load, revision, result: { data } }) },
      error => { if (active) setResult({ load, revision, result: { error } }) },
    )
    return () => { active = false }
  }, [load, revision, retryCount, enabled])

  return {
    result: result?.load === load && result.revision === revision ? result.result : undefined,
    retry: () => {
      setResult(undefined)
      setRetryCount(count => count + 1)
    },
  }
}
