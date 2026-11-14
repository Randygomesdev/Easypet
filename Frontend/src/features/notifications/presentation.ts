import axios from 'axios'
import type { NotificationAttempt, NotificationDelivery, NotificationStatus, NotificationType } from '../../services/notification.service'

export const typeLabel: Record<NotificationType, string> = {
  CONFIRMATION: 'Confirmação',
  RESCHEDULED: 'Reagendamento',
  CANCELLED: 'Cancelamento',
  REMINDER: 'Lembrete',
  READY: 'Pronto para retirada',
}

export const statusPresentation = {
  PENDING: { label: 'Na fila', tone: 'neutral' },
  SENDING: { label: 'Enviando', tone: 'info' },
  RETRY_SCHEDULED: { label: 'Nova tentativa agendada', tone: 'warning' },
  SENT: { label: 'Aceita pelo transporte', tone: 'success' },
  FAILED: { label: 'Falha no envio', tone: 'danger' },
  SUPERSEDED: { label: 'Invalidada', tone: 'neutral' },
  UNKNOWN: { label: 'Resultado incerto', tone: 'warning' },
  SUPPRESSED: { label: 'Envio bloqueado', tone: 'neutral' },
} as const satisfies Record<NotificationStatus, {
  label: string
  tone: 'neutral' | 'success' | 'info' | 'warning' | 'danger'
}>

export const attemptLabel: Record<NotificationAttempt['outcome'], string> = {
  STARTED: 'Envio iniciado',
  SENT: 'Aceita pelo transporte',
  TRANSIENT_FAILURE: 'Falha temporária',
  PERMANENT_FAILURE: 'Envio recusado',
  UNKNOWN: 'Resultado incerto',
  SUPERSEDED: 'Entrega invalidada',
  SUPPRESSED: 'Envio bloqueado antes do transporte',
}

const errors: Record<string, string> = {
  ATTEMPT_INTERRUPTED: 'Tentativa interrompida',
  EMAIL_INVALID: 'Endereço de e-mail inválido',
  RECIPIENT_LOOKUP_UNAVAILABLE: 'Consulta de destinatário indisponível',
  RECIPIENT_UNAVAILABLE: 'O Auth não encontrou uma conta de tutor ativa com e-mail elegível.',
  RECIPIENT_DOMAIN_BLOCKED: 'O endereço está fora do domínio de teste da homologação.',
  SMTP_AUTHENTICATION: 'Falha na autenticação do transporte',
  SMTP_REJECTED: 'Mensagem recusada pelo transporte',
  SMTP_TEMPORARY: 'Falha temporária no transporte',
  SMTP_UNCERTAIN: 'O transporte não confirmou o resultado',
  BOOKING_EMAIL_DISABLED: 'O tutor desativou avisos de reserva por e-mail.',
  RECEPTION_AUTHORIZATION_UNAVAILABLE: 'O consentimento de balcão é ausente, revogado ou posterior ao aviso.',
  RECEPTION_AUTHORIZATION_CHANGED: 'O consentimento atual difere do consentimento da primeira tentativa.',
}

export function errorLabel(code: string) {
  return errors[code] ?? 'Falha na entrega'
}

export function deliveryStatus(delivery: NotificationDelivery) {
  if (delivery.lastError === 'RECIPIENT_UNAVAILABLE' && delivery.status === 'FAILED') {
    return { label: 'Sem destinatário elegível', tone: 'warning' } as const
  }
  if (delivery.lastError === 'RECIPIENT_DOMAIN_BLOCKED' && delivery.status === 'FAILED') {
    return { label: 'Envio bloqueado', tone: 'warning' } as const
  }
  return statusPresentation[delivery.status]
}

export function deliveryExplanation(delivery: NotificationDelivery) {
  if (delivery.status === 'UNKNOWN') return 'Confira a captura SMTP. O reenvio está indisponível.'
  return delivery.lastError ? errorLabel(delivery.lastError) : undefined
}

export function queryError(error: unknown, fallback: string) {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined
  if (status === 403) return 'Sua sessão não tem permissão para esta consulta.'
  if (status === 429) return 'Muitas consultas em pouco tempo. Aguarde e tente novamente.'
  if (status === 503) return 'O serviço está temporariamente indisponível. Tente novamente em instantes.'
  return fallback
}

const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export function formatDateTime(value: string) {
  return dateTime.format(new Date(value))
}
