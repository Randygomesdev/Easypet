import type { AuthPermission, AuthSession, UserRole } from '../types/auth.types'

export const waveBEnabled = import.meta.env.VITE_WAVE_B_ENABLED === 'true'

export type AccessPolicy = {
  roles: readonly UserRole[]
  teamPermissions?: readonly (readonly AuthPermission[])[]
}

type SessionAccess = Pick<AuthSession, 'role' | 'partnerId' | 'permissions'>

const partner = { roles: ['PARTNER'] } satisfies AccessPolicy
const admin = { roles: ['ADMIN'] } satisfies AccessPolicy
const customer = { roles: ['CUSTOMER'] } satisfies AccessPolicy

function partnerOperations(...teamPermissions: AuthPermission[][]): AccessPolicy {
  return waveBEnabled ? { roles: ['PARTNER', 'TEAM_MEMBER'], teamPermissions } : partner
}

export const access = {
  partner,
  admin,
  customer,
  operations: { roles: waveBEnabled ? ['PARTNER', 'TEAM_MEMBER'] : ['PARTNER'] } satisfies AccessPolicy,
  customers: partnerOperations(['DESK_CUSTOMERS_MANAGE']),
  agenda: partnerOperations(['BOOKINGS_READ'], ['BOOKINGS_ASSIGNED_READ']),
  attendance: partnerOperations(['BOOKINGS_READ', 'BOOKINGS_WRITE'], ['BOOKINGS_ASSIGNED_READ', 'BOOKINGS_ASSIGNED_ATTEND']),
  cashier: partnerOperations(['CASH_RECEIVE']),
}

export function canAccess(session: SessionAccess | null | undefined, policy: AccessPolicy) {
  if (!session || !policy.roles.includes(session.role)) return false
  if (session.role !== 'TEAM_MEMBER') return true

  return Boolean(session.partnerId && (policy.teamPermissions === undefined
    || policy.teamPermissions.some(group => group.every(permission => session.permissions.includes(permission)))))
}

export function panelDestination(session: SessionAccess) {
  if (session.role === 'ADMIN') return '/admin/parceiros'
  if (session.role === 'PARTNER') return '/partner/dashboard'
  if (session.role === 'CUSTOMER') return '/app/home'
  if (!waveBEnabled || !session.partnerId || session.role !== 'TEAM_MEMBER') return undefined

  if (session.permissions.includes('BOOKINGS_READ')) return '/partner/agendamentos'
  if (canAccess(session, access.attendance)) return '/partner/atendimento'
  if (canAccess(session, access.agenda)) return '/partner/agendamentos'
  if (canAccess(session, access.customers)) return '/partner/clientes'
  if (canAccess(session, access.cashier)) return '/partner/caixa'
  return undefined
}
