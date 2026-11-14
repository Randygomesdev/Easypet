import { RefreshCw } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardContent } from '../../components/ui/Card'
import { useMasterStatus } from '../../features/master/useMasterStatus'

const labels: Record<string, string> = {
  frontend: 'Interface', 'gateway-service': 'Gateway', 'auth-service': 'Identidade', 'pet-service': 'Pets',
  'partner-service': 'Estabelecimentos', 'booking-service': 'Agendamentos', 'payment-service': 'Caixa',
  'notification-service': 'Notificações', 'auth-db': 'Banco de identidade', 'pet-db': 'Banco de pets',
  'partner-db': 'Banco de estabelecimentos', 'booking-db': 'Banco de agendamentos',
  'payment-db': 'Banco de caixa', 'notification-db': 'Banco de notificações', redis: 'Redis', 'smtp-capture': 'E-mail de testes',
}
const states = { HEALTHY: 'Saudável', UNHEALTHY: 'Com falha', STOPPED: 'Parado', MISSING: 'Ausente', UNKNOWN: 'Sem confirmação' }
const memory = (bytes: number | null) => bytes === null ? '—' : `${(bytes / 1048576).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MiB`

export default function MasterSystemPage() {
  const { data, error, loading, refresh } = useMasterStatus()
  const fresh = data?.state === 'AVAILABLE'
  const rows = data?.services ?? []
  const knownMemory = rows.filter(row => row.memoryBytes !== null)
  const healthy = rows.filter(row => row.status === 'HEALTHY').length
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-text-heading lg:text-3xl">Sistema</h1>
        <p className="mt-2 text-sm text-text-muted">Saúde e memória dos serviços do EasyPet. Atualização a cada minuto enquanto esta tela está aberta.</p></div>
      <Button variant="secondary" onClick={refresh} disabled={loading}><RefreshCw size={16} aria-hidden="true" />Atualizar status</Button>
    </div>
    {loading && <p role="status" className="text-sm text-text-muted">Consultando monitoramento…</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {data?.state === 'UNAVAILABLE' && <Card><CardContent><h2 className="font-semibold text-text-heading">Monitoramento indisponível</h2>
      <p className="mt-2 text-sm text-text-muted">Ainda não recebemos uma coleta válida. A operação técnica precisa verificar o coletor do ambiente.</p></CardContent></Card>}
    {data?.state === 'STALE' && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Coleta desatualizada. Os valores abaixo são históricos e não confirmam a saúde atual.</p>}
    {data?.collectedAt && <p className="text-xs text-text-muted">Última coleta: {new Date(data.collectedAt).toLocaleString('pt-BR')} · {data.sampleAgeSeconds} segundos antes da consulta.</p>}
    {rows.length > 0 && <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent><h2 className="text-sm text-text-muted">Serviços saudáveis</h2><p className="mt-2 text-2xl font-bold text-text-heading">{fresh ? `${healthy} de ${rows.length}` : 'Sem confirmação atual'}</p></CardContent></Card>
        <Card><CardContent><h2 className="text-sm text-text-muted">Memória dos serviços</h2><p className="mt-2 text-2xl font-bold text-text-heading">{knownMemory.length ? memory(knownMemory.reduce((sum, row) => sum + row.memoryBytes!, 0)) : '—'}</p><p className="mt-1 text-xs text-text-muted">{knownMemory.length} de {rows.length} serviços medidos; inclui cache.</p></CardContent></Card>
        <Card><CardContent><h2 className="text-sm text-text-muted">Memória disponível na VPS</h2><p className="mt-2 text-2xl font-bold text-text-heading">{memory(data?.hostMemory?.availableBytes ?? null)}</p><p className="mt-1 text-xs text-text-muted">{data?.hostMemory ? `Total do host: ${memory(data.hostMemory.totalBytes)}` : 'Métrica do host não coletada neste ambiente.'}</p></CardContent></Card>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(row => {
          const pressure = row.memoryBytes !== null && row.limitBytes !== null && row.limitBytes > 0 && row.memoryBytes / row.limitBytes >= 0.9
          return <Card key={row.id}><CardContent>
            <div className="flex flex-wrap items-start justify-between gap-2"><h2 className="font-semibold text-text-heading">{labels[row.id] ?? 'Serviço'}</h2>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${fresh && row.status === 'HEALTHY' ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-900'}`}>{fresh ? states[row.status] : 'Última coleta'}</span></div>
            <p className="mt-3 text-sm text-text-body">Memória: {memory(row.memoryBytes)} / {memory(row.limitBytes)}</p>
            {pressure && <p className="mt-1 text-xs font-semibold text-amber-800">Uso de memória acima de 90% do limite na coleta.</p>}
            <p className="mt-2 text-xs text-text-muted">Reinícios automáticos: {row.restarts ?? '—'}</p>
            <p className="mt-1 text-xs text-text-muted">Último início: {row.startedAt ? new Date(row.startedAt).toLocaleString('pt-BR') : '—'}</p>
            {row.oomKilled && <p className="mt-2 text-xs font-semibold text-red-800">Docker registrou encerramento por falta de memória.</p>}
            {!fresh && <p className="mt-2 text-xs text-text-muted">Situação registrada: {states[row.status]}</p>}
          </CardContent></Card>
        })}
      </div>
      <p className="text-xs text-text-muted">Saúde corresponde à verificação dos containers. Não substitui o teste das jornadas. A memória da VPS inclui outros sistemas; a lista mostra somente o EasyPet.</p>
    </>}
  </div>
}
