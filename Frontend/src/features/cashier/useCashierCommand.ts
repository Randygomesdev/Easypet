import { useRef, useState } from 'react'
import { cashierService } from '../../services/cashier.service'
import type { CashierCommand, CashierContext } from '../../services/cashier.service'
import { cashierDayClosed, intentStorageKey, loadIntent, rejectedByCashier } from './cashierIntent'
import type { CashierIntent } from './cashierIntent'
import { cashierError } from './format'

export function useCashierCommand(
  context: CashierContext,
  onSaved: (command: CashierCommand, id: string) => void,
  onDayClosed: () => void,
) {
  const storageKey = intentStorageKey(context)
  const inFlight = useRef(false)
  const [initial] = useState(() => {
    try {
      return { pending: loadIntent(storageKey), error: '' }
    } catch {
      return { pending: null, error: 'Não foi possível ler a tentativa de caixa salva nesta aba.' }
    }
  })
  const [pending, setPending] = useState<CashierIntent | null>(initial.pending)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(command: CashierCommand) {
    if (inFlight.current || initial.error) return
    inFlight.current = true
    setSaving(true)
    setError('')
    try {
      const existing = loadIntent(storageKey)
      if (existing && JSON.stringify(existing.command) !== JSON.stringify(command)) {
        setPending(existing)
        setError('Retome o lançamento anterior antes de enviar outra operação.')
        return
      }
      const intent = existing ?? { key: crypto.randomUUID(), command }
      sessionStorage.setItem(storageKey, JSON.stringify(intent))
      const result = await cashierService.execute(intent.command, intent.key)
      if (!result?.id) throw new Error('Confirmação de caixa inválida.')
      sessionStorage.removeItem(storageKey)
      setPending(null)
      onSaved(intent.command, result.id)
    } catch (cause) {
      try {
        if (rejectedByCashier(cause)) sessionStorage.removeItem(storageKey)
        setPending(loadIntent(storageKey))
        setError(cashierError(cause, 'Não foi possível confirmar o lançamento. Confira a tentativa antes de enviar outra operação.'))
        if (cashierDayClosed(cause)) onDayClosed()
      } catch {
        setError('O armazenamento desta aba está indisponível. Confira o caixa antes de fazer outro lançamento.')
      }
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }

  return { submit, saving, error, setError, pending, storageError: initial.error }
}

export type CashierCommandForm = Pick<ReturnType<typeof useCashierCommand>, 'submit' | 'saving' | 'error'>
