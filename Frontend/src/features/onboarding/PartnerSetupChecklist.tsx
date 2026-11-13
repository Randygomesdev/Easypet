import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { activeServiceIds, linkedStaff, type usePartnerSetup } from './usePartnerSetup'

const linkClass = `inline-flex min-h-11 items-center gap-1 rounded px-2 text-sm font-semibold text-text-heading underline
  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400`

export default function PartnerSetupChecklist({ setup }: { setup: ReturnType<typeof usePartnerSetup> }) {
  const { partner, staff, schedule, retry } = setup
  const establishment = partner.status === 'ready' ? partner.data : null
  const services = establishment ? activeServiceIds(establishment) : new Set<string>()
  const collaborators = establishment && staff.status === 'ready' ? linkedStaff(staff.data, establishment) : []
  const scheduledStaffId = schedule.status === 'ready' ? schedule.data : null
  const staffId = scheduledStaffId ?? collaborators[0]?.id
  const staffPath = staffId ? `/partner/colaboradores/${encodeURIComponent(staffId)}` : '/partner/colaboradores'
  const steps = [
    { title: 'Estabelecimento', done: establishment?.active === true, to: '/partner/cadastro', action: 'Abrir cadastro' },
    { title: 'Serviço ativo', done: services.size > 0, to: '/partner/servicos', action: 'Abrir serviços' },
    { title: 'Colaborador ativo vinculado a um serviço', done: collaborators.length > 0,
      to: '/partner/colaboradores', action: 'Abrir colaboradores' },
    { title: 'Escala cadastrada', done: Boolean(scheduledStaffId), to: staffPath,
      action: staffId ? 'Abrir colaborador para editar escala' : 'Ver colaboradores para configurar escala' },
  ]
  const failed = [partner, staff, schedule].some(read => read.status === 'error')
  const loading = partner.status === 'loading' || Boolean(establishment && !failed
    && (staff.status === 'loading' || schedule.status === 'loading'))

  return (
    <Card role="region" aria-label="Configuração inicial">
      <CardHeader title="Configuração inicial" description="Confira o cadastro, os serviços e a escala do estabelecimento." />
      {loading ? <LoadingState label="Verificando a configuração…" /> : (
        <CardContent className="space-y-3">
          {failed && <ErrorState message="Não foi possível verificar toda a configuração."
            action={<Button variant="secondary" onClick={retry}>Tentar novamente</Button>} />}
          {partner.status === 'ready' && !establishment && (
            <p className="text-sm text-text-body">Cadastre o estabelecimento para configurar os serviços, colaboradores e horários.</p>
          )}
          {establishment?.active === false && (
            <p className="text-sm text-text-body">O estabelecimento está inativo. Consulte a administração de homologação.</p>
          )}
          {partner.status === 'ready' && (
            <ul className="divide-y divide-border">
              {steps.map(({ title, done, to, action }, index) => {
                const unavailable = (index === 2 && staff.status === 'error') || (index === 3 && failed)
                const blocked = index > 0 && !establishment
                const inactive = index === 0 && establishment?.active === false
                return (
                  <li key={title} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-text-heading">{title}</span>
                      <Badge tone={done ? 'success' : unavailable || blocked ? 'neutral' : 'warning'}>
                        {done ? 'Concluído' : unavailable ? 'Não verificado' : inactive ? 'Inativo'
                          : blocked ? 'Aguardando cadastro' : 'Pendente'}
                      </Badge>
                    </div>
                    {!blocked && <Link className={linkClass} to={to}>{action}<ArrowUpRight size={14} aria-hidden="true" /></Link>}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      )}
    </Card>
  )
}
