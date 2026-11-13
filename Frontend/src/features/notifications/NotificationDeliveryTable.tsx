import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Table, TableCell, TableHeaderCell } from '../../components/ui/Table'
import type { NotificationDelivery } from '../../services/notification.service'
import { deliveryExplanation, deliveryStatus, formatDateTime, typeLabel } from './presentation'

interface Props {
  deliveries: NotificationDelivery[]
  onSelect: (delivery: NotificationDelivery) => void
}

export function NotificationDeliveryTable({ deliveries, onSelect }: Props) {
  return (
    <>
      <ul aria-label="Entregas de notificações" className="divide-y divide-border md:hidden">
        {deliveries.map(delivery => (
          <li key={delivery.id} className="space-y-3 px-5 py-4 text-sm text-text-body">
            <h3 className="font-semibold text-text-heading">{typeLabel[delivery.type]}</h3>
            <DeliveryState delivery={delivery} />
            <p className="text-xs">
              {delivery.attemptCount} {delivery.attemptCount === 1 ? 'tentativa' : 'tentativas'} · Atualizada em{' '}
              <time dateTime={delivery.updatedAt}>{formatDateTime(delivery.updatedAt)}</time>
            </p>
            <HistoryButton delivery={delivery} onSelect={onSelect} />
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table caption="Entregas de notificações">
          <thead className="border-b border-border bg-bg/30">
            <tr>
              <TableHeaderCell>Notificação</TableHeaderCell>
              <TableHeaderCell>Estado</TableHeaderCell>
              <TableHeaderCell>Tentativas</TableHeaderCell>
              <TableHeaderCell>Atualizada em</TableHeaderCell>
              <TableHeaderCell>Ações</TableHeaderCell>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {deliveries.map(delivery => (
              <tr key={delivery.id}>
                <TableCell className="font-semibold text-text-heading">{typeLabel[delivery.type]}</TableCell>
                <TableCell><DeliveryState delivery={delivery} /></TableCell>
                <TableCell className="tabular-nums">{delivery.attemptCount}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <time dateTime={delivery.updatedAt}>{formatDateTime(delivery.updatedAt)}</time>
                </TableCell>
                <TableCell><HistoryButton delivery={delivery} onSelect={onSelect} /></TableCell>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  )
}

function DeliveryState({ delivery }: { delivery: NotificationDelivery }) {
  const status = deliveryStatus(delivery)
  const explanation = deliveryExplanation(delivery)
  return (
    <div className="space-y-1">
      <Badge tone={status.tone}>{status.label}</Badge>
      {delivery.status === 'RETRY_SCHEDULED' && (
        <p className="text-xs">Próxima tentativa <time dateTime={delivery.dueAt}>{formatDateTime(delivery.dueAt)}</time></p>
      )}
      {delivery.status === 'PENDING' && (
        <p className="text-xs">Envio a partir de <time dateTime={delivery.dueAt}>{formatDateTime(delivery.dueAt)}</time></p>
      )}
      {explanation && <p className="text-xs">{explanation}</p>}
    </div>
  )
}

function HistoryButton({ delivery, onSelect }: Pick<Props, 'onSelect'> & { delivery: NotificationDelivery }) {
  return (
    <Button variant="secondary" size="sm" onClick={() => onSelect(delivery)}
      aria-label={`Ver tentativas de ${typeLabel[delivery.type].toLowerCase()}`}>
      Ver tentativas
    </Button>
  )
}
