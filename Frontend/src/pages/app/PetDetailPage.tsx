import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, PawPrint, Loader2, Plus, X, Edit2, Trash2, Save,
  Stethoscope, Syringe, Pill, Scale, FlaskConical, Scissors,
  ChevronRight, Weight,
} from 'lucide-react'
import {
  petService,
  type PetResponse,
  type AppointmentResponse, type AppointmentRequest,
  type VaccineResponse,     type VaccineRequest,
  type MedicationResponse,  type MedicationRequest,
  type ExamResponse,        type ExamRequest,
  type WeightResponse,      type WeightRequest,
  type SurgeryResponse,     type SurgeryRequest,
  SPECIES_LABEL, GENDER_LABEL,
  APPOINTMENT_STATUS_LABEL, type AppointmentStatus,
  VACCINE_STATUS_LABEL,     type VaccineStatus,
  type HistorySource,
} from '../../services/pet.service'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt(date: string) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR')
}

function age(birthDate: string) {
  if (!birthDate) return ''
  const diff = Date.now() - new Date(birthDate).getTime()
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
  if (years < 1) {
    const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44))
    return `${months} ${months === 1 ? 'mês' : 'meses'}`
  }
  return `${years} ${years === 1 ? 'ano' : 'anos'}`
}

// ── Source Badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source, partnerName }: { source?: HistorySource; partnerName?: string }) {
  if (source !== 'PLATFORM') return null
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium shrink-0">
      {partnerName ?? 'Clínica'}
    </span>
  )
}

// ── Slide Panel ──────────────────────────────────────────────────────────────

