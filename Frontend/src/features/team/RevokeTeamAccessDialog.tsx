import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { authRetryMessage, authService, getAuthError } from '../../services/auth.service'
import type { TeamAccess } from '../../types/auth.types'

export default function RevokeTeamAccessDialog({ access, onClose, onRevoked }: {
  access: TeamAccess
  onClose: () => void
  onRevoked: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function revoke() {
    setBusy(true)
    setError('')
    try {
      await authService.revokeTeamAccess(access.id)
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
      {error && <p role="alert" className="mt-3 text-sm text-text-danger">{error}</p>}
    </Dialog>
  )
}
