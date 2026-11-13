import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Field'
import { ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { useAuth } from '../../contexts/AuthContext'
import { authRetryMessage, authService, getAuthError } from '../../services/auth.service'
import type { ResetTokenErrorCode } from '../../types/auth.types'
import AccountActionLayout, { authLinkClass } from './AccountActionLayout'

const tokenMessages: Record<ResetTokenErrorCode, string> = {
  RESET_TOKEN_INVALID: 'Este link de recuperação é inválido.',
  RESET_TOKEN_EXPIRED: 'Este link de recuperação expirou.',
  RESET_TOKEN_USED: 'Este link de recuperação já foi utilizado.',
}

function tokenError(code?: string) {
  return code === 'RESET_TOKEN_INVALID' || code === 'RESET_TOKEN_EXPIRED' || code === 'RESET_TOKEN_USED'
    ? tokenMessages[code]
    : undefined
}

type Verification =
  | { status: 'checking' | 'ready' | 'success' }
  | { status: 'invalid' | 'unavailable'; message: string }

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  return (
    <AccountActionLayout title="Redefinir senha">
      <ResetPasswordForm key={token} token={token} />
    </AccountActionLayout>
  )
}

function ResetPasswordForm({ token }: { token: string }) {
  const [verification, setVerification] = useState<Verification>({ status: 'checking' })
  const [attempt, setAttempt] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { logout } = useAuth()

  useEffect(() => {
    if (!token || token.length > 255) return
    const controller = new AbortController()
    authService.validateResetToken(token, controller.signal)
      .then(() => setVerification({ status: 'ready' }))
      .catch(cause => {
        if (controller.signal.aborted) return
        const message = tokenError(getAuthError(cause)?.code)
        setVerification(message
          ? { status: 'invalid', message }
          : { status: 'unavailable', message: authRetryMessage(cause) ?? 'Não foi possível verificar o link. Tente novamente.' })
      })
    return () => controller.abort()
  }, [token, attempt])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = String(form.get('newPassword'))
    if (password !== form.get('confirmation')) {
      setError('As senhas precisam ser iguais.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await authService.resetPassword(token, password)
      logout()
      setVerification({ status: 'success' })
    } catch (cause) {
      const response = getAuthError(cause)
      const message = tokenError(response?.code)
      if (message) {
        setVerification({ status: 'invalid', message })
      } else {
        setError(authRetryMessage(cause) ?? response?.errors?.newPassword ?? response?.message
          ?? 'Não foi possível redefinir a senha. Tente novamente.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!token || token.length > 255 || verification.status === 'invalid') {
    return <ErrorState
      message={verification.status === 'invalid' ? verification.message : tokenMessages.RESET_TOKEN_INVALID}
      action={<Link to="/forgot-password" className={authLinkClass}>Solicitar outro link</Link>}
    />
  }
  if (verification.status === 'checking') {
    return <LoadingState label="Verificando o link de recuperação…" />
  }
  if (verification.status === 'unavailable') {
    return <ErrorState message={verification.message} action={(
      <Button variant="secondary" onClick={() => {
        setVerification({ status: 'checking' })
        setAttempt(current => current + 1)
      }}>Tentar novamente</Button>
    )} />
  }
  if (verification.status === 'success') {
    return (
      <div className="space-y-4 text-center text-sm">
        <p role="status">Senha alterada. Você já pode entrar com a nova senha.</p>
        <Link to="/login" replace className={authLinkClass}>Ir para o login</Link>
      </div>
    )
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <TextField name="newPassword" label="Nova senha" type="password" autoComplete="new-password"
        hint="Use pelo menos 6 caracteres." minLength={6} required />
      <TextField name="confirmation" label="Confirme a nova senha" type="password" autoComplete="new-password"
        minLength={6} required />
      {error && <p role="alert" className="text-sm text-text-danger">{error}</p>}
      <Button type="submit" variant="accent" className="w-full py-3" disabled={submitting}>
        {submitting ? 'Salvando…' : 'Salvar nova senha'}
      </Button>
    </form>
  )
}
