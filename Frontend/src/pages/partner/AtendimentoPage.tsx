import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Loader2, Clock, ChevronRight, X, CheckCircle2,
  Stethoscope, Syringe, Pill, Scale, FlaskConical, Scissors,
  ArrowLeft, Plus, Save, Trash2, Edit2, Weight,
} from 'lucide-react'
import { partnerService }  from '../../services/partner.service'
import { staffService, type StaffResponse } from '../../services/staff.service'
import {
  petService,
  type PetResponse,
  type PetHistoryResponse,
  type VaccineResponse,     type VaccineRequest,
  type MedicationResponse,  type MedicationRequest,
  type ExamResponse,        type ExamRequest,
  type WeightResponse,      type WeightRequest,
  type SurgeryResponse,     type SurgeryRequest,
  SPECIES_LABEL, GENDER_LABEL,
  VACCINE_STATUS_LABEL,     type VaccineStatus,
} from '../../services/pet.service'
import {
  bookingService,
  type BookingResponse,
  BOOKING_TYPE_LABEL,
} from '../../services/booking.service'

/* ── Helpers ────────────────────────────────────────────────────────────── */
function formatTime(iso?: string) {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function fmt(date: string) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR')
}
function age(birthDate: string) {
  if (!birthDate) return ''
  const diff   = Date.now() - new Date(birthDate).getTime()
  const years  = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
  if (years < 1) {
    const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44))
    return `${months} ${months === 1 ? 'mês' : 'meses'}`
  }
  return `${years} ${years === 1 ? 'ano' : 'anos'}`
}
function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  CONSULTATION: <Stethoscope size={15}/>,
  VACCINATION:  <Syringe     size={15}/>,
  GROOMING:     <Scissors    size={15}/>,
  BOARDING:     <FlaskConical size={15}/>,
  OTHER:        <Pill        size={15}/>,
}

/* ── Form helpers ────────────────────────────────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}
function FInput({ value, onChange, placeholder, type = 'text' }: {
  value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
           className="w-full px-3 py-2 text-sm rounded-xl border border-(--color-border)
                      bg-(--color-bg) text-(--color-text-body) outline-none
                      focus:ring-2 focus:ring-(--color-primary-500)" />
  )
}
function FSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { label: string; value: string }[]
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-(--color-border)
                       bg-(--color-bg) text-(--color-text-body) outline-none
                       focus:ring-2 focus:ring-(--color-primary-500)">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
function FTextarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
              className="w-full px-3 py-2 text-sm rounded-xl border border-(--color-border)
                         bg-(--color-bg) text-(--color-text-body) outline-none resize-none
                         focus:ring-2 focus:ring-(--color-primary-500)" />
  )
}

/* ── ProntuarioPanel (leitura) ───────────────────────────────────────────── */
function ProntuarioPanel({ history }: { history: PetHistoryResponse }) {
  return (
    <div className="space-y-5 text-sm">

      <div>
        <h4 className="text-xs font-bold text-(--color-text-muted) uppercase tracking-wider mb-2">Consultas recentes</h4>
        {history.appointments.length === 0
          ? <p className="text-xs text-(--color-text-muted) italic">Nenhuma consulta registrada.</p>
          : (
            <div className="space-y-2">
              {history.appointments.slice(0, 5).map(a => (
                <div key={a.id} className="bg-(--color-bg) rounded-xl p-3 border border-(--color-border)">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-(--color-text-heading) text-xs">
                      {fmt(a.date)} — {a.reason}
                    </p>
                    {a.source && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${a.source === 'PLATFORM' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                        {a.source === 'PLATFORM' ? (a.partnerName ?? 'Clínica') : 'Tutor'}
                      </span>
                    )}
                  </div>
                  {a.clinicalNotes && <p className="text-xs text-(--color-text-muted) mt-0.5 line-clamp-2">{a.clinicalNotes}</p>}
                  {a.vetName && <p className="text-xs text-(--color-text-muted)">Dr(a). {a.vetName}</p>}
                </div>
              ))}
            </div>
          )}
      </div>

      <div>
        <h4 className="text-xs font-bold text-(--color-text-muted) uppercase tracking-wider mb-2">Vacinas</h4>
        {history.vaccines.length === 0
          ? <p className="text-xs text-(--color-text-muted) italic">Nenhuma vacina registrada.</p>
          : (
            <div className="space-y-1.5">
              {history.vaccines.slice(0, 4).map(v => (
                <div key={v.id} className="flex items-center justify-between bg-(--color-bg) rounded-xl px-3 py-2 border border-(--color-border)">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-(--color-text-body)">{v.name}</span>
                    {v.source === 'PLATFORM' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">
                        {v.partnerName ?? 'Clínica'}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-(--color-text-muted)">{fmt(v.applicationDate)}</span>
                </div>
              ))}
            </div>
          )}
      </div>

      <div>
        <h4 className="text-xs font-bold text-(--color-text-muted) uppercase tracking-wider mb-2">Medicamentos em uso</h4>
        {history.medications.filter(m => m.active).length === 0
          ? <p className="text-xs text-(--color-text-muted) italic">Nenhum medicamento em uso.</p>
          : (
            <div className="space-y-1.5">
              {history.medications.filter(m => m.active).map(m => (
                <div key={m.id} className="flex items-center justify-between bg-orange-50 rounded-xl px-3 py-2 border border-orange-200">
                  <span className="text-xs font-medium text-(--color-text-body)">{m.name}</span>
                  <span className="text-[10px] text-(--color-text-muted)">{m.dosage ?? ''}</span>
                </div>
              ))}
            </div>
          )}
      </div>

      <div>
        <h4 className="text-xs font-bold text-(--color-text-muted) uppercase tracking-wider mb-2">Exames</h4>
        {history.exams.length === 0
          ? <p className="text-xs text-(--color-text-muted) italic">Nenhum exame registrado.</p>
          : (
            <div className="space-y-1.5">
              {history.exams.slice(0, 3).map(e => (
                <div key={e.id} className="bg-(--color-bg) rounded-xl px-3 py-2 border border-(--color-border)">
                  <p className="text-xs font-medium text-(--color-text-body)">{e.examName}</p>
                  <p className="text-[10px] text-(--color-text-muted)">{fmt(e.date)}</p>
                </div>
              ))}
            </div>
          )}
      </div>

    </div>
  )
}

/* ── SlidePanel ──────────────────────────────────────────────────────────── */
function SlidePanel({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode
}) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-30" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-(--color-surface) z-40
                       flex flex-col transition-transform duration-300
                       ${open ? 'translate-x-0 shadow-2xl' : 'translate-x-full invisible'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-(--color-border) shrink-0">
          <h2 className="font-semibold text-(--color-text-heading)">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-(--color-bg) text-(--color-text-muted)">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </>
  )
}

