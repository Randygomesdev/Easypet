import { useCallback } from 'react'
import { Mail } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { notificationService } from '../../services/notification.service'
import { attemptLabel, errorLabel, formatDateTime, queryError } from './presentation'
import { useNotificationQuery } from './useNotificationQuery'

export function NotificationAttempts({ id }: { id: string }) {
  const load = useCallback((signal: AbortSignal) => notificationService.attempts(id, signal), [id])
  const { state, reload } = useNotificationQuery(load)

  if (state.status === 'loading') return <LoadingState label="Carregando tentativas…" />
  if (state.status === 'error') {
    return <ErrorState message={queryError(state.error, 'Não foi possível carregar as tentativas.')}
      action={<Button variant="secondary" onClick={reload}>Tentar novamente</Button>} />
  }
  if (!state.data.length) return <EmptyState icon={Mail} title="Nenhuma tentativa registrada" size="sm" />

  return (
    <ol className="mt-4 divide-y divide-border">
      {state.data.map(attempt => (
        <li key={attempt.number} className="space-y-1 py-3 text-sm text-text-body">
          <p className="font-semibold text-text-heading">Tentativa {attempt.number}</p>
          <p className="text-xs">Início <time dateTime={attempt.startedAt}>{formatDateTime(attempt.startedAt)}</time></p>
          {attempt.finishedAt && (
            <p className="text-xs">Fim <time dateTime={attempt.finishedAt}>{formatDateTime(attempt.finishedAt)}</time></p>
          )}
          <p>{attemptLabel[attempt.outcome]}</p>
          {attempt.error && <p className="text-xs">{errorLabel(attempt.error)}</p>}
        </li>
      ))}
    </ol>
  )
}
