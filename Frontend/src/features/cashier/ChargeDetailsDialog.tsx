import { useCallback, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { SelectField, TextField } from '../../components/ui/Field'
import { ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { cashierService } from '../../services/cashier.service'
import type { CashierCharge, CashierMethod, CashierMovement } from '../../services/cashier.service'
import { ApplyExtraDialog } from './ApplyExtraDialog'
import { CashierCommandDialog } from './CashierCommandDialog'
import { CashierMovements } from './CashierLedger'
import { CASHIER_METHODS, cashierError, centsFromInput, METHOD_LABELS, MONEY_PATTERN, money, timestamp } from './format'
import type { CashierCommandForm } from './useCashierCommand'
import { useCashierQuery } from './useCashierQuery'

type Props = {
  chargeId: string
  todayOpen: boolean
  canClose: boolean
  command: CashierCommandForm
  revision: number
  onClose: () => void
}

type Entry = { type: 'receipt'; charge: CashierCharge } | { type: 'reverse'; receipt: CashierMovement }

export function ChargeDetailsDialog({ chargeId, todayOpen, canClose, command, revision, onClose }: Props) {
  const [entry, setEntry] = useState<Entry>()
  const [addExtra, setAddExtra] = useState(false)
  const load = useCallback(() => cashierService.charge(chargeId), [chargeId])
  const { result, retry } = useCashierQuery(load, revision)

  if (entry) {
    return <EntryForm entry={entry} onClose={() => setEntry(undefined)} command={command} />
  }

  const details = result && 'data' in result ? result.data : undefined
  if (details && addExtra) {
    return <ApplyExtraDialog details={details} command={command} onClose={onClose} />
  }
  const extras = details?.approvedExtras ?? []
  const legacyExtras = (details?.charge.extrasCents ?? 0) - extras.reduce((total, extra) => total + extra.amountCents, 0)
  const reversed = new Set(details?.movements.map(movement => movement.reversesReceiptId))
  const reversible = details?.movements.filter(movement => movement.type === 'RECEIPT' && !reversed.has(movement.id))

  return (
    <Dialog open title={details?.charge.description ?? 'Detalhes da cobrança'}
      onOpenChange={open => { if (!open) onClose() }}
      actions={details && todayOpen && (
        <>
          {legacyExtras === 0 && <Button variant="secondary" onClick={() => setAddExtra(true)}>Vincular adicional</Button>}
          {details.charge.balanceCents > 0 &&
            <Button onClick={() => setEntry({ type: 'receipt', charge: details.charge })}>Registrar recebimento</Button>}
        </>
      )}>
      {!result && <LoadingState label="Carregando cobrança…" />}
      {result && 'error' in result && (
        <ErrorState message={cashierError(result.error, 'Não foi possível carregar a cobrança.')}
          action={<Button variant="secondary" onClick={retry}>Tentar novamente</Button>} />
      )}
      {details && (
        <div className="space-y-4">
          <dl className="space-y-2 text-sm">
            <ChargeAmount label="Serviço" cents={details.charge.baseCents} />
            <ChargeAmount label="Adicionais" cents={details.charge.extrasCents} />
            <ChargeAmount label="Desconto" cents={-details.charge.discountCents} />
            <ChargeAmount label="Total" cents={details.charge.totalCents} />
            <ChargeAmount label="Recebido" cents={details.charge.receivedCents} />
            <div className="flex items-center justify-between gap-3">
              <dt>Saldo pendente</dt>
              <dd><Badge tone={details.charge.balanceCents ? 'warning' : 'success'}>{money(details.charge.balanceCents)}</Badge></dd>
            </div>
          </dl>
          {legacyExtras > 0 && (
            <p className="text-xs text-text-body">Adicionais manuais históricos de {money(legacyExtras)}.</p>
          )}
          {extras.length > 0 && (
            <div className="space-y-2 border-t border-border pt-3">
              <h3 className="text-sm font-bold text-text-heading">Adicionais aprovados aplicados</h3>
              <ul className="divide-y divide-border">
                {extras.map(extra => (
                  <li key={extra.id} className="space-y-1 py-2 wrap-anywhere text-xs text-text-body">
                    <p className="text-sm font-semibold text-text-heading">{extra.description} · {money(extra.amountCents)}</p>
                    <p>{extra.channel === 'IN_PERSON' ? 'Aceite presencial registrado' : 'Aceite digital'} em {timestamp(extra.acceptedAt)}</p>
                    <p>Aplicado em {timestamp(extra.appliedAt)} por {extra.appliedBy}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <details className="space-y-1 border-t border-border pt-3 wrap-anywhere text-xs text-text-body">
            <summary className="cursor-pointer text-sm font-bold text-text-heading">Dados da cobrança</summary>
            <p>Cobrança {details.charge.id}</p>
            <p>Reserva {details.charge.bookingId}</p>
            <p>Criada em {timestamp(details.charge.createdAt)}</p>
            <p>Operador {details.charge.createdBy}</p>
          </details>
          <div className="border-t border-border pt-3">
            <h3 className="text-sm font-bold text-text-heading">Histórico da cobrança</h3>
            <CashierMovements movements={details.movements} />
          </div>
          {todayOpen && canClose && !!reversible?.length && (
            <ul className="space-y-2" aria-label="Recebimentos disponíveis para reversão">
              {reversible.map(receipt => (
                <li key={receipt.id}>
                  <Button variant="secondary" size="sm" className="w-full justify-start text-left"
                    onClick={() => setEntry({ type: 'reverse', receipt })}>
                    Reverter {money(receipt.amountCents)} em {METHOD_LABELS[receipt.method]} · {timestamp(receipt.createdAt)}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Dialog>
  )
}

function ChargeAmount({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className="font-semibold text-text-heading tabular-nums">{money(cents === 0 ? 0 : cents)}</dd>
    </div>
  )
}

function EntryForm({ entry, onClose, command }: { entry: Entry; onClose: () => void; command: CashierCommandForm }) {
  const [validation, setValidation] = useState('')

  function submit(data: FormData) {
    setValidation('')
    if (entry.type === 'reverse') {
      const reason = String(data.get('reason') ?? '').trim()
      if (!reason) {
        setValidation('Informe o motivo da reversão.')
        return
      }
      void command.submit({ type: 'reverse', receiptId: entry.receipt.id, chargeId: entry.receipt.chargeId, reason })
    } else {
      const amount = centsFromInput(String(data.get('amount') ?? ''))
      if (!amount || amount > entry.charge.balanceCents) {
        setValidation('Informe um valor maior que zero e até o saldo pendente.')
        return
      }
      const method = data.get('method') as CashierMethod
      void command.submit({ type: 'receipt', chargeId: entry.charge.id, method, amountCents: amount })
    }
  }

  if (entry.type === 'reverse') {
    return (
      <CashierCommandDialog
        title="Reverter recebimento"
        description={`${money(entry.receipt.amountCents)} em ${METHOD_LABELS[entry.receipt.method]} será lançado como ajuste no caixa de hoje.`}
        submitLabel="Registrar reversão"
        saving={command.saving} error={validation || command.error} onClose={onClose} onSubmit={submit}
      >
        <TextField name="reason" label="Motivo" maxLength={300} required />
      </CashierCommandDialog>
    )
  }

  return (
    <CashierCommandDialog title="Registrar recebimento"
      description={`Saldo pendente de ${money(entry.charge.balanceCents)}`}
      submitLabel="Salvar recebimento"
      saving={command.saving} error={validation || command.error} onClose={onClose} onSubmit={submit}>
      <SelectField label="Forma de pagamento" name="method" defaultValue="" required>
        <option value="" disabled>Selecione</option>
        {CASHIER_METHODS.map(method => <option key={method} value={method}>{METHOD_LABELS[method]}</option>)}
      </SelectField>
      <TextField name="amount" label="Valor recebido (R$)" inputMode="decimal" pattern={MONEY_PATTERN} required />
    </CashierCommandDialog>
  )
}
