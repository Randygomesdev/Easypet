import { useCallback, useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Field'
import { ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { CashierCharges } from '../../features/cashier/CashierCharges'
import { CashierLedger } from '../../features/cashier/CashierLedger'
import { ChargeDetailsDialog } from '../../features/cashier/ChargeDetailsDialog'
import { CloseDayDialog } from '../../features/cashier/CloseDayDialog'
import { NewChargeDialog } from '../../features/cashier/NewChargeDialog'
import { PendingCashierIntent } from '../../features/cashier/PendingCashierIntent'
import { cashierError } from '../../features/cashier/format'
import { useCashierCommand } from '../../features/cashier/useCashierCommand'
import { useCashierQuery } from '../../features/cashier/useCashierQuery'
import { cashierService } from '../../services/cashier.service'
import type { CashierContext, CashierDay } from '../../services/cashier.service'

type DialogState = { type: 'create'; today: string } | { type: 'charge'; id: string } | { type: 'close'; day: CashierDay }

export default function CaixaPage() {
  const { result, retry } = useCashierQuery(cashierService.context)
  if (!result) return <LoadingState label="Carregando caixa…" />
  if ('error' in result) return (
    <ErrorState message={cashierError(result.error, 'Não foi possível carregar o caixa.')}
      action={<Button variant="secondary" onClick={retry}>Tentar novamente</Button>} />
  )
  const context = result.data
  return <CashierWorkspace key={`${context.partnerId}.${context.actorId}`} initialContext={context} />
}

const SAVED_LABELS = {
  charge: 'Cobrança criada.',
  receipt: 'Recebimento registrado.',
  reverse: 'Reversão registrada.',
  applyExtra: 'Adicional aprovado aplicado à cobrança.',
  close: 'Caixa fechado.',
}

function CashierWorkspace({ initialContext }: { initialContext: CashierContext }) {
  const [date, setDate] = useState<string>()
  const [page, setPage] = useState(0)
  const [revision, setRevision] = useState(0)
  const [notice, setNotice] = useState('')
  const [dayClosedNotice, setDayClosedNotice] = useState(false)
  const [dialog, setDialog] = useState<DialogState>()
  const contextQuery = useCashierQuery(cashierService.context, revision, revision > 0)
  const context = revision === 0 ? initialContext
    : contextQuery.result && 'data' in contextQuery.result ? contextQuery.result.data : undefined
  const sameScope = context?.partnerId === initialContext.partnerId && context.actorId === initialContext.actorId
  const canClose = Boolean(sameScope && context.canClose)
  const command = useCashierCommand(initialContext, (saved, id) => {
    setDayClosedNotice(false)
    setNotice(SAVED_LABELS[saved.type])
    setRevision(value => value + 1)
    if (saved.type === 'charge') setDialog({ type: 'charge', id })
    else if (saved.type === 'close') setDialog(undefined)
    else setDialog({ type: 'charge', id: saved.chargeId })
  }, () => {
    setNotice('')
    setDayClosedNotice(true)
    setDialog(undefined)
    setRevision(value => value + 1)
  })
  const loadDay = useCallback(() => cashierService.day(date, page), [date, page])
  const selected = useCashierQuery(loadDay, revision, canClose)
  const todayOpen = Boolean(sameScope && !context.closedToday)
  const writable = !command.pending && !command.storageError && !command.saving
  const day = canClose && selected.result && 'data' in selected.result ? selected.result.data : undefined
  const pendingType = command.pending?.command.type
  const pendingRequiresClose = pendingType === 'close' || pendingType === 'reverse'
  const canRetry = Boolean(sameScope && (pendingRequiresClose ? canClose : context.canReceive))

  function openCharge(id: string) {
    setDialog({ type: 'charge', id })
  }

  function closeDialog() {
    command.setError('')
    setDialog(undefined)
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-heading lg:text-3xl">Caixa</h1>
          <p className="mt-0.5 text-xs text-text-muted">Recebimentos no estabelecimento</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={command.saving || !context} onClick={() => {
            setDayClosedNotice(false)
            setRevision(value => value + 1)
          }}>
            <RefreshCw size={16} aria-hidden="true" /> Atualizar caixa
          </Button>
          <Button disabled={!todayOpen || !writable} onClick={() => {
            command.setError('')
            if (context) setDialog({ type: 'create', today: context.businessDate })
          }}>
            <Plus size={16} aria-hidden="true" /> Nova cobrança
          </Button>
        </div>
      </header>
      {notice && <p role="status" className="text-sm font-medium text-text-heading">{notice}</p>}
      {command.storageError && <p role="alert" className="text-sm text-text-danger">{command.storageError}</p>}
      {!dialog && !command.pending && !dayClosedNotice && command.error && (
        <p role="alert" className="text-sm text-text-danger">{command.error}</p>
      )}
      {command.pending && (
        <PendingCashierIntent command={command.pending.command} error={command.error} saving={command.saving}
          canRetry={canRetry}
          onRetry={() => { if (command.pending) void command.submit(command.pending.command) }} />
      )}
      {contextQuery.result && 'error' in contextQuery.result && (
        <ErrorState message={cashierError(contextQuery.result.error, 'Não foi possível atualizar o caixa.')}
          action={<Button variant="secondary" onClick={contextQuery.retry}>Tentar novamente</Button>} />
      )}
      {(dayClosedNotice || context?.closedToday) && (
        <p role="status" className="text-sm text-text-body">
          {dayClosedNotice ? 'O lançamento foi recusado porque o caixa do dia já foi fechado.' : 'O caixa de hoje está fechado.'}
        </p>
      )}
      {canClose && (
        <div className="flex flex-wrap items-end gap-2">
          <TextField label="Data do extrato" type="date" value={date ?? context?.businessDate} max={context?.businessDate} onChange={event => {
            setDate(event.target.value || undefined)
            setPage(0)
          }} />
          {date && <Button variant="secondary" onClick={() => { setDate(undefined); setPage(0) }}>Hoje</Button>}
        </div>
      )}
      {canClose && !selected.result && <LoadingState label="Carregando extrato…" />}
      {canClose && selected.result && 'error' in selected.result && (
        <ErrorState message={cashierError(selected.result.error, 'Não foi possível carregar o caixa.')}
          action={<Button variant="secondary" onClick={selected.retry}>Tentar novamente</Button>} />
      )}
      {day && <CashierLedger day={day} onPageChange={setPage} onOpenCharge={openCharge}
        onCloseDay={writable ? () => {
          command.setError('')
          setDialog({ type: 'close', day })
        } : undefined} />}
      <CashierCharges revision={revision} onOpenCharge={openCharge} />
      {!command.pending && dialog?.type === 'create' && <NewChargeDialog today={dialog.today}
        partnerId={initialContext.partnerId} onClose={closeDialog} command={command} />}
      {!command.pending && dialog?.type === 'charge' && <ChargeDetailsDialog key={`${dialog.id}.${revision}`}
        chargeId={dialog.id} todayOpen={todayOpen && !command.storageError}
        canClose={canClose} command={command} revision={revision} onClose={closeDialog} />}
      {!command.pending && dialog?.type === 'close' && <CloseDayDialog day={dialog.day}
        onClose={closeDialog} command={command} />}
    </div>
  )
}
