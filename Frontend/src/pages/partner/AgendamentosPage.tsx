import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, Search, ChevronLeft, ChevronRight,
  Users, CheckCircle2, Stethoscope, Syringe, Scissors,
  Clock, SlidersHorizontal, CalendarDays,
} from 'lucide-react'
import { staffService, type StaffResponse } from '../../services/staff.service'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { AgendaBlocksDialog } from '../../features/booking/AgendaBlocksDialog'
import { BookingHistory } from '../../features/booking/BookingHistory'
import { BookingReasonDialog } from '../../features/booking/BookingReasonDialog'
import { RescheduleBookingDialog } from '../../features/booking/RescheduleBookingDialog'
import { bookingError, bookingStatusLabel, canRecordNoShow, isEditableBooking } from '../../features/booking/bookingUi'
import {
  bookingService,
  type BookingResponse,
  type BookingAccess,
  type BookingPet,
  type BookingStatus,
  type BookingType,
  BOOKING_TYPE_LABEL,
  BOOKING_STATUS_LABEL,
} from '../../services/booking.service'

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function todayKey() { return toDateKey(new Date()) }

function weekRange(): { startDate: string; endDate: string } {
  const d  = new Date()
  const day = d.getDay()
  const mon = new Date(d); mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return { startDate: toDateKey(mon), endDate: toDateKey(sun) }
}

function monthRange(): { startDate: string; endDate: string } {
  const d = new Date()
  const first = new Date(d.getFullYear(), d.getMonth(), 1)
  const last  = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return { startDate: toDateKey(first), endDate: toDateKey(last) }
}

function formatDateTime(iso?: string) {
  if (!iso) return '–'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/* ─────────────────────────────────────────────
   Quick-filter chips
───────────────────────────────────────────── */
type ChipId = 'hoje' | 'pendentes' | 'confirmados' | 'finalizados' | 'semana' | 'mes'

interface ChipDef {
  id:        ChipId
  label:     string
  status?:   BookingStatus
  startDate?: string
  endDate?:   string
  date?:     string
}

function buildChips(): ChipDef[] {
  const week  = weekRange()
  const month = monthRange()
  return [
    { id: 'hoje',       label: 'Hoje',           date:      todayKey() },
    { id: 'pendentes',  label: 'Pendentes',       status:    'PENDING'   },
    { id: 'confirmados',label: 'Confirmados',     status:    'CONFIRMED' },
    { id: 'finalizados',label: 'Finalizados',     status:    'COMPLETED' },
    { id: 'semana',     label: 'Esta semana',     ...week   },
    { id: 'mes',        label: 'Este mês',        ...month  },
  ]
}

/* ─────────────────────────────────────────────
   Status badge
───────────────────────────────────────────── */
const STATUS_STYLE: Record<BookingStatus, string> = {
  COMPLETED:   'bg-emerald-100 text-emerald-700',
  CONFIRMED:   'bg-violet-100  text-violet-700',
  IN_PROGRESS: 'bg-blue-100    text-blue-700',
  PENDING:     'bg-amber-100   text-amber-700',
  CANCELLED:   'bg-pink-100    text-pink-600',
  NO_SHOW:     'bg-pink-100    text-pink-600',
}

function StatusBadge({ booking }: { booking: BookingResponse }) {
  const ready = bookingStatusLabel(booking)
  if (ready) return <Badge tone="success">{ready}</Badge>
  const { status } = booking
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {BOOKING_STATUS_LABEL[status] ?? status}
    </span>
  )
}

const ALL_TYPES: BookingType[] = ['CONSULTATION','VACCINATION','GROOMING','BOARDING','OTHER']
const PAGE_SIZE = 10

type BookingDialog = { booking: BookingResponse; action: 'reschedule' | 'history' | 'CANCELLED' | 'NO_SHOW' }

