import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import RevokeTeamAccessDialog from '../../features/team/RevokeTeamAccessDialog'
import StaffAssignmentsCard from '../../features/team/StaffAssignmentsCard'
import TeamAccessList from '../../features/team/TeamAccessList'
import TeamInviteForm from '../../features/team/TeamInviteForm'
import { authRetryMessage, authService, getAuthError, getAuthErrorStatus } from '../../services/auth.service'
import { partnerService } from '../../services/partner.service'
import type { TeamAccess } from '../../types/auth.types'

type TeamState =
  | { status: 'loading' }
  | { status: 'ready'; partnerId: string; accesses: TeamAccess[] }
  | { status: 'error'; message: string; missingPartner: boolean }

export default function EquipePage() {
  const [team, setTeam] = useState<TeamState>({ status: 'loading' })
  const [revision, setRevision] = useState(0)
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState<TeamAccess | null>(null)

  useEffect(() => {
    const request = new AbortController()
    Promise.all([partnerService.getMe(), authService.listTeamAccesses(request.signal)])
      .then(([partner, accesses]) => {
        if (!request.signal.aborted) setTeam({ status: 'ready', partnerId: partner.id, accesses })
      })
      .catch(cause => {
        if (!request.signal.aborted) {
          setTeam({ status: 'error', missingPartner: getAuthErrorStatus(cause) === 404,
            message: authRetryMessage(cause) ?? getAuthError(cause)?.message ?? 'Não foi possível carregar os acessos da equipe.' })
        }
      })
    return () => request.abort()
  }, [revision])

  function reload(message = '') {
    setTeam({ status: 'loading' })
    setNotice(message)
    setRevision(current => current + 1)
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-text-heading lg:text-3xl">Equipe</h1>
        <p className="mt-1 text-sm text-text-body">Convide pessoas e gerencie os acessos do estabelecimento.</p>
      </header>
      {notice && <p role="status" className="text-sm text-text-body">{notice}</p>}
      {team.status === 'loading' && <LoadingState label="Carregando equipe…" />}
      {team.status === 'error' && <ErrorState message={team.message} action={team.missingPartner
        ? <Link to="/partner/cadastro" className="text-sm font-semibold text-text-heading underline">Abrir cadastro do estabelecimento</Link>
        : <Button variant="secondary" onClick={() => reload()}>Tentar novamente</Button>} />}
      {team.status === 'ready' && (
        <>
          <Card>
            <CardHeader title="Convidar para a equipe" />
            <CardContent>
              <TeamInviteForm onInvited={() => reload('Convite criado. O link de aceite será enviado por e-mail.')} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Acessos individuais" />
            <TeamAccessList accesses={team.accesses} onRevoke={setSelected} />
          </Card>
          <StaffAssignmentsCard partnerId={team.partnerId} accesses={team.accesses} />
        </>
      )}
      {selected && <RevokeTeamAccessDialog access={selected} onClose={() => setSelected(null)} onRevoked={() => {
        setSelected(null)
        reload('Acesso revogado.')
      }} />}
    </div>
  )
}
