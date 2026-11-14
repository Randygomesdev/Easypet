import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { TextField } from '../../components/ui/Field'
import { customerApiError, customerService } from '../../services/customer.service'
import type { AdminCustomer } from '../../types/auth.types'

type Props = { account: AdminCustomer; onClose: () => void; onSaved: (account: AdminCustomer) => void }

export function CustomerAccountStatusDialog({ account, onClose, onSaved }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [reason, setReason] = useState('')
  const nextActive = !account.active
  const action = nextActive ? 'Reativar conta' : 'Desativar conta'

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !reason.trim()) return
    setBusy(true)
    setError('')
    try {
      onSaved(await customerService.setAccountActive(account.id, nextActive, reason.trim()))
    } catch (cause) {
      setError(customerApiError(cause, 'Não foi possível alterar a situação da conta. Tente novamente.').message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }} title={action}
      description={nextActive ? `${account.name} poderá entrar novamente com esta conta.`
        : `${account.name} perderá o acesso à conta. As sessões em uso serão encerradas.`}>
      <form className="mt-4 space-y-4" onSubmit={save} aria-busy={busy}>
        <TextField label="Motivo da alteração" name="reason" required maxLength={300} disabled={busy}
          hint="Registre um motivo operacional sem incluir dados pessoais."
          value={reason} onChange={event => setReason(event.target.value)} />
        {error && <p className="text-sm text-text-danger" role="alert">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" disabled={busy} onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant={nextActive ? 'primary' : 'danger'} disabled={busy || !reason.trim()}>
            {busy ? 'Salvando…' : action}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
