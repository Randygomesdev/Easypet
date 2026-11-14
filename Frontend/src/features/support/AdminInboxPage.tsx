import { useCallback, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Card, CardContent } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { SelectField } from '../../components/ui/Field'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { Pagination } from '../../components/ui/Pagination'
import { usePanelQuery } from '../../routes/usePanelQuery'
import { supportService, type InboxAction, type InboxItem, type InboxKind, type SupportStatus } from '../../services/support.service'
import { inboxTitle, supportError, supportStatus } from './presentation'

const severity = { INFO: 'Informativo', WARNING: 'Atenção', ERROR: 'Erro' }

function Item({ item, disabled, onUpdate }: { item: InboxItem; disabled: boolean; onUpdate: (action: InboxAction) => void }) {
  const date = (value: string) => new Date(value).toLocaleString('pt-BR')
  return <li className="space-y-3 px-5 py-4 text-sm text-text-body">
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="min-w-0 break-words font-semibold text-text-heading">{inboxTitle(item)}</h2>
      <Badge>{item.kind === 'TICKET' ? 'Chamado' : 'Alerta'}</Badge>
      <Badge tone={item.status === 'RESOLVED' ? 'success' : 'info'}>{supportStatus[item.status]}</Badge>
      {item.severity && <Badge tone={item.severity === 'ERROR' ? 'danger' : 'neutral'}>{severity[item.severity]}</Badge>}
      {!item.readAt && <Badge tone="warning">Não lido</Badge>}
    </div>
    {item.message && <p className="whitespace-pre-wrap break-words">{item.message}</p>}
    {item.resolutionMessage && <p className="whitespace-pre-wrap wrap-anywhere">Resposta: {item.resolutionMessage}</p>}
    <dl className="space-y-1 text-xs wrap-anywhere">
      <div><dt className="inline font-semibold">Aberto em </dt><dd className="inline">{date(item.createdAt)}</dd></div>
      {item.requesterId && <div><dt className="inline font-semibold">Solicitante </dt><dd className="inline">{item.requesterId}</dd></div>}
      {item.correlationId && <div><dt className="inline font-semibold">Correlação </dt><dd className="inline">{item.correlationId}</dd></div>}
      {item.service && <div><dt className="inline font-semibold">Serviço </dt><dd className="inline">{item.service}</dd></div>}
      {item.signalState && <div><dt className="inline font-semibold">Sinal </dt><dd className="inline">{item.signalState === 'RECOVERED' ? 'Recuperado' : 'Ativo'}</dd></div>}
      {item.readAt && <div><dt className="inline font-semibold">Leitura </dt><dd className="inline">{date(item.readAt)} · {item.readBy}</dd></div>}
      {item.acknowledgedAt && <div><dt className="inline font-semibold">Reconhecimento </dt><dd className="inline">{date(item.acknowledgedAt)} · {item.acknowledgedBy}</dd></div>}
      {item.resolvedAt && <div><dt className="inline font-semibold">Resolução </dt><dd className="inline">{date(item.resolvedAt)} · {item.resolutionOrigin === 'SYSTEM' ? 'Sistema' : item.resolvedBy}</dd></div>}
    </dl>
    <div className="flex flex-wrap items-center gap-2">
      {item.bookingId && <Link className="inline-flex min-h-11 items-center rounded px-2 font-semibold text-text-heading underline focus-visible:outline-2 focus-visible:outline-primary-400" to={`/admin/ocorrencias?reserva=${encodeURIComponent(item.bookingId)}`}>Investigar reserva</Link>}
      {!item.readAt && <Button variant="secondary" size="sm" disabled={disabled} onClick={() => onUpdate('read')}>Marcar como lido</Button>}
      {item.status === 'OPEN' && <Button variant="secondary" size="sm" disabled={disabled} onClick={() => onUpdate('acknowledge')}>Reconhecer</Button>}
      {item.status !== 'RESOLVED' && <Button size="sm" disabled={disabled} onClick={() => onUpdate('resolve')}>Resolver</Button>}
    </div>
  </li>
}

