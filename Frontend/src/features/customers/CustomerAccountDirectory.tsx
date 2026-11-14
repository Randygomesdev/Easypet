import { useCallback, useState } from 'react'
import { Search, Users } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { SelectField, TextField } from '../../components/ui/Field'
import { Pagination } from '../../components/ui/Pagination'
import { Table, TableCell, TableHeaderCell } from '../../components/ui/Table'
import { customerService } from '../../services/customer.service'
import type { AdminCustomer } from '../../types/auth.types'
import { CustomerAccountStatusDialog } from './CustomerAccountStatusDialog'
import { CustomerAccountHistoryDialog } from './CustomerAccountHistoryDialog'
import { useCustomerQuery } from './useCustomerQuery'
import { useDirectoryFilter } from './useDirectoryFilter'

export function CustomerAccountDirectory() {
  const [state, setState] = useState('all')
  const [selected, setSelected] = useState<AdminCustomer>()
  const [historyAccount, setHistoryAccount] = useState<AdminCustomer>()
  const [notice, setNotice] = useState('')
  const { search, setSearch, submitSearch, filter: { q, page }, selectPage } = useDirectoryFilter()
  const active = state === 'all' ? undefined : state === 'active'
  const load = useCallback(() => customerService.listAccounts({ q, page, size: 10, active }), [q, page, active])
  const { data, error, loading, reload } = useCustomerQuery(load, 'Não foi possível carregar as contas da plataforma.')

  return (
    <div className="space-y-4">
      <form onSubmit={submitSearch} className="flex flex-wrap items-end gap-2">
        <div className="w-full max-w-sm min-w-0">
          <TextField label="Buscar contas" type="search" maxLength={254} value={search}
            onChange={event => setSearch(event.target.value)} placeholder="Nome ou e-mail" />
        </div>
        <SelectField label="Status da conta" value={state} onChange={event => {
          setState(event.target.value)
          selectPage(0)
        }}>
          <option value="all">Todos</option>
          <option value="active">Ativas</option>
          <option value="inactive">Inativas</option>
        </SelectField>
        <Button type="submit" variant="secondary"><Search size={16} aria-hidden="true" />Buscar</Button>
      </form>
      {notice && <p className="text-sm text-text-body" role="status">{notice}</p>}
      <Card className="overflow-hidden">
        {loading && <LoadingState label="Carregando contas…" />}
        {error && <ErrorState message={error} action={<Button variant="secondary" onClick={reload}>Tentar novamente</Button>} />}
        {data?.content.length === 0 && <EmptyState icon={Users} title="Nenhuma conta encontrada." />}
        {data && data.content.length > 0 && (
          <Table caption="Contas de clientes da plataforma">
            <thead className="border-b border-border">
              <tr>
                <TableHeaderCell>Nome</TableHeaderCell>
                <TableHeaderCell>E-mail</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Ações</TableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {data.content.map(account => (
                <tr key={account.id} className="border-b border-border last:border-b-0">
                  <TableCell className="font-semibold">{account.name}</TableCell>
                  <TableCell>{account.email}</TableCell>
                  <TableCell><Badge tone={account.active ? 'success' : 'neutral'}>
                    {account.active ? 'Ativa' : 'Inativa'}
                  </Badge></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" aria-label={`Histórico da conta de ${account.name}`}
                        onClick={() => setHistoryAccount(account)}>Histórico</Button>
                      <Button size="sm" variant="secondary"
                        aria-label={`${account.active ? 'Desativar' : 'Reativar'} conta de ${account.name}`}
                        onClick={() => { setNotice(''); setSelected(account) }}>
                        {account.active ? 'Desativar' : 'Reativar'}
                      </Button>
                    </div>
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {data && <Pagination page={page + 1} totalPages={data.totalPages} label="Paginação de contas"
          onPageChange={next => selectPage(next - 1)} />}
      </Card>
      {historyAccount && <CustomerAccountHistoryDialog key={historyAccount.id} account={historyAccount}
        onClose={() => setHistoryAccount(undefined)} />}
      {selected && <CustomerAccountStatusDialog account={selected} onClose={() => setSelected(undefined)}
        onSaved={account => {
          setSelected(undefined)
          setNotice(account.active ? 'Conta reativada.' : 'Conta desativada.')
          if (page > 0 && active !== undefined && data?.content.length === 1) selectPage(page - 1)
          else reload()
        }} />}
    </div>
  )
}
