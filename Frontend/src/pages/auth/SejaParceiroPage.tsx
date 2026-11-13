import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { authRetryMessage, authService, getAuthError } from '../../services/auth.service'
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
      const data = await authService.registerPartner({
        name:     form.get('name')     as string,
        email:    form.get('email')    as string,
        password: form.get('password') as string,
      })
      login(data)
      navigate('/partner/cadastro', { replace: true })
    } catch (err: unknown) {
      const msg = authRetryMessage(err) ?? getAuthError(err)?.message
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

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <InputField name="name" type="text" label="Nome Completo" placeholder="Seu nome completo"
              icon={<User size={16} className="text-gray-400" />} required />

            <InputField name="email" type="email" label="Email" placeholder="seu@email.com"
              icon={<Mail size={16} className="text-gray-400" />} required />

            <div>
              <label htmlFor="partner-password" className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
              <div className="flex items-center border border-gray-200 rounded-xl px-3 gap-2
                              focus-within:ring-2 focus-within:ring-blue-200 transition-shadow">
                <Lock size={16} className="text-gray-400 shrink-0" />
                <input id="partner-password" name="password" autoComplete="new-password" type={showPassword ? 'text' : 'password'}
                  placeholder="No mínimo 6 caracteres" required minLength={6}
                  className="flex-1 py-2.5 text-sm outline-none bg-transparent placeholder:text-gray-300" />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-500 text-center bg-red-50 py-2 px-3 rounded-lg">{error}</p>
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
      <label htmlFor={`partner-${name}`} className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="flex items-center border border-gray-200 rounded-xl px-3 gap-2
                      focus-within:ring-2 focus-within:ring-blue-200 transition-shadow">
        {icon}
        <input id={`partner-${name}`} name={name} type={type} autoComplete={name} placeholder={placeholder} required={required}
          className="flex-1 py-2.5 text-sm outline-none bg-transparent placeholder:text-gray-300" />
      </div>
    </div>
  )
}
