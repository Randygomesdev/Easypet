import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Loader2, Search, ChevronLeft, ChevronRight,
  CheckCircle2, Stethoscope, Syringe, Scissors,
  Clock, SlidersHorizontal, CalendarDays,
} from 'lucide-react'
import { staffService, type StaffResponse } from '../../../services/staff.service'
import { petService, type PetResponse } from '../../../services/pet.service'
import {
  bookingService, type BookingResponse, type BookingStatus, type BookingType,
  BOOKING_TYPE_LABEL, BOOKING_STATUS_LABEL,
} from '../../../services/booking.service'

/* ─── Helpers ─── */
function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function todayKey() { return toDateKey(new Date()) }

function weekRange() {
  const d = new Date(), day = d.getDay()
  const mon = new Date(d); mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return { startDate: toDateKey(mon), endDate: toDateKey(sun) }
}

function monthRange() {
  const d = new Date()
  return {
    startDate: toDateKey(new Date(d.getFullYear(), d.getMonth(), 1)),
    endDate:   toDateKey(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
  }
}

function formatDateTime(iso?: string) {
  if (!iso) return '–'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

type ChipId = 'hoje' | 'pendentes' | 'confirmados' | 'finalizados' | 'semana' | 'mes'

function buildChips() {
  const week = weekRange(), month = monthRange()
  return [
    { id: 'hoje'       as ChipId, label: 'Hoje',        date:      todayKey()        },
    { id: 'pendentes'  as ChipId, label: 'Pendentes',   status:    'PENDING'         as BookingStatus },
    { id: 'confirmados'as ChipId, label: 'Confirmados', status:    'CONFIRMED'       as BookingStatus },
    { id: 'finalizados'as ChipId, label: 'Finalizados', status:    'COMPLETED'       as BookingStatus },
    { id: 'semana'     as ChipId, label: 'Esta semana', ...week },
    { id: 'mes'        as ChipId, label: 'Este mês',    ...month },
  ]
}

const STATUS_STYLE: Record<BookingStatus, string> = {
  COMPLETED:   'bg-emerald-100 text-emerald-700',
  CONFIRMED:   'bg-violet-100  text-violet-700',
  IN_PROGRESS: 'bg-blue-100    text-blue-700',
  PENDING:     'bg-amber-100   text-amber-700',
  CANCELLED:   'bg-pink-100    text-pink-600',
}

function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {BOOKING_STATUS_LABEL[status] ?? status}
    </span>
  )
}

const ALL_TYPES: BookingType[] = ['CONSULTATION','VACCINATION','GROOMING','BOARDING','OTHER']
const PAGE_SIZE = 10

