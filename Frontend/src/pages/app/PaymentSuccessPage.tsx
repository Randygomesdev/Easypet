import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle, Loader2, CalendarDays, ArrowRight } from 'lucide-react'
import { useCart } from '../../contexts/CartContext'
import { bookingService } from '../../services/booking.service'
import { packageService } from '../../services/package.service'
import type { EasypetCartMeta, EasypetPackageMeta } from '../../services/payment.service'

export default function PaymentSuccessPage() {
  const [searchParams]            = useSearchParams()
  const navigate                  = useNavigate()
  const { items, clearCart }      = useCart()
  const [status, setStatus]       = useState<'creating' | 'done' | 'error'>('creating')
  const [bookingCount, setCount]  = useState(0)

  const isCredit = searchParams.get('source') === 'credit'

  useEffect(() => {
    // Quando veio do fluxo de crédito, os bookings já foram criados no CartPage
    if (isCredit) {
      setCount(Number(searchParams.get('count') ?? 0))
      setStatus('done')
      return
    }

    async function createBookings() {
      if (items.length === 0) { setStatus('done'); return }

      let created = 0
      for (const item of items) {
        const pkgMeta = item.metadata as EasypetPackageMeta | undefined
        if (pkgMeta?.isPackage) {
          try {
            await packageService.purchase(item.productId, 'CARD')
            created++
          } catch (err) {
            console.error('Erro ao comprar pacote:', err)
          }
          continue
        }
        const meta = item.metadata as EasypetCartMeta | undefined
        if (!meta?.petId || !meta?.partnerId) continue
        try {
          await bookingService.create({
            petId:      meta.petId,
            partnerId:  meta.partnerId,
            serviceId:  item.productId,
            type:       meta.bookingType,
            price:      item.price,
            staffId:    meta.staffId,
            paymentMethod: 'CARD',
            ...(meta.checkIn
              ? { checkIn: meta.checkIn, checkOut: meta.checkOut }
              : { bookingDate: `${meta.scheduledDate}T${meta.scheduledTime}:00` }
            ),
          })
          created++
        } catch (err) {
          console.error('Erro ao criar booking:', err)
        }
      }
      setCount(created)
      clearCart()
      setStatus('done')
    }

    createBookings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCredit])

  const paymentId = searchParams.get('payment_id') ?? ''

  return (
    <div className="max-w-md mx-auto flex flex-col items-center gap-6 py-16 text-center">
      {status === 'creating' ? (
        <>
          <Loader2 size={48} className="animate-spin text-(--color-primary-700)" />
          <p className="text-(--color-text-body) font-medium">Confirmando seu agendamento...</p>
        </>
      ) : status === 'done' ? (
        <>
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-(--color-text-heading)">
              {isCredit ? 'Agendamento confirmado!' : 'Pagamento confirmado!'}
            </h1>
            {bookingCount > 0 && (
              <p className="text-sm text-(--color-text-muted) mt-2">
                {bookingCount} {bookingCount === 1 ? 'item confirmado' : 'itens confirmados'} com sucesso.
              </p>
            )}
            {paymentId && (
              <p className="text-xs text-(--color-text-muted) mt-1">
                Transação: {paymentId}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => navigate('/app/agendamentos')}
              className="flex items-center justify-center gap-2 bg-(--color-primary-700)
                         hover:bg-(--color-primary-800) text-white font-semibold px-6 py-3
                         rounded-xl text-sm transition-colors w-full"
            >
              <CalendarDays size={16} /> Ver meus agendamentos
            </button>
            <button
              onClick={() => navigate('/app/home')}
              className="flex items-center justify-center gap-2 border border-(--color-border)
                         text-(--color-text-body) hover:bg-(--color-bg) font-semibold px-6 py-3
                         rounded-xl text-sm transition-colors w-full"
            >
              Voltar ao início <ArrowRight size={16} />
            </button>
          </div>
        </>
      ) : (
        <p className="text-red-500">Ocorreu um erro ao confirmar o agendamento. Entre em contato com o suporte.</p>
      )}
    </div>
  )
}
