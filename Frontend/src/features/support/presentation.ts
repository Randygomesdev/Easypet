import { isAxiosError } from 'axios'
import type { InboxItem } from '../../services/support.service'

export const supportStatus = {
  OPEN: 'Aberto', ACKNOWLEDGED: 'Reconhecido', RESOLVED: 'Resolvido',
}

const alertTitles: Record<string, string> = {
  BACKUP_FAILED: 'Falha no backup', RESTORE_FAILED: 'Falha na restauração',
  QUEUE_DELAY: 'Fila de notificações atrasada', DELIVERY_FAILED: 'Falha na entrega',
  DELIVERY_UNKNOWN: 'Entrega com resultado incerto', SERVICE_UNAVAILABLE: 'Serviço indisponível',
  RELEASE_CHECK_FAILED: 'Falha na verificação da versão',
}

export function inboxTitle(item: InboxItem) {
  return item.subject ?? (item.code && alertTitles[item.code]) ?? 'Alerta operacional'
}

export function supportError(cause: unknown, fallback: string) {
  const status = isAxiosError(cause) ? cause.response?.status : undefined
  if (status === 403) return 'Sua sessão não tem permissão para esta operação.'
  if (status === 404) return 'Registro indisponível para esta sessão.'
  if (status === 409) return 'O estado do registro mudou ou a solicitação conflita com uma anterior. Atualize a consulta.'
  if (status === 429) return 'Muitas solicitações. Aguarde e tente novamente.'
  if (status === 503) return 'Serviço temporariamente indisponível. Tente novamente em instantes.'
  return fallback
}
