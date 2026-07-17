import { api } from '../lib/api'

export interface StaffRequest {
  name:        string
  photoUrl?:   string
  jobTitle?:   string
  speciality?: string
  phone?:      string
  email?:      string
  whatsapp?:   string
  status?:     'ACTIVE' | 'INACTIVE'
  serviceIds?: string[]
}

export interface StaffResponse {
  id:          string
  partnerId:   string
  name:        string
  photoUrl?:   string
  jobTitle?:   string
  speciality?: string
  phone?:      string
  email?:      string
  whatsapp?:   string
  status:      'ACTIVE' | 'INACTIVE'
  serviceIds?: string[]
  createdAt:   string
}

export interface StaffScheduleRequest {
  dayOfWeek:      number   // 1=Dom, 2=Seg … 7=Sáb
  startTime:      string   // "HH:MM:SS"
  endTime:        string
  lunchStartTime?: string
  lunchEndTime?:   string
}

export interface StaffScheduleResponse {
  id:              string
  staffId:         string
  dayOfWeek:       number
  startTime:       string
  endTime:         string
  lunchStartTime?: string
  lunchEndTime?:   string
}

export interface StaffAbsenceRequest {
  startDate: string   // ISO datetime
  endDate:   string
  reason?:   string
}

export interface StaffAbsenceResponse {
  id:        string
  staffId:   string
  startDate: string
  endDate:   string
  reason?:   string
}

export const staffService = {
  create:         (partnerId: string, data: StaffRequest) =>
    api.post<StaffResponse>(`/partners/${partnerId}/staff`, data).then(r => r.data),

  getByPartner:   (partnerId: string) =>
    api.get<StaffResponse[]>(`/partners/${partnerId}/staff`).then(r => r.data),

  getById:        (staffId: string) =>
    api.get<StaffResponse>(`/partners/staff/${staffId}`).then(r => r.data),

  update:         (staffId: string, data: StaffRequest) =>
    api.put<StaffResponse>(`/partners/staff/${staffId}`, data).then(r => r.data),

  remove:         (staffId: string) =>
    api.delete(`/partners/staff/${staffId}`),

  getSchedule:    (staffId: string) =>
    api.get<StaffScheduleResponse[]>(`/partners/staff/${staffId}/schedule`).then(r => r.data),

  updateSchedule: (staffId: string, data: StaffScheduleRequest[]) =>
    api.put<StaffScheduleResponse[]>(`/partners/staff/${staffId}/schedule`, data).then(r => r.data),

  getAbsences:    (staffId: string) =>
    api.get<StaffAbsenceResponse[]>(`/partners/staff/${staffId}/absences`).then(r => r.data),

  createAbsence:  (staffId: string, data: StaffAbsenceRequest) =>
    api.post<StaffAbsenceResponse>(`/partners/staff/${staffId}/absences`, data).then(r => r.data),
}
