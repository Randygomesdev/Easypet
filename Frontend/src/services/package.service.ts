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

export interface PackageResponse {
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

export const packageService = {
  getByPartner: (partnerId: string): Promise<PackageResponse[]> =>
    api.get(`/payments/packages/templates/partner/${partnerId}`).then(r => r.data),

  create: (data: PackageRequest): Promise<PackageResponse> =>
    api.post('/payments/packages/templates', data).then(r => r.data),

  update: (templateId: string, data: PackageRequest): Promise<PackageResponse> =>
    api.put(`/payments/packages/templates/${templateId}`, data).then(r => r.data),

  remove: (templateId: string): Promise<void> =>
    api.delete(`/payments/packages/templates/${templateId}`).then(r => r.data),
}
