import type { TeamAccess, TeamAccessRole } from '../../types/auth.types'

export const teamRoleLabels: Record<TeamAccessRole, string> = {
  MANAGER: 'Gestor',
  RECEPTION: 'Recepção',
  PROFESSIONAL: 'Profissional',
}

export const teamStatus: Record<TeamAccess['status'], {
  label: string
  tone: 'success' | 'warning' | 'neutral' | 'danger'
}> = {
  ACTIVE: { label: 'Ativo', tone: 'success' },
  PENDING: { label: 'Convite pendente', tone: 'warning' },
  EXPIRED: { label: 'Expirado', tone: 'neutral' },
  REVOKED: { label: 'Revogado', tone: 'danger' },
}
