import { useEffect, useState, type FormEvent } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { TextField } from '../../components/ui/Field'
import { bookingService, type BookingCheckIn, type BookingResponse } from '../../services/booking.service'
import { bookingError } from './bookingUi'

const textFields = [
  { name: 'allergies', label: 'Alergias informadas' },
  { name: 'behavior', label: 'Comportamento' },
  { name: 'observations', label: 'Observações de entrada' },
] as const

const empty: BookingCheckIn = { petIdentified: false, instructionsConfirmed: false }

export function GroomingCheckIn({ booking, onReady }: {
  booking: BookingResponse
  onReady: (booking: BookingResponse) => void
}) {
  const [checkIn, setCheckIn] = useState<BookingCheckIn | null>(null)
  const [saved, setSaved] = useState(false)
  const [working, setWorking] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    bookingService.getCheckIn(booking.id).then(data => {
      if (!active) return
      setCheckIn(data ?? empty)
      setSaved(!!data)
    }).catch(err => {
      if (active) setError(bookingError(err, 'Não foi possível carregar o checklist.'))
    })
    return () => { active = false }
  }, [booking.id, attempt])

  function edit(field: Partial<BookingCheckIn>) {
    if (checkIn) setCheckIn({ ...checkIn, ...field })
    setDirty(true)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!checkIn) return
    setWorking(true)
    setError('')
    try {
      setCheckIn(await bookingService.saveCheckIn(booking.id, checkIn))
      setSaved(true)
      setDirty(false)
    } catch (err) {
      setError(bookingError(err, 'Não foi possível salvar o checklist.'))
    } finally {
      setWorking(false)
    }
  }

  async function ready() {
    setWorking(true)
    setError('')
    try {
      onReady(await bookingService.markReady(booking.id))
    } catch (err) {
      setError(bookingError(err, 'Não foi possível marcar o pet como pronto.'))
    } finally {
      setWorking(false)
    }
  }

  const locked = working || !!booking.readyAt
  return (
    <Card>
      <CardHeader title="Entrada para banho e tosa" action={booking.readyAt
        ? <Badge tone="success">Pronto para retirada</Badge>
        : undefined} />
      <CardContent className="space-y-3 p-4">
        {error && <p role="alert" className="text-sm text-text-danger">{error}</p>}
        {!checkIn && (error
          ? <Button variant="secondary" onClick={() => { setError(''); setAttempt(value => value + 1) }}>Tentar novamente</Button>
          : <p role="status" className="text-sm text-text-body">Carregando checklist…</p>)}
        {checkIn && (
          <form onSubmit={save} className="space-y-3 text-sm text-text-body">
            <label className="flex items-center gap-2">
              <input type="checkbox" required checked={checkIn.petIdentified} disabled={locked}
                onChange={event => edit({ petIdentified: event.target.checked })} />
              Identificação do pet conferida
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" required checked={checkIn.instructionsConfirmed} disabled={locked}
                onChange={event => edit({ instructionsConfirmed: event.target.checked })} />
              Orientações de entrada confirmadas
            </label>
            {textFields.map(({ name, label }) => (
              <TextField key={name} label={label} value={checkIn[name] ?? ''} maxLength={1000}
                disabled={locked} onChange={event => edit({ [name]: event.target.value })} />
            ))}
            {checkIn.authorizedExtras && (
              <p className="break-words"><span className="font-semibold">Adicionais registrados anteriormente</span><br />{checkIn.authorizedExtras}</p>
            )}
            {!booking.readyAt && (
              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" variant="secondary" size="sm" disabled={working || (saved && !dirty)}>
                  {saved && !dirty ? 'Checklist salvo' : 'Salvar checklist'}
                </Button>
                <Button size="sm" disabled={working || !saved || dirty || booking.status !== 'IN_PROGRESS'}
                  onClick={() => void ready()}>Marcar pronto para retirada</Button>
              </div>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  )
}
