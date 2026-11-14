import { useCallback, useState } from 'react'
import { ReceiptText } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { Pagination } from '../../components/ui/Pagination'
import { cashierService } from '../../services/cashier.service'
import type { CashierBookingExtra, CashierChargeDetails } from '../../services/cashier.service'
import { CashierCommandDialog } from './CashierCommandDialog'
import { cashierError, money } from './format'
import type { CashierCommandForm } from './useCashierCommand'
import { useCashierQuery } from './useCashierQuery'

export function ApplyExtraDialog({ details, command, onClose }: {
  details: CashierChargeDetails
  command: CashierCommandForm
  onClose: () => void
}) {
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<CashierBookingExtra>()
  const { bookingId, id } = details.charge
  const load = useCallback(() => cashierService.bookingExtras(bookingId, page), [bookingId, page])
  const { result, retry } = useCashierQuery(load)
  const data = result && 'data' in result ? result.data : undefined
  const alreadyApplied = new Set(details.approvedExtras?.map(extra => extra.approvalId))
  const eligible = data?.content.filter(extra => extra.status === 'APPROVED' && !alreadyApplied.has(extra.id)) ?? []

  if (selected) {
    return (
      <CashierCommandDialog title="Aplicar adicional aprovado"
        description={`${selected.description} · ${money(selected.amountCents)} serão somados à cobrança.`}
        submitLabel="Aplicar adicional" saving={command.saving} error={command.error} onClose={onClose}
        onSubmit={() => void command.submit({ type: 'applyExtra', chargeId: id, approvalId: selected.id, version: selected.version })}
      />
    )
  }
  return (
    <Dialog open title="Selecionar adicional aprovado" onOpenChange={open => { if (!open) onClose() }}>
      {!result && <LoadingState label="Carregando adicionais…" />}
      {result && 'error' in result && (
        <ErrorState message={cashierError(result.error, 'Não foi possível consultar os adicionais.')}
          action={<Button variant="secondary" onClick={retry}>Tentar novamente</Button>} />
      )}
      {data && (
        <>
          {eligible.length ? <ul className="space-y-2">
            {eligible.map(extra => (
              <li key={extra.id}>
                <Button variant="secondary" className="w-full justify-start wrap-anywhere text-left"
                  onClick={() => setSelected(extra)}>
                  {extra.description} · {money(extra.amountCents)}
                </Button>
              </li>
            ))}
          </ul> : <EmptyState icon={ReceiptText} title="Nenhum adicional disponível nesta página" size="sm" />}
          <Pagination page={page + 1} totalPages={data.totalPages} onPageChange={next => setPage(next - 1)}
            label="Páginas de adicionais" />
        </>
      )}
    </Dialog>
  )
}
