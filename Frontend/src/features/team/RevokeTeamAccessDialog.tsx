import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { TextField } from '../../components/ui/Field'
import { authRetryMessage, authService, getAuthError } from '../../services/auth.service'
import type { TeamAccess } from '../../types/auth.types'

export default function RevokeTeamAccessDialog({ access, onClose, onRevoked }: {
  access: TeamAccess
  onClose: () => void
  onRevoked: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [reason, setReason] = useState('')

  async function revoke() {
    setBusy(true)
    setError('')
    try {
      await authService.revokeTeamAccess(access.id, reason.trim() || undefined)
      onRevoked()
    } catch (cause) {
      setError(authRetryMessage(cause) ?? getAuthError(cause)?.message ?? 'Não foi possível revogar o acesso. Tente novamente.')
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}
      title="Revogar acesso" description={`O convite e as sessões de ${access.email} deixarão de funcionar.`}
      actions={<>
        <Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button variant="danger" onClick={() => void revoke()} disabled={busy}>{busy ? 'Revogando…' : 'Revogar acesso'}</Button>
      </>}
    >
      <div className="mt-4">
        <TextField name="reason" label="Motivo (opcional)" maxLength={300} disabled={busy}
          hint="Registre apenas o motivo operacional, sem dados pessoais ou credenciais."
          value={reason} onChange={event => setReason(event.target.value)} />
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-text-danger">{error}</p>}
    </Dialog>
  )
}
