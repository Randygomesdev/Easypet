import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, User, CheckCircle, Building2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { authService } from '../../services/auth.service'
import { env } from '../../config/env'
import LogoEasypet from '../../assets/LogoEasypet.svg'

type Mode = 'login' | 'register'

export default function LoginPage() {
  const [searchParams]                  = useSearchParams()
  const isParceiro                      = searchParams.get('parceiro') === 'true'

  const [mode, setMode]                 = useState<Mode>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')

  const { login } = useAuth()
  const navigate  = useNavigate()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)

    try {
      if (mode === 'login') {
        const data = await authService.login({
          email:    form.get('email')    as string,
          password: form.get('password') as string,
        })
        login(data)
        navigate('/')
      } else {
        const data = await authService.register({
          name:     form.get('name')     as string,
          email:    form.get('email')    as string,
          password: form.get('password') as string,
        })
        login(data)
        navigate('/')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setError(msg || 'Algo deu errado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Painel esquerdo ── */}
      <div className="hidden md:flex md:w-[55%] relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #3b5bdb 0%, #16426b 100%)' }}>

        {/* Círculos decorativos */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-16 w-[500px] h-[500px] rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <img src={LogoEasypet} alt="Easypet" className="w-14 h-14" />
            <span className="text-3xl font-bold">EasyPet</span>
          </div>

          <h2 className="text-3xl font-bold leading-snug mb-4">
            Cuidando do seu pet com amor<br />e tecnologia
          </h2>
          <p className="text-white/70 text-sm mb-10">
            Gerencie consultas, vacinas e o histórico do seu melhor<br />amigo em um só lugar.
          </p>

          {/* Features */}
          <div className="flex flex-col gap-6">
            {[
              { title: 'Agenda Inteligente',   desc: 'Notificações automáticas para vacinas e consultas.' },
              { title: 'Histórico Completo',   desc: 'Tenha toda a ficha médica do seu pet no celular.' },
            ].map(({ title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{title}</p>
                  <p className="text-white/60 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Painel direito ── */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Banner parceiro */}
          {isParceiro && (
            <div className="flex items-center gap-2 bg-[#16426b]/5 border border-[#16426b]/20
                            rounded-xl px-4 py-3 mb-6">
              <Building2 size={16} className="text-[#16426b] shrink-0" />
              <p className="text-xs text-[#16426b]">
                <span className="font-semibold">Área de parceiros.</span> Faça login com sua conta de parceiro para acessar o painel.
              </p>
            </div>
          )}

          {/* Título */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === 'login' ? 'Bem-vindo!' : 'Criar conta'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {mode === 'login'
                ? 'Entre com sua conta para continuar'
                : 'Preencha os dados para começar'}
            </p>
          </div>

          {/* Toggle Login / Registrar */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer
                  ${mode === m
                    ? 'bg-white text-(--color-primary-700) shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {m === 'login' ? 'Login' : 'Registrar'}
              </button>
            ))}
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={() => window.location.href = env.googleAuthUrl}
            className="w-full flex items-center justify-center gap-3 border border-gray-200
                       rounded-xl py-2.5 text-sm font-medium text-gray-700
                       hover:bg-gray-50 transition-colors cursor-pointer mb-5"
          >
            <GoogleIcon />
            Continuar com Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">ou use seu email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Nome — só no register */}
            {mode === 'register' && (
              <InputField
                name="name"
                type="text"
                placeholder="Como devemos te chamar?"
                label="Nome Completo"
                icon={<User size={16} className="text-gray-400" />}
                required
              />
            )}

            <InputField
              name="email"
              type="email"
              placeholder="seu@email.com"
              label="Email"
              icon={<Mail size={16} className="text-gray-400" />}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
              <div className="flex items-center border border-gray-200 rounded-xl px-3 gap-2
                              focus-within:ring-2 focus-within:ring-blue-200 transition-shadow">
                <Lock size={16} className="text-gray-400 shrink-0" />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={mode === 'register' ? 'No mínimo 6 caracteres' : '••••••••'}
                  required
                  minLength={mode === 'register' ? 6 : undefined}
                  className="flex-1 py-2.5 text-sm outline-none bg-transparent placeholder:text-gray-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Lembrar-me + Esqueceu — só no login */}
            {mode === 'login' && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                  <input type="checkbox" name="remember" className="accent-(--color-primary-700) w-4 h-4" />
                  Lembrar-me
                </label>
                <Link to="/forgot-password" className="text-sm text-(--color-primary-600) hover:underline">
                  Esqueceu a senha?
                </Link>
              </div>
            )}

            {/* Erro */}
            {error && (
              <p className="text-sm text-red-500 text-center bg-red-50 py-2 px-3 rounded-lg">
                {error}
              </p>
            )}

            {/* Botão submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm
                         bg-(--color-secondary-500) hover:bg-(--color-secondary-600)
                         disabled:opacity-60 transition-colors cursor-pointer mt-1"
            >
              {loading
                ? 'Aguarde...'
                : mode === 'login' ? 'Entrar no Easypet' : 'Criar conta gratuita'
              }
            </button>
          </form>

          {/* Link alternativo */}
          <p className="text-center text-sm text-gray-500 mt-6">
            {mode === 'login' ? (
              <>Ainda não tem conta?{' '}
                <button onClick={() => setMode('register')}
                  className="text-(--color-primary-700) font-semibold hover:underline cursor-pointer">
                  Cadastre-se
                </button>
              </>
            ) : (
              <>Já possui uma conta?{' '}
                <button onClick={() => setMode('login')}
                  className="text-(--color-primary-700) font-semibold hover:underline cursor-pointer">
                  Faça Login
                </button>
              </>
            )}
          </p>

        </div>
      </div>
    </div>
  )
}

/* ── Campo de input reutilizável ── */
function InputField({ name, type, placeholder, label, icon, required }: {
  name: string
  type: string
  placeholder: string
  label: string
  icon: React.ReactNode
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="flex items-center border border-gray-200 rounded-xl px-3 gap-2
                      focus-within:ring-2 focus-within:ring-blue-200 transition-shadow">
        {icon}
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          className="flex-1 py-2.5 text-sm outline-none bg-transparent placeholder:text-gray-300"
        />
      </div>
    </div>
  )
}

/* ── Ícone do Google ── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.4-7.7 19.4-20 0-1.3-.1-2.7-.4-4z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.6-3.3-11.2-8l-6.6 5.1C9.5 39.6 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.8l6.2 5.2C41.1 36.2 44 30.6 44 24c0-1.3-.1-2.7-.4-4z"/>
    </svg>
  )
}
