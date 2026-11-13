import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import type { CashierCommand } from '../../services/cashier.service'
import { dayLabel, METHOD_LABELS, money } from './format'

function describe(command: CashierCommand) {
  switch (command.type) {
    case 'charge': {
      const { description, baseCents, extrasCents, discountCents } = command.data
      return `${description} · ${money(baseCents + extrasCents - discountCents)}`
    }
    case 'receipt':
      return `Recebimento de ${money(command.amountCents)} em ${METHOD_LABELS[command.method]}`
    case 'reverse':
      return `Reversão de recebimento · ${command.reason}`
    case 'close':
      return `Fechamento de ${dayLabel(command.date)}`
  }
}

export function PendingCashierIntent({ command, error, saving, canRetry, onRetry }: {
  command: CashierCommand
  error: string
  saving: boolean
  canRetry: boolean
  onRetry: () => void
}) {
  return (
    <Card>
      <CardHeader title="Lançamento aguardando confirmação" description={describe(command)} />
      <CardContent className="space-y-3">
        <p className="text-sm text-text-body">Retome a mesma tentativa para confirmar o resultado antes de outro lançamento.</p>
        {!canRetry && <p className="text-sm text-text-body">Verifique seu acesso antes de retomar esta tentativa.</p>}
        {error && <p className="text-sm text-text-danger" role="alert">{error}</p>}
        <Button onClick={onRetry} disabled={saving || !canRetry}>
          {saving ? 'Confirmando…' : 'Retomar lançamento'}
        </Button>
      </CardContent>
    </Card>
  )
}
