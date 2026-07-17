import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { authService } from '../../services/auth.service'

export default function LoginSuccessPage() {
  const [searchParams] = useSearchParams()
  const { login }      = useAuth()
  const navigate       = useNavigate()
  const attempted      = useRef(false) // evita dupla chamada do StrictMode em dev

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    const code = searchParams.get('code')
    if (!code) { navigate('/login'); return }

    authService.exchangeOAuthCode(code)
      .then(({ token }) => {
        const payload = JSON.parse(atob(token.split('.')[1]))
        login({
          token,
          id:         payload.userId,
          name:       payload.name,
          email:      payload.sub,
          role:       payload.role,
          pictureUrl: payload.pictureUrl,
        })
        if (payload.role === 'PARTNER') navigate('/partner/dashboard', { replace: true })
        else if (payload.role === 'ADMIN')     navigate('/admin/dashboard',   { replace: true })
        else if (payload.role === 'CUSTOMER')  navigate('/app/home',          { replace: true })
        else                                   navigate('/',                  { replace: true })
      })
      .catch(() => navigate('/login'))
  }, [])

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
