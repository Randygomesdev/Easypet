import { api } from '../lib/api'

export interface BusinessHour {
  dayOfWeek:        string
  businessStartHour: string
  businessEndHour:   string
  lunchStartHour:    string
  lunchEndHour:      string
  closed:            boolean
}

export interface ServiceOfferRequest {
  name:            string
  description?:    string
  price:           number
  durationMinutes: number
  billingUnit:     'HOURLY' | 'DAILY'
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
  active?:         boolean
}

export interface PartnerResponse extends PartnerPayload {
  id:       string
  rating:   number
  active:   boolean
  services: ServiceOffer[]
}

export const partnerService = {
  getMe: (): Promise<PartnerResponse> =>
    api.get('/partners/me').then(r => r.data),

  create: (data: PartnerPayload): Promise<PartnerResponse> =>
    api.post('/partners', data).then(r => r.data),

  updateMe: (data: PartnerPayload): Promise<PartnerResponse> =>
    api.put('/partners/me', data).then(r => r.data),

  /** Adiciona um único serviço ao parceiro */
  addService: (partnerId: string, data: ServiceOfferRequest): Promise<PartnerResponse> =>
    api.post(`/partners/${partnerId}/services`, data).then(r => r.data),
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
