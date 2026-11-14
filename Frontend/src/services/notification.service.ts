import { api } from '../lib/api'

export type NotificationType = 'CONFIRMATION' | 'RESCHEDULED' | 'CANCELLED' | 'REMINDER' | 'READY'
export type NotificationStatus =
  | 'PENDING' | 'SENDING' | 'RETRY_SCHEDULED' | 'SENT' | 'FAILED' | 'SUPERSEDED' | 'UNKNOWN' | 'SUPPRESSED'

export interface NotificationDelivery {
  id: string
  bookingId: string
  type: NotificationType
  status: NotificationStatus
  attemptCount: number
  dueAt: string
  updatedAt: string
  lastError: string | null
  canRetry: boolean
}

export interface NotificationAttempt {
  number: number
  startedAt: string
  finishedAt: string | null
  outcome: 'STARTED' | 'SENT' | 'TRANSIENT_FAILURE' | 'PERMANENT_FAILURE' | 'UNKNOWN' | 'SUPERSEDED' | 'SUPPRESSED'
  error: string | null
}

export interface NotificationPage {
  content: NotificationDelivery[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

const path = '/admin/notifications'

export interface NotificationPreference { bookingEmail: boolean }

export const notificationService = {
  preferences: (signal?: AbortSignal) =>
    api.get<NotificationPreference>('/notifications/preferences', { signal }).then(response => response.data),

  savePreferences: (input: NotificationPreference) =>
    api.put<NotificationPreference>('/notifications/preferences', input).then(response => response.data),

  list: (bookingId: string, page: number, signal: AbortSignal): Promise<NotificationPage> =>
    api.get(path, { params: { bookingId, page }, signal }).then(response => response.data),

  isReceptionBooking: (bookingId: string, signal: AbortSignal): Promise<boolean> =>
    api.get<{ receptionCustomerId?: string | null }>(`/bookings/${bookingId}`, { signal })
      .then(response => Boolean(response.data.receptionCustomerId)),

  attempts: (id: string, signal: AbortSignal): Promise<NotificationAttempt[]> =>
    api.get(`${path}/${id}/attempts`, { signal }).then(response => response.data),

  retry: (id: string, key: string): Promise<void> =>
    api.post(`${path}/${id}/retry`, undefined, { headers: { 'Idempotency-Key': key } }).then(() => undefined),
}
