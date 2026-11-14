import { Link } from 'react-router-dom'
import { Building2, Users, Server, Bell, ArrowUpRight, RefreshCw, History, Search, LifeBuoy } from 'lucide-react'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useCustomerQuery } from '../../features/customers/useCustomerQuery'
import { masterOverview } from '../../features/master/master.service'
import { waveBEnabled } from '../../routes/access'

const indicators = ['Estabelecimentos ativos', 'Estabelecimentos inativos', 'Tutores ativos', 'Tutores inativos']
const sections = [
  { title: 'Estabelecimentos', text: 'Consulte cadastros, serviços e equipe. Gerencie a situação e seu histórico.', path: '/admin/parceiros', icon: Building2 },
  { title: 'Tutores', text: 'Consulte contas da plataforma e cadastros de balcão. Gerencie o acesso dos tutores.', path: '/admin/clientes', icon: Users },
  { title: 'Sistema', text: 'Acompanhe a saúde dos serviços, o consumo de memória e a atualização da coleta.', path: '/admin/sistema', icon: Server },
  { title: 'Alertas e chamados', text: 'Acompanhe alertas operacionais e responda aos chamados internos.', path: '/admin/alertas', icon: LifeBuoy },
  { title: 'Ocorrências', text: 'Consulte histórico, caixa e tentativas de entrega por reserva.', path: '/admin/ocorrencias', icon: Search },
  { title: 'Auditoria', text: 'Consulte alterações em contas e acessos da equipe.', path: '/admin/auditoria', icon: History },
  ...(waveBEnabled ? [{ title: 'Notificações', text: 'Investigue falhas de entrega e acompanhe as tentativas de envio.', path: '/admin/notificacoes', icon: Bell }] : []),
]

export default function MasterDashboardPage() {
  const { data, loading, error, reload } = useCustomerQuery(masterOverview, 'Não foi possível consultar os indicadores.')
  const partial = data?.some(result => result.status === 'rejected')
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm font-semibold text-primary-700">Administração da plataforma</p>
          <h1 className="mt-1 text-2xl font-bold text-text-heading lg:text-3xl">Painel master</h1>
          <p className="mt-2 text-sm text-text-muted">Visão geral do EasyPet e acesso à operação da plataforma.</p></div>
        <Button variant="secondary" onClick={reload} disabled={loading}><RefreshCw size={16} aria-hidden="true" />Atualizar indicadores</Button>
      </div>
      {(error || partial) && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        {error ?? 'Alguns indicadores estão indisponíveis. Os demais continuam disponíveis.'}
      </p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy={loading}>
        {indicators.map((label, index) => {
          const result = data?.[index]
          return <Card key={label}><CardContent><h2 className="text-sm text-text-muted">{label}</h2>
            <p className="mt-2 text-3xl font-bold text-text-heading">{loading ? '…' : result?.status === 'fulfilled' ? result.value.toLocaleString('pt-BR') : '—'}</p>
            <p className="mt-2 text-xs text-text-muted">{loading ? 'Consultando' : result?.status === 'fulfilled' ? 'Total cadastrado na plataforma' : 'Consulta indisponível'}</p>
          </CardContent></Card>
        })}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map(({ title, text, path, icon: Icon }) => <Link key={path} to={path}
          className="group rounded-2xl border border-border bg-surface p-5 shadow-sm transition-colors hover:border-primary-700 focus-visible:outline-2 focus-visible:outline-primary-700">
          <div className="flex items-center justify-between"><Icon size={24} className="text-primary-700" aria-hidden="true" /><ArrowUpRight size={18} aria-hidden="true" /></div>
          <h2 className="mt-4 font-bold text-text-heading">{title}</h2><p className="mt-2 text-sm text-text-muted">{text}</p>
        </Link>)}
      </div>
      <p className="text-xs text-text-muted">As contas de tutores e os cadastros de balcão são consultados separadamente. As alterações administrativas mantêm as regras de acesso existentes.</p>
    </div>
  )
}
