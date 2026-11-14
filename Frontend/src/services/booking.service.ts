import { api } from '../lib/api'
import { petService, type PetResponse } from './pet.service'

export type BookingStatus  = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW' | 'INTERRUPTED'
export type BookingType    = 'CONSULTATION' | 'VACCINATION' | 'GROOMING' | 'BOARDING' | 'OTHER'

export interface BookingResponse {
  id:                string
  petId:             string
  partnerId:         string
  userId:            string | null
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
  scheduledEnd?:     string | null
  cancellationReason?: string | null
  noShowReason?:     string | null
  interruptionReason?: string | null
  interruptedAt?: string | null
  readyAt?:          string | null
  receptionCustomerId?: string | null
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
  PENDING:     'Pendente',
  CONFIRMED:   'Confirmado',
  IN_PROGRESS: 'Em Andamento',
  CANCELLED:   'Cancelado',
  COMPLETED:   'Finalizado',
  NO_SHOW:     'Falta',
  INTERRUPTED: 'Interrompido',
}

export interface BookingExtraProposal {
  description: string
  quantity: number
  unitPriceCents: number
}

export type BookingExtraDecision = 'APPROVE' | 'REJECT'

export interface BookingExtra extends BookingExtraProposal {
  id: string
  bookingId: string
  partnerId: string
  version: number
  amountCents: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
  createdAt: string
  decisionAt: string | null
  channel: 'DIGITAL' | 'IN_PERSON' | null
}

export interface RescheduleRequest {
  bookingDate?: string
  staffId?: string
  checkIn?: string
  checkOut?: string
}

export interface BookingCheckIn {
  petIdentified: boolean
  instructionsConfirmed: boolean
  allergies?: string | null
  behavior?: string | null
  authorizedExtras?: string | null
  observations?: string | null
}

export interface AgendaBlockRequest {
  start: string
  end: string
  reason: string
  staffId?: string
}

export interface AgendaBlock extends AgendaBlockRequest {
  id: string
  partnerId: string
}

export interface BookingHistoryEntry {
  action: string
  recordedAt: string
  previousStatus?: BookingStatus | null
  status: BookingStatus
  previousBookingDate?: string | null
  bookingDate: string
  previousScheduledEnd?: string | null
  scheduledEnd?: string | null
  previousStaffId?: string | null
  staffId?: string | null
  reason?: string | null
}

export interface BookingAccess {
  partnerId: string
  canManage: boolean
  canAttend: boolean
  staffId: string | null
  teamMember: boolean
  canRegisterInPersonExtraDecision?: boolean
}

export interface BookingPolicy {
  tutorNoticeMinutes: number
  defaultAppointmentDurationMinutes: number
}

export interface TutorBookingActions {
  canCancel: boolean
  canReschedule: boolean
  tutorNoticeMinutes: number
}

export type BookingPet = Pick<PetResponse, 'id' | 'name' | 'species'> &
  Partial<Pick<PetResponse, 'breed' | 'gender' | 'weight' | 'birthDate' | 'microchipNumber'>>

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

export interface StaffSlot {
  id:        string
  name:      string
  photoUrl?: string
}

export interface AvailabilitySlot {
  time:                 string   // "14:00"
  available:            boolean
  staff?:               StaffSlot[]
  reason?:              string
  allowFittingRequest?: boolean
}

export interface BookingRequest {
  petId:              string
  partnerId:          string
  serviceId?:         string
  bookingDate?:       string   // "YYYY-MM-DDTHH:mm:ss"
  checkIn?:           string
  checkOut?:          string
  type:               BookingType
  notes?:             string
  price?:             number
  paymentMethod?:     'CARD' | 'PIX' | 'PACKAGE_CREDIT'
  staffId?:           string
  requestFitting?:    boolean
  customerPackageId?: string
  receptionCustomerId?: string
}

