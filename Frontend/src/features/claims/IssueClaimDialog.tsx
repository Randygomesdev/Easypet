import { useState, type FormEvent } from 'react'
import { Dialog } from '../../components/ui/Dialog'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Field'
import { customerApiError, customerService } from '../../services/customer.service'
import { CopyClaimCode } from './CopyClaimCode'

type Props = { open: boolean; customerId: string; onClose: () => void }
const codePattern = '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}'

export function IssueClaimDialog({ open, customerId, onClose }: Props) {
  const [proof, setProof] = useState<{ token: string; expiresAt: string }>()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const userId = String(new FormData(event.currentTarget).get('accountCode')).trim()
    setSaving(true)
    setError('')
    try {
      setProof(await customerService.issueClaim(customerId, userId))
    } catch (cause) {
      setError(customerApiError(cause, 'Não foi possível gerar o código. Tente novamente.').message)
    } finally {
      setSaving(false)
    }
  }

  function close() {
    if (saving) return
    setProof(undefined)
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={next => { if (!next) close() }} title="Vincular conta do tutor">
      {open && (proof ? <div className="mt-4 space-y-3 text-sm text-text-body">
        <p>Entregue este código diretamente ao tutor verificado. Ele vale até {new Date(proof.expiresAt)
          .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.</p>
        <CopyClaimCode label="Código de vinculação" value={proof.token} />
        <Button onClick={close}>Concluir</Button>
      </div> : <form className="mt-4 space-y-4" onSubmit={submit} aria-busy={saving}>
        <TextField label="Código da conta" name="accountCode" required pattern={codePattern}
          disabled={saving} hint="Peça ao tutor o código exibido na tela Reivindicar cadastro." />
        <label className="flex items-start gap-2 text-sm text-text-body">
          <input type="checkbox" className="mt-1 accent-primary-500" required disabled={saving} />
          Confirmei presencialmente a identidade do tutor e o código da conta apresentado.
        </label>
        {error && <p role="alert" className="text-sm text-text-danger">{error}</p>}
        <Button type="submit" disabled={saving}>{saving ? 'Gerando…' : 'Gerar código'}</Button>
      </form>)}
    </Dialog>
  )
}
