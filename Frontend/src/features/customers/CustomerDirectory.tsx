import { useCallback } from 'react'
import { Search, Users } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/Field'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { Pagination } from '../../components/ui/Pagination'
import { Table, TableCell, TableHeaderCell } from '../../components/ui/Table'
import { customerService, type CustomerScope } from '../../services/customer.service'
import { useCustomerQuery } from './useCustomerQuery'
import { useDirectoryFilter } from './useDirectoryFilter'
import { CustomerAccountBadge } from './CustomerAccountBadge'

const PAGE_SIZE = 10
const dateFormat = new Intl.DateTimeFormat('pt-BR')

type Props = {
  scope: CustomerScope
  onSelect: (customerId: string) => void
}

export function CustomerDirectory({ scope, onSelect }: Props) {
  const { search, setSearch, submitSearch, filter: { q, page }, selectPage } = useDirectoryFilter()
  const load = useCallback((signal: AbortSignal) => customerService.list(scope, { q, page, size: PAGE_SIZE }, signal),
    [scope, q, page])
  const { data, error, loading, reload } = useCustomerQuery(load, 'Não foi possível carregar os clientes.')
  const isAdmin = scope === 'admin'

  return (
    <div className="space-y-4">
      <form onSubmit={submitSearch} className="flex flex-wrap items-end gap-2">
        <div className="w-full max-w-sm min-w-0">
          <TextField label="Buscar clientes" type="search" maxLength={254} value={search}
            onChange={event => setSearch(event.target.value)} placeholder="Nome, e-mail ou telefone" />
        </div>
        <Button type="submit" variant="secondary"><Search size={16} aria-hidden="true" />Buscar</Button>
      </form>
      <Card className="overflow-hidden">
        {loading && <LoadingState label="Carregando clientes…" />}
        {error && <ErrorState message={error}
          action={<Button variant="secondary" onClick={reload}>Tentar novamente</Button>} />}
        {data?.content.length === 0 && <EmptyState icon={Users}
          title={q ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
          description={q ? 'Confira o nome, e-mail ou telefone e tente outra busca.' : undefined} />}
        {data && data.content.length > 0 && (
          <Table caption={isAdmin ? 'Cadastros de balcão por estabelecimento' : 'Clientes do estabelecimento'}>
            <thead className="border-b border-border">
              <tr>
                <TableHeaderCell>Nome</TableHeaderCell>
                {isAdmin && <TableHeaderCell>Estabelecimento</TableHeaderCell>}
                <TableHeaderCell>E-mail</TableHeaderCell>
                <TableHeaderCell>Telefone</TableHeaderCell>
                <TableHeaderCell>Cadastro</TableHeaderCell>
                <TableHeaderCell>Conta</TableHeaderCell>
                <TableHeaderCell>Ações</TableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {data.content.map(customer => (
                <tr key={customer.id} className="border-b border-border last:border-b-0 hover:bg-bg/60">
                  <TableCell className="font-semibold">{customer.name}</TableCell>
                  {isAdmin && <TableCell>{customer.partnerName}</TableCell>}
                  <TableCell>{customer.email ?? '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">{customer.phone ?? '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">{dateFormat.format(new Date(customer.createdAt))}</TableCell>
                  <TableCell className="whitespace-nowrap"><CustomerAccountBadge status={customer.accountStatus} /></TableCell>
                  <TableCell>
                    <Button size="sm" variant="secondary" className="whitespace-nowrap"
                      aria-label={`Ver cadastro de ${customer.name}`} onClick={() => onSelect(customer.id)}>
                      Ver cadastro
                    </Button>
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {data && <Pagination page={page + 1} totalPages={data.totalPages} label="Paginação de clientes"
          onPageChange={next => selectPage(next - 1)} />}
      </Card>
    </div>
  )
}
