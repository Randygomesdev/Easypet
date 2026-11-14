import { isAxiosError } from 'axios'
import { api } from '../lib/api'
import { authService } from './auth.service'
import type { Page } from './partner.service'
import type { PetRequest, PetSpecies, PetGender } from './pet.service'

export type CustomerScope = 'partner' | 'admin'

export interface ReceptionCustomer {
  id: string
  partnerId: string
  partnerName: string
  name: string
  email: string | null
  phone: string | null
  accountStatus: 'UNCLAIMED' | 'CLAIMED'
  createdAt: string
}

export interface CustomerRequest {
  name: string
  email?: string
  phone?: string
}

export interface NotificationEmailAuthorization {
  state: 'NOT_GRANTED' | 'AUTHORIZED' | 'REVOKED' | 'UNAVAILABLE'
  revision: number
  grantedAt: string | null
  revokedAt: string | null
}

export interface ReceptionPet {
  id: string
  customerId: string
  partnerId: string
  name: string
  species: PetSpecies
  breed: string
  gender: PetGender
  weight: number
  birthDate: string
  microchipNumber: string | null
}

interface ListParams {
  q: string
  page: number
  size: number
}

const customerPaths: Record<CustomerScope, string> = {
  partner: '/partners/me/customers',
  admin: '/admin/reception-customers',
}

const petsPath = (customerId: string) => `/pets/reception/customers/${customerId}`
const notificationEmailPath = (customerId: string) =>
  `${customerPaths.partner}/${encodeURIComponent(customerId)}/notification-email`

export const customerService = {
  issueClaim: (customerId: string, userId: string) =>
    api.post<{ token: string; expiresAt: string }>(`${customerPaths.partner}/${customerId}/claims`, { userId })
      .then(response => response.data),
  redeemClaim: (token: string) =>
    api.post<{ customerId: string; partnerId: string; claimedAt: string }>('/partners/customer-claims/redeem', { token })
      .then(response => response.data),
  listAccounts: (params: ListParams & { active?: boolean }) => authService.listCustomers(params),
  setAccountActive: (id: string, active: boolean, reason: string) => authService.setCustomerActive(id, active, reason),
  listAccountAudit: (id: string, page: number, signal: AbortSignal) =>
    authService.listIdentityAudit({ targetType: 'CUSTOMER', targetId: id, page, size: 10 }, signal),
  getNotificationEmail: (id: string, signal: AbortSignal) =>
    api.get<NotificationEmailAuthorization>(notificationEmailPath(id), { signal }).then(response => response.data),
  setNotificationEmail: (id: string, authorized: boolean, expectedRevision: number, confirmedEmail?: string) =>
    api.put<NotificationEmailAuthorization>(notificationEmailPath(id), {
      authorized, expectedRevision, confirmedInPerson: Boolean(confirmedEmail), confirmedEmail,
    }).then(response => response.data),
  list: (scope: CustomerScope, params: ListParams, signal: AbortSignal) =>
    api.get<Page<ReceptionCustomer>>(customerPaths[scope], { params, signal }).then(response => response.data),
  get: (scope: CustomerScope, id: string, signal: AbortSignal) =>
    api.get<ReceptionCustomer>(`${customerPaths[scope]}/${id}`, { signal }).then(response => response.data),
  create: (data: CustomerRequest) =>
    api.post<ReceptionCustomer>(customerPaths.partner, data).then(response => response.data),
  listPets: (customerId: string, params: ListParams, signal: AbortSignal) =>
    api.get<Page<ReceptionPet>>(petsPath(customerId), { params, signal }).then(response => response.data),
  createPet: (customerId: string, data: PetRequest) =>
    api.post<ReceptionPet>(petsPath(customerId), data).then(response => response.data),
}

export function customerApiError(error: unknown, fallback: string): {
  message: string
  fields: Record<string, string>
  status?: number
} {
  if (isAxiosError<{ message?: string; errors?: Record<string, string> }>(error)) {
    const response = error.response
    const body = response?.data
    if (response && [400, 403, 404, 409, 410, 503].includes(response.status)) {
      return { message: body?.message || fallback, fields: body?.errors ?? {}, status: response.status }
    }
    return { message: fallback, fields: {}, status: response?.status }
  }
  return { message: fallback, fields: {} }
}
