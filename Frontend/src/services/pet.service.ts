import { api } from '../lib/api'
import type { Page } from './partner.service'

// ── Enums ──────────────────────────────────────────────────────────────────
export type PetSpecies    = 'DOG' | 'CAT' | 'BIRD' | 'OTHER'
export type PetGender     = 'MALE' | 'FEMALE'
export type HistorySource = 'OWNER' | 'PLATFORM'

export const HISTORY_SOURCE_LABEL: Record<HistorySource, string> = {
  OWNER:    'Registrado pelo tutor',
  PLATFORM: 'Registrado pela clínica',
}

export const SPECIES_LABEL: Record<PetSpecies, string> = {
  DOG: 'Cão', CAT: 'Gato', BIRD: 'Ave', OTHER: 'Outro',
}
export const GENDER_LABEL: Record<PetGender, string> = {
  MALE: 'Macho', FEMALE: 'Fêmea',
}

// ── Pet ───────────────────────────────────────────────────────────────────
export interface PetRequest {
  name:             string
  species:          PetSpecies
  breed:            string
  gender:           PetGender
  weight:           number
  birthDate:        string   // YYYY-MM-DD
  microchipNumber?: string
  pictureUrl?:      string
}

export interface PetResponse {
  id:               string
  name:             string
  breed:            string
  species:          PetSpecies
  gender:           PetGender
  weight:           number
  birthDate:        string
  microchipNumber?: string
  pictureUrl?:      string
  active:           boolean
  ownerId:          string
}

// ── Appointments ──────────────────────────────────────────────────────────
export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Agendado', COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado', NO_SHOW: 'Não compareceu',
}

export interface AppointmentRequest {
  date:           string
  reason:         string
  clinicalNotes?: string
  vetName?:       string
  providerId?:    string
  weightAtTime?:  number
  status:         AppointmentStatus
  partnerName?:   string
  bookingId?:     string
}

export interface AppointmentResponse {
  id:             string
  date:           string
  reason:         string
  clinicalNotes?: string
  vetName?:       string
  providerId?:    string
  weightAtTime?:  number
  status:         AppointmentStatus
  certified?:     boolean
  createdAt:      string
  source?:        HistorySource
  partnerName?:   string
  bookingId?:     string
}

// ── Vaccines ──────────────────────────────────────────────────────────────
export type VaccineStatus = 'UPDATED' | 'DUE_SOON' | 'OVERDUE'
export const VACCINE_STATUS_LABEL: Record<VaccineStatus, string> = {
  UPDATED: 'Em dia', DUE_SOON: 'A vencer', OVERDUE: 'Atrasada',
}

export interface VaccineRequest {
  name:             string
  applicationDate:  string
  nextDoseDate:     string
  status:           VaccineStatus
  vetName?:         string
  manufacturer?:    string
  lot?:             string
  observations?:    string
  partnerName?:     string
  bookingId?:       string
}

export interface VaccineResponse {
  id:               string
  name:             string
  applicationDate:  string
  nextDoseDate:     string
  status:           VaccineStatus
  vetName?:         string
  manufacturer?:    string
  lot?:             string
  observations?:    string
  source?:          HistorySource
  partnerName?:     string
  bookingId?:       string
}

// ── Medications ───────────────────────────────────────────────────────────
export interface MedicationRequest {
  name:           string
  dosage?:        string
  frequency?:     string
  startDate:      string
  endDate?:       string
  observations?:  string
  active?:        boolean
  appointmentId?: string
  partnerName?:   string
  bookingId?:     string
}

export interface MedicationResponse {
  id:             string
  name:           string
  dosage?:        string
  frequency?:     string
  startDate:      string
  endDate?:       string
  observations?:  string
  active?:        boolean
  appointmentId?: string
  source?:        HistorySource
  partnerName?:   string
  bookingId?:     string
}

// ── Exams ─────────────────────────────────────────────────────────────────
export interface ExamRequest {
  examName:           string
  date:               string
  laboratory?:        string
  veterinarianName?:  string
  resultsSummary?:    string
  fileUrl?:           string
  partnerName?:       string
  bookingId?:         string
}

export interface ExamResponse {
  id:                 string
  examName:           string
  date:               string
  laboratory?:        string
  veterinarianName?:  string
  resultsSummary?:    string
  fileUrl?:           string
  certified?:         boolean
  source?:            HistorySource
  partnerName?:       string
  bookingId?:         string
}

// ── Weight Records ────────────────────────────────────────────────────────
export interface WeightRequest {
  weight:       number
  date:         string
  partnerName?: string
  bookingId?:   string
}

export interface WeightResponse {
  id:           string
  weight:       number
  date:         string
  source?:      HistorySource
  partnerName?: string
  bookingId?:   string
}

// ── Surgeries ─────────────────────────────────────────────────────────────
export interface SurgeryRequest {
  description:                string
  date:                       string
  vetName?:                   string
  providerId?:                string
  anesthesiaType?:            string
  postOperativeInstructions?: string
  status?:                    string
  partnerName?:               string
  bookingId?:                 string
}

export interface SurgeryResponse {
  id:                         string
  description:                string
  date:                       string
  vetName?:                   string
  providerId?:                string
  anesthesiaType?:            string
  postOperativeInstructions?: string
  status?:                    string
  source?:                    HistorySource
  partnerName?:               string
  bookingId?:                 string
}

// ── History (endpoint legado) ─────────────────────────────────────────────
export interface PetHistoryResponse {
  appointments: AppointmentResponse[]
  medications:  MedicationResponse[]
  exams:        ExamResponse[]
  vaccines:     VaccineResponse[]
}

