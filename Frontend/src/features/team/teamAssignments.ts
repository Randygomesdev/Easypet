import { api } from '../../lib/api'

export type StaffAssignment = {
  partnerId: string
  staffId: string
  userId: string
  teamAccessId: string
}

export const teamAssignments = {
  list: (signal?: AbortSignal) =>
    api.get<StaffAssignment[]>('/partners/me/staff/team-members', { signal }).then(r => r.data),
  assign: (staffId: string, userId: string) =>
    api.put<StaffAssignment>(`/partners/me/staff/${encodeURIComponent(staffId)}/team-member`, { userId }).then(r => r.data),
  unlink: (staffId: string) =>
    api.delete<void>(`/partners/me/staff/${encodeURIComponent(staffId)}/team-member`),
}