function SlidePanel({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode
}) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-30" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-(--color-surface) z-40
                       flex flex-col transition-transform duration-300
                       ${open ? 'translate-x-0 shadow-2xl' : 'translate-x-full invisible shadow-none'}`}>
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

// ── Weight Chart ─────────────────────────────────────────────────────────────

function WeightChart({ weights }: { weights: WeightResponse[] }) {
  if (weights.length < 2) return null
  const data = [...weights].sort((a, b) => a.date.localeCompare(b.date))
    .map(w => ({ date: fmt(w.date), peso: w.weight }))
  return (
    <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-(--color-text-heading) mb-3">Evolução do Peso</h3>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data}>
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} unit="kg" width={40} />
          <Tooltip formatter={(v) => [`${v} kg`, 'Peso']} />
          <Line type="monotone" dataKey="peso" stroke="var(--color-secondary-500)" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, label, count, color, onClick }: {
  icon: React.ElementType; label: string; count: number; color: string; onClick: () => void
}) {
  return (
    <button onClick={onClick}
            className="flex items-center gap-3 p-4 bg-(--color-surface) border border-(--color-border)
                       rounded-2xl hover:shadow-md transition-shadow text-left w-full">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-(--color-text-heading)">{label}</p>
        <p className="text-xs text-(--color-text-muted)">{count} registro{count !== 1 ? 's' : ''}</p>
      </div>
      <ChevronRight size={16} className="text-(--color-text-muted)" />
    </button>
  )
}

// ── Field helper ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
           className="w-full px-3 py-2 text-sm rounded-xl border border-(--color-border)
                      bg-(--color-bg) text-(--color-text-body) outline-none
                      focus:ring-2 focus:ring-(--color-primary-500)" />
  )
}

function Select({ value, onChange, options }: {
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

function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
              className="w-full px-3 py-2 text-sm rounded-xl border border-(--color-border)
                         bg-(--color-bg) text-(--color-text-body) outline-none resize-none
                         focus:ring-2 focus:ring-(--color-primary-500)" />
  )
}

// ── Appointment Panel ────────────────────────────────────────────────────────

const APPT_STATUS_OPTIONS = Object.entries(APPOINTMENT_STATUS_LABEL).map(([v, l]) => ({ value: v, label: l }))
const EMPTY_APPT: AppointmentRequest = { date: '', reason: '', status: 'SCHEDULED', clinicalNotes: '', vetName: '', weightAtTime: undefined }

function AppointmentPanel({ petId }: { petId: string }) {
  const [list,    setList]    = useState<AppointmentResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState<AppointmentRequest | null>(null)
  const [editId,  setEditId]  = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)

  const load = useCallback(() => {
    petService.listAppointments(petId).then(p => setList(Array.isArray(p) ? p : (p.content ?? []))).finally(() => setLoading(false))
  }, [petId])

  useEffect(() => { load() }, [load])

  function startNew()  { setForm({ ...EMPTY_APPT }); setEditId(null) }
  function startEdit(a: AppointmentResponse) {
    setForm({ date: a.date, reason: a.reason, status: a.status, clinicalNotes: a.clinicalNotes ?? '', vetName: a.vetName ?? '', weightAtTime: a.weightAtTime })
    setEditId(a.id)
  }
  function setF<K extends keyof AppointmentRequest>(k: K, v: AppointmentRequest[K]) {
    setForm(f => f ? { ...f, [k]: v } : f)
  }

  async function save() {
    if (!form?.date || !form.reason) return
    setSaving(true)
    try {
      if (editId) await petService.updateAppointment(petId, editId, form)
      else        await petService.createAppointment(petId, form)
      setForm(null); setEditId(null); load()
    } finally { setSaving(false) }
  }

  async function remove(id: string) {
    if (!confirm('Remover consulta?')) return
    await petService.removeAppointment(petId, id); load()
  }

  if (form !== null) return (
    <div className="space-y-3">
      <button onClick={() => setForm(null)} className="text-sm text-(--color-text-muted) hover:underline flex items-center gap-1">
        <ArrowLeft size={14} /> Voltar
      </button>
      <h3 className="font-semibold text-(--color-text-heading)">{editId ? 'Editar Consulta' : 'Nova Consulta'}</h3>
      <Field label="Data e Hora *"><Input type="datetime-local" value={form.date} onChange={v => setF('date', v)} /></Field>
      <Field label="Motivo *"><Input value={form.reason} onChange={v => setF('reason', v)} placeholder="Ex: Consulta de rotina" /></Field>
      <Field label="Veterinário"><Input value={form.vetName ?? ''} onChange={v => setF('vetName', v)} placeholder="Nome do veterinário" /></Field>
      <Field label="Status">
        <Select value={form.status} onChange={v => setF('status', v as AppointmentStatus)} options={APPT_STATUS_OPTIONS} />
      </Field>
      <Field label="Peso no momento (kg)">
        <Input type="number" value={form.weightAtTime ?? ''} onChange={v => setF('weightAtTime', v ? parseFloat(v) : undefined)} placeholder="0.0" />
      </Field>
      <Field label="Observações clínicas">
        <Textarea value={form.clinicalNotes ?? ''} onChange={v => setF('clinicalNotes', v)} rows={4} />
      </Field>
      <button onClick={save} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                         bg-(--color-secondary-500) text-white text-sm hover:bg-(--color-secondary-600) disabled:opacity-50">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
      </button>
    </div>
  )

  return (
    <div className="space-y-3">
      <button onClick={startNew}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                         bg-(--color-secondary-500) text-white text-sm hover:bg-(--color-secondary-600)">
        <Plus size={14} /> Nova Consulta
      </button>
      {loading ? <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-(--color-primary-700)" /></div>
      : list.length === 0 ? <p className="text-center text-sm text-(--color-text-muted) py-12">Nenhuma consulta registrada.</p>
      : (
        <div className="space-y-2">
          {list.map(a => (
            <div key={a.id} className="p-3 rounded-xl bg-(--color-bg) border border-(--color-border) space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-(--color-text-heading)">{a.reason}</p>
                  <p className="text-xs text-(--color-text-muted)">{fmt(a.date)}{a.vetName ? ` · ${a.vetName}` : ''}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <SourceBadge source={a.source} partnerName={a.partnerName} />
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium
                    ${a.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      a.status === 'CANCELLED' ? 'bg-red-100 text-red-600' :
                      'bg-blue-100 text-blue-700'}`}>
                    {APPOINTMENT_STATUS_LABEL[a.status]}
                  </span>
                </div>
              </div>
              {a.clinicalNotes && <p className="text-xs text-(--color-text-muted) line-clamp-2">{a.clinicalNotes}</p>}
              {a.source !== 'PLATFORM' && (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => startEdit(a)} className="text-xs text-(--color-secondary-500) hover:underline flex items-center gap-1">
                    <Edit2 size={11} /> Editar
                  </button>
                  <button onClick={() => remove(a.id)} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                    <Trash2 size={11} /> Remover
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Vaccine Panel ─────────────────────────────────────────────────────────────

const VACCINE_STATUS_OPTIONS = Object.entries(VACCINE_STATUS_LABEL).map(([v, l]) => ({ value: v, label: l }))
const EMPTY_VAC: VaccineRequest = { name: '', applicationDate: '', nextDoseDate: '', status: 'UPDATED', vetName: '', manufacturer: '', lot: '' }

function VaccinePanel({ petId }: { petId: string }) {
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
      else        await petService.createVaccine(petId, form)
      setForm(null); setEditId(null); load()
    } finally { setSaving(false) }
  }

  async function remove(id: string) {
    if (!confirm('Remover vacina?')) return
    await petService.removeVaccine(petId, id); load()
  }

  if (form !== null) return (
    <div className="space-y-3">
      <button onClick={() => setForm(null)} className="text-sm text-(--color-text-muted) hover:underline flex items-center gap-1"><ArrowLeft size={14} /> Voltar</button>
      <h3 className="font-semibold text-(--color-text-heading)">{editId ? 'Editar Vacina' : 'Nova Vacina'}</h3>
      <Field label="Nome da Vacina *"><Input value={form.name} onChange={v => setF('name', v)} placeholder="Ex: V10" /></Field>
      <Field label="Data de Aplicação *"><Input type="date" value={form.applicationDate} onChange={v => setF('applicationDate', v)} /></Field>
      <Field label="Próxima Dose"><Input type="date" value={form.nextDoseDate} onChange={v => setF('nextDoseDate', v)} /></Field>
      <Field label="Status"><Select value={form.status} onChange={v => setF('status', v as VaccineStatus)} options={VACCINE_STATUS_OPTIONS} /></Field>
      <Field label="Veterinário"><Input value={form.vetName ?? ''} onChange={v => setF('vetName', v)} /></Field>
      <Field label="Fabricante"><Input value={form.manufacturer ?? ''} onChange={v => setF('manufacturer', v)} /></Field>
      <Field label="Lote"><Input value={form.lot ?? ''} onChange={v => setF('lot', v)} /></Field>
      <button onClick={save} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                         bg-(--color-secondary-500) text-white text-sm hover:bg-(--color-secondary-600) disabled:opacity-50">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
      </button>
    </div>
  )

  return (
    <div className="space-y-3">
      <button onClick={() => { setForm({ ...EMPTY_VAC }); setEditId(null) }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                         bg-(--color-secondary-500) text-white text-sm hover:bg-(--color-secondary-600)">
        <Plus size={14} /> Nova Vacina
      </button>
      {loading ? <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-(--color-primary-700)" /></div>
      : list.length === 0 ? <p className="text-center text-sm text-(--color-text-muted) py-12">Nenhuma vacina registrada.</p>
      : (
        <div className="space-y-2">
          {list.map(v => (
            <div key={v.id} className="p-3 rounded-xl bg-(--color-bg) border border-(--color-border) space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-(--color-text-heading)">{v.name}</p>
                  <p className="text-xs text-(--color-text-muted)">
                    Aplicada: {fmt(v.applicationDate)}
                    {v.nextDoseDate ? ` · Próxima: ${fmt(v.nextDoseDate)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <SourceBadge source={v.source} partnerName={v.partnerName} />
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium
                    ${v.status === 'UPDATED'  ? 'bg-green-100 text-green-700' :
                      v.status === 'DUE_SOON' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-600'}`}>
                    {VACCINE_STATUS_LABEL[v.status]}
                  </span>
                </div>
              </div>
              {v.source !== 'PLATFORM' && (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => { setForm({ name: v.name, applicationDate: v.applicationDate, nextDoseDate: v.nextDoseDate, status: v.status, vetName: v.vetName ?? '', manufacturer: v.manufacturer ?? '', lot: v.lot ?? '' }); setEditId(v.id) }}
                          className="text-xs text-(--color-secondary-500) hover:underline flex items-center gap-1"><Edit2 size={11} /> Editar</button>
                  <button onClick={() => remove(v.id)} className="text-xs text-red-500 hover:underline flex items-center gap-1"><Trash2 size={11} /> Remover</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Medication Panel ──────────────────────────────────────────────────────────

const EMPTY_MED: MedicationRequest = { name: '', dosage: '', frequency: '', startDate: '', endDate: '', active: true, observations: '' }

function MedicationPanel({ petId }: { petId: string }) {
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
      else        await petService.createMedication(petId, form)
      setForm(null); setEditId(null); load()
    } finally { setSaving(false) }
  }

  async function remove(id: string) {
    if (!confirm('Remover medicamento?')) return
    await petService.removeMedication(petId, id); load()
  }

  if (form !== null) return (
    <div className="space-y-3">
      <button onClick={() => setForm(null)} className="text-sm text-(--color-text-muted) hover:underline flex items-center gap-1"><ArrowLeft size={14} /> Voltar</button>
      <h3 className="font-semibold text-(--color-text-heading)">{editId ? 'Editar Medicamento' : 'Novo Medicamento'}</h3>
      <Field label="Nome *"><Input value={form.name} onChange={v => setF('name', v)} placeholder="Ex: Amoxicilina" /></Field>
      <Field label="Dosagem"><Input value={form.dosage ?? ''} onChange={v => setF('dosage', v)} placeholder="Ex: 250mg" /></Field>
      <Field label="Frequência"><Input value={form.frequency ?? ''} onChange={v => setF('frequency', v)} placeholder="Ex: a cada 8 horas" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Início *"><Input type="date" value={form.startDate} onChange={v => setF('startDate', v)} /></Field>
        <Field label="Término"><Input type="date" value={form.endDate ?? ''} onChange={v => setF('endDate', v)} /></Field>
      </div>
      <Field label="Observações"><Textarea value={form.observations ?? ''} onChange={v => setF('observations', v)} rows={3} /></Field>
      <label className="flex items-center gap-2 text-sm text-(--color-text-body) cursor-pointer">
        <input type="checkbox" checked={form.active ?? true} onChange={e => setF('active', e.target.checked)} className="rounded" />
        Em uso atualmente
      </label>
      <button onClick={save} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                         bg-(--color-secondary-500) text-white text-sm hover:bg-(--color-secondary-600) disabled:opacity-50">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
      </button>
    </div>
  )

  return (
    <div className="space-y-3">
      <button onClick={() => { setForm({ ...EMPTY_MED }); setEditId(null) }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                         bg-(--color-secondary-500) text-white text-sm hover:bg-(--color-secondary-600)">
        <Plus size={14} /> Novo Medicamento
      </button>
      {loading ? <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-(--color-primary-700)" /></div>
      : list.length === 0 ? <p className="text-center text-sm text-(--color-text-muted) py-12">Nenhum medicamento registrado.</p>
      : (
        <div className="space-y-2">
          {list.map(m => (
            <div key={m.id} className={`p-3 rounded-xl border ${m.active ? 'bg-orange-50 border-orange-200' : 'bg-(--color-bg) border-(--color-border)'} space-y-1`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-(--color-text-heading)">{m.name}</p>
                  {m.dosage && <p className="text-xs text-(--color-text-muted)">{m.dosage}{m.frequency ? ` · ${m.frequency}` : ''}</p>}
                  <p className="text-xs text-(--color-text-muted)">Início: {fmt(m.startDate)}{m.endDate ? ` · Fim: ${fmt(m.endDate)}` : ''}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <SourceBadge source={m.source} partnerName={m.partnerName} />
                  {m.active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">Em uso</span>}
                </div>
              </div>
              {m.source !== 'PLATFORM' && (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => { setForm({ name: m.name, dosage: m.dosage ?? '', frequency: m.frequency ?? '', startDate: m.startDate, endDate: m.endDate ?? '', active: m.active ?? true, observations: m.observations ?? '' }); setEditId(m.id) }}
                          className="text-xs text-(--color-secondary-500) hover:underline flex items-center gap-1"><Edit2 size={11} /> Editar</button>
                  <button onClick={() => remove(m.id)} className="text-xs text-red-500 hover:underline flex items-center gap-1"><Trash2 size={11} /> Remover</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Exam Panel ────────────────────────────────────────────────────────────────

const EMPTY_EXAM: ExamRequest = { examName: '', date: '', laboratory: '', veterinarianName: '', resultsSummary: '', fileUrl: '' }

function ExamPanel({ petId }: { petId: string }) {
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
      else        await petService.createExam(petId, form)
      setForm(null); setEditId(null); load()
    } finally { setSaving(false) }
  }

  async function remove(id: string) {
    if (!confirm('Remover exame?')) return
    await petService.removeExam(petId, id); load()
  }

  if (form !== null) return (
    <div className="space-y-3">
      <button onClick={() => setForm(null)} className="text-sm text-(--color-text-muted) hover:underline flex items-center gap-1"><ArrowLeft size={14} /> Voltar</button>
      <h3 className="font-semibold text-(--color-text-heading)">{editId ? 'Editar Exame' : 'Novo Exame'}</h3>
      <Field label="Nome do Exame *"><Input value={form.examName} onChange={v => setF('examName', v)} placeholder="Ex: Hemograma" /></Field>
      <Field label="Data *"><Input type="date" value={form.date} onChange={v => setF('date', v)} /></Field>
      <Field label="Laboratório"><Input value={form.laboratory ?? ''} onChange={v => setF('laboratory', v)} /></Field>
      <Field label="Veterinário"><Input value={form.veterinarianName ?? ''} onChange={v => setF('veterinarianName', v)} /></Field>
      <Field label="Resultado"><Textarea value={form.resultsSummary ?? ''} onChange={v => setF('resultsSummary', v)} rows={4} /></Field>
      <button onClick={save} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                         bg-(--color-secondary-500) text-white text-sm hover:bg-(--color-secondary-600) disabled:opacity-50">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
      </button>
    </div>
  )

  return (
    <div className="space-y-3">
      <button onClick={() => { setForm({ ...EMPTY_EXAM }); setEditId(null) }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                         bg-(--color-secondary-500) text-white text-sm hover:bg-(--color-secondary-600)">
        <Plus size={14} /> Novo Exame
      </button>
      {loading ? <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-(--color-primary-700)" /></div>
      : list.length === 0 ? <p className="text-center text-sm text-(--color-text-muted) py-12">Nenhum exame registrado.</p>
      : (
        <div className="space-y-2">
          {list.map(e => (
            <div key={e.id} className="p-3 rounded-xl bg-(--color-bg) border border-(--color-border) space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-(--color-text-heading)">{e.examName}</p>
                  <p className="text-xs text-(--color-text-muted)">{fmt(e.date)}{e.laboratory ? ` · ${e.laboratory}` : ''}</p>
                </div>
                <SourceBadge source={e.source} partnerName={e.partnerName} />
              </div>
              {e.resultsSummary && <p className="text-xs text-(--color-text-muted) line-clamp-2">{e.resultsSummary}</p>}
              {e.source !== 'PLATFORM' && (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => { setForm({ examName: e.examName, date: e.date, laboratory: e.laboratory ?? '', veterinarianName: e.veterinarianName ?? '', resultsSummary: e.resultsSummary ?? '', fileUrl: e.fileUrl ?? '' }); setEditId(e.id) }}
                          className="text-xs text-(--color-secondary-500) hover:underline flex items-center gap-1"><Edit2 size={11} /> Editar</button>
                  <button onClick={() => remove(e.id)} className="text-xs text-red-500 hover:underline flex items-center gap-1"><Trash2 size={11} /> Remover</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Weight Panel ──────────────────────────────────────────────────────────────

const EMPTY_WEIGHT: WeightRequest = { weight: 0, date: '' }

function WeightPanel({ petId }: { petId: string }) {
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
    try { await petService.createWeight(petId, form); setForm(null); load() }
    finally { setSaving(false) }
  }

  async function remove(id: string) {
    if (!confirm('Remover registro de peso?')) return
    await petService.removeWeight(petId, id); load()
  }

  return (
    <div className="space-y-3">
      {form === null ? (
        <button onClick={() => setForm({ ...EMPTY_WEIGHT })}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                           bg-(--color-secondary-500) text-white text-sm hover:bg-(--color-secondary-600)">
          <Plus size={14} /> Registrar Peso
        </button>
      ) : (
        <div className="p-4 bg-(--color-bg) border border-(--color-border) rounded-xl space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Peso (kg) *">
              <Input type="number" value={form.weight || ''} onChange={v => setForm(f => f ? { ...f, weight: parseFloat(v) || 0 } : f)} placeholder="0.0" />
            </Field>
            <Field label="Data *">
              <Input type="date" value={form.date} onChange={v => setForm(f => f ? { ...f, date: v } : f)} />
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
                <SourceBadge source={w.source} partnerName={w.partnerName} />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-(--color-text-muted)">{fmt(w.date)}</span>
                {w.source !== 'PLATFORM' && (
                  <button onClick={() => remove(w.id)} className="text-red-400 hover:text-red-500"><Trash2 size={13} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Surgery Panel ─────────────────────────────────────────────────────────────

const EMPTY_SURG: SurgeryRequest = { description: '', date: '', vetName: '', anesthesiaType: '', postOperativeInstructions: '' }

function SurgeryPanel({ petId }: { petId: string }) {
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
      else        await petService.createSurgery(petId, form)
      setForm(null); setEditId(null); load()
    } finally { setSaving(false) }
  }

  async function remove(id: string) {
    if (!confirm('Remover cirurgia?')) return
    await petService.removeSurgery(petId, id); load()
  }

  if (form !== null) return (
    <div className="space-y-3">
      <button onClick={() => setForm(null)} className="text-sm text-(--color-text-muted) hover:underline flex items-center gap-1"><ArrowLeft size={14} /> Voltar</button>
      <h3 className="font-semibold text-(--color-text-heading)">{editId ? 'Editar Cirurgia' : 'Nova Cirurgia'}</h3>
      <Field label="Descrição *"><Input value={form.description} onChange={v => setF('description', v)} placeholder="Ex: Castração" /></Field>
      <Field label="Data *"><Input type="date" value={form.date} onChange={v => setF('date', v)} /></Field>
      <Field label="Veterinário"><Input value={form.vetName ?? ''} onChange={v => setF('vetName', v)} /></Field>
      <Field label="Anestesia"><Input value={form.anesthesiaType ?? ''} onChange={v => setF('anesthesiaType', v)} /></Field>
      <Field label="Cuidados pós-operatórios"><Textarea value={form.postOperativeInstructions ?? ''} onChange={v => setF('postOperativeInstructions', v)} rows={4} /></Field>
      <button onClick={save} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                         bg-(--color-secondary-500) text-white text-sm hover:bg-(--color-secondary-600) disabled:opacity-50">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
      </button>
    </div>
  )

  return (
    <div className="space-y-3">
      <button onClick={() => { setForm({ ...EMPTY_SURG }); setEditId(null) }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                         bg-(--color-secondary-500) text-white text-sm hover:bg-(--color-secondary-600)">
        <Plus size={14} /> Nova Cirurgia
      </button>
      {loading ? <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-(--color-primary-700)" /></div>
      : list.length === 0 ? <p className="text-center text-sm text-(--color-text-muted) py-12">Nenhuma cirurgia registrada.</p>
      : (
        <div className="space-y-2">
          {list.map(s => (
            <div key={s.id} className="p-3 rounded-xl bg-(--color-bg) border border-(--color-border) space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-(--color-text-heading)">{s.description}</p>
                  <p className="text-xs text-(--color-text-muted)">{fmt(s.date)}{s.vetName ? ` · ${s.vetName}` : ''}</p>
                </div>
                <SourceBadge source={s.source} partnerName={s.partnerName} />
              </div>
              {s.postOperativeInstructions && <p className="text-xs text-(--color-text-muted) line-clamp-2">{s.postOperativeInstructions}</p>}
              {s.source !== 'PLATFORM' && (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => { setForm({ description: s.description, date: s.date, vetName: s.vetName ?? '', anesthesiaType: s.anesthesiaType ?? '', postOperativeInstructions: s.postOperativeInstructions ?? '' }); setEditId(s.id) }}
                          className="text-xs text-(--color-secondary-500) hover:underline flex items-center gap-1"><Edit2 size={11} /> Editar</button>
                  <button onClick={() => remove(s.id)} className="text-xs text-red-500 hover:underline flex items-center gap-1"><Trash2 size={11} /> Remover</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Panel = 'appointments' | 'vaccines' | 'medications' | 'exams' | 'weights' | 'surgeries' | null

export default function PetDetailPage() {
  const { id }       = useParams<{ id: string }>()
  const navigate     = useNavigate()
  const [pet,        setPet]        = useState<PetResponse | null>(null)
  const [weights,    setWeights]    = useState<WeightResponse[]>([])
  const [counts,     setCounts]     = useState({ appointments: 0, vaccines: 0, medications: 0, exams: 0, weights: 0, surgeries: 0 })
  const [loading,    setLoading]    = useState(true)
  const [panel,      setPanel]      = useState<Panel>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      petService.getById(id),
      petService.listWeights(id).catch(() => ({ content: [] })),
      petService.listAppointments(id).catch(() => ({ totalElements: 0 })),
      petService.listVaccines(id).catch(() => ({ totalElements: 0 })),
      petService.listMedications(id).catch(() => ({ totalElements: 0 })),
      petService.listExams(id).catch(() => ({ totalElements: 0 })),
      petService.listSurgeries(id).catch(() => ({ totalElements: 0 })),
    ]).then(([p, w, appts, vacs, meds, exams, surgs]) => {
      setPet(p)
      const toArr   = (r: any): any[] => Array.isArray(r) ? r : (r?.content ?? [])
      const toCount = (r: any): number => Array.isArray(r) ? r.length : (r?.totalElements ?? r?.content?.length ?? 0)
      setWeights(toArr(w))
      setCounts({
        appointments: toCount(appts),
        vaccines:     toCount(vacs),
        medications:  toCount(meds),
        exams:        toCount(exams),
        weights:      toCount(w),
        surgeries:    toCount(surgs),
      })
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex justify-center py-32">
      <Loader2 size={32} className="animate-spin text-(--color-primary-700)" />
    </div>
  )
  if (!pet) return <div className="text-center py-32 text-(--color-text-muted)">Pet não encontrado.</div>

  return (
    <div className="space-y-5">

      {/* Back */}
      <button onClick={() => navigate('/app/pets')}
              className="flex items-center gap-1.5 text-sm text-(--color-text-muted) hover:text-(--color-text-heading) transition-colors">
        <ArrowLeft size={16} /> Meus Pets
      </button>

      {/* Layout: sidebar (pet card) + conteúdo principal */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 lg:items-start">

        {/* Sidebar — card do pet sticky */}
        <div className="lg:sticky lg:top-6 space-y-4">

          {/* Card principal do pet */}
          <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-5 flex flex-col items-center gap-4 text-center">
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-(--color-secondary-400)
                            bg-(--color-bg) flex items-center justify-center">
              {pet.pictureUrl
                ? <img src={pet.pictureUrl} alt={pet.name} className="w-full h-full object-cover" />
                : <PawPrint size={36} className="text-(--color-text-muted) opacity-40" />
              }
            </div>

            <div>
              <h1 className="text-2xl font-bold text-(--color-secondary-500)">{pet.name}</h1>
              <p className="text-sm text-(--color-text-muted) mt-0.5">{pet.breed} · {SPECIES_LABEL[pet.species]}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full">
              {[
                { label: 'Gênero',     value: GENDER_LABEL[pet.gender] },
                { label: 'Peso',       value: `${pet.weight} kg` },
                { label: 'Nascimento', value: fmt(pet.birthDate) },
                { label: 'Idade',      value: age(pet.birthDate) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-(--color-bg) rounded-xl p-2.5">
                  <p className="text-[10px] text-(--color-text-muted) uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-semibold text-(--color-text-heading) mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {pet.microchipNumber && (
              <p className="text-xs text-(--color-text-muted)">Microchip: {pet.microchipNumber}</p>
            )}

            <button onClick={() => navigate(`/app/pets/${id}/editar`)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-xl
                               border border-(--color-border) text-(--color-text-body)
                               hover:bg-(--color-bg) transition-colors">
              <Edit2 size={13} /> Editar pet
            </button>
          </div>

          {/* Gráfico de peso — só aparece na sidebar em desktop */}
          <div className="hidden lg:block">
            <WeightChart weights={weights} />
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="space-y-5">

          {/* Gráfico de peso — aparece aqui em mobile */}
          <div className="lg:hidden">
            <WeightChart weights={weights} />
          </div>

          {/* Seções de saúde */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-(--color-text-heading)">Prontuário</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              <SectionCard icon={Stethoscope}  label="Consultas"    count={counts.appointments} color="bg-blue-100 text-blue-600"     onClick={() => setPanel('appointments')} />
              <SectionCard icon={Syringe}      label="Vacinas"      count={counts.vaccines}     color="bg-green-100 text-green-600"   onClick={() => setPanel('vaccines')} />
              <SectionCard icon={Pill}         label="Medicamentos" count={counts.medications}  color="bg-orange-100 text-orange-600" onClick={() => setPanel('medications')} />
              <SectionCard icon={FlaskConical} label="Exames"       count={counts.exams}        color="bg-purple-100 text-purple-600" onClick={() => setPanel('exams')} />
              <SectionCard icon={Scale}        label="Pesagens"     count={counts.weights}      color="bg-teal-100 text-teal-600"     onClick={() => setPanel('weights')} />
              <SectionCard icon={Scissors}     label="Cirurgias"    count={counts.surgeries}    color="bg-red-100 text-red-600"       onClick={() => setPanel('surgeries')} />
            </div>
          </div>
        </div>
      </div>

      {/* Painéis deslizantes */}
      {id && (
        <>
          <SlidePanel open={panel === 'appointments'} onClose={() => setPanel(null)} title="Consultas">
            <AppointmentPanel petId={id} />
          </SlidePanel>
          <SlidePanel open={panel === 'vaccines'}     onClose={() => setPanel(null)} title="Vacinas">
            <VaccinePanel petId={id} />
          </SlidePanel>
          <SlidePanel open={panel === 'medications'}  onClose={() => setPanel(null)} title="Medicamentos">
            <MedicationPanel petId={id} />
          </SlidePanel>
          <SlidePanel open={panel === 'exams'}        onClose={() => setPanel(null)} title="Exames">
            <ExamPanel petId={id} />
          </SlidePanel>
          <SlidePanel open={panel === 'weights'}      onClose={() => setPanel(null)} title="Pesagens">
            <WeightPanel petId={id} />
          </SlidePanel>
          <SlidePanel open={panel === 'surgeries'}    onClose={() => setPanel(null)} title="Cirurgias">
            <SurgeryPanel petId={id} />
          </SlidePanel>
        </>
      )}
    </div>
  )
}
