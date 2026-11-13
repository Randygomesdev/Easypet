import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Camera, Loader2, Save, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react'
import TimePicker from '../../components/ui/TimePicker'
import { partnerService, type ServiceOffer } from '../../services/partner.service'
import { formatPhone } from './CadastroPage'
import {
  staffService,
  type StaffResponse,
  type StaffScheduleResponse,
  type StaffAbsenceResponse,
  type StaffScheduleRequest,
} from '../../services/staff.service'

/* ════════════════════════════════════════
   Helpers
════════════════════════════════════════ */
type AbsenceStatus = 'Em Andamento' | 'Agendado' | 'Concluído'

function absenceStatus(a: StaffAbsenceResponse): AbsenceStatus {
  const now   = new Date()
  const start = new Date(a.startDate)
  const end   = new Date(a.endDate)
  if (now > end)   return 'Concluído'
  if (now >= start) return 'Em Andamento'
  return 'Agendado'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

/* ════════════════════════════════════════
   Escala — conversão API ↔ UI
════════════════════════════════════════ */
const SCHEDULE_CONFIG = [
  { dayOfWeek: 2, letra: 'S', nome: 'Segunda Feira' },
  { dayOfWeek: 3, letra: 'T', nome: 'Terça Feira'   },
  { dayOfWeek: 4, letra: 'Q', nome: 'Quarta Feira'  },
  { dayOfWeek: 5, letra: 'Q', nome: 'Quinta Feira'  },
  { dayOfWeek: 6, letra: 'S', nome: 'Sexta Feira'   },
  { dayOfWeek: 7, letra: 'S', nome: 'Sábado'        },
  { dayOfWeek: 1, letra: 'D', nome: 'Domingo'       },
]

type DiaEscala = {
  dayOfWeek:       number
  letra:           string
  nome:            string
  trabalhando:     boolean
  inicio:          string
  fim:             string
  intervalo:       boolean
  intervaloInicio: string
  intervaloFim:    string
}

function fromScheduleApi(schedules: StaffScheduleResponse[]): DiaEscala[] {
  return SCHEDULE_CONFIG.map(cfg => {
    const s = schedules.find(x => x.dayOfWeek === cfg.dayOfWeek)
    if (!s) return { ...cfg, trabalhando: false, inicio: '', fim: '', intervalo: false, intervaloInicio: '', intervaloFim: '' }
    return {
      ...cfg,
      trabalhando:     true,
      inicio:          s.startTime.slice(0, 5),
      fim:             s.endTime.slice(0, 5),
      intervalo:       !!(s.lunchStartTime && s.lunchEndTime),
      intervaloInicio: s.lunchStartTime ? s.lunchStartTime.slice(0, 5) : '',
      intervaloFim:    s.lunchEndTime   ? s.lunchEndTime.slice(0, 5)   : '',
    }
  })
}

function toScheduleApi(dias: DiaEscala[]): StaffScheduleRequest[] {
  return dias
    .filter(d => d.trabalhando && d.inicio && d.fim)
    .map(d => ({
      dayOfWeek:      d.dayOfWeek,
      startTime:      d.inicio + ':00',
      endTime:        d.fim    + ':00',
      lunchStartTime: d.intervalo && d.intervaloInicio ? d.intervaloInicio + ':00' : undefined,
      lunchEndTime:   d.intervalo && d.intervaloFim    ? d.intervaloFim    + ':00' : undefined,
    }))
}

const DEFAULT_ESCALA: DiaEscala[] = SCHEDULE_CONFIG.map(c => ({
  ...c, trabalhando: false, inicio: '', fim: '', intervalo: false, intervaloInicio: '', intervaloFim: '',
}))

/* ════════════════════════════════════════
   Página principal
════════════════════════════════════════ */
type Tab = 'dados' | 'escala' | 'afastamentos'

type Props = { adminPartnerId?: string }

export default function ColaboradorPage({ adminPartnerId }: Props = {}) {
  const { staffId } = useParams<{ staffId: string }>()
  const navigate    = useNavigate()
  const isNew       = !staffId

  const [partnerId, setPartnerId]     = useState<string | null>(null)
  const [staff, setStaff]             = useState<StaffResponse | null>(null)
  const [activeTab, setActiveTab]     = useState<Tab>('dados')
  const [loading, setLoading]         = useState(true)
  const [availableServices, setAvailableServices] = useState<ServiceOffer[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])

  // Dados form
  const [name, setName]             = useState('')
  const [photoUrl, setPhotoUrl]     = useState('')
  const [jobTitle, setJobTitle]     = useState('')
  const [speciality, setSpeciality] = useState('')
  const [phone, setPhone]           = useState('')
  const [email, setEmail]           = useState('')
  const [whatsapp, setWhatsapp]     = useState('')
  const [saving, setSaving]         = useState(false)
  const [success, setSuccess]       = useState(false)
  const [error, setError]           = useState('')

  // Schedule
  const [escala, setEscala]         = useState<DiaEscala[]>(DEFAULT_ESCALA)
  const [savingEscala, setSavingEscala] = useState(false)
  const scheduleInitialized             = useRef(false)

  // Absences
  const [absences, setAbsences]     = useState<StaffAbsenceResponse[]>([])
  const [page, setPage]             = useState(0)
  const PAGE_SIZE                   = 6
  const [showModal, setShowModal]   = useState(false)

  useEffect(() => {
    const resolveId = adminPartnerId
      ? Promise.resolve(adminPartnerId)
      : partnerService.getMe().then(p => p.id)

    resolveId
      .then(async pid => {
        setPartnerId(pid)
        const partnerData = await partnerService.getById(pid).catch(() => null)
        if (partnerData?.services) setAvailableServices(partnerData.services)

        if (!isNew && staffId) {
          const [s, sched, abs] = await Promise.all([
            staffService.getById(staffId),
            staffService.getSchedule(staffId),
            staffService.getAbsences(staffId),
          ])
          setStaff(s)
          setName(s.name)
          setPhotoUrl(s.photoUrl    ?? '')
          setJobTitle(s.jobTitle    ?? '')
          setSpeciality(s.speciality ?? '')
          setPhone(s.phone          ?? '')
          setEmail(s.email          ?? '')
          setWhatsapp(s.whatsapp    ?? '')
          setSelectedServiceIds(s.serviceIds ?? [])
          setEscala(fromScheduleApi(sched))
          scheduleInitialized.current = true
          setAbsences(abs)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [staffId])

  /* ── Salvar dados ── */
  async function handleSaveDados() {
    if (!name.trim()) { setError('O nome é obrigatório.'); return }
    setSaving(true); setError(''); setSuccess(false)
    try {
      const payload = {
        name:       name.trim(),
        photoUrl:   photoUrl.trim()   || undefined,
        jobTitle:   jobTitle.trim()   || undefined,
        speciality: speciality.trim() || undefined,
        phone:      phone.trim()      || undefined,
        email:      email.trim()      || undefined,
        whatsapp:   whatsapp.trim()   || undefined,
        serviceIds: selectedServiceIds.length > 0 ? selectedServiceIds : undefined,
      }
      if (isNew && partnerId) {
        const created = await staffService.create(partnerId, payload)
        const dest = adminPartnerId
          ? `/admin/parceiros/${adminPartnerId}/colaboradores/${created.id}`
          : `/partner/colaboradores/${created.id}`
        navigate(dest, { replace: true })
      } else if (staffId) {
        const updated = await staffService.update(staffId, payload)
        setStaff(updated)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch { setError('Erro ao salvar. Tente novamente.') }
    finally  { setSaving(false) }
  }

  /* ── Salvar escala ── */
  async function handleSaveEscala() {
    if (!staffId) return
    setSavingEscala(true)
    try {
      const updated = await staffService.updateSchedule(staffId, toScheduleApi(escala))
      setEscala(fromScheduleApi(updated))
      setSuccess(true); setTimeout(() => setSuccess(false), 3000)
    } catch { setError('Erro ao salvar escala.') }
    finally  { setSavingEscala(false) }
  }

  const tabs: { id: Tab; label: string; disabled?: boolean }[] = [
    { id: 'dados',         label: 'Dados Colaborador' },
    { id: 'escala',        label: 'Escala Horários',  disabled: isNew },
    { id: 'afastamentos',  label: 'Afastamentos',     disabled: isNew },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-(--color-primary-700)" />
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-4 lg:mb-6">
        <button
          onClick={() => navigate('/partner/colaboradores')}
          className="flex items-center gap-1.5 text-sm text-(--color-text-muted) hover:text-(--color-text-body)
                     transition-colors mb-3"
        >
          <ArrowLeft size={15} /> Colaboradores
        </button>
        <h1 className="text-xl lg:text-2xl font-bold text-(--color-text-heading)">
          {isNew ? 'Novo Colaborador' : (staff?.name ?? 'Colaborador')}
        </h1>
        <p className="text-sm text-(--color-text-muted) mt-1">
          Mantenha as informações da sua equipe sempre atualizadas
        </p>
      </div>

      <div className="bg-(--color-surface) rounded-xl shadow-md border border-(--color-border)">
        {/* Tabs */}
        <div className="flex border-b border-(--color-border) overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => !t.disabled && setActiveTab(t.id)}
              disabled={t.disabled}
              className={`flex-1 min-w-max px-4 py-4 text-xs lg:text-sm font-medium transition-colors relative whitespace-nowrap
                ${t.disabled ? 'text-(--color-text-placeholder) cursor-not-allowed' :
                  activeTab === t.id
                    ? 'text-(--color-text-heading)'
                    : 'text-(--color-text-muted) hover:text-(--color-text-body)'
                }`}
            >
              {t.label}
              {activeTab === t.id && !t.disabled && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-(--color-secondary-500)" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 lg:p-8">
          {activeTab === 'dados' && (
            <DadosTab
              name={name}           setName={setName}
              photoUrl={photoUrl}
              jobTitle={jobTitle}   setJobTitle={setJobTitle}
              speciality={speciality} setSpeciality={setSpeciality}
              phone={phone}         setPhone={setPhone}
              email={email}         setEmail={setEmail}
              whatsapp={whatsapp}   setWhatsapp={setWhatsapp}
              availableServices={availableServices}
              selectedServiceIds={selectedServiceIds}
              setSelectedServiceIds={setSelectedServiceIds}
              error={error}
            />
          )}
          {activeTab === 'escala' && (
            <EscalaTab escala={escala} setEscala={setEscala} />
          )}
          {activeTab === 'afastamentos' && staffId && (
            <AfastamentosTab
              staffId={staffId}
              absences={absences}
              setAbsences={setAbsences}
              page={page} setPage={setPage}
              pageSize={PAGE_SIZE}
              showModal={showModal}
              setShowModal={setShowModal}
            />
          )}
        </div>

        {/* Footer — só nas abas de salvar */}
        {activeTab !== 'afastamentos' && (
          <div className="px-4 lg:px-8 pt-2 pb-6 lg:pb-8 flex flex-col items-center gap-3">
            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg w-full text-center">{error}</p>
            )}
            {success && (
              <p className="text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg w-full text-center">
                Dados salvos com sucesso!
              </p>
            )}
            <button
              onClick={activeTab === 'dados' ? handleSaveDados : handleSaveEscala}
              disabled={saving || savingEscala}
              className="w-full lg:w-auto flex items-center justify-center gap-2
                         bg-(--color-secondary-500) hover:bg-(--color-secondary-600)
                         text-white font-semibold px-16 py-3 rounded-full
                         transition-colors cursor-pointer disabled:opacity-60"
            >
              {(saving || savingEscala)
                ? <><Loader2 size={16} className="animate-spin" /> Salvando...</>
                : <><Save size={16} /> Salvar Alterações</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   Tab — Dados Colaborador
════════════════════════════════════════ */
function DadosTab({ name, setName, photoUrl, jobTitle, setJobTitle,
                    speciality, setSpeciality, phone, setPhone, email, setEmail,
                    whatsapp, setWhatsapp, availableServices, selectedServiceIds,
                    setSelectedServiceIds, error }: {
  name: string; setName: (v: string) => void
  photoUrl: string
  jobTitle: string; setJobTitle: (v: string) => void
  speciality: string; setSpeciality: (v: string) => void
  phone: string; setPhone: (v: string) => void
  email: string; setEmail: (v: string) => void
  whatsapp: string; setWhatsapp: (v: string) => void
  availableServices: ServiceOffer[]
  selectedServiceIds: string[]
  setSelectedServiceIds: (ids: string[]) => void
  error: string
}) {
  function toggleService(id: string) {
    setSelectedServiceIds(
      selectedServiceIds.includes(id)
        ? selectedServiceIds.filter(s => s !== id)
        : [...selectedServiceIds, id]
    )
  }

  return (
    <div className="flex flex-col xl:flex-row xl:items-start gap-6 xl:gap-8">

      {/* Avatar */}
      <div className="flex flex-col items-center gap-2 xl:shrink-0 xl:w-40 xl:pt-1">
        <div className="w-24 h-24 xl:w-32 xl:h-32 rounded-full bg-(--color-bg) border-2 border-dashed border-(--color-border)
                        flex items-center justify-center overflow-hidden">
          {photoUrl
            ? <img src={photoUrl} alt={name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            : <Camera size={28} className="text-(--color-icon-default)" />
          }
        </div>
        <span className="text-xs text-(--color-text-muted) text-center">
          Upload disponível após integração com storage
        </span>
      </div>

      {/* Colunas */}
      <div className="flex-1 flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          {/* Esquerda */}
          <div className="flex-1 flex flex-col gap-4">
            <Field
              label="Nome Completo" required
              value={name} onChange={setName}
              placeholder="Digite o Nome Completo"
              error={error && !name.trim() ? error : ''}
            />
            <Field label="Cargo"        optional value={jobTitle}   onChange={setJobTitle}   placeholder="Ex: Médico Veterinário" />
            <Field label="Especialidade" optional value={speciality} onChange={setSpeciality} placeholder="Ex: Cirurgia, Dermatologia" />
            <Field label="Email"         optional value={email}      onChange={setEmail}      placeholder="Digite o Email" />
          </div>

          {/* Direita */}
          <div className="flex-1 flex flex-col gap-4">
            <Field
              label="Telefone Contato" optional
              value={formatPhone(phone)}
              onChange={v => setPhone(v.replace(/\D/g, '').slice(0, 11))}
              placeholder="(00) 00000-0000"
            />
            <Field
              label="WhatsApp" optional
              value={formatPhone(whatsapp)}
              onChange={v => setWhatsapp(v.replace(/\D/g, '').slice(0, 11))}
              placeholder="(00) 00000-0000"
            />
          </div>
        </div>

        {/* Serviços atendidos */}
        {availableServices.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide">
              Serviços que este colaborador atende
            </label>
            <div className="flex flex-wrap gap-2">
              {availableServices.map(s => {
                const active = selectedServiceIds.includes(s.id!)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleService(s.id!)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border-2 transition-colors
                      ${active
                        ? 'border-(--color-secondary-500) bg-(--color-secondary-500)/10 text-(--color-secondary-500) font-medium'
                        : 'border-(--color-border) text-(--color-text-muted) hover:border-(--color-secondary-400)'
                      }`}
                  >
                    {active && <span className="text-[10px]">✓</span>}
                    {s.name}
                  </button>
                )
              })}
            </div>
            {selectedServiceIds.length === 0 && (
              <p className="text-xs text-amber-600">
                Nenhum serviço selecionado — este colaborador não aparecerá na agenda de agendamentos.
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  )
}

/* ════════════════════════════════════════
   Tab — Escala de Horários
════════════════════════════════════════ */
function EscalaTab({ escala, setEscala }: {
  escala: DiaEscala[]
  setEscala: (v: DiaEscala[]) => void
}) {
  function update(index: number, field: keyof DiaEscala, val: string | boolean) {
    setEscala(escala.map((d, i) => i === index ? { ...d, [field]: val } : d))
  }

  return (
    <div className="flex flex-col gap-3">
      {escala.map((dia, i) => (
        <div
          key={dia.dayOfWeek}
          className="border border-(--color-border) rounded-xl p-4 flex flex-col gap-3
                     lg:flex-row lg:items-center lg:gap-4 lg:p-3 lg:border-0 lg:rounded-none
                     lg:border-b lg:border-(--color-border) last:border-b-0"
        >
          {/* Dia + toggle */}
          <div className="flex items-center justify-between lg:justify-start lg:gap-3 lg:w-56 lg:shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-(--color-bg) flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-(--color-text-heading)">{dia.letra}</span>
              </div>
              <span className="text-sm font-medium text-(--color-text-heading)">{dia.nome}</span>
            </div>
            <span className="text-xs text-(--color-text-muted) lg:hidden">
              {dia.trabalhando ? 'Trabalhando' : 'Folga'}
            </span>
          </div>

          {/* Expediente */}
          {dia.trabalhando && (
            <div className="flex items-center gap-2 flex-wrap lg:flex-1">
              <span className="text-sm text-(--color-text-muted) shrink-0">Expediente:</span>
              <TimePicker value={dia.inicio} onChange={v => update(i, 'inicio', v)} />
              <span className="text-sm text-(--color-text-muted)">às</span>
              <TimePicker value={dia.fim}    onChange={v => update(i, 'fim',    v)} />
            </div>
          )}

          {/* Intervalo */}
          {dia.trabalhando && (
            <div className="flex items-center gap-2 flex-wrap lg:flex-1 lg:justify-center">
              <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
                <input
                  type="checkbox"
                  checked={dia.intervalo}
                  onChange={e => update(i, 'intervalo', e.target.checked)}
                  className="accent-(--color-primary-700) w-3.5 h-3.5"
                />
                <span className="text-sm text-(--color-text-muted)">Intervalo</span>
              </label>
              {dia.intervalo && (
                <>
                  <TimePicker value={dia.intervaloInicio} onChange={v => update(i, 'intervaloInicio', v)} />
                  <span className="text-sm text-(--color-text-muted)">às</span>
                  <TimePicker value={dia.intervaloFim}    onChange={v => update(i, 'intervaloFim',    v)} />
                </>
              )}
            </div>
          )}

          {!dia.trabalhando && <div className="lg:flex-1" />}

          {/* Toggle folga — desktop */}
          <div className="flex items-center gap-2 shrink-0 lg:w-28 lg:justify-end">
            <span className="text-sm text-(--color-text-muted)">
              {dia.trabalhando ? 'Trabalhando' : 'Folga'}
            </span>
            <button
              onClick={() => update(i, 'trabalhando', !dia.trabalhando)}
              className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0
                ${dia.trabalhando ? 'bg-(--color-secondary-500)' : 'bg-(--color-border)'}`}
            >
              <span className={`absolute left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                ${dia.trabalhando ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ════════════════════════════════════════
   Tab — Afastamentos
════════════════════════════════════════ */
function AfastamentosTab({ staffId, absences, setAbsences, page, setPage, pageSize, showModal, setShowModal }: {
  staffId:      string
  absences:     StaffAbsenceResponse[]
  setAbsences:  (v: StaffAbsenceResponse[]) => void
  page:         number
  setPage:      (v: number) => void
  pageSize:     number
  showModal:    boolean
  setShowModal: (v: boolean) => void
}) {
  const sorted  = [...absences].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
  const total   = sorted.length
  const paged   = sorted.slice(page * pageSize, page * pageSize + pageSize)
  const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1)

  const STATUS_COLORS: Record<AbsenceStatus, string> = {
    'Em Andamento': 'bg-purple-100 text-purple-700',
    'Agendado':     'bg-blue-100 text-blue-700',
    'Concluído':    'bg-teal-100 text-teal-700',
  }

  function handleCreated(a: StaffAbsenceResponse) {
    setAbsences([...absences, a])
    setShowModal(false)
  }

  return (
    <div>
      {/* Table header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-(--color-text-heading)">Histórico de Afastamentos</h3>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-(--color-secondary-500) hover:bg-(--color-secondary-600)
                     text-white font-semibold px-4 py-2 rounded-full text-sm transition-colors"
        >
          <Plus size={14} /> Afastamento
        </button>
      </div>

      {absences.length === 0 ? (
        <p className="text-sm text-(--color-text-muted) text-center py-10">
          Nenhum afastamento registrado.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-(--color-border)">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-(--color-border) bg-(--color-bg)">
                  {['#', 'Tipo / Razão', 'Data Início', 'Data Término', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border)">
                {paged.map((a, idx) => {
                  const status = absenceStatus(a)
                  return (
                    <tr key={a.id} className="hover:bg-(--color-bg) transition-colors">
                      <td className="px-4 py-3 text-(--color-text-muted) font-mono">
                        {String(page * pageSize + idx + 1).padStart(5, '0')}
                      </td>
                      <td className="px-4 py-3 text-(--color-text-body) font-medium">
                        {a.reason || '—'}
                      </td>
                      <td className="px-4 py-3 text-(--color-text-body)">{fmtDate(a.startDate)}</td>
                      <td className="px-4 py-3 text-(--color-text-body)">{fmtDate(a.endDate)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-3 text-xs text-(--color-text-muted)">
            <span>Mostrando {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} de {total}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg border border-(--color-border) hover:bg-(--color-bg)
                           disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage(Math.min(maxPage, page + 1))}
                disabled={page >= maxPage}
                className="p-1.5 rounded-lg border border-(--color-border) hover:bg-(--color-bg)
                           disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <AbsenceModal
          staffId={staffId}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}

/* ════════════════════════════════════════
   Modal — Novo Afastamento
════════════════════════════════════════ */
const ABSENCE_TYPES = ['Férias', 'Folga', 'Atestado Médico', 'Licença', 'Outros']

function AbsenceModal({ staffId, onClose, onCreated }: {
  staffId:   string
  onClose:   () => void
  onCreated: (a: StaffAbsenceResponse) => void
}) {
  const today = new Date().toISOString().split('T')[0]

  const [tipo, setTipo]         = useState(ABSENCE_TYPES[0])
  const [startDate, setStart]   = useState(today)
  const [days, setDays]         = useState(1)
  const [endDate, setEnd]       = useState(addDays(today, 0))
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  function handleStartChange(v: string) {
    setStart(v)
    setEnd(addDays(v, days - 1))
  }
  function handleDaysChange(v: number) {
    const d = Math.max(1, v)
    setDays(d)
    setEnd(addDays(startDate, d - 1))
  }
  function handleEndChange(v: string) {
    setEnd(v)
    const diff = Math.round((new Date(v).getTime() - new Date(startDate).getTime()) / 86400000) + 1
    setDays(Math.max(1, diff))
  }

  async function handleSave() {
    if (!startDate || !endDate) { setError('Preencha as datas.'); return }
    setSaving(true); setError('')
    try {
      const created = await staffService.createAbsence(staffId, {
        startDate: `${startDate}T00:00:00`,
        endDate:   `${endDate}T23:59:59`,
        reason:    tipo,
      })
      onCreated(created)
    } catch { setError('Erro ao registrar afastamento.') }
    finally  { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-(--color-surface) rounded-xl shadow-xl w-full max-w-sm border border-(--color-border)">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-(--color-border)">
          <h3 className="text-sm font-semibold text-(--color-text-heading)">Novo Afastamento</h3>
          <button onClick={onClose} className="text-(--color-icon-default) hover:text-(--color-icon-active)">
            <X size={18} />
          </button>
        </div>

        {/* Modal body */}
        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Tipo */}
          <div>
            <label className="text-sm font-medium text-(--color-text-heading) mb-1.5 block">
              Tipo de Afastamento
            </label>
            <select
              value={tipo}
              onChange={e => setTipo(e.target.value)}
              className="w-full border border-(--color-border) rounded-lg px-3 py-2.5 text-sm
                         text-(--color-text-body) bg-(--color-bg) focus:outline-none focus:ring-2
                         focus:ring-(--color-primary-300)"
            >
              {ABSENCE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          {/* Data Início */}
          <div>
            <label className="text-sm font-medium text-(--color-text-heading) mb-1.5 block">Data Início</label>
            <input
              type="date"
              value={startDate}
              onChange={e => handleStartChange(e.target.value)}
              className="w-full border border-(--color-border) rounded-lg px-3 py-2.5 text-sm
                         text-(--color-text-body) bg-(--color-bg) focus:outline-none focus:ring-2
                         focus:ring-(--color-primary-300)"
            />
          </div>

          {/* Quantidade de dias */}
          <div>
            <label className="text-sm font-medium text-(--color-text-heading) mb-1.5 block">Quantidade de Dias</label>
            <input
              type="number"
              min={1}
              value={days}
              onChange={e => handleDaysChange(parseInt(e.target.value) || 1)}
              className="w-full border border-(--color-border) rounded-lg px-3 py-2.5 text-sm
                         text-(--color-text-body) bg-(--color-bg) focus:outline-none focus:ring-2
                         focus:ring-(--color-primary-300)"
            />
          </div>

          {/* Data Término */}
          <div>
            <label className="text-sm font-medium text-(--color-text-heading) mb-1.5 block">Data Término</label>
            <input
              type="date"
              value={endDate}
              onChange={e => handleEndChange(e.target.value)}
              className="w-full border border-(--color-border) rounded-lg px-3 py-2.5 text-sm
                         text-(--color-text-body) bg-(--color-bg) focus:outline-none focus:ring-2
                         focus:ring-(--color-primary-300)"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Modal footer */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-(--color-border)">
          <button
            onClick={onClose}
            className="flex-1 border border-(--color-border) rounded-full py-2.5 text-sm font-medium
                       text-(--color-text-body) hover:bg-(--color-bg) transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-(--color-secondary-500) hover:bg-(--color-secondary-600) text-white
                       rounded-full py-2.5 text-sm font-semibold transition-colors disabled:opacity-60
                       flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Input simples ─── */
function Field({ label, placeholder, required, optional, value, onChange, error }: {
  label: string; placeholder?: string; required?: boolean; optional?: boolean
  value: string; onChange: (v: string) => void; error?: string
}) {
  return (
    <div>
      <label className="flex items-center gap-1 text-sm font-medium text-(--color-text-heading) mb-1.5">
        {label}
        {required && <span className="text-red-400">*</span>}
        {optional && <span className="text-(--color-text-muted) text-xs font-normal">Opcional</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full border rounded-lg px-3 py-2.5 text-sm
                   text-(--color-text-body) placeholder:text-(--color-text-placeholder)
                   bg-(--color-bg) focus:outline-none focus:ring-2 transition-shadow
                   ${error ? 'border-red-400 focus:ring-red-200' : 'border-(--color-border) focus:ring-(--color-primary-300)'}`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