/* ── SectionCard ─────────────────────────────────────────────────────────── */
function SectionCard({ icon: Icon, label, color, onClick }: {
  icon: React.ElementType; label: string; color: string; onClick: () => void
}) {
  return (
    <button onClick={onClick}
            className="flex items-center gap-3 p-4 bg-(--color-surface) border border-(--color-border)
                       rounded-2xl hover:shadow-md transition-shadow text-left w-full">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-(--color-text-heading)">{label}</p>
      </div>
      <ChevronRight size={16} className="text-(--color-text-muted)" />
    </button>
  )
}

/* ── WeightPanel ─────────────────────────────────────────────────────────── */
const EMPTY_WEIGHT: WeightRequest = { weight: 0, date: '' }

function WeightPanel({ petId, bookingId, partnerName }: { petId: string; bookingId?: string; partnerName?: string }) {
  const [list,    setList]    = useState<WeightResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState<WeightRequest | null>(null)
  const [saving,  setSaving]  = useState(false)

  const load = useCallback(() => {
    petService.listWeights(petId).then(p => setList(Array.isArray(p) ? p : (p.content ?? []))).finally(() => setLoading(false))
  }, [petId])
  useEffect(() => { load() }, [load])

  async function save() {
    if (!form?.weight || !form.date) return
    setSaving(true)
    try { await petService.createWeight(petId, { ...form, bookingId, partnerName }); setForm(null); load() }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      {form === null ? (
        <button onClick={() => setForm({ ...EMPTY_WEIGHT, date: today() })}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                           bg-(--color-secondary-500) text-white text-sm hover:opacity-90">
          <Plus size={14} /> Registrar Peso
        </button>
      ) : (
        <div className="p-4 bg-(--color-bg) border border-(--color-border) rounded-xl space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Peso (kg) *">
              <FInput type="number" value={form.weight || ''} onChange={v => setForm(f => f ? { ...f, weight: parseFloat(v) || 0 } : f)} placeholder="0.0" />
            </Field>
            <Field label="Data *">
              <FInput type="date" value={form.date} onChange={v => setForm(f => f ? { ...f, date: v } : f)} />
            </Field>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setForm(null)} className="flex-1 py-2 text-sm rounded-xl border border-(--color-border) text-(--color-text-body) hover:bg-(--color-surface)">Cancelar</button>
            <button onClick={save} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-(--color-secondary-500) text-white text-sm disabled:opacity-50">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Salvar
            </button>
          </div>
        </div>
      )}
      {loading ? <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-(--color-primary-700)" /></div>
      : list.length === 0 ? <p className="text-center text-sm text-(--color-text-muted) py-12">Nenhum registro de peso.</p>
      : (
        <div className="space-y-1.5">
          {[...list].sort((a, b) => b.date.localeCompare(a.date)).map(w => (
            <div key={w.id} className="flex items-center justify-between p-3 rounded-xl bg-(--color-bg) border border-(--color-border)">
              <div className="flex items-center gap-2">
                <Weight size={14} className="text-(--color-text-muted)" />
                <span className="text-sm font-medium text-(--color-text-heading)">{w.weight} kg</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-(--color-text-muted)">{fmt(w.date)}</span>
                <button onClick={async () => { if(confirm('Remover?')) { await petService.removeWeight(petId, w.id); load() } }} className="text-red-400 hover:text-red-500"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── AppointmentPanel ────────────────────────────────────────────────────── */
function AppointmentPanel({ petId, booking, partnerName, serviceNameMap }: {
  petId: string; booking: BookingResponse; partnerName?: string; serviceNameMap: Record<string, string>
}) {
  const autoDate   = booking.bookingDate
    ? new Date(booking.bookingDate).toISOString().slice(0, 16)
    : new Date().toISOString().slice(0, 16)
  const autoReason = (booking.serviceId && serviceNameMap[booking.serviceId])
    ? serviceNameMap[booking.serviceId]
    : BOOKING_TYPE_LABEL[booking.type as keyof typeof BOOKING_TYPE_LABEL] ?? booking.type

  const [staff,         setStaff]         = useState<StaffResponse[]>([])
  const [staffLoading,  setStaffLoading]  = useState(true)
  const [vetName,       setVetName]       = useState('')
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [saved,         setSaved]         = useState(false)
  const [saving,        setSaving]        = useState(false)

  useEffect(() => {
    staffService.getByPartner(booking.partnerId)
      .then(list => setStaff(list.filter(s => s.status === 'ACTIVE')))
      .catch(() => {})
      .finally(() => setStaffLoading(false))
  }, [booking.partnerId])

  async function save() {
    setSaving(true)
    try {
      await petService.createAppointment(petId, {
        date:         autoDate,
        reason:       autoReason,
        status:       'COMPLETED',
        vetName:      vetName || undefined,
        clinicalNotes,
        bookingId:    booking.id,
        partnerName,
      })
      setSaved(true)
    } finally { setSaving(false) }
  }

  if (saved) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <CheckCircle2 size={36} className="text-emerald-500" />
      <p className="text-sm font-medium text-(--color-text-heading)">Registro salvo com sucesso!</p>
      <button onClick={() => setSaved(false)} className="text-xs text-(--color-text-muted) hover:underline">
        Registrar novamente
      </button>
    </div>
  )

  return (
    <div className="space-y-4">

      {/* Campos auto-preenchidos (somente leitura) */}
      <div className="bg-(--color-bg) border border-(--color-border) rounded-xl p-3 space-y-1.5">
        <p className="text-[10px] font-bold text-(--color-text-muted) uppercase tracking-wider">Preenchido pelo agendamento</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-(--color-text-muted)">Data</span>
          <span className="text-xs font-medium text-(--color-text-body)">
            {new Date(booking.bookingDate ?? '').toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-(--color-text-muted)">Tipo</span>
          <span className="text-xs font-medium text-(--color-text-body)">{autoReason}</span>
        </div>
      </div>

      {/* Veterinário — dropdown de colaboradores */}
      <Field label="Veterinário / Colaborador responsável">
        {staffLoading ? (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-(--color-text-muted)">
            <Loader2 size={13} className="animate-spin" /> Carregando colaboradores…
          </div>
        ) : (
          <select
            value={vetName}
            onChange={e => setVetName(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-(--color-border)
                       bg-(--color-bg) text-(--color-text-body) outline-none
                       focus:ring-2 focus:ring-(--color-primary-500)"
          >
            <option value="">— Selecionar colaborador —</option>
            {staff.map(s => (
              <option key={s.id} value={s.name}>
                {s.name}{s.jobTitle ? ` · ${s.jobTitle}` : ''}
              </option>
            ))}
          </select>
        )}
      </Field>

      {/* Observações */}
      <Field label="Observações clínicas">
        <FTextarea value={clinicalNotes} onChange={setClinicalNotes}
                   placeholder="Anamnese, diagnóstico, orientações…" rows={6} />
      </Field>

      <button onClick={save} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                         bg-(--color-secondary-500) text-white text-sm disabled:opacity-50">
        {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Salvar Registro
      </button>
    </div>
  )
}

/* ── VaccinePanel ────────────────────────────────────────────────────────── */
const VACCINE_STATUS_OPTIONS = Object.entries(VACCINE_STATUS_LABEL).map(([v, l]) => ({ value: v, label: l }))
const EMPTY_VAC: VaccineRequest = { name: '', applicationDate: '', nextDoseDate: '', status: 'UPDATED', vetName: '', manufacturer: '', lot: '' }

function VaccinePanel({ petId, bookingId, partnerName }: { petId: string; bookingId?: string; partnerName?: string }) {
  const [list,    setList]    = useState<VaccineResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState<VaccineRequest | null>(null)
  const [editId,  setEditId]  = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)

  const load = useCallback(() => {
    petService.listVaccines(petId).then(p => setList(Array.isArray(p) ? p : (p.content ?? []))).finally(() => setLoading(false))
  }, [petId])
  useEffect(() => { load() }, [load])

  function setF<K extends keyof VaccineRequest>(k: K, v: VaccineRequest[K]) {
    setForm(f => f ? { ...f, [k]: v } : f)
  }
  async function save() {
    if (!form?.name || !form.applicationDate) return
    setSaving(true)
    try {
      if (editId) await petService.updateVaccine(petId, editId, form)
      else        await petService.createVaccine(petId, { ...form, bookingId, partnerName })
      setForm(null); setEditId(null); load()
    } finally { setSaving(false) }
  }

  if (form !== null) return (
    <div className="space-y-3">
      <button onClick={() => setForm(null)} className="text-sm text-(--color-text-muted) hover:underline flex items-center gap-1"><ArrowLeft size={14}/> Voltar</button>
      <h3 className="font-semibold text-(--color-text-heading)">{editId ? 'Editar Vacina' : 'Nova Vacina'}</h3>
      <Field label="Nome da Vacina *"><FInput value={form.name} onChange={v => setF('name', v)} placeholder="Ex: V10" /></Field>
      <Field label="Data de Aplicação *"><FInput type="date" value={form.applicationDate} onChange={v => setF('applicationDate', v)} /></Field>
      <Field label="Próxima Dose"><FInput type="date" value={form.nextDoseDate} onChange={v => setF('nextDoseDate', v)} /></Field>
      <Field label="Status"><FSelect value={form.status} onChange={v => setF('status', v as VaccineStatus)} options={VACCINE_STATUS_OPTIONS} /></Field>
      <Field label="Veterinário"><FInput value={form.vetName ?? ''} onChange={v => setF('vetName', v)} /></Field>
      <Field label="Fabricante"><FInput value={form.manufacturer ?? ''} onChange={v => setF('manufacturer', v)} /></Field>
      <Field label="Lote"><FInput value={form.lot ?? ''} onChange={v => setF('lot', v)} /></Field>
      <button onClick={save} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-(--color-secondary-500) text-white text-sm disabled:opacity-50">
        {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Salvar
      </button>
    </div>
  )

  return (
    <div className="space-y-3">
      <button onClick={() => { setForm({ ...EMPTY_VAC }); setEditId(null) }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-(--color-secondary-500) text-white text-sm hover:opacity-90">
        <Plus size={14}/> Nova Vacina
      </button>
      {loading ? <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-(--color-primary-700)"/></div>
      : list.length === 0 ? <p className="text-center text-sm text-(--color-text-muted) py-12">Nenhuma vacina registrada.</p>
      : (
        <div className="space-y-2">
          {list.map(v => (
            <div key={v.id} className="p-3 rounded-xl bg-(--color-bg) border border-(--color-border) space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-(--color-text-heading)">{v.name}</p>
                  <p className="text-xs text-(--color-text-muted)">Aplicada: {fmt(v.applicationDate)}{v.nextDoseDate ? ` · Próxima: ${fmt(v.nextDoseDate)}` : ''}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0
                  ${v.status === 'UPDATED' ? 'bg-green-100 text-green-700' : v.status === 'DUE_SOON' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                  {VACCINE_STATUS_LABEL[v.status]}
                </span>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setForm({ name: v.name, applicationDate: v.applicationDate, nextDoseDate: v.nextDoseDate, status: v.status, vetName: v.vetName ?? '', manufacturer: v.manufacturer ?? '', lot: v.lot ?? '' }); setEditId(v.id) }}
                        className="text-xs text-(--color-secondary-500) hover:underline flex items-center gap-1"><Edit2 size={11}/> Editar</button>
                <button onClick={async () => { if(confirm('Remover vacina?')) { await petService.removeVaccine(petId, v.id); load() } }}
                        className="text-xs text-red-500 hover:underline flex items-center gap-1"><Trash2 size={11}/> Remover</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── MedicationPanel ─────────────────────────────────────────────────────── */
const EMPTY_MED: MedicationRequest = { name: '', dosage: '', frequency: '', startDate: '', endDate: '', active: true, observations: '' }

function MedicationPanel({ petId, bookingId, partnerName }: { petId: string; bookingId?: string; partnerName?: string }) {
  const [list,    setList]    = useState<MedicationResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState<MedicationRequest | null>(null)
  const [editId,  setEditId]  = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)

  const load = useCallback(() => {
    petService.listMedications(petId).then(p => setList(Array.isArray(p) ? p : (p.content ?? []))).finally(() => setLoading(false))
  }, [petId])
  useEffect(() => { load() }, [load])

  function setF<K extends keyof MedicationRequest>(k: K, v: MedicationRequest[K]) {
    setForm(f => f ? { ...f, [k]: v } : f)
  }
  async function save() {
    if (!form?.name || !form.startDate) return
    setSaving(true)
    try {
      if (editId) await petService.updateMedication(petId, editId, form)
      else        await petService.createMedication(petId, { ...form, bookingId, partnerName })
      setForm(null); setEditId(null); load()
    } finally { setSaving(false) }
  }

  if (form !== null) return (
    <div className="space-y-3">
      <button onClick={() => setForm(null)} className="text-sm text-(--color-text-muted) hover:underline flex items-center gap-1"><ArrowLeft size={14}/> Voltar</button>
      <h3 className="font-semibold text-(--color-text-heading)">{editId ? 'Editar Medicamento' : 'Novo Medicamento'}</h3>
      <Field label="Nome *"><FInput value={form.name} onChange={v => setF('name', v)} placeholder="Ex: Amoxicilina" /></Field>
      <Field label="Dosagem"><FInput value={form.dosage ?? ''} onChange={v => setF('dosage', v)} placeholder="Ex: 250mg" /></Field>
      <Field label="Frequência"><FInput value={form.frequency ?? ''} onChange={v => setF('frequency', v)} placeholder="Ex: a cada 8 horas" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Início *"><FInput type="date" value={form.startDate} onChange={v => setF('startDate', v)} /></Field>
        <Field label="Término"><FInput type="date" value={form.endDate ?? ''} onChange={v => setF('endDate', v)} /></Field>
      </div>
      <Field label="Observações"><FTextarea value={form.observations ?? ''} onChange={v => setF('observations', v)} rows={3} /></Field>
      <label className="flex items-center gap-2 text-sm text-(--color-text-body) cursor-pointer">
        <input type="checkbox" checked={form.active ?? true} onChange={e => setF('active', e.target.checked)} className="rounded" />
        Em uso atualmente
      </label>
      <button onClick={save} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-(--color-secondary-500) text-white text-sm disabled:opacity-50">
        {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Salvar
      </button>
    </div>
  )

  return (
    <div className="space-y-3">
      <button onClick={() => { setForm({ ...EMPTY_MED }); setEditId(null) }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-(--color-secondary-500) text-white text-sm hover:opacity-90">
        <Plus size={14}/> Novo Medicamento
      </button>
      {loading ? <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-(--color-primary-700)"/></div>
      : list.length === 0 ? <p className="text-center text-sm text-(--color-text-muted) py-12">Nenhum medicamento registrado.</p>
      : (
        <div className="space-y-2">
          {list.map(m => (
            <div key={m.id} className={`p-3 rounded-xl border ${m.active ? 'bg-orange-50 border-orange-200' : 'bg-(--color-bg) border-(--color-border)'} space-y-1`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-(--color-text-heading)">{m.name}</p>
                  {m.dosage && <p className="text-xs text-(--color-text-muted)">{m.dosage}{m.frequency ? ` · ${m.frequency}` : ''}</p>}
                  <p className="text-xs text-(--color-text-muted)">Início: {fmt(m.startDate)}{m.endDate ? ` · Fim: ${fmt(m.endDate)}` : ''}</p>
                </div>
                {m.active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium shrink-0">Em uso</span>}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setForm({ name: m.name, dosage: m.dosage ?? '', frequency: m.frequency ?? '', startDate: m.startDate, endDate: m.endDate ?? '', active: m.active ?? true, observations: m.observations ?? '' }); setEditId(m.id) }}
                        className="text-xs text-(--color-secondary-500) hover:underline flex items-center gap-1"><Edit2 size={11}/> Editar</button>
                <button onClick={async () => { if(confirm('Remover medicamento?')) { await petService.removeMedication(petId, m.id); load() } }}
                        className="text-xs text-red-500 hover:underline flex items-center gap-1"><Trash2 size={11}/> Remover</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── ExamPanel ───────────────────────────────────────────────────────────── */
const EMPTY_EXAM: ExamRequest = { examName: '', date: '', laboratory: '', veterinarianName: '', resultsSummary: '', fileUrl: '' }

function ExamPanel({ petId, bookingId, partnerName }: { petId: string; bookingId?: string; partnerName?: string }) {
  const [list,    setList]    = useState<ExamResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState<ExamRequest | null>(null)
  const [editId,  setEditId]  = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)

  const load = useCallback(() => {
    petService.listExams(petId).then(p => setList(Array.isArray(p) ? p : (p.content ?? []))).finally(() => setLoading(false))
  }, [petId])
  useEffect(() => { load() }, [load])

  function setF<K extends keyof ExamRequest>(k: K, v: ExamRequest[K]) {
    setForm(f => f ? { ...f, [k]: v } : f)
  }
  async function save() {
    if (!form?.examName || !form.date) return
    setSaving(true)
    try {
      if (editId) await petService.updateExam(petId, editId, form)
      else        await petService.createExam(petId, { ...form, bookingId, partnerName })
      setForm(null); setEditId(null); load()
    } finally { setSaving(false) }
  }

  if (form !== null) return (
    <div className="space-y-3">
      <button onClick={() => setForm(null)} className="text-sm text-(--color-text-muted) hover:underline flex items-center gap-1"><ArrowLeft size={14}/> Voltar</button>
      <h3 className="font-semibold text-(--color-text-heading)">{editId ? 'Editar Exame' : 'Novo Exame'}</h3>
      <Field label="Nome do Exame *"><FInput value={form.examName} onChange={v => setF('examName', v)} placeholder="Ex: Hemograma" /></Field>
      <Field label="Data *"><FInput type="date" value={form.date} onChange={v => setF('date', v)} /></Field>
      <Field label="Laboratório"><FInput value={form.laboratory ?? ''} onChange={v => setF('laboratory', v)} /></Field>
      <Field label="Veterinário"><FInput value={form.veterinarianName ?? ''} onChange={v => setF('veterinarianName', v)} /></Field>
      <Field label="Resultado / Descrição"><FTextarea value={form.resultsSummary ?? ''} onChange={v => setF('resultsSummary', v)} rows={4} /></Field>
      <button onClick={save} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-(--color-secondary-500) text-white text-sm disabled:opacity-50">
        {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Salvar
      </button>
    </div>
  )

  return (
    <div className="space-y-3">
      <button onClick={() => { setForm({ ...EMPTY_EXAM }); setEditId(null) }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-(--color-secondary-500) text-white text-sm hover:opacity-90">
        <Plus size={14}/> Novo Exame
      </button>
      {loading ? <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-(--color-primary-700)"/></div>
      : list.length === 0 ? <p className="text-center text-sm text-(--color-text-muted) py-12">Nenhum exame registrado.</p>
      : (
        <div className="space-y-2">
          {list.map(e => (
            <div key={e.id} className="p-3 rounded-xl bg-(--color-bg) border border-(--color-border) space-y-1">
              <p className="text-sm font-medium text-(--color-text-heading)">{e.examName}</p>
              <p className="text-xs text-(--color-text-muted)">{fmt(e.date)}{e.laboratory ? ` · ${e.laboratory}` : ''}</p>
              {e.resultsSummary && <p className="text-xs text-(--color-text-muted) line-clamp-2">{e.resultsSummary}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setForm({ examName: e.examName, date: e.date, laboratory: e.laboratory ?? '', veterinarianName: e.veterinarianName ?? '', resultsSummary: e.resultsSummary ?? '', fileUrl: e.fileUrl ?? '' }); setEditId(e.id) }}
                        className="text-xs text-(--color-secondary-500) hover:underline flex items-center gap-1"><Edit2 size={11}/> Editar</button>
                <button onClick={async () => { if(confirm('Remover exame?')) { await petService.removeExam(petId, e.id); load() } }}
                        className="text-xs text-red-500 hover:underline flex items-center gap-1"><Trash2 size={11}/> Remover</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── SurgeryPanel ────────────────────────────────────────────────────────── */
const EMPTY_SURG: SurgeryRequest = { description: '', date: '', vetName: '', anesthesiaType: '', postOperativeInstructions: '' }

function SurgeryPanel({ petId, bookingId, partnerName }: { petId: string; bookingId?: string; partnerName?: string }) {
  const [list,    setList]    = useState<SurgeryResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState<SurgeryRequest | null>(null)
  const [editId,  setEditId]  = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)

  const load = useCallback(() => {
    petService.listSurgeries(petId).then(p => setList(Array.isArray(p) ? p : (p.content ?? []))).finally(() => setLoading(false))
  }, [petId])
  useEffect(() => { load() }, [load])

  function setF<K extends keyof SurgeryRequest>(k: K, v: SurgeryRequest[K]) {
    setForm(f => f ? { ...f, [k]: v } : f)
  }
  async function save() {
    if (!form?.description || !form.date) return
    setSaving(true)
    try {
      if (editId) await petService.updateSurgery(petId, editId, form)
      else        await petService.createSurgery(petId, { ...form, bookingId, partnerName })
      setForm(null); setEditId(null); load()
    } finally { setSaving(false) }
  }

  if (form !== null) return (
    <div className="space-y-3">
      <button onClick={() => setForm(null)} className="text-sm text-(--color-text-muted) hover:underline flex items-center gap-1"><ArrowLeft size={14}/> Voltar</button>
      <h3 className="font-semibold text-(--color-text-heading)">{editId ? 'Editar Cirurgia/Procedimento' : 'Nova Cirurgia/Procedimento'}</h3>
      <Field label="Descrição *"><FInput value={form.description} onChange={v => setF('description', v)} placeholder="Ex: Castração" /></Field>
      <Field label="Data *"><FInput type="date" value={form.date} onChange={v => setF('date', v)} /></Field>
      <Field label="Veterinário"><FInput value={form.vetName ?? ''} onChange={v => setF('vetName', v)} /></Field>
      <Field label="Anestesia"><FInput value={form.anesthesiaType ?? ''} onChange={v => setF('anesthesiaType', v)} /></Field>
      <Field label="Cuidados pós-operatórios"><FTextarea value={form.postOperativeInstructions ?? ''} onChange={v => setF('postOperativeInstructions', v)} rows={4} /></Field>
      <button onClick={save} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-(--color-secondary-500) text-white text-sm disabled:opacity-50">
        {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Salvar
      </button>
    </div>
  )

  return (
    <div className="space-y-3">
      <button onClick={() => { setForm({ ...EMPTY_SURG }); setEditId(null) }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-(--color-secondary-500) text-white text-sm hover:opacity-90">
        <Plus size={14}/> Nova Cirurgia / Procedimento
      </button>
      {loading ? <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-(--color-primary-700)"/></div>
      : list.length === 0 ? <p className="text-center text-sm text-(--color-text-muted) py-12">Nenhuma cirurgia registrada.</p>
      : (
        <div className="space-y-2">
          {list.map(s => (
            <div key={s.id} className="p-3 rounded-xl bg-(--color-bg) border border-(--color-border) space-y-1">
              <p className="text-sm font-medium text-(--color-text-heading)">{s.description}</p>
              <p className="text-xs text-(--color-text-muted)">{fmt(s.date)}{s.vetName ? ` · ${s.vetName}` : ''}</p>
              {s.postOperativeInstructions && <p className="text-xs text-(--color-text-muted) line-clamp-2">{s.postOperativeInstructions}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setForm({ description: s.description, date: s.date, vetName: s.vetName ?? '', anesthesiaType: s.anesthesiaType ?? '', postOperativeInstructions: s.postOperativeInstructions ?? '' }); setEditId(s.id) }}
                        className="text-xs text-(--color-secondary-500) hover:underline flex items-center gap-1"><Edit2 size={11}/> Editar</button>
                <button onClick={async () => { if(confirm('Remover cirurgia?')) { await petService.removeSurgery(petId, s.id); load() } }}
                        className="text-xs text-red-500 hover:underline flex items-center gap-1"><Trash2 size={11}/> Remover</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Painel direito — registrar atendimento ──────────────────────────────── */
type RecordPanel = 'weight' | 'appointment' | 'vaccine' | 'exam' | 'surgery' | 'medication' | null

interface RecordPanelProps {
  booking:        BookingResponse
  pet:            PetResponse | null
  partnerName?:   string
  serviceNameMap: Record<string, string>
  onFinish:       () => void
}

function RecordPanel({ booking, pet, partnerName, serviceNameMap, onFinish }: RecordPanelProps) {
  const [panel,   setPanel]   = useState<RecordPanel>(null)
  const [saving,  setSaving]  = useState(false)

  async function handleFinalize() {
    setSaving(true)
    try { await bookingService.updateStatus(booking.id, 'COMPLETED') }
    finally { setSaving(false) }
    onFinish()
  }

  return (
    <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl overflow-hidden flex flex-col h-full">

      {/* Header */}
      <div className="px-5 py-4 border-b border-(--color-border) shrink-0">
        <p className="text-xs font-bold text-(--color-text-muted) uppercase tracking-wider mb-0.5">Registrar Atendimento</p>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-(--color-text-heading)">
            {BOOKING_TYPE_LABEL[booking.type as keyof typeof BOOKING_TYPE_LABEL] ?? booking.type}
          </h3>
          <span className="text-xs text-(--color-text-muted)">{formatTime(booking.bookingDate)}</span>
        </div>
        {pet && (
          <p className="text-xs text-(--color-text-muted) mt-0.5">
            {pet.name} · {pet.breed} · {age(pet.birthDate)}
          </p>
        )}
      </div>

      {/* Section cards */}
      <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
        <SectionCard icon={Scale}        label="Pesagem"                   color="bg-teal-100 text-teal-600"    onClick={() => setPanel('weight')} />
        <SectionCard icon={Stethoscope}  label="Observações da Consulta"   color="bg-blue-100 text-blue-600"    onClick={() => setPanel('appointment')} />
        <SectionCard icon={Syringe}      label="Vacinas"                   color="bg-green-100 text-green-600"  onClick={() => setPanel('vaccine')} />
        <SectionCard icon={FlaskConical} label="Exames"               color="bg-purple-100 text-purple-600" onClick={() => setPanel('exam')} />
        <SectionCard icon={Scissors}     label="Cirurgias / Procedimentos" color="bg-red-100 text-red-600" onClick={() => setPanel('surgery')} />
        <SectionCard icon={Pill}         label="Medicamentos / Prescrições" color="bg-orange-100 text-orange-600" onClick={() => setPanel('medication')} />
      </div>

      {/* Finalizar */}
      <div className="px-5 py-4 border-t border-(--color-border) shrink-0">
        <button onClick={handleFinalize} disabled={saving}
                className="w-full py-3 rounded-xl font-bold text-sm text-white
                           bg-(--color-primary-700) hover:opacity-90 disabled:opacity-50
                           transition-opacity flex items-center justify-center gap-2">
          {saving ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>}
          Finalizar Atendimento
        </button>
      </div>

      {/* SlidePanels */}
      {pet && (
        <>
          <SlidePanel open={panel === 'weight'}      onClose={() => setPanel(null)} title="Pesagem"><WeightPanel      petId={pet.id} bookingId={booking.id} partnerName={partnerName} /></SlidePanel>
          <SlidePanel open={panel === 'appointment'} onClose={() => setPanel(null)} title="Observações da Consulta"><AppointmentPanel petId={pet.id} booking={booking} partnerName={partnerName} serviceNameMap={serviceNameMap} /></SlidePanel>
          <SlidePanel open={panel === 'vaccine'}     onClose={() => setPanel(null)} title="Vacinas"><VaccinePanel     petId={pet.id} bookingId={booking.id} partnerName={partnerName} /></SlidePanel>
          <SlidePanel open={panel === 'exam'}        onClose={() => setPanel(null)} title="Exames"><ExamPanel         petId={pet.id} bookingId={booking.id} partnerName={partnerName} /></SlidePanel>
          <SlidePanel open={panel === 'surgery'}     onClose={() => setPanel(null)} title="Cirurgias / Procedimentos"><SurgeryPanel  petId={pet.id} bookingId={booking.id} partnerName={partnerName} /></SlidePanel>
          <SlidePanel open={panel === 'medication'}  onClose={() => setPanel(null)} title="Medicamentos / Prescrições"><MedicationPanel petId={pet.id} bookingId={booking.id} partnerName={partnerName} /></SlidePanel>
        </>
      )}
    </div>
  )
}

/* ── Página principal ────────────────────────────────────────────────────── */
export default function AtendimentoPage() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()
  const initialId      = searchParams.get('bookingId')

  const [queue,          setQueue]          = useState<BookingResponse[]>([])
  const [petMap,         setPetMap]         = useState<Record<string, PetResponse>>({})
  const [historyMap,     setHistoryMap]     = useState<Record<string, PetHistoryResponse>>({})
  const [selected,       setSelected]       = useState<BookingResponse | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [histLoading,    setHistLoading]    = useState(false)
  const [finished,       setFinished]       = useState<Set<string>>(new Set())
  const [partnerName,    setPartnerName]    = useState<string | undefined>(undefined)
  const [serviceNameMap, setServiceNameMap] = useState<Record<string, string>>({})

  /* carrega fila do dia (CONFIRMED + IN_PROGRESS) */
  useEffect(() => {
    partnerService.getMe().then(async p => {
      setPartnerName(p.name)
      const svcMap: Record<string, string> = {}
      ;(p.services ?? []).forEach(s => { svcMap[s.id] = s.name })
      setServiceNameMap(svcMap)
      const todayStr = today()
      try {
        const [confirmedRes, inProgressRes] = await Promise.all([
          bookingService.getByPartner(p.id, { date: todayStr, status: 'CONFIRMED',   size: 50, sort: 'bookingDate,asc' }),
          bookingService.getByPartner(p.id, { date: todayStr, status: 'IN_PROGRESS', size: 50, sort: 'bookingDate,asc' }),
        ])

        const merged = [...inProgressRes.content, ...confirmedRes.content]
          .sort((a, b) => (a.bookingDate ?? '').localeCompare(b.bookingDate ?? ''))
        setQueue(merged)

        merged.forEach(b => {
          if (b.petId) {
            petService.getById(b.petId)
              .then(pet => setPetMap(prev => ({ ...prev, [pet.id]: pet })))
              .catch(() => {})
          }
        })

        if (initialId) {
          const found = merged.find(b => b.id === initialId)
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
    petService.getHistory(petId)
      .then(h => setHistoryMap(prev => ({ ...prev, [petId]: h })))
      .catch(() => {})
      .finally(() => setHistLoading(false))
  }, [selected, historyMap])

  const handleSelect = useCallback(async (b: BookingResponse) => {
    if (b.status === 'CONFIRMED') {
      try {
        const updated = await bookingService.updateStatus(b.id, 'IN_PROGRESS')
        setQueue(prev => prev.map(q => q.id === updated.id ? updated : q))
        setSelected(updated)
      } catch {
        setSelected(b)
      }
    } else {
      setSelected(b)
    }
    navigate(`/partner/atendimento?bookingId=${b.id}`, { replace: true })
  }, [navigate])

  const handleFinish = useCallback(() => {
    if (!selected) return
    setFinished(prev => new Set([...prev, selected.id]))
    setSelected(null)
  }, [selected])

  const pet     = selected ? petMap[selected.petId]     : null
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
          Fila de hoje — {queue.filter(b => b.status === 'CONFIRMED').length} aguardando
          {queue.some(b => b.status === 'IN_PROGRESS') && (
            <span className="ml-2 text-purple-600 font-medium">
              · {queue.filter(b => b.status === 'IN_PROGRESS').length} em atendimento
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5" style={{ minHeight: '70vh' }}>

        {/* ── Fila ── */}
        <div className="w-full lg:w-72 shrink-0 space-y-2">
          {queue.length === 0 ? (
            <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-6 text-center">
              <p className="text-sm text-(--color-text-muted)">Nenhum atendimento confirmado hoje.</p>
            </div>
          ) : queue.map(b => {
            const p           = petMap[b.petId]
            const isSelected  = selected?.id === b.id
            const isDone      = finished.has(b.id)
            const isInProgress = b.status === 'IN_PROGRESS'
            return (
              <button key={b.id} onClick={() => !isDone && handleSelect(b)}
                disabled={isDone}
                className={[
                  'w-full text-left rounded-2xl border p-4 transition-all',
                  isDone
                    ? 'opacity-50 cursor-default border-(--color-border) bg-(--color-surface)'
                    : isInProgress
                      ? 'border-purple-400 bg-purple-50 shadow-md'
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
                    : isInProgress
                      ? <span className="text-[10px] font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full shrink-0">Em atendimento</span>
                      : <ChevronRight size={14} className="text-(--color-text-muted) shrink-0" />
                  }
                </div>
                <p className="font-bold text-(--color-text-heading) text-sm mt-1.5">{p?.name ?? '…'}</p>
                <p className="text-xs text-(--color-text-muted) leading-tight">
                  {p?.breed ?? ''}{p?.breed && p?.species ? ' · ' : ''}{p?.species ? SPECIES_LABEL[p.species] : ''}
                </p>
                {p?.birthDate && (
                  <p className="text-xs text-(--color-text-muted)">{age(p.birthDate)}</p>
                )}
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

            {/* Prontuário do pet */}
            <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-(--color-border) shrink-0">
                <p className="text-xs font-bold text-(--color-text-muted) uppercase tracking-wider mb-0.5">Prontuário</p>
                <h3 className="text-lg font-bold text-(--color-text-heading)">{pet?.name ?? '…'}</h3>
                {pet && (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-xs text-(--color-text-muted)">
                      {pet.breed} · {SPECIES_LABEL[pet.species]} · {GENDER_LABEL[pet.gender]}
                    </p>
                    <p className="text-xs text-(--color-text-muted)">
                      Nascimento: {fmt(pet.birthDate)} · <span className="font-medium text-(--color-text-body)">{age(pet.birthDate)}</span>
                    </p>
                    <p className="text-xs text-(--color-text-muted)">
                      Peso cadastrado: <span className="font-medium text-(--color-text-body)">{pet.weight} kg</span>
                    </p>
                    {pet.microchipNumber && (
                      <p className="text-xs text-(--color-text-muted)">Microchip: {pet.microchipNumber}</p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-5">
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

            {/* Registro de atendimento */}
            <RecordPanel booking={selected} pet={pet} partnerName={partnerName} serviceNameMap={serviceNameMap} onFinish={handleFinish} />
          </div>
        )}
      </div>
    </div>
  )
}
