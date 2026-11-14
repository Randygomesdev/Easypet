import { api } from '../../lib/api'
import type { BookingHistoryEntry } from '../../services/booking.service'
import type { CashierCharge, CashierMovement } from '../../services/cashier.service'

export const investigationPath = '/admin/bookings/investigations'
export const reservationIdPattern = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i

export type InvestigationPage<T> = { content: T[]; totalPages: number }
export type BookingSummary = { bookingId: string; partnerId: string; status: string; type: string; bookingDate: string; scheduledEnd: string | null; bookingVersion: number; updatedAt: string }
export type BookingHistory = Omit<BookingHistoryEntry, 'status' | 'bookingDate'> & {
  actorId: string | null; status: string | null; bookingDate: string | null
}
export type BookingExtraAudit = {
  extra: { id: string; description: string; amountCents: number; quantity: number; unitPriceCents: number
    version: number; status: string; createdAt: string; decisionAt: string | null; channel: string | null }
  proposedBy: string; tutorIdentityType: 'AUTH_USER' | 'RECEPTION_CUSTOMER'; decisionBy: string | null
  reason: string | null; evidence: string | null
}
export type BookingInvestigation = {
  booking: BookingSummary; reason: string | null; interruptedAt: string | null
  history: InvestigationPage<BookingHistory>; extras: InvestigationPage<BookingExtraAudit>
}
export type CashierInvestigation = {
  charge: Pick<CashierCharge, 'id' | 'totalCents' | 'receivedCents' | 'balanceCents' | 'createdBy' | 'createdAt'> | null
  movements: InvestigationPage<Omit<CashierMovement, 'chargeId' | 'chargeDescription'>>
  approvedExtras: { id: string; approvalId: string; version: number; description: string; amountCents: number; channel: string; acceptedBy: string; acceptedAt: string; appliedBy: string; appliedAt: string }[]
}

export function listInvestigations(page: number, status: string, signal: AbortSignal) {
  return api.get<InvestigationPage<BookingSummary>>(investigationPath, { params: { page, size: 20, status: status || undefined }, signal })
    .then(response => response.data)
}

export function getInvestigation(bookingId: string, historyPage: number, extrasPage: number, signal: AbortSignal, partnerId?: string) {
  return api.get<BookingInvestigation>(`${investigationPath}/${encodeURIComponent(bookingId)}`, { params: { historyPage, extrasPage, partnerId }, signal })
    .then(({ data }) => {
      if (data.booking.bookingId.toLowerCase() !== bookingId.toLowerCase() || (partnerId && data.booking.partnerId !== partnerId)) {
        throw new Error('Resposta divergente da reserva consultada')
      }
      return data
    })
}

export function getCashierInvestigation(bookingId: string, partnerId: string, page: number, signal: AbortSignal) {
  return api.get<CashierInvestigation>(`/admin/cashier/bookings/${encodeURIComponent(bookingId)}`,
    { params: { partnerId, page, size: 20 }, signal }).then(response => response.data)
}

export function bookingState(status: string | null) {
  if (!status) return '—'
  return ({ PENDING: 'Pendente', CONFIRMED: 'Confirmado', IN_PROGRESS: 'Em atendimento', COMPLETED: 'Concluído',
    CANCELLED: 'Cancelado', NO_SHOW: 'Falta', INTERRUPTED: 'Interrompido' } as Record<string, string>)[status] ?? status
}
