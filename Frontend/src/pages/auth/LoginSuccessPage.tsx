import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { authService } from '../../services/auth.service'

export default function LoginSuccessPage() {
  const [searchParams] = useSearchParams()
  const { login }      = useAuth()
  const navigate       = useNavigate()
  const attempted      = useRef(false) // evita dupla chamada do StrictMode em dev
  const code           = searchParams.get('code')

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    if (!code) { navigate('/login'); return }

    authService.exchangeOAuthCode(code)
      .then(({ token }) => {
        const segment = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/')
        const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(segment), c => c.charCodeAt(0))))
        if (payload.role !== 'PARTNER' && payload.role !== 'ADMIN' && payload.role !== 'CUSTOMER') {
          navigate('/login', { replace: true })
          return
        }
        login({
          token,
          id:         payload.userId,
          name:       payload.name,
          email:      payload.sub,
          role:       payload.role,
          pictureUrl: payload.pictureUrl,
        })
        navigate('/painel', { replace: true })
      })
      .catch(() => navigate('/login', { replace: true }))
  }, [code, login, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-(--color-primary-700) border-t-transparent
                        rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-500">Autenticando com Google...</p>
      </div>
    </div>
  )
}