/* ─── Tab principal ─── */
export default function AgendamentosTab({ partnerId }: { partnerId: string }) {
  const [bookings,      setBookings]      = useState<BookingResponse[]>([])
  const [staffList,     setStaffList]     = useState<StaffResponse[]>([])
  const [petMap,        setPetMap]        = useState<Record<string, PetResponse>>({})
  const [loading,       setLoading]       = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [page,          setPage]          = useState(0)
  const [totalPages,    setTotalPages]    = useState(0)
  const [totalItems,    setTotalItems]    = useState(0)

  const chips = buildChips()
  const [activeChip,  setActiveChip]  = useState<ChipId>('hoje')
  const [search,      setSearch]      = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [fStatus,     setFStatus]     = useState<BookingStatus | ''>('')
  const [fType,       setFType]       = useState<BookingType | ''>('')
  const [fStaff,      setFStaff]      = useState('')
  const [fStart,      setFStart]      = useState('')
  const [fEnd,        setFEnd]        = useState('')

  const chipFilters = useMemo(() => {
    const chip = chips.find(c => c.id === activeChip)!
    return { date: (chip as any).date, status: (chip as any).status, startDate: (chip as any).startDate, endDate: (chip as any).endDate }
  }, [activeChip])

  useEffect(() => {
    staffService.getByPartner(partnerId)
      .then(list => setStaffList(list))
      .catch(() => {})
  }, [partnerId])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const hasAdvanced = fStatus || fType || fStaff || fStart || fEnd
      const params = hasAdvanced
        ? { status: fStatus || undefined, type: fType || undefined, staffId: fStaff || undefined, startDate: fStart || undefined, endDate: fEnd || undefined, page, size: PAGE_SIZE }
        : { ...chipFilters, page, size: PAGE_SIZE }

      const res = await bookingService.getByPartner(partnerId, params)
      setBookings(res.content)
      setTotalPages(res.totalPages)
      setTotalItems(res.totalElements)
      res.content.forEach(b => {
        if (b.petId && !petMap[b.petId])
          petService.getById(b.petId)
            .then(pet => setPetMap(prev => ({ ...prev, [pet.id]: pet })))
            .catch(() => {})
      })
    } catch {
      setBookings([])
      setTotalPages(0)
      setTotalItems(0)
    } finally { setLoading(false) }
  }, [partnerId, chipFilters, fStatus, fType, fStaff, fStart, fEnd, page])

  useEffect(() => { load() }, [load])

  /* KPIs */
  const kpiPending   = bookings.filter(b => b.status === 'PENDING').length
  const kpiConfirmed = bookings.filter(b => b.status === 'CONFIRMED').length
  const kpiCompleted = bookings.filter(b => b.status === 'COMPLETED').length
  const kpiConsulta  = bookings.filter(b => b.type === 'CONSULTATION').length
  const kpiVacina    = bookings.filter(b => b.type === 'VACCINATION').length
  const kpiGrooming  = bookings.filter(b => b.type === 'GROOMING').length

  const displayed = useMemo(() => {
    if (!search.trim()) return bookings
    const q = search.toLowerCase()
    return bookings.filter(b => (petMap[b.petId]?.name ?? '').toLowerCase().includes(q))
  }, [bookings, petMap, search])

  async function handleStatusChange(id: string, status: BookingStatus) {
    setActionLoading(id)
    try { await bookingService.updateStatus(id, status); await load() }
    catch { }
    finally { setActionLoading(null) }
  }

  async function handleFitting(id: string, decision: 'APPROVE' | 'REJECT') {
    setActionLoading(id)
    try { await bookingService.processFittingDecision(id, decision); await load() }
    catch { }
    finally { setActionLoading(null) }
  }

  function ActionButtons({ b }: { b: BookingResponse }) {
    if (actionLoading === b.id) return <Loader2 size={14} className="animate-spin text-(--color-primary-700)" />

    if (b.status === 'PENDING' && b.isFittingRequest) return (
      <div className="flex gap-1.5">
        <button onClick={() => handleFitting(b.id, 'APPROVE')}
          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">Aprovar</button>
        <button onClick={() => handleFitting(b.id, 'REJECT')}
          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-pink-100 text-pink-600 hover:bg-pink-200 transition-colors">Rejeitar</button>
      </div>
    )
    if (b.status === 'PENDING') return (
      <div className="flex gap-1.5">
        <button onClick={() => handleStatusChange(b.id, 'CONFIRMED')}
          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors">Confirmar</button>
        <button onClick={() => handleStatusChange(b.id, 'CANCELLED')}
          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-pink-100 text-pink-600 hover:bg-pink-200 transition-colors">Cancelar</button>
      </div>
    )
    if (b.status === 'CONFIRMED') return (
      <button onClick={() => handleStatusChange(b.id, 'COMPLETED')}
        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-(--color-secondary-500) text-white hover:opacity-90 transition-opacity">
        Concluir
      </button>
    )
    return null
  }

  function handleChip(id: ChipId) {
    setActiveChip(id)
    setFStatus(''); setFType(''); setFStaff(''); setFStart(''); setFEnd('')
    setShowFilters(false); setPage(0)
  }

  const firstItem = page * PAGE_SIZE + 1
  const lastItem  = Math.min(page * PAGE_SIZE + bookings.length, totalItems)

  return (
    <div className="space-y-5">

      {/* Cabeçalho */}
      <div>
        <h2 className="text-lg font-bold text-(--color-text-heading)">Agendamentos</h2>
        <p className="text-sm text-(--color-text-muted) mt-1">Gerencie os atendimentos do estabelecimento</p>
      </div>

      {/* KPIs */}
      <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl shadow-sm overflow-hidden">
        <div className="hidden lg:flex divide-x divide-(--color-border)">
          {[
            { label: 'Pendentes',    value: kpiPending,   icon: <Clock size={16}/>,        bg: 'bg-amber-100',   color: 'text-amber-600'   },
            { label: 'Confirmados',  value: kpiConfirmed, icon: <CalendarDays size={16}/>, bg: 'bg-violet-100',  color: 'text-violet-600'  },
            { label: 'Finalizados',  value: kpiCompleted, icon: <CheckCircle2 size={16}/>, bg: 'bg-emerald-100', color: 'text-emerald-600' },
            { label: 'Consultas',    value: kpiConsulta,  icon: <Stethoscope size={16}/>,  bg: 'bg-teal-100',    color: 'text-teal-600'    },
            { label: 'Vacinação',    value: kpiVacina,    icon: <Syringe size={16}/>,      bg: 'bg-indigo-100',  color: 'text-indigo-600'  },
            { label: 'Banho e tosa', value: kpiGrooming,  icon: <Scissors size={16}/>,     bg: 'bg-pink-100',    color: 'text-pink-600'    },
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
        <div className="lg:hidden grid grid-cols-3 divide-x divide-(--color-border)">
          {[
            { label: 'Pendentes',   value: kpiPending,   color: 'text-amber-600'   },
            { label: 'Confirmados', value: kpiConfirmed, color: 'text-violet-600'  },
            { label: 'Finalizados', value: kpiCompleted, color: 'text-emerald-600' },
          ].map((k, i) => (
            <div key={i} className="flex flex-col items-center py-3 gap-0.5">
              <p className={`text-xl font-black tabular-nums ${k.color}`}>{k.value}</p>
              <p className="text-[9px] font-semibold text-(--color-text-muted) text-center leading-tight px-1">{k.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Chips + Busca */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {chips.map(c => (
            <button key={c.id} onClick={() => handleChip(c.id)}
              className={['px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap',
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome do pet…"
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-(--color-border)
              bg-(--color-surface) text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700)" />
          </div>
          <button onClick={() => setShowFilters(v => !v)}
            className={['flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border transition-colors',
              showFilters
                ? 'border-(--color-primary-700) text-(--color-primary-700) bg-(--color-primary-700)/10'
                : 'border-(--color-border) text-(--color-text-muted) hover:border-(--color-primary-700)/50 bg-(--color-surface)',
            ].join(' ')}>
            <SlidersHorizontal size={15} /> Filtros
          </button>
        </div>

        {showFilters && (
          <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-(--color-text-muted) mb-1">Status</label>
                <select value={fStatus} onChange={e => setFStatus(e.target.value as BookingStatus | '')}
                  className="w-full text-sm rounded-xl border border-(--color-border) bg-(--color-bg) px-3 py-2 text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700)">
                  <option value="">Todos</option>
                  <option value="PENDING">Pendente</option>
                  <option value="CONFIRMED">Confirmado</option>
                  <option value="COMPLETED">Finalizado</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-(--color-text-muted) mb-1">Tipo</label>
                <select value={fType} onChange={e => setFType(e.target.value as BookingType | '')}
                  className="w-full text-sm rounded-xl border border-(--color-border) bg-(--color-bg) px-3 py-2 text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700)">
                  <option value="">Todos</option>
                  {ALL_TYPES.map(t => <option key={t} value={t}>{BOOKING_TYPE_LABEL[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-(--color-text-muted) mb-1">Profissional</label>
                <select value={fStaff} onChange={e => setFStaff(e.target.value)}
                  className="w-full text-sm rounded-xl border border-(--color-border) bg-(--color-bg) px-3 py-2 text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700)">
                  <option value="">Todos</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-(--color-text-muted) mb-1">Data início</label>
                <input type="date" value={fStart} onChange={e => setFStart(e.target.value)}
                  className="w-full text-sm rounded-xl border border-(--color-border) bg-(--color-bg) px-3 py-2 text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700)" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-(--color-text-muted) mb-1">Data fim</label>
                <input type="date" value={fEnd} onChange={e => setFEnd(e.target.value)}
                  className="w-full text-sm rounded-xl border border-(--color-border) bg-(--color-bg) px-3 py-2 text-(--color-text-body) focus:outline-none focus:border-(--color-primary-700)" />
              </div>
              <div className="col-span-2 lg:col-span-3 flex items-end gap-2">
                <button onClick={() => setPage(0)} className="px-4 py-2 text-sm font-semibold rounded-xl bg-(--color-primary-700) text-white hover:opacity-90 transition-opacity">Aplicar</button>
                <button onClick={() => { setFStatus(''); setFType(''); setFStaff(''); setFStart(''); setFEnd(''); setSearch(''); setPage(0) }}
                  className="px-4 py-2 text-sm font-semibold rounded-xl border border-(--color-border) text-(--color-text-muted) hover:border-(--color-primary-700)/50 transition-colors">Limpar</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-(--color-border)">
                {['PET','RAÇA','PROFISSIONAL','TIPO','DATA / HORÁRIO','STATUS','AÇÕES'].map(col => (
                  <th key={col} className="text-left px-5 py-3.5 text-[11px] font-bold text-(--color-text-muted) uppercase tracking-wider whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-16"><Loader2 size={24} className="animate-spin text-(--color-primary-700) mx-auto" /></td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-sm text-(--color-text-muted) font-medium">Nenhum agendamento encontrado.</td></tr>
              ) : displayed.map(b => {
                const pet   = petMap[b.petId]
                const staff = b.staffId ? staffList.find(s => s.id === b.staffId) : null
                return (
                  <tr key={b.id} className="border-b border-(--color-border) hover:bg-(--color-bg)/60 transition-colors">
                    <td className="px-5 py-4 text-sm font-semibold text-(--color-text-body)">{pet?.name ?? <span className="italic text-(--color-text-muted) text-xs">–</span>}</td>
                    <td className="px-5 py-4 text-sm text-(--color-text-body)">{pet?.breed ?? <span className="italic text-(--color-text-muted) text-xs">–</span>}</td>
                    <td className="px-5 py-4 text-sm text-(--color-text-body)">{staff?.name ?? <span className="italic text-(--color-text-muted) text-xs">Qualquer</span>}</td>
                    <td className="px-5 py-4 text-sm text-(--color-text-body)">{BOOKING_TYPE_LABEL[b.type] ?? b.type}</td>
                    <td className="px-5 py-4 text-sm text-(--color-text-muted) whitespace-nowrap">{formatDateTime(b.bookingDate)}</td>
                    <td className="px-5 py-4"><StatusBadge status={b.status} /></td>
                    <td className="px-5 py-4"><ActionButtons b={b} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {totalItems > 0 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-(--color-border) bg-(--color-bg)/30">
            <span className="text-xs text-(--color-text-muted) font-medium">
              Mostrando {firstItem}–{lastItem} de {totalItems}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0}
                className="p-1.5 rounded-lg border border-(--color-border) hover:bg-(--color-bg) text-(--color-text-muted) disabled:opacity-40 transition-colors">
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages-1, p+1))} disabled={page >= totalPages-1}
                className="p-1.5 rounded-lg border border-(--color-border) hover:bg-(--color-bg) text-(--color-text-muted) disabled:opacity-40 transition-colors">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
