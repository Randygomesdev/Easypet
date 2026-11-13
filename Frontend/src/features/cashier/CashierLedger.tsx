import { ReceiptText } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/FeedbackState'
import { Pagination } from '../../components/ui/Pagination'
import { Table, TableCell, TableHeaderCell } from '../../components/ui/Table'
import type { CashierDay, CashierMovement } from '../../services/cashier.service'
import { CASHIER_METHODS, dayLabel, METHOD_LABELS, money, timestamp } from './format'

type LedgerProps = {
  day: CashierDay
  onPageChange: (page: number) => void
  onOpenCharge: (id: string) => void
  onCloseDay?: () => void
}

export function CashierLedger({ day, onPageChange, onOpenCharge, onCloseDay }: LedgerProps) {
  const { totals, movements } = day
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DayAmount label="Recebido" cents={totals.receivedCents} />
        <DayAmount label="Ajustes" cents={totals.adjustmentCents} />
        <DayAmount label="Líquido do dia" cents={totals.netCents} />
      </dl>
      <Card>
        <CardHeader
          title={`Extrato de ${dayLabel(day.date)}`}
          action={day.closedAt
            ? <Badge tone="neutral">Fechado</Badge>
            : <Button variant="secondary" size="sm" disabled={!onCloseDay} onClick={onCloseDay}>Fechar dia</Button>}
        />
        {day.closedAt && (
          <CardContent className="space-y-1 border-b border-border text-xs text-text-body">
            <p>Fechado em {timestamp(day.closedAt)}</p>
            <p className="break-all">Operador {day.closedBy}</p>
            {day.closingId && <p className="break-all">Fechamento {day.closingId}</p>}
          </CardContent>
        )}
        <CardContent className="border-b border-border">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5" aria-label="Líquido por forma de pagamento">
            {CASHIER_METHODS.map(method => (
              <div key={method}>
                <dt className="text-xs text-text-muted">{METHOD_LABELS[method]}</dt>
                <dd className="text-sm font-semibold text-text-heading tabular-nums">{money(totals.byMethod[method])}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
        <CashierMovements movements={movements.content} onOpenCharge={onOpenCharge} />
        <Pagination
          page={movements.number + 1}
          totalPages={movements.totalPages}
          onPageChange={page => onPageChange(page - 1)}
          label="Páginas do extrato"
        />
      </Card>
    </div>
  )
}

function DayAmount({ label, cents }: { label: string; cents: number }) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <dt className="text-xs font-semibold text-text-body">{label}</dt>
      <dd className="text-2xl font-black text-text-heading tabular-nums">{money(cents)}</dd>
    </Card>
  )
}

type MovementsProps = {
  movements: CashierMovement[]
  onOpenCharge?: (id: string) => void
}

export function CashierMovements({ movements, onOpenCharge }: MovementsProps) {
  if (!movements.length) {
    return <EmptyState icon={ReceiptText} title="Nenhum movimento registrado" size="sm" />
  }
  return (
    <>
      <ul aria-label="Movimentos" className={onOpenCharge ? 'divide-y divide-border sm:hidden' : 'divide-y divide-border'}>
        {movements.map(movement => (
          <li key={movement.id} className={onOpenCharge ? 'space-y-2 p-4' : 'space-y-2 py-3'}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <MovementBadge movement={movement} />
              <span className="font-semibold text-text-heading tabular-nums">{money(movement.amountCents)}</span>
            </div>
            <p className="text-xs text-text-body">{METHOD_LABELS[movement.method]} · {timestamp(movement.createdAt)}</p>
            {onOpenCharge && (
              <Button variant="secondary" size="sm" className="max-w-full wrap-anywhere text-left"
                onClick={() => onOpenCharge(movement.chargeId)}>
                {movement.chargeDescription}
              </Button>
            )}
            <MovementAudit movement={movement} />
          </li>
        ))}
      </ul>
      {onOpenCharge && (
        <div className="hidden sm:block">
          <MovementTable movements={movements} onOpenCharge={onOpenCharge} />
        </div>
      )}
    </>
  )
}

function MovementBadge({ movement }: { movement: CashierMovement }) {
  return (
    <Badge tone={movement.type === 'RECEIPT' ? 'success' : 'warning'}>
      {movement.type === 'RECEIPT' ? 'Recebimento' : 'Reversão'}
    </Badge>
  )
}

function MovementAudit({ movement }: { movement: CashierMovement }) {
  return (
    <div className="space-y-1 wrap-anywhere text-xs text-text-body">
      <p>Operador {movement.createdBy}</p>
      {movement.reason && <p>Motivo: {movement.reason}</p>}
      <details>
        <summary className="cursor-pointer font-semibold text-text-heading">Referências do movimento</summary>
        <p className="mt-1">Movimento {movement.id}</p>
        {movement.reversesReceiptId && <p>Recebimento original {movement.reversesReceiptId}</p>}
      </details>
    </div>
  )
}

function MovementTable({ movements, onOpenCharge }: {
  movements: CashierMovement[]
  onOpenCharge: (id: string) => void
}) {
  return (
    <Table caption="Movimentos do caixa">
      <thead className="border-b border-border bg-bg/30">
        <tr>
          <TableHeaderCell>Data e hora</TableHeaderCell>
          <TableHeaderCell>Cobrança</TableHeaderCell>
          <TableHeaderCell>Movimento</TableHeaderCell>
          <TableHeaderCell>Forma</TableHeaderCell>
          <TableHeaderCell className="text-right">Valor</TableHeaderCell>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {movements.map(movement => (
          <tr key={movement.id}>
            <TableCell className="whitespace-nowrap">{timestamp(movement.createdAt)}</TableCell>
            <TableCell>
              <Button variant="secondary" size="sm" className="wrap-anywhere text-left"
                onClick={() => onOpenCharge(movement.chargeId)}>
                {movement.chargeDescription}
              </Button>
            </TableCell>
            <TableCell className="space-y-1">
              <MovementBadge movement={movement} />
              <MovementAudit movement={movement} />
            </TableCell>
            <TableCell>{METHOD_LABELS[movement.method]}</TableCell>
            <TableCell className="text-right font-semibold whitespace-nowrap tabular-nums">
              {money(movement.amountCents)}
            </TableCell>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
