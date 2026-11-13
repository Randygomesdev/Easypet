import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { Pagination } from '../../components/ui/Pagination'
import { Table, TableCell, TableHeaderCell } from '../../components/ui/Table'
import ExampleCode from './ExampleCode'

const appointments = [
  { pet: 'Luna', service: 'Banho e tosa', time: '09:00', tone: 'info', status: 'Confirmado' },
  { pet: 'Bento', service: 'Banho', time: '10:30', tone: 'warning', status: 'Pendente' },
  { pet: 'Amora', service: 'Banho', time: '14:00', tone: 'success', status: 'Concluído' },
] as const

function TableExample() {
  const [page, setPage] = useState(1)
  const pageSize = 2
  const rows = appointments.slice((page - 1) * pageSize, page * pageSize)

  return (
    <Card id="tabelas">
      <CardHeader title="Tabelas e paginação" description="Agendamentos de exemplo." />
      <Table caption="Agendamentos de exemplo">
        <thead className="border-b border-border">
          <tr>
            <TableHeaderCell>Pet</TableHeaderCell>
            <TableHeaderCell>Serviço</TableHeaderCell>
            <TableHeaderCell>Horário</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(row => (
            <tr key={row.pet} className="transition-colors hover:bg-bg/60">
              <TableCell className="font-semibold">{row.pet}</TableCell>
              <TableCell className="whitespace-nowrap">{row.service}</TableCell>
              <TableCell className="tabular-nums">{row.time}</TableCell>
              <TableCell><Badge tone={row.tone}>{row.status}</Badge></TableCell>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination page={page} totalPages={Math.ceil(appointments.length / pageSize)} onPageChange={setPage} />
      <CardContent>
        <ExampleCode>{`import { Table, TableCell, TableHeaderCell } from '../../components/ui/Table'
import { Pagination } from '../../components/ui/Pagination'

<Table caption="Agendamentos de exemplo">
  <thead><tr><TableHeaderCell>Pet</TableHeaderCell></tr></thead>
  <tbody><tr><TableCell>Luna</TableCell></tr></tbody>
</Table>
<Pagination page={page} totalPages={2} onPageChange={setPage} />`}</ExampleCode>
      </CardContent>
    </Card>
  )
}

function FeedbackExamples() {
  const [retried, setRetried] = useState(false)

  return (
    <Card id="estados">
      <CardHeader title="Estados" />
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-border"><LoadingState /></div>
          <div className="rounded-xl border border-border">
            {retried
              ? <EmptyState icon={CalendarDays} title="Consulta concluída" description="Nenhum agendamento encontrado." />
              : <ErrorState message="Não foi possível carregar a agenda."
                  action={<Button variant="secondary" size="sm" onClick={() => setRetried(true)}>Tentar novamente</Button>} />}
          </div>
          <div className="rounded-xl border border-border">
            <EmptyState icon={CalendarDays} title="Nenhum agendamento" description="Os horários reservados aparecem aqui." />
          </div>
        </div>
        <ExampleCode>{`import { CalendarDays } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/FeedbackState'

<LoadingState label="Carregando agenda…" />
<ErrorState message="Não foi possível carregar a agenda."
  action={<Button onClick={reload}>Tentar novamente</Button>} />
<EmptyState icon={CalendarDays} title="Nenhum agendamento" />`}</ExampleCode>
      </CardContent>
    </Card>
  )
}

export default function DataExamples() {
  return (
    <>
      <Card id="cards">
        <CardHeader title="Cards" />
        <CardContent className="space-y-4">
          <Card>
            <CardHeader title="Banho e tosa" description="Duração de 60 minutos" action={<Badge tone="success">Ativo</Badge>} />
            <CardContent className="text-sm text-text-body">R$ 80,00</CardContent>
          </Card>
          <ExampleCode>{`import { Badge } from '../../components/ui/Badge'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'

<Card>
  <CardHeader title="Banho e tosa" description="Duração de 60 minutos"
    action={<Badge tone="success">Ativo</Badge>} />
  <CardContent>R$ 80,00</CardContent>
</Card>`}</ExampleCode>
        </CardContent>
      </Card>
      <TableExample />
      <FeedbackExamples />
    </>
  )
}
