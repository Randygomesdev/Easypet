import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { authService } from '../../services/auth.service'
import { env } from '../../config/env'
import LogoEasypet from '../../assets/LogoEasypet.svg'
import VetTalking  from '../../assets/Vet_talking.png'

export default function SejaParceiroPage() {
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
      const data = await authService.register({
        name:     form.get('name')     as string,
        email:    form.get('email')    as string,
        password: form.get('password') as string,
      })
      login(data)
      navigate('/partner/cadastro')
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
      <div className="hidden md:block md:w-[45%] relative overflow-hidden">
        <img src={VetTalking} alt="Veterinária" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#16426b]/90 via-[#16426b]/40 to-transparent" />
        <div className="relative z-10 flex flex-col h-full p-10">
          <Link to="/" className="flex items-center gap-2">
            <img src={LogoEasypet} alt="Easypet" className="w-9 h-9" />
            <span className="text-white font-bold text-xl">Easypet</span>
          </Link>
          <div className="mt-auto text-white">
            <h2 className="text-3xl font-bold leading-snug mb-3">
              Expanda seu negócio com a maior rede pet do Brasil
            </h2>
            <p className="text-white/70 text-sm">
              Após criar sua conta, complete o cadastro do seu negócio e comece a receber agendamentos.
            </p>
          </div>
        </div>
      </div>

      {/* ── Painel direito ── */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Criar conta de parceiro</h1>
            <p className="text-sm text-gray-500 mt-1">Cadastre seu negócio na plataforma Easypet</p>
          </div>

          {/* Aviso */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
            <p className="text-xs text-amber-700 leading-relaxed">
              <span className="font-semibold">⚠️ Atenção:</span> utilize um e-mail exclusivo para sua conta de parceiro. Contas de cliente e parceiro não podem compartilhar o mesmo e-mail.
            </p>
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

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">ou use seu email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <InputField name="name" type="text" label="Nome Completo" placeholder="Seu nome completo"
              icon={<User size={16} className="text-gray-400" />} required />

            <InputField name="email" type="email" label="Email" placeholder="seu@email.com"
              icon={<Mail size={16} className="text-gray-400" />} required />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
              <div className="flex items-center border border-gray-200 rounded-xl px-3 gap-2
                              focus-within:ring-2 focus-within:ring-blue-200 transition-shadow">
                <Lock size={16} className="text-gray-400 shrink-0" />
                <input name="password" type={showPassword ? 'text' : 'password'}
                  placeholder="No mínimo 6 caracteres" required minLength={6}
                  className="flex-1 py-2.5 text-sm outline-none bg-transparent placeholder:text-gray-300" />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center bg-red-50 py-2 px-3 rounded-lg">{error}</p>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm mt-1
                         bg-[#ee9019] hover:bg-[#d07a0f] disabled:opacity-60 transition-colors cursor-pointer">
              {loading ? 'Criando conta...' : 'Criar conta e continuar'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Já é parceiro?{' '}
            <Link to="/login?parceiro=true" className="text-[#16426b] font-semibold hover:underline">
              Faça login
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}

function InputField({ name, type, placeholder, label, icon, required }: {
  name: string; type: string; placeholder: string
  label: string; icon: React.ReactNode; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="flex items-center border border-gray-200 rounded-xl px-3 gap-2
                      focus-within:ring-2 focus-within:ring-blue-200 transition-shadow">
        {icon}
        <input name={name} type={type} placeholder={placeholder} required={required}
          className="flex-1 py-2.5 text-sm outline-none bg-transparent placeholder:text-gray-300" />
      </div>
    </div>
  )
}

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
