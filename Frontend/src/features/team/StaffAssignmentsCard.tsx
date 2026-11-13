import { useEffect, useState, type FormEvent } from 'react'
import { Users } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { SelectField } from '../../components/ui/Field'
import { authRetryMessage, getAuthError } from '../../services/auth.service'
import { staffService, type StaffResponse } from '../../services/staff.service'
import type { TeamAccess } from '../../types/auth.types'
import { teamAssignments, type StaffAssignment } from './teamAssignments'

type Scale = { staff: StaffResponse[]; assignments: StaffAssignment[] }

export default function StaffAssignmentsCard({ partnerId, accesses }: { partnerId: string; accesses: TeamAccess[] }) {
  const [scale, setScale] = useState<Scale | null>(null)
  const [loadError, setLoadError] = useState('')
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [unlink, setUnlink] = useState<StaffResponse | null>(null)

  useEffect(() => {
    const request = new AbortController()
    Promise.all([staffService.getByPartner(partnerId), teamAssignments.list(request.signal)])
      .then(([staff, assignments]) => { if (!request.signal.aborted) setScale({ staff, assignments }) })
      .catch(cause => {
        if (!request.signal.aborted) {
          setLoadError(authRetryMessage(cause) ?? 'Não foi possível carregar os vínculos da escala.')
        }
      })
    return () => request.abort()
  }, [partnerId, revision])

  function reload() {
    setLoadError('')
    setScale(null)
    setRevision(current => current + 1)
  }

  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    const staffId = String(fields.get('staffId'))
    const userId = String(fields.get('userId'))
    const saved = await updateAssignment(() => teamAssignments.assign(staffId, userId), 'Profissional associado à conta.')
    if (saved) form.reset()
  }

  async function updateAssignment(change: () => Promise<unknown>, message: string) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await change()
      setUnlink(null)
      setNotice(message)
      reload()
      return true
    } catch (cause) {
      setError(authRetryMessage(cause) ?? getAuthError(cause)?.message ?? 'Não foi possível atualizar o vínculo. Tente novamente.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const professionals = accesses.filter(access => access.status === 'ACTIVE' && access.accessRole === 'PROFESSIONAL' && access.userId)
  const availableAccounts = professionals.filter(access => !scale?.assignments.some(link => link.userId === access.userId))
  const availableStaff = scale?.staff.filter(person => person.status === 'ACTIVE'
    && !scale.assignments.some(link => link.staffId === person.id)) ?? []

  return (
    <Card>
      <CardHeader title="Vínculos com a escala" description="Associe uma conta de profissional a uma pessoa da escala para liberar seus atendimentos." />
      <CardContent className="space-y-4">
        {notice && <p role="status" className="text-sm text-text-body">{notice}</p>}
        {loadError ? <ErrorState message={loadError}
          action={<Button variant="secondary" onClick={reload}>Tentar novamente</Button>} />
          : !scale ? <LoadingState label="Carregando vínculos da escala…" />
          : (
            <>
              {scale.assignments.length > 0 && (
                <ul className="divide-y divide-border">
                  {scale.assignments.map(link => {
                    const person = scale.staff.find(member => member.id === link.staffId)
                    const access = professionals.find(account => account.userId === link.userId
                      && account.id === link.teamAccessId)
                    if (!person) return null
                    return (
                      <li key={link.staffId} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                        <div>
                          <p className="font-semibold text-text-heading">{person.name}</p>
                          <p>{access?.email ?? 'Acesso revogado ou substituído'}</p>
                        </div>
                        <Button size="sm" variant="secondary" disabled={busy}
                          aria-label={`Desvincular ${person.name}`} onClick={() => { setError(''); setUnlink(person) }}>
                          Desvincular
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
              {availableAccounts.length && availableStaff.length ? (
                <form onSubmit={assign} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField name="userId" label="Conta de profissional" defaultValue="" required disabled={busy}>
                      <option value="" disabled>Selecione uma conta</option>
                      {availableAccounts.map(access => <option key={access.id} value={access.userId ?? ''}>{access.email}</option>)}
                    </SelectField>
                    <SelectField name="staffId" label="Profissional da escala" defaultValue="" required disabled={busy}>
                      <option value="" disabled>Selecione um profissional</option>
                      {availableStaff.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
                    </SelectField>
                  </div>
                  <Button type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Associar profissional'}</Button>
                </form>
              ) : scale.assignments.length === 0 ? <EmptyState icon={Users} size="sm" title="Nenhum vínculo com a escala"
                description="É preciso uma conta de profissional ativa e um profissional ativo na escala." /> : null}
              {error && !unlink && <p role="alert" className="text-sm text-text-danger">{error}</p>}
            </>
          )}
      </CardContent>
      <Dialog open={!!unlink} onOpenChange={open => { if (!open && !busy) setUnlink(null) }}
        title="Desvincular profissional" description={unlink ? `${unlink.name} perderá o acesso aos atendimentos desta escala.` : undefined}
        actions={<>
          <Button variant="secondary" disabled={busy} onClick={() => setUnlink(null)}>Cancelar</Button>
          <Button variant="danger" disabled={busy} onClick={() => {
            if (unlink) void updateAssignment(() => teamAssignments.unlink(unlink.id), 'Profissional desvinculado da conta.')
          }}>{busy ? 'Desvinculando…' : 'Desvincular'}</Button>
        </>}>
        {error && <p role="alert" className="mt-3 text-sm text-text-danger">{error}</p>}
      </Dialog>
    </Card>
  )
}
