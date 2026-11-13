import { useNavigate } from 'react-router-dom'
import { Clock, ArrowLeft } from 'lucide-react'

export default function PaymentPendingPage() {
  const navigate = useNavigate()
  return (
    <div className="max-w-md mx-auto flex flex-col items-center gap-6 py-16 text-center">
      <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center">
        <Clock size={40} className="text-amber-500" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-(--color-text-heading)">Pagamento pendente</h1>
        <p className="text-sm text-(--color-text-muted) mt-2">
          Seu pagamento está sendo processado. Quando confirmado, seu agendamento será criado automaticamente.
          Verifique seu e-mail para mais informações.
        </p>
      </div>
      <button
        onClick={() => navigate('/app/home')}
        className="flex items-center gap-2 border border-(--color-border) text-(--color-text-body)
                   hover:bg-(--color-bg) font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
      >
        <ArrowLeft size={16} /> Voltar ao início
      </button>
    </div>
  )
}
