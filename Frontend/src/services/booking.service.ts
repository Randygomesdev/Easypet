import { api } from '../lib/api'

export type BookingStatus  = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
export type BookingType    = 'CONSULTATION' | 'VACCINATION' | 'GROOMING' | 'BOARDING' | 'OTHER'

export interface BookingResponse {
  id:                string
  petId:             string
  partnerId:         string
  userId:            string
  bookingDate?:      string   // ISO LocalDateTime
  type:              BookingType
  status:            BookingStatus
  notes?:            string
  price:             number
  checkIn?:          string
  checkOut?:         string
  serviceId?:        string
  customerPackageId?: string
  paymentMethod?:    string
  staffId?:          string
  isFittingRequest?: boolean
  createdAt:         string
  updatedAt?:        string
}

export interface PageResponse<T> {
  content:       T[]
  totalElements: number
  totalPages:    number
  number:        number
  size:          number
}

export interface BookingQueryParams {
  date?:      string   // YYYY-MM-DD
  staffId?:   string
  status?:    BookingStatus
  type?:      BookingType
  startDate?: string   // YYYY-MM-DD
  endDate?:   string   // YYYY-MM-DD
  page?:      number
  size?:      number
  sort?:      string
}

export const BOOKING_TYPE_LABEL: Record<BookingType, string> = {
  CONSULTATION: 'Consulta',
  VACCINATION:  'Vacinação',
  GROOMING:     'Banho e tosa',
  BOARDING:     'Hospedagem',
  OTHER:        'Outro',
}

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING:   'Pendente',
  CONFIRMED: 'Em Andamento',
  CANCELLED: 'Cancelado',
  COMPLETED: 'Finalizado',
}

// ── Stats types ────────────────────────────────────────────────────────────

export interface RevenueStatsResponse {
  revenue:    number
  month:      number
  year:       number
}

export interface DailyStatsEntry {
  day:   string   // "YYYY-MM-DD"
  total: number
}

export interface ClientStatsResponse {
  newClients: number
  month:      number
  year:       number
}

// ── Service ────────────────────────────────────────────────────────────────

export const bookingService = {
  getByPartner: (partnerId: string, params: BookingQueryParams = {}): Promise<PageResponse<BookingResponse>> => {
    const q = new URLSearchParams()
    if (params.date)      q.set('date',      params.date)
    if (params.staffId)   q.set('staffId',   params.staffId)
    if (params.status)    q.set('status',    params.status)
    if (params.type)      q.set('type',      params.type)
    if (params.startDate) q.set('startDate', params.startDate)
    if (params.endDate)   q.set('endDate',   params.endDate)
    q.set('page', String(params.page ?? 0))
    q.set('size', String(params.size ?? 10))
    q.set('sort', params.sort ?? 'bookingDate,desc')
    return api.get(`/bookings/partner/${partnerId}?${q}`).then(r => r.data)
  },

  updateStatus: (id: string, status: BookingStatus): Promise<BookingResponse> =>
    api.patch(`/bookings/${id}/status?status=${status}`).then(r => r.data),

  processFittingDecision: (bookingId: string, decision: 'APPROVE' | 'REJECT'): Promise<unknown> =>
    api.post(`/bookings/${bookingId}/fitting-decision`, { decision }).then(r => r.data),

  // ── Analytics ─────────────────────────────────────────────────────────────

  getRevenueStats: (partnerId: string, month: string): Promise<RevenueStatsResponse> =>
    api.get(`/bookings/partner/${partnerId}/stats/revenue?month=${month}`).then(r => r.data),

  getDailyStats: (partnerId: string, days = 7): Promise<DailyStatsEntry[]> =>
    api.get(`/bookings/partner/${partnerId}/stats/daily?days=${days}`).then(r => r.data),

  getClientStats: (partnerId: string, month: string): Promise<ClientStatsResponse> =>
    api.get(`/bookings/partner/${partnerId}/stats/clients?month=${month}`).then(r => r.data),
}
