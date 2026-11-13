import { useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { PendingCashierIntent } from '../../features/cashier/PendingCashierIntent'
import { NotificationDeliveryTable } from '../../features/notifications/NotificationDeliveryTable'
import type { NotificationDelivery } from '../../services/notification.service'
import ExampleCode from './ExampleCode'

function CashierExample() {
  const [canClose, setCanClose] = useState(false)
  const [pending, setPending] = useState(true)

  return (
    <Card id="caixa">
      <CardHeader title="Recebimento parcial e fechamento de caixa" />
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Perfil do caixa">
          <Button size="sm" variant={canClose ? 'secondary' : 'primary'} aria-pressed={!canClose} onClick={() => setCanClose(false)}>Recepção</Button>
          <Button size="sm" variant={canClose ? 'primary' : 'secondary'} aria-pressed={canClose} onClick={() => setCanClose(true)}>Gestor</Button>
        </div>
        <Card>
          <CardHeader title="Banho e tosa" action={<Badge tone="warning">Parcial</Badge>} />
          <CardContent>
            <dl className="grid gap-3 text-sm text-text-body sm:grid-cols-3">
              <div><dt>Cobrado</dt><dd className="font-semibold tabular-nums">R$ 100,00</dd></div>
              <div><dt>Recebido</dt><dd className="font-semibold tabular-nums">R$ 40,00</dd></div>
              <div><dt>Saldo pendente</dt><dd className="font-semibold tabular-nums">R$ 60,00</dd></div>
            </dl>
          </CardContent>
        </Card>
        {canClose && <Card>
          <CardHeader title="Extrato do dia" action={<Badge tone="neutral">Fechado</Badge>} />
          <CardContent className="text-sm text-text-body">Fechado por Ana Souza em 13/11/2026. Total líquido de R$ 40,00.</CardContent>
        </Card>}
        {pending ? <PendingCashierIntent
          command={{ type: 'receipt', chargeId: 'cobranca-de-exemplo', method: 'PIX', amountCents: 4000 }}
          canRetry error="" saving={false} onRetry={() => setPending(false)} />
          : <p role="status" className="text-sm text-text-body">Lançamento retomado neste exemplo.</p>}
        <ExampleCode>{`{pending && <PendingCashierIntent command={pending.command} canRetry={canRetry}
  error={error} saving={saving} onRetry={resume} />}
{canClose && <CashierLedger day={day} onPageChange={setPage}
  onOpenCharge={openCharge} onCloseDay={confirmClose} />}`}</ExampleCode>
      </CardContent>
    </Card>
  )
}

const sampleDelivery: NotificationDelivery = {
  id: '11d594e8-9f66-4813-b9ab-cc99664f3070',
  bookingId: '56535e34-8cf1-45cf-a94c-826fc3b539ab',
  type: 'CONFIRMATION',
  status: 'FAILED',
  attemptCount: 3,
  dueAt: '2026-11-13T15:02:00Z',
  updatedAt: '2026-11-13T15:02:01Z',
  lastError: 'SMTP_TEMPORARY',
  canRetry: true,
}

function NotificationExample() {
  const [selected, setSelected] = useState<NotificationDelivery>()
  const [retryRequested, setRetryRequested] = useState(false)
  const delivered = { ...sampleDelivery, status: 'SENT', lastError: null, canRetry: false } satisfies NotificationDelivery

  return (
    <Card id="notificacoes">
      <CardHeader title="Tentativas de notificação" />
      <NotificationDeliveryTable deliveries={[retryRequested ? delivered : sampleDelivery]} onSelect={setSelected} />
      <CardContent className="space-y-3">
        {retryRequested && <p role="status" className="text-sm text-text-body">Reenvio concluído neste exemplo.</p>}
        <ExampleCode>{`<NotificationDeliveryTable deliveries={deliveries} onSelect={setSelectedDelivery} />
{selectedDelivery?.canRetry && <Button onClick={requestRetry}>Solicitar reenvio</Button>}`}</ExampleCode>
      </CardContent>
      <Dialog open={Boolean(selected)} title="Confirmação" onOpenChange={open => { if (!open) setSelected(undefined) }}
        actions={selected?.canRetry && <Button onClick={() => {
          setRetryRequested(true)
          setSelected(undefined)
        }}>Solicitar reenvio</Button>}>
        <p className="text-sm text-text-body">Tentativa {selected?.attemptCount}</p>
        <p className="text-sm font-semibold text-text-heading">{selected?.canRetry ? 'Falha temporária' : 'Enviada'}</p>
      </Dialog>
    </Card>
  )
}

export default function OperationsExamples() {
  return <><CashierExample /><NotificationExample /></>
}