export default function AdminInboxPage() {
  const [kind, setKind] = useState<InboxKind | ''>('')
  const [status, setStatus] = useState<SupportStatus | ''>('')
  const [page, setPage] = useState(0)
  const load = useCallback((signal: AbortSignal) => supportService.inbox({ page, size: 20, kind: kind || undefined, status: status || undefined }, signal), [page, kind, status])
  const { result, reload } = usePanelQuery(load)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ error: boolean; text: string }>()
  const [resolving, setResolving] = useState<InboxItem>()
  const [response, setResponse] = useState('')
  const inFlight = useRef(false)

  async function update(id: string, action: InboxAction, resolutionMessage?: string) {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setMessage(undefined)
    try {
      await supportService.update(id, action, resolutionMessage)
      setResolving(undefined)
      setMessage({ error: false, text: 'Estado registrado.' })
      window.dispatchEvent(new Event('easypet:inbox-updated'))
      reload()
    } catch (cause) {
      setMessage({ error: true, text: supportError(cause, 'Não foi possível atualizar o registro.') })
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return <div className="space-y-5">
    <h1 className="text-2xl font-bold text-text-heading lg:text-3xl">Alertas e chamados</h1>
    <Card><CardContent className="flex flex-wrap items-end gap-3">
      <SelectField label="Tipo" value={kind} onChange={e => { setKind(e.target.value as InboxKind | ''); setPage(0) }}>
        <option value="">Todos</option><option value="ALERT">Alertas</option><option value="TICKET">Chamados</option>
      </SelectField>
      <SelectField label="Estado" value={status} onChange={e => { setStatus(e.target.value as SupportStatus | ''); setPage(0) }}>
        <option value="">Todos</option>{Object.entries(supportStatus).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </SelectField>
      <Button variant="secondary" onClick={reload} disabled={busy || !result}>Atualizar central</Button>
    </CardContent></Card>
    {message && !resolving && <p role={message.error ? 'alert' : 'status'} className={message.error ? 'text-sm text-text-danger' : 'text-sm text-text-body'}>{message.text}</p>}
    <Card aria-busy={busy || !result}>
      {!result ? <LoadingState label="Carregando alertas e chamados…" /> : result.status === 'error' ? (
        <ErrorState message={supportError(result.cause, 'Não foi possível carregar a central.')}
          action={<Button variant="secondary" onClick={reload}>Tentar novamente</Button>} />
      ) : result.data.content.length ? <ul className="divide-y divide-border">
        {result.data.content.map(item => <Item key={item.id} item={item} disabled={busy} onUpdate={action => {
          if (action === 'resolve' && item.kind === 'TICKET') {
            setMessage(undefined)
            setResponse('')
            setResolving(item)
          } else void update(item.id, action)
        }} />)}
      </ul> : <EmptyState icon={Bell} title="Nenhum alerta ou chamado nesta página" />}
      {result?.status === 'ready' && <Pagination page={page + 1} totalPages={result.data.totalPages} onPageChange={value => setPage(value - 1)} />}
    </Card>
    <Dialog open={Boolean(resolving)} title="Resolver chamado" onOpenChange={open => { if (!open && !busy) setResolving(undefined) }}>
      <form className="space-y-3" onSubmit={event => {
        event.preventDefault()
        if (resolving && response.trim()) void update(resolving.id, 'resolve', response.trim())
      }}>
        <label htmlFor="support-resolution" className="block text-sm font-semibold text-text-heading">Resposta ao solicitante</label>
        <textarea id="support-resolution" rows={4} maxLength={2000} required disabled={busy} value={response}
          onChange={event => setResponse(event.target.value)} className="w-full rounded-xl border border-border bg-bg p-3 text-sm focus-visible:outline-2 focus-visible:outline-primary-400" />
        {message?.error && <p role="alert" className="text-sm text-text-danger">{message.text}</p>}
        <Button type="submit" disabled={busy || !response.trim()}>{busy ? 'Salvando…' : 'Registrar resolução'}</Button>
      </form>
    </Dialog>
  </div>
}
