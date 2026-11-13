import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Field'
import { authRetryMessage, authService, getAuthError } from '../../services/auth.service'
import AccountActionLayout, { authLinkClass } from './AccountActionLayout'

export default function TeamInvitationPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [loading, setLoading] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    const form = new FormData(event.currentTarget)
    setLoading(true)
    setError('')
    try {
      await authService.acceptTeamInvitation(token, String(form.get('name')), String(form.get('password')))
      setAccepted(true)
    } catch (cause) {
      const response = getAuthError(cause)
      setError(authRetryMessage(cause) ?? response?.errors?.password ?? response?.errors?.name ?? response?.message
        ?? 'Não foi possível aceitar o convite. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AccountActionLayout title="Convite para equipe">
      {!token ? <p role="alert" className="text-sm text-text-danger">O link do convite é inválido.</p>
        : accepted ? <p role="status" className="text-sm text-text-body">Sua conta de equipe foi ativada.</p>
        : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm text-text-body">Informe seu nome e escolha uma senha para ativar a conta.</p>
            <TextField name="name" label="Nome completo" autoComplete="name" maxLength={255} required />
            <TextField name="password" label="Senha" type="password" autoComplete="new-password"
              hint="Use pelo menos 6 caracteres." minLength={6} required />
            {error && <p role="alert" className="text-sm text-text-danger">{error}</p>}
            <Button type="submit" variant="accent" className="w-full py-3" disabled={loading}>
              {loading ? 'Ativando…' : 'Aceitar convite'}
            </Button>
          </form>
        )}
      <p className="text-center text-sm"><Link to="/login" className={authLinkClass}>Ir para o login</Link></p>
    </AccountActionLayout>
  )
}
