import { useNavigate } from 'react-router-dom'
import { XCircle, ShoppingCart, ArrowLeft } from 'lucide-react'

export default function PaymentFailurePage() {
  const navigate = useNavigate()
  return (
    <div className="max-w-md mx-auto flex flex-col items-center gap-6 py-16 text-center">
      <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
        <XCircle size={40} className="text-red-500" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-(--color-text-heading)">Pagamento não realizado</h1>
        <p className="text-sm text-(--color-text-muted) mt-2">
          Houve um problema ao processar seu pagamento. Seu carrinho foi mantido — tente novamente.
        </p>
      </div>
      <div className="flex flex-col gap-3 w-full">
        <button
          onClick={() => navigate('/app/carrinho')}
          className="flex items-center justify-center gap-2 bg-(--color-primary-700)
                     hover:bg-(--color-primary-800) text-white font-semibold px-6 py-3
                     rounded-xl text-sm transition-colors w-full"
        >
          <ShoppingCart size={16} /> Tentar novamente
        </button>
        <button
          onClick={() => navigate('/app/home')}
          className="flex items-center justify-center gap-2 border border-(--color-border)
                     text-(--color-text-body) hover:bg-(--color-bg) font-semibold px-6 py-3
                     rounded-xl text-sm transition-colors w-full"
        >
          <ArrowLeft size={16} /> Voltar ao início
        </button>
      </div>
    </div>
  )
}
