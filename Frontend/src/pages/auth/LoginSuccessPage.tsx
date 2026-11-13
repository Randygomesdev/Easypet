import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { useAuth } from '../../contexts/AuthContext'
import { authRetryMessage, authService } from '../../services/auth.service'
import AccountActionLayout, { authLinkClass } from './AccountActionLayout'

const fallback = 'Não foi possível concluir o login com Google. Volte ao login para iniciar outra tentativa.'
const exchangeCode = /^[A-Za-z0-9_-]{43}$/

export default function LoginSuccessPage() {
  const { hash } = useLocation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [code] = useState(() => new URLSearchParams(hash.slice(1)).get('code'))
  const [error, setError] = useState('')
  const exchange = useRef<ReturnType<typeof authService.exchangeOAuthCode> | null>(null)

  useEffect(() => {
    // Limpa o fragmento sem perder a tentativa em memória ou disparar outra navegação.
    if (window.location.hash) {
      window.history.replaceState(window.history.state, '', window.location.pathname)
    }
    if (!code || !exchangeCode.test(code)) return
    exchange.current ??= authService.exchangeOAuthCode(code)
    let current = true
    exchange.current.then(user => {
      if (!current) return
      if (!user.token || !user.id || !['PARTNER', 'ADMIN', 'CUSTOMER'].includes(user.role)) {
        setError(fallback)
        return
      }
      login(user)
      navigate('/painel', { replace: true })
    }).catch(cause => {
      if (current) setError(authRetryMessage(cause) ?? fallback)
    })
    return () => { current = false }
  }, [code, login, navigate])

  const invalid = !code || !exchangeCode.test(code)
  return (
    <AccountActionLayout title="Login com Google">
      {invalid || error ? (
        <ErrorState message={error || fallback}
          action={<Link to="/login" replace className={authLinkClass}>Voltar ao login</Link>} />
      ) : <LoadingState label="Concluindo o login com Google…" />}
    </AccountActionLayout>
  )
}
