import { isAxiosError } from 'axios'
import type { CashierCommand, CashierContext } from '../../services/cashier.service'

export interface CashierIntent {
  key: string
  command: CashierCommand
}

export function intentStorageKey({ actorId, partnerId }: CashierContext) {
  return `easypet.cashier.intent.v1.${partnerId}.${actorId}`
}

export function loadIntent(storageKey: string): CashierIntent | null {
  const saved = sessionStorage.getItem(storageKey)
  if (!saved) return null
  const intent = JSON.parse(saved) as CashierIntent | null
  if (!intent || typeof intent.key !== 'string' ||
      !['charge', 'receipt', 'reverse', 'close'].includes(intent.command?.type)) {
    throw new Error('Intenção de caixa inválida.')
  }
  return intent
}

export function rejectedByCashier(error: unknown) {
  return isAxiosError<{ timestamp?: string }>(error) && Boolean(error.response?.data?.timestamp) &&
    (error.response?.status === 400 || error.response?.status === 409)
}

export function cashierDayClosed(error: unknown) {
  return isAxiosError<{ code?: string }>(error) && error.response?.status === 409
    && error.response.data?.code === 'CASHIER_DAY_CLOSED'
}
