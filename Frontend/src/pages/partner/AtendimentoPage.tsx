import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Loader2, Clock, ChevronRight, Stethoscope, Syringe,
  Scissors, Package, FileText, Plus, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { partnerService }  from '../../services/partner.service'
import {
  petService,
  type PetResponse,
  type PetHistoryResponse,
  type AppointmentRequest,
  type MedicationRequest,
  type ExamRequest,
  type VaccineRequest,
} from '../../services/pet.service'
import {
  bookingService,
  type BookingResponse,
  BOOKING_TYPE_LABEL,
} from '../../services/booking.service'

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function formatTime(iso?: string) {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function toISOLocal(dateStr: string, timeStr: string) {
  return `${dateStr}T${timeStr}:00`
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  CONSULTATION: <Stethoscope size={15}/>,
  VACCINATION:  <Syringe     size={15}/>,
  GROOMING:     <Scissors    size={15}/>,
  BOARDING:     <Package     size={15}/>,
  OTHER:        <FileText    size={15}/>,
}

/* ─────────────────────────────────────────────
   Sub-componentes de prontuário
───────────────────────────────────────────── */
function HistorySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-bold text-(--color-text-muted) uppercase tracking-wider mb-2">{title}</h4>
      {children}
    </div>
  )
}

function EmptyHistory({ label }: { label: string }) {
  return (
    <p className="text-xs text-(--color-text-muted) italic py-1">Nenhum(a) {label} registrado(a).</p>
  )
}

