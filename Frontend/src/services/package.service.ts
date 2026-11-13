import { api } from '../lib/api'

export interface PackageRequest {
  partnerId:    string
  name:         string
  description?: string
  serviceId:    string
  quantity:     number
  price:        number
  validityDays: number
}

export interface PackageTemplateResponse {
  id:           string
  partnerId:    string
  name:         string
  description?: string
  serviceId:    string
  quantity:     number
  price:        number
  validityDays: number
  isActive:     boolean
}

export type PackageResponse = PackageTemplateResponse

export type PaymentMethod = 'CARD' | 'PIX'

export interface CustomerPackageResponse {
  id:               string
  packageTemplate:  PackageTemplateResponse
  totalCredits:     number
  remainingCredits: number
  expirationDate:   string
  status:           'ACTIVE' | 'EXPIRED' | 'EXHAUSTED' | 'CANCELLED'
}

export const packageService = {
  getByPartner: (partnerId: string): Promise<PackageTemplateResponse[]> =>
    api.get(`/payments/packages/templates/partner/${partnerId}`).then(r => r.data),

  purchase: (templateId: string, paymentMethod: PaymentMethod): Promise<CustomerPackageResponse> =>
    api.post(`/payments/packages/purchase/${templateId}`, { paymentMethod }).then(r => r.data),

  myBalances: (): Promise<CustomerPackageResponse[]> =>
    api.get('/payments/packages/my-balances').then(r => r.data),

  create: (data: PackageRequest): Promise<PackageTemplateResponse> =>
    api.post('/payments/packages/templates', data).then(r => r.data),

  update: (templateId: string, data: PackageRequest): Promise<PackageTemplateResponse> =>
    api.put(`/payments/packages/templates/${templateId}`, data).then(r => r.data),

  remove: (templateId: string): Promise<void> =>
    api.delete(`/payments/packages/templates/${templateId}`).then(r => r.data),
}
