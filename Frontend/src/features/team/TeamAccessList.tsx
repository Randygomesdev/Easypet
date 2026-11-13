import { Users } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/FeedbackState'
import { Table, TableCell, TableHeaderCell } from '../../components/ui/Table'
import type { TeamAccess } from '../../types/auth.types'
import { teamRoleLabels, teamStatus } from './teamLabels'

const deadline = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
})

export default function TeamAccessList({ accesses, onRevoke }: {
  accesses: TeamAccess[]
  onRevoke: (access: TeamAccess) => void
}) {
  if (accesses.length === 0) return <EmptyState icon={Users} title="Nenhum acesso individual" description="Envie um convite para adicionar alguém à equipe." />

  return (
    <Table caption="Acessos individuais da equipe">
      <thead className="border-b border-border bg-bg">
        <tr>
          <TableHeaderCell>E-mail</TableHeaderCell>
          <TableHeaderCell>Perfil</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Validade do convite</TableHeaderCell>
          <TableHeaderCell>Ações</TableHeaderCell>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {accesses.map(access => (
          <tr key={access.id}>
            <TableCell className="font-medium">{access.email}</TableCell>
            <TableCell>{teamRoleLabels[access.accessRole]}</TableCell>
            <TableCell><Badge tone={teamStatus[access.status].tone}>{teamStatus[access.status].label}</Badge></TableCell>
            <TableCell>{access.status === 'PENDING' ? deadline.format(new Date(access.expiresAt)) : '—'}</TableCell>
            <TableCell>
              {(access.status === 'ACTIVE' || access.status === 'PENDING') && (
                <Button size="sm" variant="secondary" aria-label={`Revogar acesso de ${access.email}`} onClick={() => onRevoke(access)}>
                  Revogar
                </Button>
              )}
            </TableCell>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
