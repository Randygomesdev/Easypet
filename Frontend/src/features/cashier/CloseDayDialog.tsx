import type { CashierDay } from '../../services/cashier.service'
import { CashierCommandDialog } from './CashierCommandDialog'
import { dayLabel, money } from './format'
import type { CashierCommandForm } from './useCashierCommand'

export function CloseDayDialog({ day, onClose, command }: { day: CashierDay; onClose: () => void; command: CashierCommandForm }) {
  return (
    <CashierCommandDialog
      title={`Fechar caixa de ${dayLabel(day.date)}?`}
      description={`Líquido consultado de ${money(day.totals.netCents)}. Após o fechamento, o extrato desse dia fica disponível para consulta.`}
      submitLabel="Confirmar fechamento"
      saving={command.saving}
      error={command.error}
      onClose={onClose}
      onSubmit={() => void command.submit({ type: 'close', date: day.date })}
    />
  )
}
