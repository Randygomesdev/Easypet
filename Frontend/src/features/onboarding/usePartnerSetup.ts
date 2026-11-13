import { isAxiosError } from 'axios'
import { useEffect, useState } from 'react'
import { partnerService, type PartnerResponse } from '../../services/partner.service'
import { staffService, type StaffResponse } from '../../services/staff.service'

type Read<T> = { status: 'loading' | 'error' } | { status: 'ready'; data: T }

type PartnerSetup = {
  partner: Read<PartnerResponse | null>
  staff: Read<StaffResponse[]>
  schedule: Read<string | null>
}

const initial: PartnerSetup = {
  partner: { status: 'loading' }, staff: { status: 'loading' }, schedule: { status: 'loading' },
}

export function activeServiceIds(partner: PartnerResponse) {
  return new Set(partner.services.filter(service => service.active === true).map(service => service.id))
}

export function linkedStaff(staff: StaffResponse[], partner: PartnerResponse) {
  const serviceIds = activeServiceIds(partner)
  return staff.filter(person => person.status === 'ACTIVE' && person.partnerId === partner.id
    && person.serviceIds?.some(id => serviceIds.has(id)))
}

export function usePartnerSetup() {
  const [setup, setSetup] = useState(initial)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let current = true

    async function load() {
      let partner: PartnerResponse
      try {
        partner = await partnerService.getMe()
        if (!partner?.id || typeof partner.active !== 'boolean' || !Array.isArray(partner.services)
          || !partner.services.every(service => typeof service?.id === 'string' && typeof service.active === 'boolean')) {
          throw new Error('Cadastro incompleto na resposta')
        }
      } catch (error) {
        if (current) setSetup({ ...initial, partner: isAxiosError(error) && error.response?.status === 404
          ? { status: 'ready', data: null } : { status: 'error' } })
        return
      }
      if (!current) return
      setSetup({ ...initial, partner: { status: 'ready', data: partner } })

      let staff: StaffResponse[]
      try {
        staff = await staffService.getByPartner(partner.id)
        if (!Array.isArray(staff) || !staff.every(person => typeof person?.id === 'string'
          && person.partnerId === partner.id && (person.status === 'ACTIVE' || person.status === 'INACTIVE')
          && (person.serviceIds == null || Array.isArray(person.serviceIds)))) {
          throw new Error('Lista de colaboradores inválida')
        }
      } catch {
        if (current) setSetup(state => ({ ...state, staff: { status: 'error' } }))
        return
      }
      if (!current) return
      setSetup(state => ({ ...state, staff: { status: 'ready', data: staff } }))

      // Stop once an eligible collaborator has a confirmed interval.
      let failed = false
      for (const person of linkedStaff(staff, partner)) {
        try {
          const schedule = await staffService.getSchedule(person.id, partner.id)
          if (!current) return
          if (!Array.isArray(schedule) || !schedule.every(interval => interval?.staffId === person.id
            && Number.isInteger(interval.dayOfWeek) && interval.dayOfWeek >= 1 && interval.dayOfWeek <= 7
            && validTime(interval.startTime) && validTime(interval.endTime))) {
            throw new Error('Escala inválida')
          }
          if (schedule.some(interval => interval.startTime.slice(0, 5) < interval.endTime.slice(0, 5))) {
            setSetup(state => ({ ...state, schedule: { status: 'ready', data: person.id } }))
            return
          }
        } catch {
          if (!current) return
          failed = true
        }
      }
      if (current) setSetup(state => ({ ...state, schedule: failed ? { status: 'error' } : { status: 'ready', data: null } }))
    }

    void load()
    return () => { current = false }
  }, [attempt])

  function retry() {
    setSetup(initial)
    setAttempt(value => value + 1)
  }

  return { ...setup, retry }
}

function validTime(time: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time)
}
