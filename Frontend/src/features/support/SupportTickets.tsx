import { isAxiosError } from 'axios'
import { useCallback, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { LifeBuoy } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { TextField } from '../../components/ui/Field'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { Pagination } from '../../components/ui/Pagination'
import { usePanelQuery } from '../../routes/usePanelQuery'
import { supportService, type TicketInput } from '../../services/support.service'
import { supportError, supportStatus } from './presentation'

const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i

export default function SupportTickets() {
  const [page, setPage] = useState(0)
  const load = useCallback((signal: AbortSignal) => supportService.tickets(page, signal), [page])
  const { result, reload } = usePanelQuery(load)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; error: boolean }>()
  const pending = useRef<{ key: string; body: TicketInput } | null>(null)
  const inFlight = useRef(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current) return
    const form = event.currentTarget
    const data = new FormData(form)
    const body = {
      subject: String(data.get('subject') ?? '').trim(),
      message: String(data.get('message') ?? '').trim(),
      bookingId: String(data.get('bookingId') ?? '').trim() || null,
    }
    if (!body.subject || !body.message || (body.bookingId && !uuid.test(body.bookingId))) {
      setFeedback({ message: 'Informe título, mensagem e, se necessário, um ID de reserva válido.', error: true })
      return
    }
    // Replay only the same body after an ambiguous result.
    if (pending.current && JSON.stringify(pending.current.body) !== JSON.stringify(body)) {
      setFeedback({ message: 'Restaure o conteúdo da última tentativa para confirmar se o chamado foi registrado.', error: true })
      return
    }
    pending.current ??= { key: crypto.randomUUID(), body }
    inFlight.current = true
    setSaving(true)
    setFeedback(undefined)
    try {
      await supportService.create(body, pending.current.key)
      pending.current = null
      form.reset()
      setPage(0)
      reload()
      setFeedback({ message: 'Chamado registrado.', error: false })
    } catch (cause) {
      const status = isAxiosError(cause) ? cause.response?.status : undefined
      if (status === 400 || status === 403 || status === 404) pending.current = null
      setFeedback({ message: supportError(cause, 'Não foi possível confirmar o registro. Tente novamente.'), error: true })
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }

  return <>
    <Card>
      <CardHeader title="Registrar chamado" />
      <CardContent>
        <form className="space-y-4" onSubmit={submit} aria-busy={saving}>
          <TextField name="subject" label="Título" maxLength={120} required disabled={saving} />
          <TextField name="bookingId" label="ID da reserva (opcional)" maxLength={36} disabled={saving} />
          <div className="space-y-1">
            <label htmlFor="support-message" className="block text-xs font-semibold uppercase tracking-wide text-text-body">Mensagem</label>
            <textarea id="support-message" name="message" rows={4} maxLength={2000} required disabled={saving}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text-body focus-visible:outline-2 focus-visible:outline-primary-400" />
          </div>
          {feedback && <p role={feedback.error ? 'alert' : 'status'} className={feedback.error ? 'text-sm text-text-danger' : 'text-sm text-text-body'}>{feedback.message}</p>}
          <Button type="submit" disabled={saving}>{saving ? 'Registrando…' : 'Registrar chamado'}</Button>
        </form>
      </CardContent>
    </Card>
    <Card>
      <CardHeader title="Meus chamados" />
      {!result ? <LoadingState label="Carregando chamados…" /> : result.status === 'error' ? (
        <ErrorState message={supportError(result.cause, 'Não foi possível carregar os chamados.')}
          action={<Button variant="secondary" onClick={reload}>Tentar novamente</Button>} />
      ) : result.data.content.length === 0 ? <EmptyState icon={LifeBuoy} title="Nenhum chamado nesta página" /> : (
        <ul className="divide-y divide-border">
          {result.data.content.map(ticket => <li key={ticket.id} className="space-y-2 px-5 py-4 text-sm text-text-body">
            <div className="flex flex-wrap items-center gap-2"><h3 className="break-words font-semibold text-text-heading">{ticket.subject}</h3>
              <Badge>{supportStatus[ticket.status]}</Badge></div>
            <p className="whitespace-pre-wrap break-words">{ticket.message}</p>
            <time dateTime={ticket.createdAt} className="text-xs">{new Date(ticket.createdAt).toLocaleString('pt-BR')}</time>
            {ticket.resolutionMessage && <div className="space-y-1 rounded-xl bg-bg p-3">
              <p className="font-semibold text-text-heading">Resposta da administração</p>
              <p className="whitespace-pre-wrap wrap-anywhere">{ticket.resolutionMessage}</p>
              {ticket.resolvedAt && <time dateTime={ticket.resolvedAt} className="text-xs">{new Date(ticket.resolvedAt).toLocaleString('pt-BR')}</time>}
            </div>}
          </li>)}
        </ul>
      )}
      {result?.status === 'ready' && <Pagination page={page + 1} totalPages={result.data.totalPages} onPageChange={value => setPage(value - 1)} />}
    </Card>
  </>
}