function ProntuarioPanel({ history }: { history: PetHistoryResponse }) {
  return (
    <div className="space-y-5 text-sm">
      <HistorySection title="Consultas">
        {history.appointments.length === 0 ? <EmptyHistory label="consulta" /> : (
          <div className="space-y-2">
            {history.appointments.slice(0, 5).map(a => (
              <div key={a.id} className="bg-(--color-bg) rounded-xl p-3 border border-(--color-border)">
                <p className="font-semibold text-(--color-text-heading) text-xs">
                  {new Date(a.date).toLocaleDateString('pt-BR')} — {a.reason}
                </p>
                {a.clinicalNotes && <p className="text-xs text-(--color-text-muted) mt-0.5">{a.clinicalNotes}</p>}
                {a.vetName       && <p className="text-xs text-(--color-text-muted)">Dr(a). {a.vetName}</p>}
              </div>
            ))}
          </div>
        )}
      </HistorySection>

      <HistorySection title="Vacinas">
        {history.vaccines.length === 0 ? <EmptyHistory label="vacina" /> : (
          <div className="space-y-1.5">
            {history.vaccines.slice(0, 4).map(v => (
              <div key={v.id} className="flex items-center justify-between bg-(--color-bg) rounded-xl px-3 py-2 border border-(--color-border)">
                <span className="font-medium text-(--color-text-body) text-xs">{v.name}</span>
                <span className="text-[10px] text-(--color-text-muted)">{new Date(v.applicationDate).toLocaleDateString('pt-BR')}</span>
              </div>
            ))}
          </div>
        )}
      </HistorySection>

      <HistorySection title="Medicamentos ativos">
        {history.medications.filter(m => m.active).length === 0 ? <EmptyHistory label="medicamento ativo" /> : (
          <div className="space-y-1.5">
            {history.medications.filter(m => m.active).map(m => (
              <div key={m.id} className="flex items-center justify-between bg-(--color-bg) rounded-xl px-3 py-2 border border-(--color-border)">
                <span className="font-medium text-(--color-text-body) text-xs">{m.name}</span>
                <span className="text-[10px] text-(--color-text-muted)">{m.dosage ?? ''}</span>
              </div>
            ))}
          </div>
        )}
      </HistorySection>

      <HistorySection title="Exames">
        {history.exams.length === 0 ? <EmptyHistory label="exame" /> : (
          <div className="space-y-1.5">
            {history.exams.slice(0, 3).map(e => (
              <div key={e.id} className="bg-(--color-bg) rounded-xl px-3 py-2 border border-(--color-border)">
                <p className="font-medium text-(--color-text-body) text-xs">{e.examName}</p>
                <p className="text-[10px] text-(--color-text-muted)">{new Date(e.date).toLocaleDateString('pt-BR')}</p>
              </div>
            ))}
          </div>
        )}
      </HistorySection>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Formulário de atendimento
───────────────────────────────────────────── */
interface ServiceFormProps {
  booking:   BookingResponse
  onFinish:  () => void
}

function ServiceForm({ booking, onFinish }: ServiceFormProps) {
  const todayStr = today()
  const isConsultation = booking.type === 'CONSULTATION'
  const isVaccination  = booking.type === 'VACCINATION'

  /* ── Consulta ── */
  const [apptReason,  setApptReason]  = useState('')
  const [apptNotes,   setApptNotes]   = useState('')
  const [apptVetName, setApptVetName] = useState('')
  const [apptWeight,  setApptWeight]  = useState('')
  const [apptTime,    setApptTime]    = useState(formatTime(booking.bookingDate))

  /* ── Vacina ── */
  const [vaccName,      setVaccName]      = useState('')
  const [vaccNextDate,  setVaccNextDate]  = useState('')
  const [vaccVetName,   setVaccVetName]   = useState('')
  const [vaccManuf,     setVaccManuf]     = useState('')
  const [vaccLot,       setVaccLot]       = useState('')

  /* ── Medicamento (opcional) ── */
  const [addMed,      setAddMed]      = useState(false)
  const [medName,     setMedName]     = useState('')
  const [medDosage,   setMedDosage]   = useState('')
  const [medFreq,     setMedFreq]     = useState('')
  const [medStart,    setMedStart]    = useState(todayStr)
  const [medEnd,      setMedEnd]      = useState('')

  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleSave() {
    if (isConsultation && !apptReason.trim()) { setError('Motivo da consulta é obrigatório.'); return }
    if (isVaccination  && !vaccName.trim())   { setError('Nome da vacina é obrigatório.');    return }
    setError(null)
    setSaving(true)
    try {
      const petId = booking.petId

      if (isConsultation) {
        const req: AppointmentRequest = {
          date:          toISOLocal(todayStr, apptTime || '08:00'),
          reason:        apptReason.trim(),
          clinicalNotes: apptNotes.trim() || undefined,
          vetName:       apptVetName.trim() || undefined,
          weightAtTime:  apptWeight ? Number(apptWeight) : undefined,
          status:        'COMPLETED',
        }
        await petService.createAppointment(petId, req)
      }

      if (isVaccination) {
        const req: VaccineRequest = {
          name:            vaccName.trim(),
          applicationDate: todayStr,
          nextDoseDate:    vaccNextDate || todayStr,
          status:          'APPLIED',
          vetName:         vaccVetName.trim() || undefined,
          manufacturer:    vaccManuf.trim()   || undefined,
          lot:             vaccLot.trim()     || undefined,
        }
        await petService.createVaccine(petId, req)
      }

      if (!isConsultation && !isVaccination) {
        const req: AppointmentRequest = {
          date:   toISOLocal(todayStr, apptTime || '08:00'),
          reason: BOOKING_TYPE_LABEL[booking.type as keyof typeof BOOKING_TYPE_LABEL] ?? booking.type,
          status: 'COMPLETED',
        }
        await petService.createAppointment(petId, req)
      }

      if (addMed && medName.trim()) {
        const medReq: MedicationRequest = {
          name:      medName.trim(),
          dosage:    medDosage.trim() || undefined,
          frequency: medFreq.trim()  || undefined,
          startDate: medStart,
          endDate:   medEnd || undefined,
          active:    true,
        }
        await petService.createMedication(petId, medReq)
      }

      await bookingService.updateStatus(booking.id, 'COMPLETED')
      onFinish()
    } catch {
      setError('Erro ao finalizar atendimento. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Serviço principal ── */}
      {(isConsultation || (!isConsultation && !isVaccination)) && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-(--color-text-muted) uppercase tracking-wider">
            {isConsultation ? 'Dados da consulta' : 'Registro do atendimento'}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-(--color-text-muted) mb-1">Horário do atendimento</label>
              <input type="time" value={apptTime} onChange={e => setApptTime(e.target.value)}
                className="w-full text-sm rounded-xl border border-(--color-border) bg-(--color-bg)
                           px-3 py-2 text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700)" />
            </div>
            {isConsultation && (
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-(--color-text-muted) mb-1">Motivo *</label>
                <input value={apptReason} onChange={e => setApptReason(e.target.value)} placeholder="Ex: Consulta de rotina"
                  className="w-full text-sm rounded-xl border border-(--color-border) bg-(--color-bg)
                             px-3 py-2 text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700)" />
              </div>
            )}
            {isConsultation && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-(--color-text-muted) mb-1">Médico responsável</label>
                  <input value={apptVetName} onChange={e => setApptVetName(e.target.value)} placeholder="Nome do médico"
                    className="w-full text-sm rounded-xl border border-(--color-border) bg-(--color-bg)
                               px-3 py-2 text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700)" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-(--color-text-muted) mb-1">Peso atual (kg)</label>
                  <input type="number" step="0.1" value={apptWeight} onChange={e => setApptWeight(e.target.value)} placeholder="0.0"
                    className="w-full text-sm rounded-xl border border-(--color-border) bg-(--color-bg)
                               px-3 py-2 text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700)" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-(--color-text-muted) mb-1">Notas clínicas / prescrição</label>
                  <textarea rows={3} value={apptNotes} onChange={e => setApptNotes(e.target.value)}
                    placeholder="Observações, diagnóstico, prescrições..."
                    className="w-full text-sm rounded-xl border border-(--color-border) bg-(--color-bg)
                               px-3 py-2 text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700) resize-none" />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {isVaccination && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-(--color-text-muted) uppercase tracking-wider">Dados da vacinação</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-(--color-text-muted) mb-1">Nome da vacina *</label>
              <input value={vaccName} onChange={e => setVaccName(e.target.value)} placeholder="Ex: V10, Antirrábica"
                className="w-full text-sm rounded-xl border border-(--color-border) bg-(--color-bg)
                           px-3 py-2 text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700)" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-(--color-text-muted) mb-1">Próxima dose</label>
              <input type="date" value={vaccNextDate} onChange={e => setVaccNextDate(e.target.value)}
                className="w-full text-sm rounded-xl border border-(--color-border) bg-(--color-bg)
                           px-3 py-2 text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700)" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-(--color-text-muted) mb-1">Médico responsável</label>
              <input value={vaccVetName} onChange={e => setVaccVetName(e.target.value)}
                className="w-full text-sm rounded-xl border border-(--color-border) bg-(--color-bg)
                           px-3 py-2 text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700)" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-(--color-text-muted) mb-1">Fabricante</label>
              <input value={vaccManuf} onChange={e => setVaccManuf(e.target.value)}
                className="w-full text-sm rounded-xl border border-(--color-border) bg-(--color-bg)
                           px-3 py-2 text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700)" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-(--color-text-muted) mb-1">Lote</label>
              <input value={vaccLot} onChange={e => setVaccLot(e.target.value)}
                className="w-full text-sm rounded-xl border border-(--color-border) bg-(--color-bg)
                           px-3 py-2 text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700)" />
            </div>
          </div>
        </div>
      )}

      {/* ── Medicamento opcional ── */}
      <div>
        <button onClick={() => setAddMed(v => !v)}
          className="flex items-center gap-2 text-xs font-semibold text-(--color-primary-700) hover:opacity-80 transition-opacity">
          <Plus size={14} />
          {addMed ? 'Remover medicamento' : 'Adicionar medicamento / prescrição'}
        </button>
        {addMed && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-(--color-text-muted) mb-1">Nome do medicamento *</label>
              <input value={medName} onChange={e => setMedName(e.target.value)} placeholder="Ex: Amoxicilina"
                className="w-full text-sm rounded-xl border border-(--color-border) bg-(--color-bg)
                           px-3 py-2 text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700)" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-(--color-text-muted) mb-1">Dosagem</label>
              <input value={medDosage} onChange={e => setMedDosage(e.target.value)} placeholder="Ex: 500mg"
                className="w-full text-sm rounded-xl border border-(--color-border) bg-(--color-bg)
                           px-3 py-2 text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700)" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-(--color-text-muted) mb-1">Frequência</label>
              <input value={medFreq} onChange={e => setMedFreq(e.target.value)} placeholder="Ex: 12/12h"
                className="w-full text-sm rounded-xl border border-(--color-border) bg-(--color-bg)
                           px-3 py-2 text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700)" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-(--color-text-muted) mb-1">Início</label>
              <input type="date" value={medStart} onChange={e => setMedStart(e.target.value)}
                className="w-full text-sm rounded-xl border border-(--color-border) bg-(--color-bg)
                           px-3 py-2 text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700)" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-(--color-text-muted) mb-1">Fim</label>
              <input type="date" value={medEnd} onChange={e => setMedEnd(e.target.value)}
                className="w-full text-sm rounded-xl border border-(--color-border) bg-(--color-bg)
                           px-3 py-2 text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700)" />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-500 font-medium">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 rounded-xl font-bold text-sm text-white
                   bg-(--color-primary-700) hover:opacity-90 disabled:opacity-50
                   transition-opacity flex items-center justify-center gap-2">
        {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
        Finalizar Atendimento
      </button>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Página principal
───────────────────────────────────────────── */
export default function AtendimentoPage() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()
  const initialId      = searchParams.get('bookingId')

  const [partnerId,  setPartnerId]  = useState<string | null>(null)
  const [queue,      setQueue]      = useState<BookingResponse[]>([])
  const [petMap,     setPetMap]     = useState<Record<string, PetResponse>>({})
  const [historyMap, setHistoryMap] = useState<Record<string, PetHistoryResponse>>({})
  const [selected,   setSelected]   = useState<BookingResponse | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [histLoading,setHistLoading]= useState(false)
  const [finished,   setFinished]   = useState<Set<string>>(new Set())

  /* carrega parceiro + fila do dia */
  useEffect(() => {
    partnerService.getMe().then(async p => {
      setPartnerId(p.id)
      const todayStr = today()
      try {
        const res = await bookingService.getByPartner(p.id, {
          date: todayStr, status: 'CONFIRMED', size: 50, sort: 'bookingDate,asc',
        })
        const sorted = [...res.content].sort((a, b) =>
          (a.bookingDate ?? '').localeCompare(b.bookingDate ?? ''))
        setQueue(sorted)

        sorted.forEach(b => {
          if (b.petId && !petMap[b.petId]) {
            petService.getById(b.petId)
              .then(pet => setPetMap(prev => ({ ...prev, [pet.id]: pet })))
              .catch(() => {})
          }
        })

        if (initialId) {
          const found = sorted.find(b => b.id === initialId)
          if (found) setSelected(found)
        }
      } catch { /* API error */ }
    }).finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialId])

  /* carrega prontuário quando seleciona um booking */
  useEffect(() => {
    if (!selected) return
    const petId = selected.petId
    if (historyMap[petId]) return
    setHistLoading(true)
    petService.getPetHistory(petId)
      .then(h => setHistoryMap(prev => ({ ...prev, [petId]: h })))
      .catch(() => {})
      .finally(() => setHistLoading(false))
  }, [selected, historyMap])

  const handleSelect = useCallback((b: BookingResponse) => {
    setSelected(b)
    navigate(`/partner/atendimento?bookingId=${b.id}`, { replace: true })
  }, [navigate])

  const handleFinish = useCallback(() => {
    if (!selected) return
    setFinished(prev => new Set([...prev, selected.id]))
    setSelected(null)
  }, [selected])

  const pet     = selected ? petMap[selected.petId]   : null
  const history = selected ? historyMap[selected.petId] : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-(--color-primary-700)" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-(--color-text-heading)">Atendimento</h1>
        <p className="text-sm text-(--color-text-muted) mt-1">
          Fila de hoje — {queue.length} confirmado{queue.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 h-full">

        {/* ── Fila ── */}
        <div className="w-full lg:w-72 shrink-0 space-y-2">
          {queue.length === 0 ? (
            <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-6 text-center">
              <p className="text-sm text-(--color-text-muted)">Nenhum atendimento confirmado hoje.</p>
            </div>
          ) : queue.map(b => {
            const p = petMap[b.petId]
            const isSelected  = selected?.id === b.id
            const isDone      = finished.has(b.id)
            return (
              <button key={b.id} onClick={() => !isDone && handleSelect(b)}
                disabled={isDone}
                className={[
                  'w-full text-left rounded-2xl border p-4 transition-all',
                  isDone
                    ? 'opacity-50 cursor-default border-(--color-border) bg-(--color-surface)'
                    : isSelected
                      ? 'border-(--color-primary-700) bg-(--color-surface) shadow-md'
                      : 'border-(--color-border) bg-(--color-surface) hover:border-(--color-primary-700)/50 hover:shadow-sm',
                ].join(' ')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-(--color-text-muted) text-xs">
                      <Clock size={12} className="inline mr-1" />
                      {formatTime(b.bookingDate)}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-(--color-bg) text-(--color-text-muted) font-medium">
                      {TYPE_ICON[b.type]}
                    </span>
                  </div>
                  {isDone
                    ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    : <ChevronRight  size={14} className="text-(--color-text-muted) shrink-0" />
                  }
                </div>
                <p className="font-bold text-(--color-text-heading) text-sm mt-1.5">
                  {p?.name ?? '…'}
                </p>
                <p className="text-xs text-(--color-text-muted) leading-tight">
                  {p?.breed ?? ''} {p?.breed && p?.species ? '·' : ''} {p?.species ?? ''}
                </p>
                <p className="text-xs text-(--color-text-muted) mt-0.5">
                  {BOOKING_TYPE_LABEL[b.type as keyof typeof BOOKING_TYPE_LABEL] ?? b.type}
                </p>
              </button>
            )
          })}
        </div>

        {/* ── Detalhe ── */}
        {!selected ? (
          <div className="flex-1 bg-(--color-surface) border border-(--color-border) rounded-2xl
                          flex items-center justify-center p-10">
            <div className="text-center">
              <Stethoscope size={40} className="text-(--color-text-muted) mx-auto mb-3 opacity-40" />
              <p className="text-sm text-(--color-text-muted) font-medium">
                Selecione um atendimento na fila para iniciar.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-5">

            {/* Prontuário */}
            <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-(--color-border)">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-(--color-text-muted) uppercase tracking-wider mb-0.5">Prontuário</p>
                    <h3 className="text-lg font-bold text-(--color-text-heading)">{pet?.name ?? '…'}</h3>
                    {pet && (
                      <p className="text-xs text-(--color-text-muted)">
                        {pet.breed} · {pet.species} · {pet.gender === 'MALE' ? 'Macho' : 'Fêmea'} · {pet.weight}kg
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-(--color-text-muted)">
                    <p className="font-semibold text-(--color-secondary-500)">{BOOKING_TYPE_LABEL[selected.type as keyof typeof BOOKING_TYPE_LABEL]}</p>
                    <p>{formatTime(selected.bookingDate)}</p>
                  </div>
                </div>
              </div>
              <div className="p-5 overflow-y-auto max-h-[520px]">
                {histLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 size={20} className="animate-spin text-(--color-primary-700)" />
                  </div>
                ) : history ? (
                  <ProntuarioPanel history={history} />
                ) : (
                  <p className="text-xs text-(--color-text-muted) italic">Carregando prontuário…</p>
                )}
              </div>
            </div>

            {/* Formulário */}
            <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-(--color-border)">
                <p className="text-xs font-bold text-(--color-text-muted) uppercase tracking-wider mb-0.5">Registrar atendimento</p>
                <h3 className="text-base font-bold text-(--color-text-heading)">
                  {BOOKING_TYPE_LABEL[selected.type as keyof typeof BOOKING_TYPE_LABEL] ?? selected.type}
                </h3>
              </div>
              <div className="p-5 overflow-y-auto max-h-[520px]">
                <ServiceForm booking={selected} onFinish={handleFinish} />
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
