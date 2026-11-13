import { useEffect, useState } from 'react'
import { bookingService, BOOKING_STATUS_LABEL, type BookingHistoryEntry } from '../../services/booking.service'
import { bookingError } from './bookingUi'

const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

function describe(entry: BookingHistoryEntry) {
  if (entry.action === 'RESCHEDULED') {
    const before = entry.previousBookingDate ? dateTime.format(new Date(entry.previousBookingDate)) : ''
    const after = dateTime.format(new Date(entry.bookingDate))
    if (before !== after) return `Reagendado de ${before} para ${after}`
    if (entry.previousScheduledEnd && entry.scheduledEnd && entry.previousScheduledEnd !== entry.scheduledEnd) {
      return `Término alterado para ${dateTime.format(new Date(entry.scheduledEnd))}`
    }
    return 'Alocação atualizada'
  }
  if (entry.action === 'READY') return 'Pronto para retirada'
  return BOOKING_STATUS_LABEL[entry.status]
}

function HistoryEntries({ bookingId }: { bookingId: string }) {
  const [entries, setEntries] = useState<BookingHistoryEntry[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    bookingService.history(bookingId)
      .then(data => { if (active) setEntries(data) })
      .catch(err => { if (active) setError(bookingError(err, 'Não foi possível consultar o histórico.')) })
    return () => { active = false }
  }, [bookingId])

  if (error) return <p role="alert" className="text-text-danger">{error}</p>
  if (!entries) return <p role="status">Carregando histórico…</p>
  if (!entries.length) return <p>Nenhuma alteração registrada.</p>
  return (
    <ol className="space-y-2">
      {entries.map((entry, index) => (
        <li key={`${entry.recordedAt}-${index}`} className="border-l-2 border-border pl-3">
          <p className="font-semibold">{describe(entry)}</p>
          {entry.reason && <p className="break-words">{entry.reason}</p>}
          <time dateTime={entry.recordedAt} className="text-xs text-text-muted">
            {dateTime.format(new Date(entry.recordedAt))}
          </time>
        </li>
      ))}
    </ol>
  )
}

export function BookingHistory({ bookingId, standalone = false }: { bookingId: string; standalone?: boolean }) {
  const [open, setOpen] = useState(false)
  if (standalone) return <div className="text-sm text-text-body"><HistoryEntries bookingId={bookingId} /></div>
  return (
    <details className="space-y-2 text-sm text-text-body" onToggle={event => setOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer font-medium">Histórico do agendamento</summary>
      {open && <HistoryEntries key={bookingId} bookingId={bookingId} />}
    </details>
  )
}
