import { isAxiosError } from 'axios'
import { bookingService, type BookingRequest, type BookingResponse } from '../../services/booking.service'

export type BookingIntent = {
  key: string
  input: BookingRequest
  bookingId?: string
}

export function bookingIntentScope(actorId: string, source: 'catalog' | 'cart' | 'reception', ...context: string[]) {
  return 'easypet.booking-intent.' + JSON.stringify([actorId, source, ...context])
}

export function readBookingIntent(scope: string): BookingIntent | null {
  const saved = localStorage.getItem(scope)
  if (saved === null) return null
  const parsed = JSON.parse(saved) as BookingIntent
  if (!parsed?.key || !parsed.input?.partnerId || !parsed.input?.petId) {
    throw new Error('A tentativa de reserva salva está inválida.')
  }
  return parsed
}

export function acknowledgeBookingIntent(scope: string, bookingId: string) {
  if (readBookingIntent(scope)?.bookingId === bookingId) localStorage.removeItem(scope)
}

function isDefinitiveFailure(error: unknown) {
  return isAxiosError(error) && [400, 409, 422].includes(error.response?.status ?? 0)
}

export async function submitBookingIntent(scope: string, input: BookingRequest, stableKey?: string): Promise<BookingResponse> {
  const submit = async () => {
    const intent = readBookingIntent(scope) ?? { key: stableKey ?? crypto.randomUUID(), input }
    // Persist before issuing the POST. A failed write must leave the server untouched.
    localStorage.setItem(scope, JSON.stringify(intent))
    let booking: BookingResponse
    try {
      booking = await bookingService.create(intent.input, intent.key)
    } catch (error) {
      if (!intent.bookingId && isDefinitiveFailure(error) && readBookingIntent(scope)?.key === intent.key) {
        localStorage.removeItem(scope)
      }
      throw error
    }
    if (typeof booking?.id !== 'string' || !booking.id) throw new Error('Resposta da reserva inválida.')
    localStorage.setItem(scope, JSON.stringify({ ...intent, bookingId: booking.id }))
    return booking
  }

  // Serialize a shared intent across tabs when the browser supports Web Locks.
  return navigator.locks ? navigator.locks.request(scope, submit) : submit()
}