/* ─────────────────────────────────────────────
   Página
───────────────────────────────────────────── */
export default function AgendamentosPage() {
  const navigate = useNavigate()

  const [access, setAccess] = useState<BookingAccess | null>(null)
  const partnerId = access?.partnerId ?? null
  const summaryOnly = access?.teamMember ?? false
  const [bookings,      setBookings]      = useState<BookingResponse[]>([])
  const [staffList,     setStaffList]     = useState<StaffResponse[]>([])
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({})
  const [serviceError, setServiceError] = useState('')
  const [petMap,        setPetMap]        = useState<Record<string, BookingPet>>({})
  const [petLoadFailed, setPetLoadFailed] = useState(false)
  const [partnerLoading, setPartnerLoading] = useState(true)
  const [loadedRequest, setLoadedRequest] = useState('')
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [page,          setPage]          = useState(0)
  const [totalPages,    setTotalPages]    = useState(0)
  const [totalItems,    setTotalItems]    = useState(0)
  const [blocksOpen, setBlocksOpen] = useState(false)
  const [dialog, setDialog] = useState<BookingDialog | null>(null)

  /* ── Filtros ── */
  const chips       = useMemo(() => buildChips(), [])
  const [activeChip,  setActiveChip]  = useState<ChipId>('hoje')
  const [search,      setSearch]      = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [fStatus,     setFStatus]     = useState<BookingStatus | ''>('')
  const [fType,       setFType]       = useState<BookingType | ''>('')
  const [fStaff,      setFStaff]      = useState('')
  const [fStart,      setFStart]      = useState('')
  const [fEnd,        setFEnd]        = useState('')

  /* filtros derivados do chip ativo */
  const chipFilters = useMemo(() => {
    const chip = chips.find(c => c.id === activeChip)!
    return {
      date:      chip.date,
      status:    chip.status,
      startDate: chip.startDate,
      endDate:   chip.endDate,
    }
  }, [activeChip, chips])

  /* carrega parceiro + staff */
  useEffect(() => {
    let active = true
    bookingService.agendaAccess().then(context => {
      if (!active) return
      setAccess(context)
      if (!context.teamMember) {
        void staffService.getByPartner(context.partnerId).then(list => { if (active) setStaffList(list) }).catch(() => {})
      }
    }).catch(err => { if (active) setLoadError(bookingError(err, 'Não foi possível carregar o acesso à agenda.')) })
      .finally(() => setPartnerLoading(false))
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!partnerId) return
    let active = true
    bookingService.partnerSummary(partnerId).then(partner => {
      if (!active) return
      setServiceNames(Object.fromEntries(partner.services.map(service => [service.id, service.name])))
      setServiceError('')
    }).catch(err => { if (active) setServiceError(bookingError(err, 'Não foi possível carregar os serviços.')) })
    return () => { active = false }
  }, [partnerId, refresh])

  /* carrega bookings */
  const requestKey = JSON.stringify([partnerId, chipFilters, fStatus, fType, fStaff, fStart, fEnd, page, refresh])
  const loading = partnerLoading || (!!partnerId && requestKey !== loadedRequest)
  useEffect(() => {
    if (!partnerId) return
    let active = true
    async function load(id: string) {
      const hasAdvanced = fStatus || fType || fStaff || fStart || fEnd
      const params = hasAdvanced
        ? { status: fStatus || undefined, type: fType || undefined, staffId: fStaff || undefined, startDate: fStart || undefined, endDate: fEnd || undefined, page, size: PAGE_SIZE }
        : { ...chipFilters, page, size: PAGE_SIZE }

      try {
        const res = await bookingService.getByPartner(id, params)
        const byPet = new Map(res.content.map(booking => [booking.petId, booking]))
        const pets = await Promise.allSettled([...byPet.values()].map(booking => bookingService.getPet(booking, summaryOnly)))
        if (!active) return
        setBookings(res.content)
        setTotalPages(res.totalPages)
        setTotalItems(res.totalElements)
        setPetMap(Object.fromEntries(pets.flatMap(result =>
          result.status === 'fulfilled' ? [[result.value.id, result.value]] : []
        )))
        setPetLoadFailed(pets.some(result => result.status === 'rejected'))
        setLoadError('')
      } catch (err) {
        if (!active) return
        setBookings([])
        setTotalPages(0)
        setTotalItems(0)
        setPetMap({})
        setPetLoadFailed(false)
        setLoadError(bookingError(err, 'Não foi possível carregar os agendamentos.'))
      } finally {
        if (active) setLoadedRequest(requestKey)
      }
    }
    void load(partnerId)
    return () => { active = false }
  }, [partnerId, chipFilters, fStatus, fType, fStaff, fStart, fEnd, page, requestKey, summaryOnly])

  /* KPIs derivados da página carregada */
  const kpiPending   = bookings.filter(b => b.status === 'PENDING').length
  const kpiConfirmed = bookings.filter(b => b.status === 'CONFIRMED').length
  const kpiCompleted = bookings.filter(b => b.status === 'COMPLETED').length
  const kpiStaff     = new Set(bookings.filter(b => b.staffId).map(b => b.staffId!)).size
  const kpiConsulta  = bookings.filter(b => b.type === 'CONSULTATION').length
  const kpiVacina    = bookings.filter(b => b.type === 'VACCINATION').length
  const kpiGrooming  = bookings.filter(b => b.type === 'GROOMING').length

  /* filtro client-side por nome do pet */
  const displayed = useMemo(() => {
    if (!search.trim()) return bookings
    const q = search.toLowerCase()
    return bookings.filter(b => (petMap[b.petId]?.name ?? '').toLowerCase().includes(q))
  }, [bookings, petMap, search])

  /* ── Ações ── */
  async function handleStatusChange(id: string, status: BookingStatus) {
    setActionLoading(id)
    setActionError('')
    try { await bookingService.updateStatus(id, status); setRefresh(value => value + 1) }
    catch (err) { setActionError(bookingError(err, 'Não foi possível atualizar o agendamento.')) }
    finally { setActionLoading(null) }
  }

  async function handleFitting(id: string, decision: 'APPROVE' | 'REJECT') {
    setActionLoading(id)
    setActionError('')
    try { await bookingService.processFittingDecision(id, decision); setRefresh(value => value + 1) }
    catch (err) { setActionError(bookingError(err, 'Não foi possível atualizar o agendamento.')) }
    finally { setActionLoading(null) }
  }

  function renderActions(b: BookingResponse) {
    if (actionLoading === b.id)
      return <Loader2 size={14} className="animate-spin text-(--color-primary-700)" />

    return (
      <div className="flex flex-wrap gap-1.5">
        {access?.canManage && b.status === 'PENDING' && (
          <Button size="sm" onClick={() => b.isFittingRequest
            ? void handleFitting(b.id, 'APPROVE')
            : void handleStatusChange(b.id, 'CONFIRMED')}>
            {b.isFittingRequest ? 'Aprovar' : 'Confirmar'}
          </Button>
        )}
        {access?.canAttend && (b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS') && (
          <Button size="sm" variant="accent" onClick={() => navigate(`/partner/atendimento?bookingId=${b.id}`)}>
            {b.status === 'CONFIRMED' ? 'Iniciar Atendimento' : 'Abrir atendimento'}
          </Button>
        )}
        {access?.canManage && isEditableBooking(b) && (
          <>
            <Button size="sm" variant="secondary" onClick={() => setDialog({ booking: b, action: 'reschedule' })}>
              Reagendar
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setDialog({ booking: b, action: 'CANCELLED' })}>
              {b.status === 'PENDING' && b.isFittingRequest ? 'Rejeitar' : 'Cancelar'}
            </Button>
          </>
        )}
        {access?.canManage && canRecordNoShow(b) && (
          <Button size="sm" variant="secondary" onClick={() => setDialog({ booking: b, action: 'NO_SHOW' })}>
            Registrar falta
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={() => setDialog({ booking: b, action: 'history' })}>Histórico</Button>
      </div>
    )
  }

  function bookingSaved() {
    setDialog(null)
    setActionError('')
    setRefresh(value => value + 1)
  }

  function handleChip(id: ChipId) {
    setActiveChip(id)
    setFStatus(''); setFType(''); setFStaff(''); setFStart(''); setFEnd('')
    setShowFilters(false)
    setPage(0)
  }

  function handleApplyFilters() { setPage(0); setShowFilters(false) }
  function handleClearFilters() {
    setFStatus(''); setFType(''); setFStaff(''); setFStart(''); setFEnd('')
    setSearch('')
    setPage(0)
    setShowFilters(false)
  }

  const firstItem = page * PAGE_SIZE + 1
  const lastItem  = Math.min(page * PAGE_SIZE + bookings.length, totalItems)

  if (!partnerId && loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin text-(--color-primary-700)" />
    </div>
  )

  return (
    <div className="space-y-5">

      {/* ── Cabeçalho ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-(--color-text-heading)">Agendamentos</h1>
          <p className="text-sm text-(--color-text-muted) mt-1">
            Gerencie e acompanhe todos os atendimentos da sua equipe
          </p>
        </div>
        {partnerId && access?.canManage && <Button variant="secondary" onClick={() => setBlocksOpen(true)}>Bloqueios de agenda</Button>}
      </div>

      {(actionError || (!loading && loadError)) && (
        <p role="alert" className="text-sm text-text-danger">{actionError || loadError}</p>
      )}
      {!loading && (petLoadFailed || serviceError) && (
        <div className="flex flex-wrap items-center gap-2">
          <p role="alert" className="text-sm text-text-danger">
            {petLoadFailed ? 'Não foi possível carregar alguns cadastros de pet.' : serviceError}
          </p>
          <Button size="sm" variant="secondary" onClick={() => setRefresh(value => value + 1)}>Tentar novamente</Button>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl shadow-sm overflow-hidden">
        <div className="hidden lg:flex divide-x divide-(--color-border)">
          {[
            { label: 'Pendentes',          value: kpiPending,   icon: <Clock size={16}/>,        bg: 'bg-amber-100',   color: 'text-amber-600'   },
            { label: 'Confirmados',        value: kpiConfirmed, icon: <CalendarDays size={16}/>, bg: 'bg-violet-100',  color: 'text-violet-600'  },
            { label: 'Finalizados',        value: kpiCompleted, icon: <CheckCircle2 size={16}/>, bg: 'bg-emerald-100', color: 'text-emerald-600' },
            { label: 'Profissionais',      value: kpiStaff,     icon: <Users size={16}/>,        bg: 'bg-blue-100',    color: 'text-blue-600'    },
            { label: 'Consultas',          value: kpiConsulta,  icon: <Stethoscope size={16}/>,  bg: 'bg-teal-100',    color: 'text-teal-600'    },
            { label: 'Vacinação',          value: kpiVacina,    icon: <Syringe size={16}/>,      bg: 'bg-indigo-100',  color: 'text-indigo-600'  },
            { label: 'Banho e tosa',       value: kpiGrooming,  icon: <Scissors size={16}/>,     bg: 'bg-pink-100',    color: 'text-pink-600'    },
          ].map((k, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 py-4 px-3 hover:bg-(--color-bg) transition-colors cursor-default">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${k.bg}`}>
                <span className={k.color}>{k.icon}</span>
              </div>
              <p className="text-[10px] font-semibold text-(--color-text-muted) text-center leading-tight">{k.label}</p>
              <p className="text-2xl font-black text-(--color-text-heading) tabular-nums leading-none">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Mobile: grid 4 colunas */}
        <div className="lg:hidden grid grid-cols-4 divide-x divide-(--color-border)">
          {[
            { label: 'Pendentes',    value: kpiPending,   color: 'text-amber-600'   },
            { label: 'Confirmados',  value: kpiConfirmed, color: 'text-violet-600'  },
            { label: 'Finalizados',  value: kpiCompleted, color: 'text-emerald-600' },
            { label: 'Profissionais',value: kpiStaff,     color: 'text-blue-600'    },
          ].map((k, i) => (
            <div key={i} className="flex flex-col items-center py-3 gap-0.5">
              <p className={`text-xl font-black tabular-nums ${k.color}`}>{k.value}</p>
              <p className="text-[9px] font-semibold text-(--color-text-muted) text-center leading-tight px-1">{k.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick-filter chips + busca ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {chips.map(c => (
            <button key={c.id} onClick={() => handleChip(c.id)}
              className={[
                'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap',
                activeChip === c.id
                  ? 'bg-(--color-primary-700) text-white shadow-sm'
                  : 'bg-(--color-surface) border border-(--color-border) text-(--color-text-muted) hover:border-(--color-primary-700)/50',
              ].join(' ')}>
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome do pet…"
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-(--color-border)
                         bg-(--color-surface) text-(--color-text-body)
                         focus:outline-none focus:border-(--color-primary-700)" />
          </div>
          <button onClick={() => setShowFilters(v => !v)}
            className={[
              'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border transition-colors',
              showFilters
                ? 'border-(--color-primary-700) text-(--color-primary-700) bg-(--color-primary-700)/10'
                : 'border-(--color-border) text-(--color-text-muted) hover:border-(--color-primary-700)/50 bg-(--color-surface)',
            ].join(' ')}>
            <SlidersHorizontal size={15} />
            Filtros
          </button>
        </div>

        {showFilters && (
          <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-(--color-text-muted) mb-1">Status</label>
                <select value={fStatus} onChange={e => setFStatus(e.target.value as BookingStatus | '')}
                  className="w-full text-sm rounded-xl border border-(--color-border) bg-(--color-bg)
                             px-3 py-2 text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700)">
                  <option value="">Todos</option>
                  <option value="PENDING">Pendente</option>
                  <option value="CONFIRMED">Confirmado</option>
                  <option value="COMPLETED">Finalizado</option>
                  <option value="CANCELLED">Cancelado</option>
                  <option value="NO_SHOW">Falta</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-(--color-text-muted) mb-1">Tipo</label>
                <select value={fType} onChange={e => setFType(e.target.value as BookingType | '')}
                  className="w-full text-sm rounded-xl border border-(--color-border) bg-(--color-bg)
                             px-3 py-2 text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700)">
                  <option value="">Todos</option>
                  {ALL_TYPES.map(t => <option key={t} value={t}>{BOOKING_TYPE_LABEL[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-(--color-text-muted) mb-1">Profissional</label>
                <select value={fStaff} onChange={e => setFStaff(e.target.value)}
                  className="w-full text-sm rounded-xl border border-(--color-border) bg-(--color-bg)
                             px-3 py-2 text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700)">
                  <option value="">Todos</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-(--color-text-muted) mb-1">Data início</label>
                <input type="date" value={fStart} onChange={e => setFStart(e.target.value)}
                  className="w-full text-sm rounded-xl border border-(--color-border) bg-(--color-bg)
                             px-3 py-2 text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700)" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-(--color-text-muted) mb-1">Data fim</label>
                <input type="date" value={fEnd} onChange={e => setFEnd(e.target.value)}
                  className="w-full text-sm rounded-xl border border-(--color-border) bg-(--color-bg)
                             px-3 py-2 text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700)" />
              </div>
              <div className="col-span-2 lg:col-span-3 flex items-end gap-2">
                <button onClick={handleApplyFilters}
                  className="px-4 py-2 text-sm font-semibold rounded-xl bg-(--color-primary-700) text-white hover:opacity-90 transition-opacity">
                  Aplicar
                </button>
                <button onClick={handleClearFilters}
                  className="px-4 py-2 text-sm font-semibold rounded-xl border border-(--color-border)
                             text-(--color-text-muted) hover:border-(--color-primary-700)/50 transition-colors">
                  Limpar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Tabela ── */}
      <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl shadow-sm overflow-hidden">

        {/* Mobile */}
        <div className="lg:hidden">
          {loading ? (
            <div className="flex justify-center py-14">
              <Loader2 size={24} className="animate-spin text-(--color-primary-700)" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-sm text-(--color-text-muted) font-medium">Nenhum agendamento encontrado.</p>
            </div>
          ) : (
            <div className="divide-y divide-(--color-border)">
              {displayed.map(b => {
                const pet   = petMap[b.petId]
                const staff = b.staffId ? staffList.find(s => s.id === b.staffId) : null
                return (
                  <div key={b.id} className="px-4 py-3.5 hover:bg-(--color-bg)/60 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        <p className="font-bold text-(--color-text-heading) text-sm leading-tight">
                          {pet?.name ?? 'Pet indisponível'}
                        </p>
                        {pet?.breed && <p className="text-xs text-(--color-text-muted)">{pet.breed}</p>}
                      </div>
                      <StatusBadge booking={b} />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-(--color-text-muted) mb-2">
                      <span className="font-medium text-(--color-text-body)">{serviceNames[b.serviceId ?? ''] ?? BOOKING_TYPE_LABEL[b.type] ?? b.type}</span>
                      {staff && <><span>·</span><span>{staff.name}</span></>}
                      {b.bookingDate && <><span>·</span><span>{formatDateTime(b.bookingDate)}</span></>}
                    </div>
                    {renderActions(b)}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Desktop */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-(--color-border)">
                {['PET','RAÇA','PROFISSIONAL','SERVIÇO','DATA / HORÁRIO','STATUS','AÇÕES'].map(col => (
                  <th key={col}
                    className="text-left px-5 py-3.5 text-[11px] font-bold text-(--color-text-muted)
                               uppercase tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <Loader2 size={24} className="animate-spin text-(--color-primary-700) mx-auto" />
                  </td>
                </tr>
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <p className="text-sm text-(--color-text-muted) font-medium">Nenhum agendamento encontrado.</p>
                  </td>
                </tr>
              ) : displayed.map(b => {
                const pet   = petMap[b.petId]
                const staff = b.staffId ? staffList.find(s => s.id === b.staffId) : null
                return (
                  <tr key={b.id}
                    className="border-b border-(--color-border) hover:bg-(--color-bg)/60 transition-colors">
                    <td className="px-5 py-4 text-sm font-semibold text-(--color-text-body)">
                      {pet?.name ?? <span className="italic text-(--color-text-muted) text-xs">Pet indisponível</span>}
                    </td>
                    <td className="px-5 py-4 text-sm text-(--color-text-body)">
                      {pet?.breed ?? <span className="italic text-(--color-text-muted) text-xs">–</span>}
                    </td>
                    <td className="px-5 py-4 text-sm text-(--color-text-body)">
                      {staff?.name ?? <span className="italic text-(--color-text-muted) text-xs">Qualquer</span>}
                    </td>
                    <td className="px-5 py-4 text-sm text-(--color-text-body)">
                      {serviceNames[b.serviceId ?? ''] ?? BOOKING_TYPE_LABEL[b.type] ?? b.type}
                    </td>
                    <td className="px-5 py-4 text-sm text-(--color-text-muted) whitespace-nowrap">
                      {formatDateTime(b.bookingDate)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge booking={b} />
                    </td>
                    <td className="px-5 py-4">
                      {renderActions(b)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalItems > 0 && (
          <div className="flex items-center justify-between px-5 py-3.5
                          border-t border-(--color-border) bg-(--color-bg)/30">
            <span className="text-xs text-(--color-text-muted) font-medium">
              Mostrando {firstItem}–{lastItem} de {totalItems}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0}
                className="p-1.5 rounded-lg border border-(--color-border) hover:bg-(--color-bg)
                           text-(--color-text-muted) disabled:opacity-40 transition-colors">
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages-1, p+1))} disabled={page >= totalPages-1}
                className="p-1.5 rounded-lg border border-(--color-border) hover:bg-(--color-bg)
                           text-(--color-text-muted) disabled:opacity-40 transition-colors">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {blocksOpen && partnerId && (
        <AgendaBlocksDialog partnerId={partnerId} staff={staffList} onClose={() => setBlocksOpen(false)} />
      )}
      {dialog?.action === 'reschedule' && (
        <RescheduleBookingDialog booking={dialog.booking} onClose={() => setDialog(null)} onSaved={bookingSaved} />
      )}
      {dialog?.action === 'history' && (
        <Dialog open title="Histórico do agendamento" onOpenChange={open => { if (!open) setDialog(null) }}>
          <BookingHistory bookingId={dialog.booking.id} standalone />
        </Dialog>
      )}
      {(dialog?.action === 'CANCELLED' || dialog?.action === 'NO_SHOW') && (
        <BookingReasonDialog bookingId={dialog.booking.id} status={dialog.action}
          onClose={() => setDialog(null)} onSaved={bookingSaved} />
      )}

    </div>
  )
}