// ── Service ───────────────────────────────────────────────────────────────
export const petService = {
  // Pets CRUD
  list: (params?: { page?: number; size?: number }): Promise<Page<PetResponse>> =>
    api.get('/pets', { params: { page: 0, size: 50, ...params } }).then(r => r.data),

  getById: (petId: string): Promise<PetResponse> =>
    api.get(`/pets/${petId}`).then(r => r.data),

  create: (data: PetRequest): Promise<PetResponse> =>
    api.post('/pets', data).then(r => r.data),

  update: (petId: string, data: PetRequest): Promise<PetResponse> =>
    api.put(`/pets/${petId}`, data).then(r => r.data),

  remove: (petId: string): Promise<void> =>
    api.delete(`/pets/${petId}`).then(() => undefined),

  // History (all-in-one)
  getHistory: (petId: string): Promise<PetHistoryResponse> =>
    api.get(`/pets/${petId}/history`).then(r => r.data),

  // Appointments
  listAppointments: (petId: string, params?: { page?: number; size?: number }): Promise<Page<AppointmentResponse>> =>
    api.get(`/pets/${petId}/appointments`, { params: { page: 0, size: 20, ...params } }).then(r => r.data),
  createAppointment: (petId: string, data: AppointmentRequest): Promise<AppointmentResponse> =>
    api.post(`/pets/${petId}/appointments`, data).then(r => r.data),
  updateAppointment: (petId: string, id: string, data: AppointmentRequest): Promise<AppointmentResponse> =>
    api.put(`/pets/${petId}/appointments/${id}`, data).then(r => r.data),
  removeAppointment: (petId: string, id: string): Promise<void> =>
    api.delete(`/pets/${petId}/appointments/${id}`).then(() => undefined),

  // Vaccines
  listVaccines: (petId: string, params?: { page?: number; size?: number }): Promise<Page<VaccineResponse>> =>
    api.get(`/pets/${petId}/vaccines`, { params: { page: 0, size: 100, ...params } }).then(r => r.data),
  createVaccine: (petId: string, data: VaccineRequest): Promise<VaccineResponse> =>
    api.post(`/pets/${petId}/vaccines`, data).then(r => r.data),
  updateVaccine: (petId: string, id: string, data: VaccineRequest): Promise<VaccineResponse> =>
    api.put(`/pets/${petId}/vaccines/${id}`, data).then(r => r.data),
  removeVaccine: (petId: string, id: string): Promise<void> =>
    api.delete(`/pets/${petId}/vaccines/${id}`).then(() => undefined),

  // Medications
  listMedications: (petId: string, params?: { page?: number; size?: number }): Promise<Page<MedicationResponse>> =>
    api.get(`/pets/${petId}/medications`, { params: { page: 0, size: 50, ...params } }).then(r => r.data),
  createMedication: (petId: string, data: MedicationRequest): Promise<MedicationResponse> =>
    api.post(`/pets/${petId}/medications`, data).then(r => r.data),
  updateMedication: (petId: string, id: string, data: MedicationRequest): Promise<MedicationResponse> =>
    api.put(`/pets/${petId}/medications/${id}`, data).then(r => r.data),
  removeMedication: (petId: string, id: string): Promise<void> =>
    api.delete(`/pets/${petId}/medications/${id}`).then(() => undefined),

  // Exams
  listExams: (petId: string, params?: { page?: number; size?: number }): Promise<Page<ExamResponse>> =>
    api.get(`/pets/${petId}/exams`, { params: { page: 0, size: 20, ...params } }).then(r => r.data),
  createExam: (petId: string, data: ExamRequest): Promise<ExamResponse> =>
    api.post(`/pets/${petId}/exams`, data).then(r => r.data),
  updateExam: (petId: string, id: string, data: ExamRequest): Promise<ExamResponse> =>
    api.put(`/pets/${petId}/exams/${id}`, data).then(r => r.data),
  removeExam: (petId: string, id: string): Promise<void> =>
    api.delete(`/pets/${petId}/exams/${id}`).then(() => undefined),

  // Weights
  listWeights: (petId: string, params?: { page?: number; size?: number }): Promise<Page<WeightResponse>> =>
    api.get(`/pets/${petId}/weights`, { params: { page: 0, size: 50, ...params } }).then(r => r.data),
  createWeight: (petId: string, data: WeightRequest): Promise<WeightResponse> =>
    api.post(`/pets/${petId}/weights`, data).then(r => r.data),
  removeWeight: (petId: string, id: string): Promise<void> =>
    api.delete(`/pets/${petId}/weights/${id}`).then(() => undefined),

  // Surgeries
  listSurgeries: (petId: string, params?: { page?: number; size?: number }): Promise<Page<SurgeryResponse>> =>
    api.get(`/pets/${petId}/surgeries`, { params: { page: 0, size: 20, ...params } }).then(r => r.data),
  createSurgery: (petId: string, data: SurgeryRequest): Promise<SurgeryResponse> =>
    api.post(`/pets/${petId}/surgeries`, data).then(r => r.data),
  updateSurgery: (petId: string, id: string, data: SurgeryRequest): Promise<SurgeryResponse> =>
    api.put(`/pets/${petId}/surgeries/${id}`, data).then(r => r.data),
  removeSurgery: (petId: string, id: string): Promise<void> =>
    api.delete(`/pets/${petId}/surgeries/${id}`).then(() => undefined),
}
