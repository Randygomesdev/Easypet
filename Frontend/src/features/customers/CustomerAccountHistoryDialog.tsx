import { useCallback, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { Pagination } from '../../components/ui/Pagination'
import { customerService } from '../../services/customer.service'
import type { AdminCustomer } from '../../types/auth.types'
import { useCustomerQuery } from './useCustomerQuery'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export function CustomerAccountHistoryDialog({ account, onClose }: { account: AdminCustomer; onClose: () => void }) {
  const [page, setPage] = useState(0)
  const load = useCallback((signal: AbortSignal) => customerService.listAccountAudit(account.id, page, signal),
    [account.id, page])
  const { data, error, loading, reload } = useCustomerQuery(load, 'Não foi possível carregar o histórico da conta.')

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }} title="Histórico da conta" description={account.name}>
      <div className="mt-4 space-y-3">
        {loading && <LoadingState label="Carregando histórico…" />}
        {error && <ErrorState message={error} action={<Button variant="secondary" onClick={reload}>Tentar novamente</Button>} />}
        {data?.content.length === 0 && <p className="text-sm">Nenhuma alteração registrada para esta conta.</p>}
        {data && data.content.length > 0 && (
          <ol className="space-y-2 text-sm">
            {data.content.map(event => (
              <li key={event.id} className="rounded-xl border border-border p-3">
                <p className="font-semibold text-text-heading">
                  {event.action === 'CUSTOMER_ACTIVATED' ? 'Conta reativada' : 'Conta desativada'}
                </p>
                <p className="break-words">{event.reason}</p>
                <p className="mt-1 text-xs">{dateFormat.format(new Date(event.occurredAt))}</p>
                <p className="break-all text-xs">Operador {event.actorId}</p>
              </li>
            ))}
          </ol>
        )}
        {data && <Pagination page={page + 1} totalPages={data.totalPages}
          label="Paginação do histórico da conta" onPageChange={next => setPage(next - 1)} />}
      </div>
    </Dialog>
  )
}
