import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { TextField } from '../../components/ui/Field'
import { bookingService, type BookingResponse } from '../../services/booking.service'
import { bookingError } from './bookingUi'

export function BookingReasonDialog({ bookingId, status, partnerId, onClose, onSaved }: {
  bookingId: string
  status: 'CANCELLED' | 'NO_SHOW'
  partnerId?: string
  onClose: () => void
  onSaved: (booking: BookingResponse) => void
}) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const title = status === 'CANCELLED' ? 'Cancelar agendamento' : 'Registrar falta'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reason.trim()) {
      setError('Informe o motivo.')
      return
    }
    setSaving(true)
    setError('')
    try {
      onSaved(await (partnerId
        ? bookingService.updateAdminStatus(partnerId, bookingId, status, reason.trim())
        : bookingService.updateStatus(bookingId, status, reason.trim())))
    } catch (err) {
      setError(bookingError(err, 'Não foi possível atualizar o agendamento.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open title={title} onOpenChange={open => { if (!open && !saving) onClose() }}>
      <form className="space-y-4" onSubmit={submit}>
        <TextField label="Motivo" required maxLength={500} value={reason}
          onChange={event => setReason(event.target.value)} disabled={saving} />
        {error && <p role="alert" className="text-sm text-text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={saving} onClick={onClose}>Voltar</Button>
          <Button type="submit" variant="danger" disabled={saving}>{saving ? 'Salvando…' : title}</Button>
        </div>
      </form>
    </Dialog>
  )
}
