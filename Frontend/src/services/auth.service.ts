import axios from 'axios'
import { env } from '../config/env'
import { api } from '../lib/api'
import type {
  AdminCustomer, AdminCustomerPage, AuthenticationResult, AuthSession, IdentityAuditFilters, IdentityAuditPage,
  LoginRequest, RegisterRequest,
  TeamAccess, TeamAccessRole, User,
} from '../types/auth.types'

// Os formulários públicos precisam tratar os próprios erros, inclusive 401 de credenciais.
const publicAuthApi = axios.create({ baseURL: env.apiUrl })

export function getAuthError(error: unknown) {
  return axios.isAxiosError<{ message?: string; code?: string; errors?: Record<string, string> }>(error)
    ? error.response?.data
    : undefined
}

export function getAuthErrorStatus(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}

export function authRetryMessage(error: unknown) {
  if (!axios.isAxiosError(error)) return undefined
  if (error.response?.status === 429) {
    const seconds = Number(error.response.headers['retry-after'])
    const wait = Number.isFinite(seconds) && seconds > 0
      ? `Aguarde ${Math.ceil(seconds)} s`
      : 'Aguarde alguns instantes'
    return `Muitas solicitações. ${wait} e tente novamente.`
  }
  if (error.response?.status === 503) {
    return 'Serviço temporariamente indisponível. Tente novamente em instantes.'
  }
  return undefined
}

export const authService = {
  session: (token: string, signal: AbortSignal) =>
    publicAuthApi.get<AuthSession>('/auth/session', {
      headers: { Authorization: `Bearer ${token}` }, signal, timeout: 5000,
    }).then(r => {
      if (r.status !== 200) throw new Error('Resposta de sessão inesperada.')
      return r.data
    }),

  login: (data: LoginRequest) =>
    publicAuthApi.post<AuthenticationResult>('/auth/login', data).then(r => r.data),

  register: (data: RegisterRequest) =>
    publicAuthApi.post<User>('/auth/register', data).then(r => r.data),

  registerPartner: (data: RegisterRequest) =>
    publicAuthApi.post<User>('/auth/register/partner', data).then(r => r.data),

  forgotPassword: (email: string) =>
    publicAuthApi.post<void>('/auth/forgot-password', { email }),

  validateResetToken: (token: string, signal: AbortSignal) =>
    publicAuthApi.post<void>('/auth/reset-password/validate', { token }, { signal }),

  resetPassword: (token: string, newPassword: string) =>
    publicAuthApi.post<void>('/auth/reset-password', { token, newPassword }),

  acceptTeamInvitation: (token: string, name: string, password: string) =>
    publicAuthApi.post<TeamAccess>('/auth/team/invitations/accept', { token, name, password }).then(r => r.data),

  listTeamAccesses: (signal?: AbortSignal) =>
    api.get<TeamAccess[]>('/auth/team/accesses', { signal }).then(r => r.data),

  inviteTeamMember: (data: { email: string; accessRole: TeamAccessRole; reason?: string }) =>
    api.post<TeamAccess>('/auth/team/invitations', data).then(r => r.data),

  revokeTeamAccess: (id: string, reason?: string) =>
    api.delete<void>(`/auth/team/accesses/${encodeURIComponent(id)}`, { data: reason ? { reason } : undefined }),

  listCustomers: (params: { page: number; size: number; q?: string; active?: boolean }) =>
    api.get<AdminCustomerPage>('/admin/customers', { params }).then(r => r.data),

  setCustomerActive: (id: string, active: boolean, reason?: string) =>
    api.patch<AdminCustomer>(`/admin/customers/${encodeURIComponent(id)}/active`, { active, reason }).then(r => r.data),

  listIdentityAudit: (params: IdentityAuditFilters = {}, signal?: AbortSignal) =>
    api.get<IdentityAuditPage>('/admin/identity-audit', { params, signal }).then(r => r.data),

  exchangeOAuthCode: (code: string) =>
    publicAuthApi.post<User>('/auth/oauth2/exchange', { code }).then(r => r.data),
}
