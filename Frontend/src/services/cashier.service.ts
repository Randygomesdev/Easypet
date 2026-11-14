import { api } from '../lib/api'
import type { PageResponse } from './booking.service'

export type CashierMethod = 'CASH' | 'PIX' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'OTHER'

export interface CashierContext {
  actorId: string
  partnerId: string
  businessDate: string
  closedToday: boolean
  canReceive: boolean
  canClose: boolean
}

export interface CashierCharge {
  id: string
  bookingId: string
  description: string
  baseCents: number
  extrasCents: number
  discountCents: number
  totalCents: number
  receivedCents: number
  balanceCents: number
  createdAt: string
  createdBy: string
}

export interface CashierMovement {
  id: string
  chargeId: string
  chargeDescription: string
  date: string
  type: 'RECEIPT' | 'REVERSAL'
  method: CashierMethod
  amountCents: number
  reason: string | null
  reversesReceiptId: string | null
  createdAt: string
  createdBy: string
}

export interface CashierChargeDetails {
  charge: CashierCharge
  movements: CashierMovement[]
  approvedExtras: CashierApprovedExtra[]
}

export interface CashierApprovedExtra {
  id: string
  approvalId: string
  version: number
  description: string
  quantity: number
  unitPriceCents: number
  amountCents: number
  acceptedAt: string
  acceptedBy: string
  tutorIdentityType: 'AUTH_USER' | 'RECEPTION_CUSTOMER'
  channel: 'DIGITAL' | 'IN_PERSON'
  appliedAt: string
  appliedBy: string
}

export interface CashierBookingExtra {
  id: string
  version: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
  description: string
  amountCents: number
}

export interface CashierDay {
  date: string
  businessDate: string
  closingId: string | null
  closedAt: string | null
  closedBy: string | null
  totals: {
    receivedCents: number
    adjustmentCents: number
    netCents: number
    byMethod: Record<CashierMethod, number>
  }
  movements: PageResponse<CashierMovement>
}

export type NewCashierCharge = Pick<CashierCharge, 'bookingId' | 'description' | 'baseCents' | 'extrasCents' | 'discountCents'>

export type CashierCommand =
  | { type: 'charge'; data: NewCashierCharge }
  | { type: 'receipt'; chargeId: string; method: CashierMethod; amountCents: number }
  | { type: 'reverse'; receiptId: string; chargeId: string; reason: string }
  | { type: 'applyExtra'; chargeId: string; approvalId: string; version: number }
  | { type: 'close'; date: string }

const base = '/payments/cashier'
const timeout = 15000

function command(path: string, key: string, body?: unknown) {
  return api.post<{ id: string }>(base + path, body, {
    headers: { 'Idempotency-Key': key },
    timeout,
  }).then(r => r.data)
}

export const cashierService = {
  context: (): Promise<CashierContext> => api.get(base + '/context', { timeout }).then(r => r.data),
  charges: (openOnly: boolean, page: number): Promise<PageResponse<CashierCharge>> =>
    api.get(base + '/charges', { timeout, params: { openOnly, page } }).then(r => r.data),
  charge: (id: string): Promise<CashierChargeDetails> =>
    api.get(base + '/charges/' + id, { timeout }).then(r => r.data),
  bookingExtras: (bookingId: string, page: number): Promise<PageResponse<CashierBookingExtra>> =>
    api.get(`/bookings/${bookingId}/extras`, { timeout, params: { page, size: 20 } }).then(r => r.data),
  day: (date: string | undefined, page: number): Promise<CashierDay> =>
    api.get(base + '/days', { timeout, params: { date, page } }).then(r => r.data),
  execute(intent: CashierCommand, key: string) {
    switch (intent.type) {
      case 'charge':
        return command('/charges', key, intent.data)
      case 'receipt':
        return command(`/charges/${intent.chargeId}/receipts`, key, {
          method: intent.method, amountCents: intent.amountCents,
        })
      case 'reverse':
        return command(`/receipts/${intent.receiptId}/reverse`, key, { reason: intent.reason })
      case 'applyExtra':
        return command(`/charges/${intent.chargeId}/approved-extras`, key, {
          approvalId: intent.approvalId, version: intent.version,
        })
      case 'close':
        return command(`/days/${intent.date}/close`, key)
    }
  },
}
