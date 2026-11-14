import { api } from '../lib/api'

export type SupportStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'
export type InboxKind = 'ALERT' | 'TICKET'
export type InboxAction = 'read' | 'acknowledge' | 'resolve'

export interface SupportTicket {
  id: string
  bookingId: string | null
  subject: string
  message: string
  status: SupportStatus
  createdAt: string
  updatedAt: string
  resolutionMessage: string | null
  resolvedAt: string | null
  resolvedBy: string | null
}

export interface InboxItem extends Omit<SupportTicket, 'subject' | 'message'> {
  kind: InboxKind
  severity: 'INFO' | 'WARNING' | 'ERROR' | null
  source: string | null
  code: string | null
  correlationId: string | null
  subject: string | null
  message: string | null
  requesterId: string | null
  readAt: string | null
  readBy: string | null
  acknowledgedAt: string | null
  acknowledgedBy: string | null
  resolutionOrigin: 'ADMIN' | 'SYSTEM' | null
  service: string | null
  incidentId: string | null
  signalState: 'OPEN' | 'RECOVERED' | null
}

export interface SupportPage<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type TicketInput = Pick<SupportTicket, 'subject' | 'message' | 'bookingId'>

const tickets = '/support/tickets'
const inbox = '/admin/operations/inbox'

export const supportService = {
  tickets: (page: number, signal: AbortSignal) =>
    api.get<SupportPage<SupportTicket>>(tickets, { signal, params: { page, size: 20 } }).then(response => response.data),
  create: (input: TicketInput, key: string) =>
    api.post<SupportTicket>(tickets, input, { headers: { 'Idempotency-Key': key } }).then(response => response.data),
  inbox: (params: { page: number; size: number; status?: SupportStatus; kind?: InboxKind }, signal: AbortSignal) =>
    api.get<SupportPage<InboxItem>>(inbox, { params, signal }).then(response => response.data),
  unread: (signal: AbortSignal) =>
    api.get<{ count: number }>(`${inbox}/unread`, { signal }).then(response => response.data),
  update: (id: string, action: InboxAction, resolutionMessage?: string) => api.post<void>(`${inbox}/${encodeURIComponent(id)}/${action}`,
    resolutionMessage === undefined ? undefined : { resolutionMessage }),
}
