import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { SelectField, TextField } from '../../components/ui/Field'
import { bookingService, type AgendaBlock } from '../../services/booking.service'
import { bookingError } from './bookingUi'

const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export function AgendaBlocksDialog({ partnerId, staff, onClose }: {
  partnerId: string
  staff: ReadonlyArray<{ id: string; name: string }>
  onClose: () => void
}) {
  const [blocks, setBlocks] = useState<AgendaBlock[] | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    bookingService.getBlocks(partnerId)
      .then(data => { if (active) setBlocks(data) })
      .catch(err => {
        if (active) {
          setBlocks([])
          setError(bookingError(err, 'Não foi possível consultar os bloqueios.'))
        }
      })
    return () => { active = false }
  }, [partnerId])

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const start = String(data.get('start'))
    const end = String(data.get('end'))
    const reason = String(data.get('reason')).trim()
    const staffId = String(data.get('staffId')) || undefined
    if (!reason || start >= end) {
      setError('Informe um motivo e um fim posterior ao início.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const block = await bookingService.createBlock(partnerId, { start, end, reason, staffId })
      setBlocks(current => [...(current ?? []), block].sort((a, b) => a.start.localeCompare(b.start)))
      form.reset()
    } catch (err) {
      setError(bookingError(err, 'Não foi possível bloquear o período.'))
    } finally {
      setSaving(false)
    }
  }

  async function remove(block: AgendaBlock) {
    setSaving(true)
    setError('')
    try {
      await bookingService.removeBlock(partnerId, block.id)
      setBlocks(current => current?.filter(item => item.id !== block.id) ?? [])
    } catch (err) {
      setError(bookingError(err, 'Não foi possível remover o bloqueio.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open title="Bloqueios de agenda" onOpenChange={open => { if (!open && !saving) onClose() }}>
      <form className="space-y-3" onSubmit={create}>
        <TextField label="Início" name="start" type="datetime-local" required disabled={saving} />
        <TextField label="Fim" name="end" type="datetime-local" required disabled={saving} />
        <SelectField label="Profissional" name="staffId" disabled={saving}>
          <option value="">Todo o estabelecimento</option>
          {staff.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
        </SelectField>
        <TextField label="Motivo" name="reason" required maxLength={500} disabled={saving} />
        <Button type="submit" disabled={saving || blocks === null}>Bloquear período</Button>
      </form>
      {error && <p role="alert" className="mt-3 text-sm text-text-danger">{error}</p>}
      <div className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
        {blocks === null && <p role="status">Carregando bloqueios…</p>}
        {blocks?.length === 0 && !error && <p>Nenhum bloqueio cadastrado.</p>}
        {blocks?.map(block => (
          <div key={block.id} className="space-y-1 rounded-xl border border-border bg-bg p-3">
            <p className="font-semibold break-words">{block.reason}</p>
            <p className="text-xs">{dateTime.format(new Date(block.start))} até {dateTime.format(new Date(block.end))}</p>
            <p className="text-xs">{block.staffId
              ? staff.find(person => person.id === block.staffId)?.name ?? 'Profissional'
              : 'Todo o estabelecimento'}</p>
            <Button variant="secondary" size="sm" disabled={saving} onClick={() => void remove(block)}>
              Remover bloqueio
            </Button>
          </div>
        ))}
      </div>
    </Dialog>
  )
}
