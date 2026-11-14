import { useCallback, useState, type FormEvent } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { customerApiError, customerService, type NotificationEmailAuthorization } from '../../services/customer.service'
import { useCustomerQuery } from './useCustomerQuery'

const labels: Record<NotificationEmailAuthorization['state'], string> = {
  NOT_GRANTED: 'Sem autorização',
  AUTHORIZED: 'Autorizado',
  REVOKED: 'Revogado',
  UNAVAILABLE: 'Indisponível',
}

export function ReceptionNotificationEmail({ customerId, email, onReloadCustomer }: {
  customerId: string
  email: string | null
  onReloadCustomer: () => void
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const load = useCallback((signal: AbortSignal) => customerService.getNotificationEmail(customerId, signal), [customerId])
  const { data, error, loading, reload } = useCustomerQuery(load, 'Não foi possível consultar a autorização de e-mail.')

  return (
    <Card>
      <CardHeader title="Avisos da reserva por e-mail" action={data &&
        <Badge tone={data.state === 'AUTHORIZED' ? 'success' : 'neutral'}>{labels[data.state]}</Badge>} />
      <CardContent className="space-y-3">
        {notice && <p role="status" className="text-sm text-text-body">{notice}</p>}
        {loading && <LoadingState label="Consultando autorização…" />}
        {error && <ErrorState message={error} action={<Button variant="secondary" onClick={reload}>Tentar novamente</Button>} />}
        {data?.state === 'UNAVAILABLE' && (
          <p className="text-sm text-text-body">{email
            ? 'A autorização de balcão está indisponível para este cadastro.'
            : 'O cadastro precisa ter um e-mail para autorizar avisos.'}</p>
        )}
        {data && data.state !== 'UNAVAILABLE' && (
          <>
            <Button variant="secondary" onClick={() => { setNotice(''); setDialogOpen(true) }}>
              {data.state === 'AUTHORIZED' ? 'Revogar autorização' : 'Registrar autorização presencial'}
            </Button>
            {dialogOpen && <AuthorizationDialog
              customerId={customerId} email={email} grant={data.state !== 'AUTHORIZED'} revision={data.revision}
              onClose={() => setDialogOpen(false)}
              onRefresh={() => { setDialogOpen(false); onReloadCustomer() }}
              onSaved={authorized => {
                setDialogOpen(false)
                setNotice(authorized ? 'Autorização presencial registrada.' : 'Autorização revogada.')
                reload()
              }} />}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function AuthorizationDialog({ customerId, email, grant, revision, onClose, onSaved, onRefresh }: {
  customerId: string
  email: string | null
  grant: boolean
  revision: number
  onClose: () => void
  onSaved: (authorized: boolean) => void
  onRefresh: () => void
}) {
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [refreshRequired, setRefreshRequired] = useState(false)
  const title = grant ? 'Registrar autorização presencial' : 'Revogar autorização'

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || refreshRequired || (grant && (!confirmed || !email))) return
    setBusy(true)
    setError('')
    try {
      await customerService.setNotificationEmail(customerId, grant, revision, grant ? email ?? undefined : undefined)
      onSaved(grant)
    } catch (cause) {
      const result = customerApiError(cause, 'Não foi possível salvar a autorização.')
      setError(result.message)
      setRefreshRequired(result.status === 409 || result.status === undefined)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open title={title} onOpenChange={open => { if (!open && !busy) onClose() }}>
      <form className="space-y-4 text-sm" onSubmit={save} aria-busy={busy}>
        {grant ? (
          <>
            <p className="break-words">E-mail cadastrado <strong>{email}</strong></p>
            <label className="flex items-start gap-2">
              <input type="checkbox" required checked={confirmed} disabled={busy || refreshRequired}
                className="mt-1 accent-primary-500" onChange={event => setConfirmed(event.target.checked)} />
              O tutor confirmou este e-mail presencialmente e autorizou os avisos da reserva.
            </label>
          </>
        ) : <p>A revogação impede novas tentativas de envio de avisos de balcão a este contato.</p>}
        {error && <p role="alert" className="text-text-danger">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" disabled={busy} onClick={onClose}>Cancelar</Button>
          {refreshRequired ? <Button onClick={onRefresh}>Atualizar autorização</Button>
            : <Button type="submit" variant={grant ? 'primary' : 'danger'} disabled={busy || (grant && (!confirmed || !email))}>
              {busy ? 'Salvando…' : grant ? 'Registrar autorização' : 'Confirmar revogação'}
            </Button>}
        </div>
      </form>
    </Dialog>
  )
}
