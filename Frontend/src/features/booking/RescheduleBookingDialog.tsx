import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { SelectField, TextField } from '../../components/ui/Field'
import { bookingService, type AvailabilitySlot, type BookingResponse, type RescheduleRequest } from '../../services/booking.service'
import { bookingError } from './bookingUi'

export function RescheduleBookingDialog({ booking, onClose, onSaved }: {
  booking: BookingResponse
  onClose: () => void
  onSaved: (booking: BookingResponse) => void
}) {
  const boarding = booking.type === 'BOARDING'
  const [date, setDate] = useState(booking.bookingDate?.slice(0, 10) ?? '')
  const [time, setTime] = useState('')
  const [staffId, setStaffId] = useState('')
  const [checkIn, setCheckIn] = useState(booking.checkIn?.slice(0, 16) ?? '')
  const [checkOut, setCheckOut] = useState(booking.checkOut?.slice(0, 16) ?? '')
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [loading, setLoading] = useState(!boarding && !!date && !!booking.serviceId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [slotError, setSlotError] = useState('')
  const [slotAttempt, setSlotAttempt] = useState(0)
  const staff = slots.find(slot => slot.time === time)?.staff ?? []

  useEffect(() => {
    if (boarding || !date || !booking.serviceId) return
    let active = true
    bookingService.getAvailability(booking.partnerId, date, booking.serviceId, booking.id)
      .then(result => { if (active) setSlots(result.filter(slot => slot.available)) })
      .catch(err => { if (active) setSlotError(bookingError(err, 'Não foi possível consultar os horários.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [boarding, booking.id, booking.partnerId, booking.serviceId, date, slotAttempt])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!boarding && (!date || !time || !staffId)) return
    const input: RescheduleRequest = boarding ? { checkIn, checkOut } : { bookingDate: `${date}T${time}:00`, staffId }
    setSaving(true)
    setError('')
    try {
      onSaved(await bookingService.reschedule(booking.id, input))
    } catch (err) {
      setError(bookingError(err, 'Não foi possível reagendar.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open title="Reagendar" onOpenChange={open => { if (!open && !saving) onClose() }}>
      <form className="space-y-4" onSubmit={submit}>
        {boarding ? (
          <>
            <TextField type="datetime-local" label="Novo check-in" required value={checkIn}
              onChange={event => setCheckIn(event.target.value)} disabled={saving} />
            <TextField type="datetime-local" label="Novo check-out" required min={checkIn} value={checkOut}
              onChange={event => setCheckOut(event.target.value)} disabled={saving} />
          </>
        ) : (
          <>
            <TextField type="date" label="Nova data" required value={date} disabled={saving}
              onChange={event => {
                setDate(event.target.value)
                setTime('')
                setStaffId('')
                setSlots([])
                setSlotError('')
                setLoading(!!event.target.value && !!booking.serviceId)
              }} />
            <SelectField label="Horário" required value={time} disabled={saving || loading || !slots.length}
              onChange={event => {
                const next = event.target.value
                const people = slots.find(slot => slot.time === next)?.staff ?? []
                setTime(next)
                setStaffId(people.find(person => person.id === booking.staffId)?.id ?? people[0]?.id ?? '')
              }}>
              <option value="">{loading ? 'Consultando…' : 'Selecione'}</option>
              {slots.map(slot => <option key={slot.time} value={slot.time}>{slot.time}</option>)}
            </SelectField>
            {date && !loading && !slots.length && !slotError && (
              <p role="status" className="text-sm text-text-body">Nenhum horário disponível nessa data.</p>
            )}
            {slotError && (
              <div className="space-y-2">
                <p role="alert" className="text-sm text-text-danger">{slotError}</p>
                <Button variant="secondary" size="sm" onClick={() => {
                  setSlotError('')
                  setLoading(true)
                  setSlotAttempt(attempt => attempt + 1)
                }}>Consultar novamente</Button>
              </div>
            )}
            <SelectField label="Profissional" required value={staffId} disabled={saving || !staff.length}
              onChange={event => setStaffId(event.target.value)}>
              <option value="">Selecione</option>
              {staff.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
            </SelectField>
          </>
        )}
        {error && <p role="alert" className="text-sm text-text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={saving} onClick={onClose}>Voltar</Button>
          <Button type="submit" disabled={saving || (!boarding && (!time || !staffId))}>
            {saving ? 'Salvando…' : 'Salvar horário'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
