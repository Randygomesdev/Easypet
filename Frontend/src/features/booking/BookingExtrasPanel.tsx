import { useEffect, useRef, useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { SelectField, TextField } from '../../components/ui/Field'
import { Pagination } from '../../components/ui/Pagination'
import { useAuth } from '../../contexts/AuthContext'
import { bookingService, type BookingExtra, type BookingExtraDecision, type BookingExtraProposal, type PageResponse } from '../../services/booking.service'
import { bookingError } from './bookingUi'

type Mode = 'tutor' | 'operator' | 'desk'
type Action = { kind: 'proposal' } | { kind: 'digital' | 'in-person'; extra: BookingExtra }

const labels: Record<BookingExtra['status'], string> = {
  PENDING: 'Aguardando decisão', APPROVED: 'Autorizado', REJECTED: 'Recusado', EXPIRED: 'Expirado',
}
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function ExtraSummary({ extra }: { extra: BookingExtra }) {
  return (
    <div className="space-y-1 break-words text-sm text-text-body">
      <p className="font-semibold">{extra.description}</p>
      <p>{extra.quantity} × {currency.format(extra.unitPriceCents / 100)} · Total {currency.format(extra.amountCents / 100)}</p>
    </div>
  )
}

type ProposalIntent = { key: string; proposal: BookingExtraProposal }

function ExtraDialog({ action, bookingId, onClose, onSaved }: {
  action: Action
  bookingId: string
  onClose: () => void
  onSaved: () => void
}) {
  const { user } = useAuth()
  const scope = user && action.kind === 'proposal'
    ? `easypet.booking-extra.${user.id}.${bookingId}` : null
  const [intent, setIntent] = useState<ProposalIntent | null>(() => {
    try {
      const saved = scope && sessionStorage.getItem(scope)
      const parsed = saved ? JSON.parse(saved) as ProposalIntent : null
      return typeof parsed?.key === 'string' && typeof parsed.proposal?.description === 'string'
        && Number.isInteger(parsed.proposal.quantity) && Number.isInteger(parsed.proposal.unitPriceCents) ? parsed : null
    } catch {
      return null
    }
  })
  const [description, setDescription] = useState(intent?.proposal.description ?? '')
  const [quantity, setQuantity] = useState(String(intent?.proposal.quantity ?? 1))
  const [price, setPrice] = useState(intent ? (intent.proposal.unitPriceCents / 100).toFixed(2) : '')
  const [reason, setReason] = useState('')
  const [evidence, setEvidence] = useState('')
  const [decision, setDecision] = useState<BookingExtraDecision | ''>('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submitting = useRef(false)
  const proposal = action.kind === 'proposal'
  const inPerson = action.kind === 'in-person'
  const parsedPrice = /^\d{1,7}(?:[.,]\d{1,2})?$/.test(price.trim()) ? Math.round(Number(price.replace(',', '.')) * 100) : 0
  const amount = parsedPrice * Number(quantity)
  const title = proposal ? 'Propor adicional' : inPerson ? 'Registrar decisão presencial' : 'Decidir sobre adicional'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    if (!proposal && (!decision || (inPerson && (!reason.trim() || !evidence.trim())))) {
      setError('Confira a decisão, o motivo e a prova do registro.')
      return
    }
    submitting.current = true
    setSaving(true)
    setError('')
    try {
      if (action.kind === 'proposal') {
        const count = Number(quantity)
        if (!scope || !description.trim() || !Number.isInteger(count) || count < 1 || count > 100 || amount < 1 || amount > 100_000_000) {
          setError('Confira a descrição, a quantidade e o valor do adicional.')
          return
        }
        const request = intent ?? { key: crypto.randomUUID(), proposal: { description: description.trim(), quantity: count, unitPriceCents: parsedPrice } }
        sessionStorage.setItem(scope, JSON.stringify(request))
        setIntent(request)
        await bookingService.proposeExtra(bookingId, request.proposal, request.key)
        sessionStorage.removeItem(scope)
      } else {
        if (!decision) return
        if (inPerson) await bookingService.decideExtraInPerson(action.extra, decision, reason.trim(), evidence.trim())
        else await bookingService.decideExtraDigital(action.extra, decision)
      }
      onSaved()
    } catch (err) {
      if (scope && isAxiosError(err) && [400, 409, 422].includes(err.response?.status ?? 0)) {
        sessionStorage.removeItem(scope)
        setIntent(null)
      }
      setError(bookingError(err, 'Não foi possível salvar. Tente novamente.'))
    } finally {
      submitting.current = false
      setSaving(false)
    }
  }

  return (
    <Dialog open title={title} onOpenChange={open => { if (!open && !saving) onClose() }}>
      <form className="space-y-4" onSubmit={submit}>
        {action.kind === 'proposal' ? (
          <>
            <TextField required label="Descrição" maxLength={300} disabled={saving || !!intent} value={description} onChange={e => setDescription(e.target.value)} />
            <TextField required label="Quantidade" type="number" min={1} max={100} disabled={saving || !!intent} value={quantity} onChange={e => setQuantity(e.target.value)} />
            <TextField required label="Valor unitário (R$)" inputMode="decimal" maxLength={10} disabled={saving || !!intent} value={price} onChange={e => setPrice(e.target.value)} />
            {amount > 0 && <p className="text-sm font-semibold text-text-body">Total {currency.format(amount / 100)}</p>}
            {intent && !saving && <p className="text-sm text-text-muted">Repita o envio para confirmar o registro desta proposta.</p>}
          </>
        ) : (
          <>
            <ExtraSummary extra={action.extra} />
            <SelectField required label={inPerson ? 'Decisão do tutor' : 'Sua decisão'} disabled={saving} value={decision}
              onChange={e => setDecision(e.target.value as BookingExtraDecision | '')}>
              <option value="">Selecione</option>
              <option value="APPROVE">Autorizar adicional</option>
              <option value="REJECT">Recusar adicional</option>
            </SelectField>
            {inPerson && <>
              <TextField required label="Motivo" maxLength={500} disabled={saving} value={reason} onChange={e => setReason(e.target.value)} />
              <TextField required label="Prova declarada" hint="Informe uma referência ao registro do aceite ou da recusa do tutor, sem dados de contato."
                maxLength={500} disabled={saving} value={evidence} onChange={e => setEvidence(e.target.value)} />
            </>}
          </>
        )}
        {error && <p className="text-sm text-text-danger" role="alert">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" disabled={saving} onClick={onClose}>Voltar</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : proposal ? 'Enviar proposta' : 'Registrar decisão'}</Button>
        </div>
      </form>
    </Dialog>
  )
}

export function BookingExtrasPanel({ bookingId, mode, inProgress }: { bookingId: string; mode: Mode; inProgress: boolean }) {
  const [expanded, setExpanded] = useState(mode !== 'tutor' || inProgress)
  const [page, setPage] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [action, setAction] = useState<Action | null>(null)
  const [result, setResult] = useState<{ page: number; attempt: number; data?: PageResponse<BookingExtra>; error?: string } | null>(null)
  const current = result?.attempt === attempt && result.page === page ? result : null

  useEffect(() => {
    if (!expanded) return
    let active = true
    bookingService.extras(bookingId, page)
      .then(data => { if (active) setResult({ page, attempt, data }) })
      .catch(err => { if (active) setResult({ page, attempt, error: bookingError(err, 'Não foi possível consultar os adicionais.') }) })
    return () => { active = false }
  }, [bookingId, page, attempt, expanded])

  function refresh() { setAttempt(value => value + 1) }

  return (
    <section aria-label="Adicionais" className="space-y-3 rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-text-heading">Adicionais</h3>
        <div className="flex flex-wrap gap-2">
          {mode !== 'tutor' && inProgress && <Button size="sm" onClick={() => setAction({ kind: 'proposal' })}>Propor adicional</Button>}
          {expanded
            ? <Button size="sm" variant="secondary" onClick={refresh}>Atualizar adicionais</Button>
            : <Button size="sm" variant="secondary" onClick={() => setExpanded(true)}>Consultar adicionais</Button>}
        </div>
      </div>
      {expanded && !current && <p className="text-sm text-text-muted" role="status">Carregando adicionais…</p>}
      {expanded && current?.error && <p className="text-sm text-text-danger" role="alert">{current.error}</p>}
      {expanded && current?.data && <>
        {current.data.content.length === 0 && <p className="text-sm text-text-muted">Nenhuma proposta registrada.</p>}
        <ul className="space-y-2">
          {current.data.content.map(extra => (
            <li className="space-y-2 rounded-lg border border-border p-3" key={extra.id}>
              <ExtraSummary extra={extra} />
              <p className="text-sm text-text-muted">{labels[extra.status]}{extra.channel === 'IN_PERSON' ? ' · Registro presencial' : ''}</p>
              {inProgress && extra.status === 'PENDING' && mode !== 'operator' && (
                <Button size="sm" variant="secondary" onClick={() => setAction({ kind: mode === 'desk' ? 'in-person' : 'digital', extra })}>
                  {mode === 'desk' ? 'Registrar decisão presencial' : 'Revisar e decidir'}
                </Button>
              )}
            </li>
          ))}
        </ul>
        {current.data.totalPages > 1 && <Pagination page={page + 1} totalPages={current.data.totalPages} onPageChange={value => setPage(value - 1)} />}
      </>}
      {action && <ExtraDialog action={action} bookingId={bookingId} onClose={() => setAction(null)} onSaved={() => {
        if (action.kind === 'proposal') setPage(0)
        setAction(null)
        refresh()
      }} />}
    </section>
  )
}
