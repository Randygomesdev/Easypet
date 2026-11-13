import { useRef, useState } from 'react'
import axios from 'axios'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { notificationService, type NotificationDelivery } from '../../services/notification.service'
import { NotificationAttempts } from './NotificationAttempts'
import { deliveryExplanation, queryError, typeLabel } from './presentation'

interface Props {
  delivery: NotificationDelivery | null
  actorId: string
  onClose: () => void
  onRetried: () => void
}

function savedRetryKey(storageKey: string) {
  try {
    return sessionStorage.getItem(storageKey)
  } catch {
    return null
  }
}

function saveRetryKey(storageKey: string, key: string | null) {
  try {
    if (key === null) sessionStorage.removeItem(storageKey)
    else sessionStorage.setItem(storageKey, key)
  } catch {
    // The in-memory key still covers retries when browser storage is restricted.
  }
}

export function NotificationHistoryDialog({ delivery, actorId, onClose, onRetried }: Props) {
  const [request, setRequest] = useState<{ id: string; status: 'saving' | 'error'; message?: string }>()
  const keys = useRef(new Map<string, string>())
  const active = request?.id === delivery?.id ? request : undefined
  const saving = active?.status === 'saving'

  async function retry(item: NotificationDelivery) {
    const storageKey = `notification-retry:${actorId}:${item.id}`
    const key = keys.current.get(storageKey) ?? savedRetryKey(storageKey) ?? crypto.randomUUID()
    keys.current.set(storageKey, key)
    saveRetryKey(storageKey, key)
    setRequest({ id: item.id, status: 'saving' })
    try {
      await notificationService.retry(item.id, key)
      keys.current.delete(storageKey)
      saveRetryKey(storageKey, null)
      setRequest(undefined)
      onRetried()
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined
      if (status === 409) {
        keys.current.delete(storageKey)
        saveRetryKey(storageKey, null)
      }
      setRequest({
        id: item.id,
        status: 'error',
        message: status === 409
          ? 'O reenvio não está mais disponível. Atualize a consulta.'
          : status === 403
            ? 'Sua sessão não tem permissão para solicitar reenvio.'
            : queryError(error, 'Não foi possível solicitar o reenvio. Tente novamente.'),
      })
    }
  }

  return (
    <Dialog
      open={delivery !== null}
      onOpenChange={open => { if (!open && !saving) onClose() }}
      title={delivery ? typeLabel[delivery.type] : 'Tentativas de envio'}
      description={delivery ? deliveryExplanation(delivery) : undefined}
      actions={delivery?.canRetry && (
        <Button disabled={saving} onClick={() => void retry(delivery)}>
          {saving ? 'Solicitando…' : 'Solicitar reenvio'}
        </Button>
      )}
    >
      {delivery && <NotificationAttempts id={delivery.id} />}
      {active?.message && <p role="alert" className="text-sm text-text-danger">{active.message}</p>}
    </Dialog>
  )
}
