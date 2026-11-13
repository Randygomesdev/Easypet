import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { SelectField, TextField } from '../../components/ui/Field'
import { partnerService, type ServiceOffer } from '../../services/partner.service'
import { BOOKING_TYPE_LABEL, bookingService, type AvailabilitySlot, type BookingRequest, type BookingResponse, type BookingType } from '../../services/booking.service'
import { acknowledgeBookingIntent, bookingIntentScope, readBookingIntent, submitBookingIntent } from './bookingIntent'
import { bookingError } from './bookingUi'

export type ReceptionBookingDialogProps = {
  actorId: string
  partnerId: string
  customerId: string
  petId: string
  petName: string
  onClose: () => void
  onBooked: (booking: BookingResponse) => void
}

export function ReceptionBookingDialog({ actorId, partnerId, customerId, petId, petName, onClose, onBooked }: ReceptionBookingDialogProps) {
  const scope = bookingIntentScope(actorId, 'reception', partnerId, customerId, petId)
  const [services, setServices] = useState<ServiceOffer[] | null>(null)
  const [serviceId, setServiceId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [staffId, setStaffId] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [query, setQuery] = useState(0)
  const [slotResult, setSlotResult] = useState<{ key: string; slots: AvailabilitySlot[]; error?: string } | null>(null)
  const [catalogError, setCatalogError] = useState('')
  const [catalogAttempt, setCatalogAttempt] = useState(0)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submitting = useRef(false)
  const [intent, setIntent] = useState(() => readBookingIntent(scope))
  const service = services?.find(item => item.id === serviceId)
  const boarding = service?.billingUnit === 'DAILY'
  const slotKey = !boarding && date && serviceId ? JSON.stringify([date, serviceId, query]) : ''
  const slotResponse = slotKey && slotResult?.key === slotKey ? slotResult : null
  const slots = slotResponse?.slots ?? []
  const staff = slots.find(slot => slot.time === time)?.staff ?? []

  function close() {
    if (saving) return
    if (intent?.bookingId) acknowledgeBookingIntent(scope, intent.bookingId)
    onClose()
  }

  useEffect(() => {
    if (intent) return
    let active = true
    partnerService.getCatalogPartner(partnerId)
      .then(partner => { if (active) setServices((partner.services ?? []).filter(service => service.active !== false)) })
      .catch(err => { if (active) setCatalogError(bookingError(err, 'Não foi possível carregar os serviços.')) })
    return () => { active = false }
  }, [partnerId, catalogAttempt, intent])

  useEffect(() => {
    if (!slotKey || intent) return
    let active = true
    bookingService.getAvailability(partnerId, date, serviceId)
      .then(result => { if (active) setSlotResult({ key: slotKey, slots: result.filter(slot => slot.available) }) })
      .catch(err => {
        if (active) setSlotResult({ key: slotKey, slots: [], error: bookingError(err, 'Não foi possível consultar os horários.') })
      })
    return () => { active = false }
  }, [date, serviceId, partnerId, slotKey, intent])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || (!intent && !service)) return
    const type = boarding ? 'BOARDING' : service?.bookingType as BookingType | undefined ?? 'OTHER'
    const input: BookingRequest = intent?.input ?? {
      petId, partnerId, receptionCustomerId: customerId, serviceId, type,
      price: service?.price ?? 0,
      ...(boarding ? { checkIn, checkOut } : { bookingDate: `${date}T${time}:00`, staffId: staffId || undefined }),
    }
    submitting.current = true
    setSaving(true)
    setError('')
    try {
      const booking = await submitBookingIntent(scope, input)
      setIntent(readBookingIntent(scope))
      onBooked(booking)
      acknowledgeBookingIntent(scope, booking.id)
    } catch (err) {
      setError(bookingError(err, 'Não foi possível concluir a reserva.'))
      setIntent(readBookingIntent(scope))
    } finally {
      submitting.current = false
      setSaving(false)
    }
  }

  return (
    <Dialog open title="Agendar atendimento" description={petName}
      onOpenChange={open => { if (!open) close() }}>
      <form className="mt-4 space-y-3" onSubmit={submit}>
        {intent ? (
          <div className="space-y-1 text-sm text-text-body">
            <p className="font-semibold">{BOOKING_TYPE_LABEL[intent.input.type]}</p>
            <p>{(intent.input.checkIn ?? intent.input.bookingDate)?.replace('T', ' ').slice(0, 16)}</p>
            <p>{intent.bookingId ? 'Reserva registrada.' : 'Há uma tentativa de reserva pendente.'}</p>
          </div>
        ) : (
          <>
            <SelectField label="Serviço" required value={serviceId} disabled={saving || !services}
              onChange={event => { setServiceId(event.target.value); setTime(''); setStaffId('') }}>
              <option value="">{services ? 'Selecione' : 'Carregando…'}</option>
              {services?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </SelectField>
            {catalogError && <div className="space-y-2">
              <p role="alert" className="text-sm text-text-danger">{catalogError}</p>
              <Button size="sm" variant="secondary" onClick={() => { setCatalogError(''); setCatalogAttempt(value => value + 1) }}>
                Consultar serviços novamente
              </Button>
            </div>}
            {service && (boarding ? (
              <>
                <TextField type="datetime-local" label="Check-in" required value={checkIn} disabled={saving}
                  onChange={event => setCheckIn(event.target.value)} />
                <TextField type="datetime-local" label="Check-out" required min={checkIn} value={checkOut} disabled={saving}
                  onChange={event => setCheckOut(event.target.value)} />
              </>
            ) : (
              <>
                <TextField type="date" label="Data" required value={date} disabled={saving}
                  onChange={event => { setDate(event.target.value); setTime(''); setStaffId('') }} />
                <SelectField label="Horário" required value={time} disabled={saving || !slots.length}
                  onChange={event => { setTime(event.target.value); setStaffId('') }}>
                  <option value="">{slotKey && !slotResponse ? 'Consultando…' : 'Selecione'}</option>
                  {slots.map(slot => <option key={slot.time} value={slot.time}>{slot.time}</option>)}
                </SelectField>
                {slotResponse?.error && <div className="space-y-2">
                  <p role="alert" className="text-sm text-text-danger">{slotResponse.error}</p>
                  <Button size="sm" variant="secondary" onClick={() => setQuery(value => value + 1)}>Consultar novamente</Button>
                </div>}
                {slotResponse && !slotResponse.error && !slots.length && <p className="text-sm text-text-body">Nenhum horário disponível.</p>}
                <SelectField label="Profissional" value={staffId} disabled={saving || !staff.length}
                  onChange={event => setStaffId(event.target.value)}>
                  <option value="">Qualquer profissional disponível</option>
                  {staff.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
                </SelectField>
              </>
            ))}
          </>
        )}
        {error && <p role="alert" className="text-sm text-text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={saving} onClick={close}>Fechar</Button>
          <Button type="submit" disabled={saving || (!intent && (!service || (boarding ? !checkIn || !checkOut : !time)))}>
            {saving ? 'Salvando…' : intent ? 'Consultar ou retomar reserva' : 'Solicitar reserva'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
