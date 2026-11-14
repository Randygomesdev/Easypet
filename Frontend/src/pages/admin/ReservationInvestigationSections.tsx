import { useCallback, useState } from 'react'
import { CalendarDays, Mail, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { Pagination } from '../../components/ui/Pagination'
import { NotificationDeliveryTable } from '../../features/notifications/NotificationDeliveryTable'
import { NotificationAttempts } from '../../features/notifications/NotificationAttempts'
import { Dialog } from '../../components/ui/Dialog'
import { money, METHOD_LABELS } from '../../features/cashier/format'
import { supportError } from '../../features/support/presentation'
import { usePanelQuery } from '../../routes/usePanelQuery'
import { notificationService, type NotificationDelivery } from '../../services/notification.service'
import { bookingState, getCashierInvestigation, getInvestigation, type BookingInvestigation, type BookingSummary } from './reservationInvestigation'

const date = (value: string) => new Date(value).toLocaleString('pt-BR')

function QueryFailure({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorState message={supportError(error, 'Não foi possível concluir esta consulta.')}
    action={<Button variant="secondary" onClick={retry}>Tentar novamente</Button>} />
}

function RecordList<T>({ items, render }: { items: T[]; render: (item: T) => ReactNode }) {
  return <ul className="divide-y divide-border text-sm text-text-body wrap-anywhere">{items.map(render)}</ul>
}

function BookingDetails({ initial }: { initial: BookingInvestigation }) {
  const { bookingId, partnerId } = initial.booking
  const [historyPage, setHistoryPage] = useState(0)
  const [extrasPage, setExtrasPage] = useState(0)
  const load = useCallback((signal: AbortSignal) => getInvestigation(bookingId, historyPage, extrasPage, signal, partnerId), [bookingId, partnerId, historyPage, extrasPage])
  const hasPageChange = historyPage > 0 || extrasPage > 0
  const query = usePanelQuery(load, hasPageChange)
  const result = hasPageChange ? query.result : { status: 'ready' as const, data: initial }

  return <Card>
    <CardHeader title="Histórico da reserva" />
    {!result ? <LoadingState label="Carregando histórico da reserva…" /> : result.status === 'error' ? (
      <QueryFailure error={result.cause} retry={query.reload} />
    ) : <>
      {(result.data.reason || result.data.interruptedAt) && <CardContent className="space-y-2 text-sm text-text-body">
        {result.data.interruptedAt && <p>Interrupção em {date(result.data.interruptedAt)}</p>}
        {result.data.reason && <p className="whitespace-pre-wrap wrap-anywhere">Motivo: {result.data.reason}</p>}
      </CardContent>}
      {result.data.history.content.length ? <RecordList items={result.data.history.content} render={(event) => (
        <li key={`${event.recordedAt}:${event.action}:${event.actorId}`} className="space-y-1 px-5 py-3">
          <p className="font-semibold text-text-heading">{event.previousStatus ? `${bookingState(event.previousStatus)} → ` : ''}{bookingState(event.status)}</p>
          <p>{date(event.recordedAt)} · {event.action}</p>
          {event.actorId && <p>Autor {event.actorId}</p>}
          {event.previousBookingDate && <p>Horário anterior {date(event.previousBookingDate)}</p>}
          {event.bookingDate && <p>Horário registrado {date(event.bookingDate)}</p>}
          {event.reason && <p className="whitespace-pre-wrap">{event.reason}</p>}
        </li>
      )} /> : <EmptyState icon={CalendarDays} title="Nenhum evento de reserva nesta página" size="sm" />}
      <Pagination label="Páginas do histórico da reserva" page={historyPage + 1} totalPages={result.data.history.totalPages} onPageChange={value => setHistoryPage(value - 1)} />
      <CardHeader title="Autorizações de adicionais" />
      {result.data.extras.content.length ? <RecordList items={result.data.extras.content} render={({ extra, proposedBy, decisionBy, tutorIdentityType, reason, evidence }) => (
        <li key={extra.id} className="space-y-1 px-5 py-3">
          <p className="font-semibold">{extra.description} · {money(extra.amountCents)}</p>
          <p>{extra.quantity} × {money(extra.unitPriceCents)} · {extra.status} · versão {extra.version}</p>
          <p>{extra.id}</p>
          <p>Proposta em {date(extra.createdAt)} · Autor {proposedBy}</p>
          <p>Titularidade: {tutorIdentityType === 'AUTH_USER' ? 'Conta do tutor' : 'Cadastro de balcão'}</p>
          {extra.decisionAt && <p>Decisão em {date(extra.decisionAt)} · {extra.channel === 'IN_PERSON' ? 'Presencial' : extra.channel === 'DIGITAL' ? 'Digital' : '—'} · Autor {decisionBy ?? '—'}</p>}
          {reason && <p className="whitespace-pre-wrap">Motivo: {reason}</p>}
          {evidence && <p className="whitespace-pre-wrap">Evidência: {evidence}</p>}
        </li>
      )} /> : <EmptyState icon={CalendarDays} title="Nenhum adicional nesta página" size="sm" />}
      <Pagination label="Páginas de autorizações" page={extrasPage + 1} totalPages={result.data.extras.totalPages} onPageChange={value => setExtrasPage(value - 1)} />
    </>}
  </Card>
}

function CashierDetails({ bookingId, partnerId }: Pick<BookingSummary, 'bookingId' | 'partnerId'>) {
  const [page, setPage] = useState(0)
  const load = useCallback((signal: AbortSignal) => getCashierInvestigation(bookingId, partnerId, page, signal), [bookingId, partnerId, page])
  const { result, reload } = usePanelQuery(load)
  const data = result?.status === 'ready' ? result.data : undefined

  return <Card>
    <CardHeader title="Caixa da reserva" />
    {!result ? <LoadingState label="Carregando caixa…" /> : result.status === 'error' ? <QueryFailure error={result.cause} retry={reload} />
      : !data?.charge ? <EmptyState icon={Wallet} title="Nenhuma cobrança para esta reserva" size="sm" /> : <>
        <CardContent className="space-y-2 text-sm text-text-body wrap-anywhere">
          <p className="font-semibold text-text-heading">Cobrança {data.charge.id}</p>
          <p>Total {money(data.charge.totalCents)} · Recebido {money(data.charge.receivedCents)} · Saldo {money(data.charge.balanceCents)}</p>
          <p>Criada em {date(data.charge.createdAt)} · Autor {data.charge.createdBy}</p>
        </CardContent>
        {data.approvedExtras.length > 0 && <><CardHeader title="Adicionais aplicados" />
          <RecordList items={data.approvedExtras} render={extra => <li key={extra.id} className="space-y-1 px-5 py-3">
            <p>{extra.description} · {money(extra.amountCents)} · Aceite {extra.approvalId} (v{extra.version})</p>
            <p>Aceito em {date(extra.acceptedAt)} · Autor {extra.acceptedBy}</p>
            <p>Aplicado em {date(extra.appliedAt)} · Autor {extra.appliedBy}</p>
          </li>} />
        </>}
        <CardHeader title="Movimentos" />
        {data.movements.content.length ? <RecordList items={data.movements.content} render={move => (
          <li key={move.id} className="space-y-1 px-5 py-3">
            <p>{move.type === 'REVERSAL' ? 'Reversão' : 'Recebimento'} · {money(move.amountCents)} · {METHOD_LABELS[move.method]}</p>
            <p>{date(move.createdAt)} · Autor {move.createdBy}</p>
            {move.reversesReceiptId && <p>Recebimento original {move.reversesReceiptId}</p>}
            {move.reason && <p className="whitespace-pre-wrap">{move.reason}</p>}
          </li>
        )} /> : <EmptyState icon={Wallet} title="Nenhum movimento nesta página" size="sm" />}
        <Pagination label="Páginas de movimentos" page={page + 1} totalPages={data.movements.totalPages} onPageChange={value => setPage(value - 1)} />
      </>}
  </Card>
}

function NotificationDetails({ bookingId }: { bookingId: string }) {
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<NotificationDelivery>()
  const load = useCallback((signal: AbortSignal) => notificationService.list(bookingId, page, signal), [bookingId, page])
  const { result, reload } = usePanelQuery(load)

  return <Card>
    <CardHeader title="Entregas e tentativas" />
    {!result ? <LoadingState label="Carregando entregas…" /> : result.status === 'error' ? <QueryFailure error={result.cause} retry={reload} /> : <>
      {result.data.content.length ? <NotificationDeliveryTable deliveries={result.data.content} onSelect={setSelected} />
        : <EmptyState icon={Mail} title="Nenhuma entrega nesta página" size="sm" />}
      <Pagination label="Páginas de entregas" page={page + 1} totalPages={result.data.totalPages} onPageChange={value => setPage(value - 1)} />
    </>}
    <Dialog open={Boolean(selected)} title="Tentativas de entrega" onOpenChange={open => { if (!open) setSelected(undefined) }}>
      {selected && <NotificationAttempts key={selected.id} id={selected.id} />}
    </Dialog>
  </Card>
}

export default function ReservationInvestigationSections({ initial }: { initial: BookingInvestigation }) {
  const { booking } = initial
  return <>
    <BookingDetails initial={initial} />
    <CashierDetails bookingId={booking.bookingId} partnerId={booking.partnerId} />
    <NotificationDetails bookingId={booking.bookingId} />
  </>
}
