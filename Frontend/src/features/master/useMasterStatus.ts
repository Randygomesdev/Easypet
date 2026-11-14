import { useEffect, useState } from 'react'
import { masterStatus, type MasterStatus } from './master.service'

export function useMasterStatus() {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ attempt: number; data?: MasterStatus; error?: string }>()
  useEffect(() => {
    const controller = new AbortController()
    masterStatus(controller.signal).then(data => {
      if (!controller.signal.aborted) setResult({ attempt, data })
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ attempt, error: 'Não foi possível consultar o monitoramento.' })
    })
    return () => controller.abort()
  }, [attempt])
  useEffect(() => {
    const refresh = () => { if (!document.hidden) setAttempt(value => value + 1) }
    const timer = window.setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  const current = result?.attempt === attempt ? result : undefined
  return { data: current?.data, error: current?.error, loading: !current, refresh: () => setAttempt(value => value + 1) }
}
