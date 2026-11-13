import { api } from '../lib/api'

export interface Page<T> {
  content:       T[]
  totalPages:    number
  totalElements: number
}

export interface BusinessHour {
  dayOfWeek:        string
  businessStartHour: string
  businessEndHour:   string
  lunchStartHour:    string
  lunchEndHour:      string
  closed:            boolean
}

export interface ServiceSubcategoryResponse {
  id:           string
  name:         string
  slug:         string
  displayOrder: number
}

export interface ServiceCategoryResponse {
  id:             string
  name:           string
  slug:           string
  description?:   string
  icon?:          string
  bookingType:    string
  displayOrder:   number
  subcategories:  ServiceSubcategoryResponse[]
}

export interface ServiceOfferRequest {
  name:            string
  description?:    string
  price:           number
  durationMinutes: number
  billingUnit:     'HOURLY' | 'DAILY'
  categoryId?:     string
  staffIds?:       string[]
}

export interface PartnerPayload {
  name:                         string
  legalName:                    string
  cnpj:                         string
  email?:                       string
  contactPhone?:                string
  phone?:                       string
  description?:                 string
  stateRegistration?:           string
  stateRegistrationExempt?:     boolean
  municipalRegistration?:       string
  municipalRegistrationExempt?: boolean
  zipCode?:                     string
  address?:                     string
  number?:                      string
  neighborhood?:                string
  complement?:                  string
  city?:                        string
  state?:                       string
  latitude?:                    number
  longitude?:                   number
  pictureUrl?:                  string
  businessHours?:               BusinessHour[]
  services?:                    ServiceOfferRequest[]
}

export interface ServiceOffer {
  id:              string
  name:            string
  description?:    string
  price:           number
  durationMinutes: number
  billingUnit:     'HOURLY' | 'DAILY'
  categoryId?:     string
  categoryName?:   string
  bookingType?:    string
  active?:         boolean
}

export type PartnerCategory = 'CLINIC' | 'PETSHOP' | 'GROOMER' | 'TRAINER' | 'SITTER'
export const CATEGORY_LABEL: Record<PartnerCategory, string> = {
  CLINIC:  'Clínica Veterinária',
  PETSHOP: 'Petshop',
  GROOMER: 'Banho & Tosa',
  TRAINER: 'Adestramento',
  SITTER:  'Hospedagem',
}

export interface ReviewRequest {
  rating:      number
  comment?:    string
  authorName:  string
}

export interface ReviewResponse {
  id:          string
  rating:      number
  comment?:    string
  authorName:  string
  createdAt:   string
}

export interface PartnerResponse extends PartnerPayload {
  id:               string
  rating:           number
  active:           boolean
  services:         ServiceOffer[]
  categories?:      PartnerCategory[]
  activeModules?:   string[]
  galleryPictures?: string[]
  boardingCapacity?: number
}

export const partnerService = {
  getMe: (): Promise<PartnerResponse> =>
    api.get('/partners/me').then(r => r.data),

  create: (data: PartnerPayload): Promise<PartnerResponse> =>
    api.post('/partners', data).then(r => r.data),

  updateMe: (data: PartnerPayload): Promise<PartnerResponse> =>
    api.put('/partners/me', data).then(r => r.data),

  /** Adiciona um único serviço ao parceiro (retorna o serviço criado) */
  addService: (partnerId: string, data: ServiceOfferRequest): Promise<ServiceOffer> =>
    api.post(`/partners/${partnerId}/services`, data).then(r => r.data),

  /** Atualiza um serviço específico e vincula colaboradores */
  updateService: (partnerId: string, serviceId: string, data: ServiceOfferRequest): Promise<ServiceOffer> =>
    api.put(`/partners/${partnerId}/services/${serviceId}`, data).then(r => r.data),

  listCategories: (): Promise<ServiceCategoryResponse[]> =>
    api.get('/categories').then(r => r.data),

  listCatalog: (params: { name?: string; category?: string; page: number; size: number }): Promise<Page<PartnerResponse>> =>
    api.get('/partners/catalog', { params }).then(r => r.data),

  getCatalogPartner: (id: string): Promise<PartnerResponse> =>
    api.get(`/partners/catalog/${id}`).then(r => r.data),

  // ── Admin ──────────────────────────────────────────────────
  listAll: (params: { name?: string; category?: string; page: number; size: number }): Promise<Page<PartnerResponse>> =>
    api.get('/partners', { params }).then(r => r.data),

  getById: (id: string): Promise<PartnerResponse> =>
    api.get(`/partners/${id}`).then(r => r.data),

  updateById: (id: string, data: Partial<PartnerPayload> & { active?: boolean }): Promise<PartnerResponse> =>
    api.put(`/partners/${id}`, data).then(r => r.data),

  deleteById: (id: string): Promise<void> =>
    api.delete(`/partners/${id}`).then(() => undefined),

  // Reviews
  getReviews: (partnerId: string): Promise<ReviewResponse[]> =>
    api.get(`/partners/${partnerId}/reviews`).then(r => r.data),

  submitReview: (partnerId: string, data: ReviewRequest): Promise<ReviewResponse> =>
    api.post(`/partners/${partnerId}/reviews`, data).then(r => r.data),
}

/** Monta o PartnerPayload completo a partir de um PartnerResponse (para updates parciais) */
export function buildPayload(partner: PartnerResponse, overrides: Partial<PartnerPayload> = {}): PartnerPayload {
  return {
    name:                        partner.name,
    legalName:                   partner.legalName,
    cnpj:                        partner.cnpj.replace(/\D/g, ''),
    email:                       partner.email,
    contactPhone:                partner.contactPhone,
    phone:                       partner.phone,
    description:                 partner.description,
    stateRegistration:           partner.stateRegistration,
    stateRegistrationExempt:     partner.stateRegistrationExempt,
    municipalRegistration:       partner.municipalRegistration,
    municipalRegistrationExempt: partner.municipalRegistrationExempt,
    zipCode:                     partner.zipCode,
    address:                     partner.address,
    number:                      partner.number,
    neighborhood:                partner.neighborhood,
    complement:                  partner.complement,
    city:                        partner.city,
    state:                       partner.state,
    latitude:                    partner.latitude,
    longitude:                   partner.longitude,
    pictureUrl:                  partner.pictureUrl,
    businessHours:               partner.businessHours,
    ...overrides,
  }
}
