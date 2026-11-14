import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import { History } from 'lucide-react'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Card, CardContent } from '../../components/ui/Card'
import { SelectField, TextField } from '../../components/ui/Field'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { Pagination } from '../../components/ui/Pagination'
import { usePanelQuery } from '../../routes/usePanelQuery'
import { supportError } from '../../features/support/presentation'
import type { SupportPage } from '../../services/support.service'

const actions = {
  CUSTOMER_ACTIVATED: 'Conta reativada', CUSTOMER_DEACTIVATED: 'Conta desativada',
  TEAM_INVITED: 'Convite enviado', TEAM_INVITATION_ACCEPTED: 'Convite aceito', TEAM_ACCESS_REVOKED: 'Acesso revogado',
}

type Snapshot = { active?: boolean; status?: string; accessRole?: string }
type AuditEvent = {
  id: string; occurredAt: string; actorId: string; actorRole: string; targetType: 'CUSTOMER' | 'TEAM_ACCESS'
  targetId: string; targetUserId: string | null; partnerId: string | null; action: keyof typeof actions
  before: Snapshot | null; after: Snapshot | null; reason: string
}

const targets = { CUSTOMER: 'Conta de tutor', TEAM_ACCESS: 'Acesso de equipe' }
const snapshotLabels: Record<string, string> = {
  PENDING: 'Pendente', ACTIVE: 'Ativo', EXPIRED: 'Expirado', REVOKED: 'Revogado',
  RECEPTION: 'Recepção', MANAGER: 'Gestor', PROFESSIONAL: 'Profissional',
}

function snapshot(value: Snapshot | null) {
  if (!value) return '—'
  if (value.active !== undefined) return value.active ? 'Ativa' : 'Inativa'
  return [value.status, value.accessRole].filter((item): item is string => Boolean(item))
    .map(item => snapshotLabels[item] ?? item).join(' · ') || '—'
}

export default function IdentityAuditPage() {
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [page, setPage] = useState(0)
  const load = useCallback((signal: AbortSignal) => api.get<SupportPage<AuditEvent>>('/admin/identity-audit', {
    params: { ...filters, page, size: 20 }, signal,
  }).then(response => response.data), [filters, page])
  const { result, reload } = usePanelQuery(load)

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const entries = [...new FormData(event.currentTarget)].map(([key, value]) => [key, String(value).trim()])
    setFilters(Object.fromEntries(entries.filter(([, value]) => value)))
    setPage(0)
  }

  return <div className="space-y-5">
    <h1 className="text-2xl font-bold text-text-heading lg:text-3xl">Auditoria de identidade</h1>
    <Card><CardContent>
      <form onSubmit={search} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <SelectField name="targetType" label="Tipo de registro"><option value="">Todos</option>
            {Object.entries(targets).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </SelectField>
          <SelectField name="action" label="Ação"><option value="">Todas</option>
            {Object.entries(actions).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </SelectField>
          <TextField name="targetId" label="ID do registro" maxLength={36} />
          <TextField name="actorId" label="ID do autor" maxLength={36} />
          <TextField name="partnerId" label="ID do estabelecimento" maxLength={36} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Filtrar auditoria</Button>
          <Button type="reset" variant="secondary" onClick={() => { setFilters({}); setPage(0) }}>Limpar filtros</Button>
        </div>
      </form>
    </CardContent></Card>
    <Card>
      {!result ? <LoadingState label="Carregando auditoria…" /> : result.status === 'error' ? (
        <ErrorState message={supportError(result.cause, 'Não foi possível consultar a auditoria. Confira os filtros.')}
          action={<Button variant="secondary" onClick={reload}>Tentar novamente</Button>} />
      ) : result.data.content.length ? <ul className="divide-y divide-border">
        {result.data.content.map(item => <li key={item.id} className="space-y-2 px-5 py-4 text-sm text-text-body wrap-anywhere">
          <h2 className="font-semibold text-text-heading">{actions[item.action] ?? item.action}</h2>
          <time dateTime={item.occurredAt}>{new Date(item.occurredAt).toLocaleString('pt-BR')}</time>
          <p>{targets[item.targetType]} · {item.targetId}</p>
          {item.partnerId && <p>Estabelecimento {item.partnerId}</p>}
          <p>Autor {item.actorId} · {item.actorRole}</p>
          <p>Antes: {snapshot(item.before)} · Depois: {snapshot(item.after)}</p>
          <p className="whitespace-pre-wrap">{item.reason}</p>
        </li>)}
      </ul> : <EmptyState icon={History} title="Nenhum evento nesta página" />}
      {result?.status === 'ready' && <Pagination page={page + 1} totalPages={result.data.totalPages} onPageChange={value => setPage(value - 1)} />}
    </Card>
  </div>
}
