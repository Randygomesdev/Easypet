import { useEffect, useState } from 'react'

type QueryState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'success'; data: T }

export function useNotificationQuery<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<{
    load: typeof load
    revision: number
    state: QueryState<T>
  }>()

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal).then(
      data => {
        if (!controller.signal.aborted) setResult({ load, revision, state: { status: 'success', data } })
      },
      error => {
        if (!controller.signal.aborted) setResult({ load, revision, state: { status: 'error', error } })
      },
    )
    return () => controller.abort()
  }, [load, revision])

  const state: QueryState<T> = result?.load === load && result.revision === revision
    ? result.state
    : { status: 'loading' }

  return { state, reload: () => setRevision(current => current + 1) }
}
