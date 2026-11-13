import { useCallback, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { SelectField, TextField } from '../../components/ui/Field'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { Pagination } from '../../components/ui/Pagination'
import { bookingService, BOOKING_TYPE_LABEL } from '../../services/booking.service'
import type { BookingResponse, BookingStatus } from '../../services/booking.service'
import { partnerService } from '../../services/partner.service'
import { CashierCommandDialog } from './CashierCommandDialog'
import { cashierError, centsFromInput, MONEY_PATTERN } from './format'
import type { CashierCommandForm } from './useCashierCommand'
import { useCashierQuery } from './useCashierQuery'

const BILLABLE_STATUSES: { id: BookingStatus; label: string }[] = [
  { id: 'COMPLETED', label: 'Finalizadas' },
  { id: 'IN_PROGRESS', label: 'Em andamento' },
  { id: 'CONFIRMED', label: 'Confirmadas' },
]

type Candidate = { id: string; description: string; option: string; price: string }

async function getCandidates(partnerId: string, date: string, status: BookingStatus, page: number) {
  const [partner, bookings] = await Promise.all([
    partnerService.getCatalogPartner(partnerId),
    bookingService.getByPartner(partnerId, { date, status, page, size: 10 }),
  ])
  const eligible = bookings.content.filter(booking => booking.paymentMethod !== 'PACKAGE_CREDIT')
  const pets = await Promise.allSettled(eligible.map(booking => bookingService.getPet(booking, true)))
  const names = new Map(pets.flatMap((result, index) => result.status === 'fulfilled'
    ? [[eligible[index].id, result.value.name] as const] : []))

  function candidate(booking: BookingResponse): Candidate {
    const service = partner.services?.find(item => item.id === booking.serviceId)?.name ?? BOOKING_TYPE_LABEL[booking.type]
    const name = names.get(booking.id) ?? `Pet ${booking.petId.slice(0, 8)}`
    const description = `${service} · ${name}`
    const time = (booking.bookingDate ?? booking.checkIn)?.slice(11, 16)
    return {
      id: booking.id,
      description: description.slice(0, 160),
      option: [time, description].filter(Boolean).join(' · '),
      price: Number.isFinite(booking.price) ? booking.price.toFixed(2).replace('.', ',') : '',
    }
  }
  return { candidates: eligible.map(candidate), pages: bookings.totalPages }
}

type Props = { today: string; partnerId: string; onClose: () => void; command: CashierCommandForm }

export function NewChargeDialog({ today, partnerId, onClose, command }: Props) {
  const [date, setDate] = useState(today)
  const [status, setStatus] = useState<BookingStatus>('COMPLETED')
  const [page, setPage] = useState(0)
  const [booking, setBooking] = useState<Candidate>()
  const load = useCallback(() => getCandidates(partnerId, date, status, page), [partnerId, date, status, page])
  const { result, retry } = useCashierQuery(load)

  if (booking) return <ChargeForm booking={booking} onClose={onClose} command={command} />

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }} title="Escolher reserva">
      <div className="mt-4 space-y-3">
        <TextField label="Data da reserva" type="date" value={date} onChange={event => {
          if (event.target.value) {
            setDate(event.target.value)
            setPage(0)
          }
        }} />
        <SelectField label="Situação" value={status} onChange={event => {
          setStatus(event.target.value as BookingStatus)
          setPage(0)
        }}>
          {BILLABLE_STATUSES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </SelectField>
        {!result && <LoadingState label="Carregando reservas…" />}
        {result && 'error' in result && (
          <ErrorState message={cashierError(result.error, 'Não foi possível carregar as reservas.')}
            action={<Button variant="secondary" onClick={retry}>Tentar novamente</Button>} />
        )}
        {result && 'data' in result && (
          <>
            {result.data.candidates.length ? (
              <ul className="space-y-2">
                {result.data.candidates.map(item => (
                  <li key={item.id}>
                    <Button variant="secondary" className="w-full justify-start text-left" onClick={() => setBooking(item)}>
                      {item.option}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : <EmptyState icon={CalendarDays} title="Nenhuma reserva elegível nesta página" size="sm" />}
            <Pagination page={page + 1} totalPages={result.data.pages} onPageChange={value => setPage(value - 1)}
              label="Páginas de reservas" />
          </>
        )}
      </div>
    </Dialog>
  )
}

function ChargeForm({ booking, onClose, command }: Pick<Props, 'onClose' | 'command'> & { booking: Candidate }) {
  const [validation, setValidation] = useState('')
  function submit(form: FormData) {
    const description = String(form.get('description') ?? '').trim()
    const baseCents = centsFromInput(String(form.get('base') ?? ''))
    const extrasCents = centsFromInput(String(form.get('extras') || '0'))
    const discountCents = centsFromInput(String(form.get('discount') || '0'))
    if (!description || baseCents === null || extrasCents === null || discountCents === null) {
      setValidation('Preencha a descrição e informe valores com até duas casas decimais.')
      return
    }
    if (discountCents > baseCents + extrasCents) {
      setValidation('O desconto excede o valor da cobrança.')
      return
    }
    setValidation('')
    const data = { bookingId: booking.id, description, baseCents, extrasCents, discountCents }
    void command.submit({ type: 'charge', data })
  }
  return (
    <CashierCommandDialog title="Nova cobrança" submitLabel="Criar cobrança" saving={command.saving}
      error={validation || command.error} onClose={onClose} onSubmit={submit}>
      <TextField name="description" label="Descrição" defaultValue={booking.description} maxLength={160} required />
      <TextField name="base" label="Valor do serviço (R$)" defaultValue={booking.price}
        inputMode="decimal" pattern={MONEY_PATTERN} required />
      <TextField name="extras" label="Adicionais (R$)" inputMode="decimal" pattern={MONEY_PATTERN} placeholder="0,00"
        hint="Valor lançado manualmente. O caixa não registra autorização do tutor." />
      <TextField name="discount" label="Desconto (R$)" inputMode="decimal" pattern={MONEY_PATTERN} placeholder="0,00" />
    </CashierCommandDialog>
  )
}
