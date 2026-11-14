import { useCallback } from 'react'
import axios from 'axios'
import { Mail } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { notificationService } from '../../services/notification.service'
import { queryError } from './presentation'
import { useNotificationQuery } from './useNotificationQuery'

export function EmptyNotificationResults({ bookingId }: { bookingId: string }) {
  const load = useCallback((signal: AbortSignal) => notificationService.isReceptionBooking(bookingId, signal),
    [bookingId])
  const { state, reload } = useNotificationQuery(load)

  if (state.status === 'loading') return <LoadingState label="Verificando a origem da reserva…" />
  if (state.status === 'error') {
    if (axios.isAxiosError(state.error) && state.error.response?.status === 404) {
      return <EmptyState icon={Mail} title="Reserva indisponível" description="Confira o ID e consulte novamente." />
    }
    return <ErrorState message={queryError(state.error, 'Não foi possível verificar a origem da reserva.')}
      action={<Button variant="secondary" onClick={reload}>Tentar novamente</Button>} />
  }
  if (state.data) {
    return <EmptyState icon={Mail} title="Nenhuma entrega para esta reserva de balcão"
      description="Avisos de balcão exigem consentimento válido e um destinatário autorizado." />
  }
  return <EmptyState icon={Mail} title="Nenhuma entrega para esta reserva" />
}
