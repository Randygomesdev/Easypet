import { isAxiosError } from 'axios'
import type { CashierMethod } from '../../services/cashier.service'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dateTime = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
})

export const METHOD_LABELS: Record<CashierMethod, string> = {
  CASH: 'Dinheiro',
  PIX: 'Pix',
  DEBIT_CARD: 'Cartão de débito',
  CREDIT_CARD: 'Cartão de crédito',
  OTHER: 'Outra forma',
}

export const CASHIER_METHODS = Object.keys(METHOD_LABELS) as CashierMethod[]
export const MONEY_PATTERN = '[0-9]{1,9}([,.][0-9]{1,2})?'

export function centsFromInput(input: string) {
  if (!new RegExp(`^${MONEY_PATTERN}$`).test(input.trim())) return null
  const [whole, fraction = ''] = input.trim().split(/[,.]/)
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}

export const money = (cents: number) => currency.format(cents / 100)
export const timestamp = (value: string) => dateTime.format(new Date(value))
export const dayLabel = (date: string) => date.split('-').reverse().join('/')

export function cashierError(error: unknown, fallback: string) {
  if (!isAxiosError<{ message?: string }>(error)) return fallback
  const status = error.response?.status
  const message = status === 403 ? 'Seu acesso ao caixa não está disponível.'
    : status === 429 ? 'Muitas solicitações ao caixa. Aguarde um momento e tente novamente.'
    : error.response?.data?.message || fallback
  const requestId = error.response?.headers['x-request-id']
  return typeof requestId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(requestId)
    ? `${message} Referência ${requestId}.`
    : message
}
