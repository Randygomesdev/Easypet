import { useCallback, useState } from 'react'
import { ReceiptText } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { SelectField } from '../../components/ui/Field'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { Pagination } from '../../components/ui/Pagination'
import { Table, TableCell, TableHeaderCell } from '../../components/ui/Table'
import { cashierService } from '../../services/cashier.service'
import type { CashierCharge } from '../../services/cashier.service'
import { cashierError, money } from './format'
import { useCashierQuery } from './useCashierQuery'

type Props = {
  revision: number
  onOpenCharge: (id: string) => void
}

export function CashierCharges({ revision, onOpenCharge }: Props) {
  const [openOnly, setOpenOnly] = useState(true)
  const [page, setPage] = useState(0)
  const load = useCallback(() => cashierService.charges(openOnly, page), [openOnly, page])
  const { result, retry } = useCashierQuery(load, revision)
  return (
    <Card>
      <CardHeader
        title="Cobranças"
        action={
          <SelectField label="Saldo" value={openOnly ? 'open' : 'all'} onChange={event => {
            setOpenOnly(event.target.value === 'open')
            setPage(0)
          }}>
            <option value="open">Pendentes</option>
            <option value="all">Todas</option>
          </SelectField>
        }
      />
      {!result && <LoadingState label="Carregando cobranças…" />}
      {result && 'error' in result && (
        <ErrorState
          message={cashierError(result.error, 'Não foi possível carregar as cobranças.')}
          action={<Button variant="secondary" onClick={retry}>Tentar novamente</Button>}
        />
      )}
      {result && 'data' in result && (
        <>
          {!result.data.content.length ? (
            <EmptyState
              icon={ReceiptText}
              title={openOnly ? 'Nenhuma cobrança pendente nesta página' : 'Nenhuma cobrança nesta página'}
              size="sm"
              action={page > 0 && <Button variant="secondary" onClick={() => setPage(0)}>Voltar à primeira página</Button>}
            />
          ) : (
            <>
              <ul aria-label="Cobranças do estabelecimento" className="divide-y divide-border sm:hidden">
                {result.data.content.map(charge => (
                  <li key={charge.id} className="space-y-3 p-4">
                    <Button variant="secondary" size="sm" className="max-w-full wrap-anywhere text-left"
                      onClick={() => onOpenCharge(charge.id)}>
                      {charge.description}
                    </Button>
                    <dl className="grid grid-cols-2 gap-2 text-xs text-text-body">
                      <div><dt>Total</dt><dd className="tabular-nums">{money(charge.totalCents)}</dd></div>
                      <div><dt>Recebido</dt><dd className="tabular-nums">{money(charge.receivedCents)}</dd></div>
                      <div className="col-span-2"><dt>Saldo</dt><dd><Balance charge={charge} /></dd></div>
                    </dl>
                  </li>
                ))}
              </ul>
              <div className="hidden sm:block">
                <ChargeTable charges={result.data.content} onOpenCharge={onOpenCharge} />
              </div>
            </>
          )}
          <Pagination
            page={page + 1}
            totalPages={result.data.totalPages}
            onPageChange={next => setPage(next - 1)}
            label="Páginas de cobranças"
          />
        </>
      )}
    </Card>
  )
}

function Balance({ charge }: { charge: CashierCharge }) {
  return <Badge tone={charge.balanceCents > 0 ? 'warning' : 'success'}>{money(charge.balanceCents)}</Badge>
}

function ChargeTable({ charges, onOpenCharge }: { charges: CashierCharge[]; onOpenCharge: (id: string) => void }) {
  return (
    <Table caption="Cobranças do estabelecimento">
      <thead className="border-b border-border bg-bg/30">
        <tr>
          <TableHeaderCell>Cobrança</TableHeaderCell>
          <TableHeaderCell className="text-right">Total</TableHeaderCell>
          <TableHeaderCell className="text-right">Recebido</TableHeaderCell>
          <TableHeaderCell className="text-right">Saldo</TableHeaderCell>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {charges.map(charge => (
          <tr key={charge.id}>
            <TableCell>
              <Button variant="secondary" size="sm" className="wrap-anywhere text-left" onClick={() => onOpenCharge(charge.id)}>
                {charge.description}
              </Button>
            </TableCell>
            <TableCell className="text-right whitespace-nowrap tabular-nums">{money(charge.totalCents)}</TableCell>
            <TableCell className="text-right whitespace-nowrap tabular-nums">{money(charge.receivedCents)}</TableCell>
            <TableCell className="text-right whitespace-nowrap tabular-nums">
              <Balance charge={charge} />
            </TableCell>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
