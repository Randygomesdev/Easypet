import { api } from '../../lib/api'

export type ServiceStatus = {
  id: string
  status: 'HEALTHY' | 'UNHEALTHY' | 'STOPPED' | 'MISSING' | 'UNKNOWN'
  startedAt: string | null
  restarts: number | null
  oomKilled: boolean
  memoryBytes: number | null
  limitBytes: number | null
}
export type MasterStatus = {
  state: 'AVAILABLE' | 'STALE' | 'UNAVAILABLE'
  collectedAt: string | null
  sampleAgeSeconds: number | null
  hostMemory: { totalBytes: number; availableBytes: number } | null
  services: ServiceStatus[]
}

export const masterStatus = (signal: AbortSignal) =>
  api.get<MasterStatus>('/admin/platform/status', { signal, timeout: 8000 }).then(response => response.data)

export async function masterOverview(signal: AbortSignal) {
  const queries = [
    ['/admin/partners', true], ['/admin/partners', false],
    ['/admin/customers', true], ['/admin/customers', false],
  ] as const
  return Promise.allSettled(queries.map(async ([path, active]) => {
    const response = await api.get<{ totalElements: number }>(path, { params: { active, page: 0, size: 1 }, signal })
    if (!Number.isSafeInteger(response.data.totalElements) || response.data.totalElements < 0) throw new Error('Invalid count')
    return response.data.totalElements
  }))
}
