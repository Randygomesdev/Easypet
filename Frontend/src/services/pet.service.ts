import { api } from '../lib/api'

export interface PetResponse {
  id:              string
  name:            string
  breed:           string
  species:         string
  gender:          string
  weight:          number
  birthDate:       string
  microchipNumber?: string
  pictureUrl?:     string
  active:          boolean
  ownerId:         string
}

// ── Prontuário ────────────────────────────────────────────────────────────

export interface AppointmentResponse {
  id:            string
  date:          string
  reason:        string
  clinicalNotes?: string
  vetName?:      string
  providerId?:   string
  weightAtTime?: number
  status:        string
  certified?:    boolean
  createdAt:     string
}

export interface MedicationResponse {
  id:            string
  name:          string
  dosage?:       string
  frequency?:    string
  startDate:     string
  endDate?:      string
  observations?: string
  active?:       boolean
  appointmentId?: string
}

export interface ExamResponse {
  id:               string
  examName:         string
  date:             string
  laboratory?:      string
  veterinarianName?: string
  resultsSummary?:  string
  fileUrl?:         string
  certified?:       boolean
}

export interface VaccineResponse {
  id:              string
  name:            string
  applicationDate: string
  nextDoseDate:    string
  status:          string
  vetName?:        string
  manufacturer?:   string
  lot?:            string
  observations?:   string
}

export interface PetHistoryResponse {
  appointments: AppointmentResponse[]
  medications:  MedicationResponse[]
  exams:        ExamResponse[]
  vaccines:     VaccineResponse[]
}

// ── Requests ──────────────────────────────────────────────────────────────

export interface AppointmentRequest {
  date:           string   // ISO LocalDateTime
  reason:         string
  clinicalNotes?: string
  vetName?:       string
  providerId?:    string
  weightAtTime?:  number
  status:         string   // AppointmentStatus enum
}

export interface MedicationRequest {
  name:           string
  dosage?:        string
  frequency?:     string
  startDate:      string   // LocalDate
  endDate?:       string
  observations?:  string
  active?:        boolean
  appointmentId?: string
}

export interface ExamRequest {
  examName:          string
  date:              string   // ISO LocalDateTime
  laboratory?:       string
  veterinarianName?: string
  resultsSummary?:   string
  fileUrl?:          string
}

export interface VaccineRequest {
  name:            string
  applicationDate: string   // LocalDate
  nextDoseDate:    string
  status:          string   // VaccineStatus enum
  vetName?:        string
  manufacturer?:   string
  lot?:            string
  observations?:   string
}

// ── Service ───────────────────────────────────────────────────────────────

export const petService = {
  getById: (petId: string): Promise<PetResponse> =>
    api.get(`/pets/${petId}`).then(r => r.data),

  getPetHistory: (petId: string): Promise<PetHistoryResponse> =>
    api.get(`/pets/${petId}/history`).then(r => r.data),

  createAppointment: (petId: string, data: AppointmentRequest): Promise<AppointmentResponse> =>
    api.post(`/pets/${petId}/appointments`, data).then(r => r.data),

  createMedication: (petId: string, data: MedicationRequest): Promise<MedicationResponse> =>
    api.post(`/pets/${petId}/medications`, data).then(r => r.data),

  createExam: (petId: string, data: ExamRequest): Promise<ExamResponse> =>
    api.post(`/pets/${petId}/exams`, data).then(r => r.data),

  createVaccine: (petId: string, data: VaccineRequest): Promise<VaccineResponse> =>
    api.post(`/pets/${petId}/vaccines`, data).then(r => r.data),
}
