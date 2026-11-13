import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Field'
import { authRetryMessage, authService, getAuthError } from '../../services/auth.service'
import AccountActionLayout, { authLinkClass } from './AccountActionLayout'

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get('email'))
    setLoading(true)
    setError('')
    try {
      await authService.forgotPassword(email)
      setSent(true)
    } catch (cause) {
      setError(authRetryMessage(cause) ?? getAuthError(cause)?.message ?? 'Não foi possível solicitar o link. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AccountActionLayout title="Recuperar senha">
      {sent ? (
        <p role="status" className="text-center text-sm text-text-body">
          Se houver uma conta ativa para esse e-mail, você receberá um link para redefinir a senha.
          Confira também a caixa de spam.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-text-body">Informe o e-mail usado na sua conta para receber um link de recuperação.</p>
          <TextField name="email" type="email" label="E-mail" autoComplete="email" maxLength={255} required />
          {error && <p role="alert" className="text-sm text-text-danger">{error}</p>}
          <Button type="submit" variant="accent" className="w-full py-3" disabled={loading}>
            {loading ? 'Enviando…' : 'Enviar link de recuperação'}
          </Button>
        </form>
      )}
      <p className="text-center text-sm"><Link to="/login" className={authLinkClass}>Voltar ao login</Link></p>
    </AccountActionLayout>
  )
}
