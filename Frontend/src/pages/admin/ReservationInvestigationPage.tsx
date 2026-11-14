import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarDays } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { SelectField, TextField } from '../../components/ui/Field'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { Pagination } from '../../components/ui/Pagination'
import { usePanelQuery } from '../../routes/usePanelQuery'
import { supportError } from '../../features/support/presentation'
import { BOOKING_TYPE_LABEL, type BookingType } from '../../services/booking.service'
import { bookingState, getInvestigation, listInvestigations, reservationIdPattern, type BookingSummary } from './reservationInvestigation'
import ReservationInvestigationSections from './ReservationInvestigationSections'

function BookingContext({ booking }: { booking: BookingSummary }) {
  return <div className="space-y-2 text-sm text-text-body wrap-anywhere">
    <div className="flex flex-wrap items-center gap-2">
      <p className="font-semibold text-text-heading">{BOOKING_TYPE_LABEL[booking.type as BookingType] ?? booking.type}</p>
      <Badge tone="info">{bookingState(booking.status)}</Badge>
    </div>
    <p>Reserva {booking.bookingId}</p>
    <p>Estabelecimento {booking.partnerId}</p>
    <p>Horário {new Date(booking.bookingDate).toLocaleString('pt-BR')}</p>
    {booking.scheduledEnd && <p>Término previsto {new Date(booking.scheduledEnd).toLocaleString('pt-BR')}</p>}
  </div>
}

function RecentInvestigations() {
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState('')
  const load = useCallback((signal: AbortSignal) => listInvestigations(page, status, signal), [page, status])
  const { result, reload } = usePanelQuery(load)

  return <Card>
    <CardHeader title="Reservas com ocorrências" />
    <CardContent>
      <SelectField label="Situação" value={status} onChange={event => { setStatus(event.target.value); setPage(0) }}>
        <option value="">Todas as ocorrências</option>
        {['CANCELLED', 'NO_SHOW', 'INTERRUPTED'].map(value => <option key={value} value={value}>{bookingState(value)}</option>)}
      </SelectField>
    </CardContent>
    {!result ? <LoadingState label="Procurando ocorrências…" /> : result.status === 'error' ? (
      <ErrorState message={supportError(result.cause, 'Não foi possível consultar ocorrências.')}
        action={<Button variant="secondary" onClick={reload}>Tentar novamente</Button>} />
    ) : <>
      {result.data.content.length ? <ul className="divide-y divide-border">
        {result.data.content.map(booking => <li key={booking.bookingId} className="space-y-2 px-5 py-4">
          <BookingContext booking={booking} />
          <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-text-heading underline"
            to={`?reserva=${encodeURIComponent(booking.bookingId)}`}>Investigar reserva {booking.bookingId.slice(0, 8)}</Link>
        </li>)}
      </ul> : <EmptyState icon={CalendarDays} title="Nenhuma ocorrência nesta página" />}
      <Pagination label="Páginas de ocorrências" page={page + 1} totalPages={result.data.totalPages} onPageChange={value => setPage(value - 1)} />
    </>}
  </Card>
}

function Investigation({ id }: { id: string }) {
  const load = useCallback((signal: AbortSignal) => getInvestigation(id, 0, 0, signal), [id])
  const { result, reload } = usePanelQuery(load)
  if (!result) return <LoadingState label="Verificando a reserva…" />
  if (result.status === 'error') return <ErrorState message={supportError(result.cause, 'Não foi possível consultar a reserva.')}
    action={<Button variant="secondary" onClick={reload}>Tentar novamente</Button>} />
  const booking = result.data.booking
  return <>
    <Card><CardHeader title="Reserva localizada" /><CardContent><BookingContext booking={booking} /></CardContent></Card>
    <ReservationInvestigationSections initial={result.data} />
  </>
}

export default function ReservationInvestigationPage() {
  const [params, setParams] = useSearchParams()
  const id = params.get('reserva') ?? ''
  const [error, setError] = useState('')
  const valid = reservationIdPattern.test(id)

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = String(new FormData(event.currentTarget).get('bookingId') ?? '').trim()
    if (!reservationIdPattern.test(input)) {
      setError('Informe um ID de reserva válido.')
      return
    }
    setError('')
    setParams({ reserva: input })
  }

  return <div className="space-y-5">
    <h1 className="text-2xl font-bold text-text-heading lg:text-3xl">Ocorrências de reservas</h1>
    <Card><CardContent>
      <form key={id} onSubmit={search} className="space-y-3" noValidate>
        <TextField name="bookingId" label="ID da reserva" defaultValue={id} maxLength={36} required
          spellCheck={false} error={error || (id && !valid ? 'Informe um ID de reserva válido.' : undefined)} onChange={() => setError('')} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Consultar reserva</Button>
          {id && <Link className="inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-semibold text-text-heading underline"
            to="/admin/ocorrencias" onClick={() => setError('')}>Ver ocorrências recentes</Link>}
        </div>
      </form>
    </CardContent></Card>
    {valid ? <Investigation key={id} id={id} /> : <RecentInvestigations />}
  </div>
}
