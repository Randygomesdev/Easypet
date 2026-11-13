import { api } from '../lib/api'

// ── Checkout ──────────────────────────────────────────────────────────────────

export interface CheckoutItem {
  productId:    string
  label:        string
  description?: string
  price:        number
  quantity:     number
  metadata?:    Record<string, unknown>
}

export interface CheckoutRequest {
  items:       CheckoutItem[]
  successUrl?: string
  failureUrl?: string
  pendingUrl?: string
}

export interface CheckoutResponse {
  transactionId:    string
  preferenceId:     string
  initPoint:        string
  sandboxInitPoint: string
}

// ── Easypet booking metadata stored in cart item ──────────────────────────────

export interface EasypetCartMeta {
  partnerId:        string
  partnerName:      string
  bookingType:      'CONSULTATION' | 'VACCINATION' | 'GROOMING' | 'BOARDING' | 'OTHER'
  scheduledDate:    string   // YYYY-MM-DD (check-in date for daily)
  scheduledTime:    string   // HH:mm (check-in time for daily)
  checkIn?:         string   // ISO datetime — only for DAILY billing
  checkOut?:        string   // ISO datetime — only for DAILY billing
  durationMinutes?: number
  staffId?:         string
  staffName?:       string
  petId:            string
  petName:          string
}

// ── Easypet package metadata stored in cart item ──────────────────────────────

export interface EasypetPackageMeta {
  isPackage:    true
  partnerId:    string
  partnerName:  string
  sessions:     number   // quantidade de créditos/sessões do pacote
  validityDays: number
}

// ── Credit wallet ─────────────────────────────────────────────────────────────

export interface CreditBalanceResponse {
  balance: number
}

// ── Service ───────────────────────────────────────────────────────────────────

export const paymentService = {
  checkout: (data: CheckoutRequest): Promise<CheckoutResponse> =>
    api.post('/payments/checkout', data).then(r => r.data),
}

export const creditService = {
  getBalance: (): Promise<CreditBalanceResponse> =>
    api.get('/payments/credits/balance').then(r => r.data),
}