export const bookingService = {
  create: (data: BookingRequest, idempotencyKey?: string): Promise<BookingResponse> =>
    api.post('/bookings', data, idempotencyKey
      ? { headers: { 'Idempotency-Key': idempotencyKey } }
      : undefined).then(r => r.data),

  myBookings: (page = 0, size = 10, status?: BookingStatus): Promise<PageResponse<BookingResponse>> =>
    api.get('/bookings/my-bookings', { params: { page, size, status, sort: 'bookingDate,desc' } }).then(r => r.data),

  agendaAccess: (): Promise<BookingAccess> =>
    api.get('/bookings/agenda-access').then(r => r.data),

  policy: (): Promise<BookingPolicy> =>
    api.get('/bookings/policy').then(r => r.data),

  tutorActions: (id: string): Promise<TutorBookingActions> =>
    api.get(`/bookings/${id}/tutor-actions`).then(r => r.data),

  partnerSummary: (partnerId: string): Promise<{ id: string; name: string; services: { id: string; name: string }[] }> =>
    api.get(`/bookings/partner/${partnerId}/summary`).then(r => r.data),

  getPet: (booking: BookingResponse, summaryOnly = false): Promise<BookingPet> => {
    if (summaryOnly) return api.get<BookingPet>(`/bookings/${booking.id}/pet-summary`).then(r => r.data)
    return booking.receptionCustomerId
      ? api.get<BookingPet>(`/pets/reception/customers/${booking.receptionCustomerId}/${booking.petId}`).then(r => r.data)
      : petService.getById(booking.petId)
  },

  getAvailability: (partnerId: string, date: string, serviceId?: string, excludeBookingId?: string): Promise<AvailabilitySlot[]> =>
    api.get('/bookings/availability', {
      params: { partnerId, date, serviceId, excludeBookingId },
    }).then(r => r.data),

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

  updateStatus: (id: string, status: BookingStatus, reason?: string): Promise<BookingResponse> =>
    api.patch(`/bookings/${id}/status`, reason ? { reason } : undefined, { params: { status } }).then(r => r.data),

  updateAdminStatus: (partnerId: string, id: string, status: BookingStatus, reason?: string): Promise<BookingResponse> =>
    api.patch(`/bookings/partner/${partnerId}/${id}/status`, reason ? { reason } : undefined, { params: { status } }).then(r => r.data),

  adminFittingDecision: (partnerId: string, id: string, decision: 'APPROVE' | 'REJECT'): Promise<unknown> =>
    api.post(`/bookings/partner/${partnerId}/${id}/fitting-decision`, { decision }).then(r => r.data),

  reschedule: (id: string, input: RescheduleRequest): Promise<BookingResponse> =>
    api.post(`/bookings/${id}/reschedule`, input).then(r => r.data),

  history: (id: string): Promise<BookingHistoryEntry[]> =>
    api.get(`/bookings/${id}/history`).then(r => r.data),

  interrupt: (id: string, reason: string): Promise<BookingResponse> =>
    api.post(`/bookings/${id}/interrupt`, { reason }).then(r => r.data),

  extras: (id: string, page: number): Promise<PageResponse<BookingExtra>> =>
    api.get(`/bookings/${id}/extras`, { params: { page, size: 20 } }).then(r => r.data),

  proposeExtra: (id: string, proposal: BookingExtraProposal, key: string): Promise<BookingExtra> =>
    api.post(`/bookings/${id}/extras`, proposal, { headers: { 'Idempotency-Key': key } }).then(r => r.data),

  decideExtraDigital: (extra: BookingExtra, decision: BookingExtraDecision): Promise<BookingExtra> =>
    api.post(`/bookings/${extra.bookingId}/extras/${extra.id}/decisions/digital`, { version: extra.version, decision }).then(r => r.data),

  decideExtraInPerson: (extra: BookingExtra, decision: BookingExtraDecision, reason: string, evidence: string): Promise<BookingExtra> =>
    api.post(`/bookings/${extra.bookingId}/extras/${extra.id}/decisions/in-person`,
      { version: extra.version, decision, reason, evidence }).then(r => r.data),

  getCheckIn: (id: string): Promise<BookingCheckIn | null> =>
    api.get(`/bookings/${id}/check-in`).then(r => r.status === 204 ? null : r.data),

  saveCheckIn: (id: string, input: BookingCheckIn): Promise<BookingCheckIn> =>
    api.put(`/bookings/${id}/check-in`, input).then(r => r.data),

  markReady: (id: string): Promise<BookingResponse> =>
    api.post(`/bookings/${id}/ready`).then(r => r.data),

  getBlocks: (partnerId: string): Promise<AgendaBlock[]> =>
    api.get(`/bookings/partner/${partnerId}/blocks`).then(r => r.data),

  createBlock: (partnerId: string, input: AgendaBlockRequest): Promise<AgendaBlock> =>
    api.post(`/bookings/partner/${partnerId}/blocks`, input).then(r => r.data),

  removeBlock: (partnerId: string, id: string): Promise<void> =>
    api.delete(`/bookings/partner/${partnerId}/blocks/${id}`).then(() => undefined),

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
