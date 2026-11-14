import { useCallback, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { customerService, type CustomerScope } from '../../services/customer.service'
import { ReceptionPetDirectory } from './ReceptionPetDirectory'
import { ReceptionNotificationEmail } from './ReceptionNotificationEmail'
import { useCustomerQuery } from './useCustomerQuery'
import { CustomerAccountBadge } from './CustomerAccountBadge'
import { IssueClaimDialog } from '../claims/IssueClaimDialog'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export function CustomerDetail({ scope, customerId }: { scope: CustomerScope; customerId: string }) {
  const [claimOpen, setClaimOpen] = useState(false)
  const load = useCallback((signal: AbortSignal) => customerService.get(scope, customerId, signal), [scope, customerId])
  const { data: customer, error, loading, reload } = useCustomerQuery(load, 'Não foi possível carregar o cadastro.')

  if (loading) return <Card><LoadingState label="Carregando cadastro…" /></Card>
  if (!customer) return (
    <Card>
      <ErrorState message={error ?? 'Cadastro indisponível.'}
        action={<Button variant="secondary" onClick={reload}>Tentar novamente</Button>} />
    </Card>
  )

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title={customer.name} action={<CustomerAccountBadge status={customer.accountStatus} />} />
        <CardContent>
          <dl className="grid gap-4 text-sm text-text-body sm:grid-cols-2">
            <div><dt className="text-xs font-semibold">E-mail</dt><dd className="break-words">{customer.email ?? '—'}</dd></div>
            <div><dt className="text-xs font-semibold">Telefone</dt><dd>{customer.phone ?? '—'}</dd></div>
            <div><dt className="text-xs font-semibold">Estabelecimento</dt><dd>{customer.partnerName}</dd></div>
            <div><dt className="text-xs font-semibold">Cadastro</dt><dd>{dateFormat.format(new Date(customer.createdAt))}</dd></div>
          </dl>
          {scope === 'partner' && customer.accountStatus === 'UNCLAIMED' && (
            <Button className="mt-4" variant="secondary" onClick={() => setClaimOpen(true)}>
              Gerar código de vinculação
            </Button>
          )}
        </CardContent>
      </Card>
      {scope === 'partner' && <>
        <ReceptionNotificationEmail key={`notification-${customer.id}`} customerId={customer.id} email={customer.email}
          onReloadCustomer={reload} />
        <ReceptionPetDirectory key={customer.id} customerId={customer.id} partnerId={customer.partnerId} />
      </>}
      <IssueClaimDialog open={claimOpen} customerId={customer.id} onClose={() => { setClaimOpen(false); reload() }} />
    </div>
  )
}
