import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { SelectField, TextField } from '../../components/ui/Field'
import { authRetryMessage, authService, getAuthError } from '../../services/auth.service'
import type { TeamAccessRole } from '../../types/auth.types'
import { teamRoleLabels } from './teamLabels'

export default function TeamInviteForm({ onInvited }: { onInvited: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    const email = String(fields.get('email'))
    const accessRole = fields.get('accessRole') as TeamAccessRole
    const reason = String(fields.get('reason')).trim()
    setError('')
    setLoading(true)
    try {
      await authService.inviteTeamMember({ email, accessRole, reason: reason || undefined })
      form.reset()
      onInvited()
    } catch (cause) {
      const response = getAuthError(cause)
      setError(authRetryMessage(cause) ?? response?.errors?.reason ?? response?.errors?.email ?? response?.message
        ?? 'Não foi possível confirmar o convite. Confira a lista e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={invite} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="email" type="email" label="E-mail do convidado" autoComplete="off" maxLength={255} required disabled={loading} />
        <SelectField name="accessRole" label="Perfil de acesso" defaultValue="" required disabled={loading}>
          <option value="" disabled>Selecione um perfil</option>
          {Object.entries(teamRoleLabels).map(([role, label]) => <option key={role} value={role}>{label}</option>)}
        </SelectField>
      </div>
      <TextField name="reason" label="Motivo (opcional)" maxLength={300} disabled={loading}
        hint="Registre apenas o motivo operacional, sem dados pessoais ou credenciais." />
      {error && <p role="alert" className="text-sm text-text-danger">{error}</p>}
      <Button type="submit" variant="accent" disabled={loading}>{loading ? 'Criando convite…' : 'Enviar convite'}</Button>
    </form>
  )
}
