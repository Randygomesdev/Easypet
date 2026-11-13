import { isAxiosError } from 'axios'
import type { BookingResponse } from '../../services/booking.service'

export function bookingError(error: unknown, fallback: string): string {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? fallback
  }
  return fallback
}

export function noticeDuration(minutes: number) {
  if (minutes > 0 && minutes % 60 === 0) {
    const hours = minutes / 60
    return `${hours} ${hours === 1 ? 'hora' : 'horas'}`
  }
  return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
}

export function isEditableBooking(booking: BookingResponse) {
  return booking.status === 'PENDING' || booking.status === 'CONFIRMED'
}

export function canRecordNoShow(booking: BookingResponse, now = Date.now()) {
  return booking.status === 'CONFIRMED' && !!booking.bookingDate && Date.parse(booking.bookingDate) <= now
}

export function bookingStatusLabel(booking: BookingResponse) {
  return booking.status === 'IN_PROGRESS' && booking.readyAt ? 'Pronto para retirada' : null
}
