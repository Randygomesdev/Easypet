import { useCallback, useState, type FormEvent } from 'react'
import { Search } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { TextField } from '../../components/ui/Field'
import { Pagination } from '../../components/ui/Pagination'
import { useAuth } from '../../contexts/AuthContext'
import { notificationService, type NotificationDelivery } from '../../services/notification.service'
import { NotificationDeliveryTable } from './NotificationDeliveryTable'
import { NotificationHistoryDialog } from './NotificationHistoryDialog'
import { EmptyNotificationResults } from './EmptyNotificationResults'
import { queryError } from './presentation'
import { useNotificationQuery } from './useNotificationQuery'

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i

function DeliveryResults({ bookingId, actorId }: { bookingId: string; actorId: string }) {
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<NotificationDelivery | null>(null)
  const [feedback, setFeedback] = useState('')
  const load = useCallback((signal: AbortSignal) => notificationService.list(bookingId, page, signal), [bookingId, page])
  const { state, reload } = useNotificationQuery(load)

  return (
    <Card>
      <CardHeader title="Entregas" action={<Button variant="secondary" size="sm" onClick={reload}>Atualizar</Button>} />
      {feedback && <p role="status" className="px-5 pt-4 text-sm text-text-body">{feedback}</p>}
      {state.status === 'loading' && <LoadingState label="Carregando entregas…" />}
      {state.status === 'error' && (
        <ErrorState message={queryError(state.error, 'Não foi possível consultar as notificações.')}
          action={<Button variant="secondary" onClick={reload}>Tentar novamente</Button>} />
      )}
      {state.status === 'success' && (
        state.data.content.length === 0
          ? <EmptyNotificationResults bookingId={bookingId} />
          : <>
              <NotificationDeliveryTable deliveries={state.data.content} onSelect={setSelected} />
              <Pagination page={page + 1} totalPages={state.data.totalPages}
                onPageChange={next => setPage(next - 1)} label="Páginas de notificações" />
            </>
      )}
      <NotificationHistoryDialog
        delivery={selected}
        actorId={actorId}
        onClose={() => setSelected(null)}
        onRetried={() => {
          setSelected(null)
          setFeedback('Reenvio solicitado.')
          reload()
        }}
      />
    </Card>
  )
}

export default function NotificationsPage() {
  const { session, sessionStatus } = useAuth()
  const [input, setInput] = useState('')
  const [lookup, setLookup] = useState<{ bookingId: string; revision: number }>()
  const [error, setError] = useState<string>()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const bookingId = input.trim()
    if (!uuid.test(bookingId)) {
      setError('Informe um ID de reserva válido.')
      return
    }
    setError(undefined)
    setLookup(current => ({ bookingId, revision: (current?.revision ?? 0) + 1 }))
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-text-heading lg:text-3xl">Notificações</h1>
      <Card>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col items-start gap-3 sm:flex-row">
            <div className="w-full sm:max-w-sm">
              <TextField label="ID da reserva" value={input} error={error} required spellCheck={false}
                onChange={event => {
                  setInput(event.target.value)
                  setError(undefined)
                }} />
            </div>
            <Button type="submit" className="w-full sm:mt-5 sm:w-auto">
              <Search size={16} aria-hidden="true" />
              Consultar
            </Button>
          </form>
        </CardContent>
      </Card>
      {lookup && sessionStatus === 'ready' && session?.role === 'ADMIN' && (
        <DeliveryResults key={`${session.userId}:${lookup.revision}`}
          bookingId={lookup.bookingId} actorId={session.userId} />
      )}
    </div>
  )
}
