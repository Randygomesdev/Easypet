import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { customerApiError, customerService } from '../../services/customer.service'
import type { AdminCustomer } from '../../types/auth.types'

type Props = { account: AdminCustomer; onClose: () => void; onSaved: (account: AdminCustomer) => void }

export function CustomerAccountStatusDialog({ account, onClose, onSaved }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const nextActive = !account.active
  const action = nextActive ? 'Reativar conta' : 'Desativar conta'

  async function save() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      onSaved(await customerService.setAccountActive(account.id, nextActive))
    } catch (cause) {
      setError(customerApiError(cause, 'Não foi possível alterar a situação da conta. Tente novamente.').message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }} title={action}
      description={nextActive ? `${account.name} poderá entrar novamente com esta conta.`
        : `${account.name} perderá o acesso à conta. As sessões em uso serão encerradas.`}
      actions={<>
        <Button variant="secondary" disabled={busy} onClick={onClose}>Cancelar</Button>
        <Button variant={nextActive ? 'primary' : 'danger'} disabled={busy} onClick={save}>
          {busy ? 'Salvando…' : action}
        </Button>
      </>}>
      {error && <p className="mt-4 text-sm text-text-danger" role="alert">{error}</p>}
    </Dialog>
  )
}
