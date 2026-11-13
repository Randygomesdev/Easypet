import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays, ChevronLeft, ChevronRight, Loader2, MapPin,
  Clock, RefreshCw, X, PawPrint, CreditCard, FileText, Tag,
  Ban, Wallet, AlertCircle,
} from 'lucide-react'
import { bookingService, type BookingResponse, BOOKING_STATUS_LABEL, BOOKING_TYPE_LABEL } from '../../services/booking.service'
import { partnerService, type PartnerResponse } from '../../services/partner.service'
import { petService, type PetResponse } from '../../services/pet.service'
import { creditService } from '../../services/payment.service'

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function formatDateTime(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

const PAYMENT_LABEL: Record<string, string> = {
  CARD:           'Cartão',
  PIX:            'PIX',
  PACKAGE_CREDIT: 'Crédito de Pacote',
  PLATFORM_CREDIT: 'Crédito Easypet',
}

/* ── Status styles ───────────────────────────────────────────────────────── */
const STATUS_STYLE: Record<string, string> = {
  PENDING:     'bg-amber-100  text-amber-700  border-amber-200',
  CONFIRMED:   'bg-blue-100   text-blue-700   border-blue-200',
  IN_PROGRESS: 'bg-purple-100 text-purple-700 border-purple-200',
  COMPLETED:   'bg-green-100  text-green-700  border-green-200',
  CANCELLED:   'bg-red-100    text-red-600    border-red-200',
}
const STATUS_DOT: Record<string, string> = {
  PENDING:     'bg-amber-400',
  CONFIRMED:   'bg-blue-400',
  IN_PROGRESS: 'bg-purple-500',
  COMPLETED:   'bg-green-500',
  CANCELLED:   'bg-red-400',
}

/* ── Helpers de cancelamento ─────────────────────────────────────────────── */
function canCancel(booking: BookingResponse): boolean {
  if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') return false
  const ref = booking.checkIn ?? booking.bookingDate
  if (!ref) return false
  return new Date(ref) > new Date(Date.now() + 2 * 60 * 60 * 1000)
}

function creditMessageForCancel(booking: BookingResponse): string {
  if (booking.paymentMethod === 'PACKAGE_CREDIT') {
    return '1 crédito será devolvido ao seu pacote.'
  }
  return `${formatBRL(booking.price ?? 0)} serão adicionados como crédito Easypet para uso futuro.`
}

/* ── Modal de detalhes ───────────────────────────────────────────────────── */
function BookingDetailModal({
  booking, partner, pet, onClose, onCancelled,
}: {
  booking:     BookingResponse
  partner?:    PartnerResponse
  pet?:        PetResponse
  onClose:     () => void
  onCancelled: (id: string) => void
}) {
  const navigate       = useNavigate()
  const isBoarding     = !!booking.checkIn
  const isFitting      = booking.isFittingRequest
  const serviceName    = partner?.services?.find(s => s.id === booking.serviceId)?.name
  const cancellable    = canCancel(booking)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')

  async function handleCancel() {
    if (!confirm('Confirmar cancelamento?\n\n' + creditMessageForCancel(booking))) return
    setCancelling(true)
    setCancelError('')
    try {
      await bookingService.updateStatus(booking.id, 'CANCELLED')
      onCancelled(booking.id)
      onClose()
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Não foi possível cancelar. Tente novamente.'
      setCancelError(msg)
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-(--color-surface) rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-(--color-border)">
          <div>
            <h2 className="font-bold text-(--color-text-heading) text-base">
              {serviceName ?? BOOKING_TYPE_LABEL[booking.type]}
              {isFitting && (
                <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  encaixe
                </span>
              )}
            </h2>
            <p className="text-xs text-(--color-text-muted) mt-0.5">
              ID #{booking.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-(--color-text-muted) hover:bg-(--color-bg) hover:text-(--color-text-body) transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">

          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-(--color-text-muted)">Status</span>
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLE[booking.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[booking.status] ?? 'bg-gray-400'}`} />
              {BOOKING_STATUS_LABEL[booking.status] ?? booking.status}
            </span>
          </div>

          <hr className="border-(--color-border)" />

          {/* Data / período */}
          <div className="flex items-start gap-3">
            <Clock size={16} className="text-(--color-text-muted) mt-0.5 shrink-0" />
            <div className="text-sm text-(--color-text-body)">
              {isBoarding ? (
                <>
                  <p>Check-in: <strong>{formatDate(booking.checkIn)}</strong></p>
                  <p>Check-out: <strong>{formatDate(booking.checkOut)}</strong></p>
                </>
              ) : (
                <p>{formatDateTime(booking.bookingDate)}</p>
              )}
            </div>
          </div>

          {/* Pet */}
          <div className="flex items-center gap-3">
            <PawPrint size={16} className="text-(--color-text-muted) shrink-0" />
            <span className="text-sm text-(--color-text-body)">
              {pet ? (
                <>
                  <strong>{pet.name}</strong>
                  <span className="text-(--color-text-muted) ml-1">({pet.breed})</span>
                </>
              ) : '—'}
            </span>
          </div>

          {/* Parceiro */}
          <div className="flex items-start gap-3">
            <MapPin size={16} className="text-(--color-text-muted) mt-0.5 shrink-0" />
            <div className="text-sm text-(--color-text-body)">
              <p><strong>{partner?.name ?? '—'}</strong></p>
              {partner?.address && (
                <p className="text-(--color-text-muted) text-xs mt-0.5">{partner.address}</p>
              )}
            </div>
          </div>

          {/* Preço + forma de pagamento */}
          <div className="flex items-center gap-3">
            <CreditCard size={16} className="text-(--color-text-muted) shrink-0" />
            <span className="text-sm text-(--color-text-body)">
              <strong>{formatBRL(booking.price ?? 0)}</strong>
              {booking.paymentMethod && (
                <span className="text-(--color-text-muted) ml-1.5">
                  via {PAYMENT_LABEL[booking.paymentMethod] ?? booking.paymentMethod}
                </span>
              )}
            </span>
          </div>

          {/* Tipo */}
          <div className="flex items-center gap-3">
            <Tag size={16} className="text-(--color-text-muted) shrink-0" />
            <span className="text-sm text-(--color-text-body)">
              {serviceName ?? BOOKING_TYPE_LABEL[booking.type]}
            </span>
          </div>

          {/* Observações */}
          {booking.notes && (
            <div className="flex items-start gap-3">
              <FileText size={16} className="text-(--color-text-muted) mt-0.5 shrink-0" />
              <p className="text-sm text-(--color-text-body) whitespace-pre-wrap">{booking.notes}</p>
            </div>
          )}

          {/* Aviso de cancelamento fora do prazo */}
          {booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED' && !cancellable && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>Cancelamentos devem ser feitos com pelo menos 2 horas de antecedência.</span>
            </div>
          )}

          {/* Erro de cancelamento */}
          {cancelError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{cancelError}</span>
            </div>
          )}

          <hr className="border-(--color-border)" />
          <p className="text-xs text-(--color-text-muted)">
            Criado em {formatDateTime(booking.createdAt)}
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex flex-col gap-2">
          {cancellable && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200
                         text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelling
                ? <Loader2 size={14} className="animate-spin" />
                : <Ban size={14} />
              }
              {cancelling ? 'Cancelando...' : 'Cancelar agendamento'}
            </button>
          )}
          <button
            onClick={() => { onClose(); navigate(`/app/parceiros/${booking.partnerId}`) }}
            className="w-full py-2.5 rounded-xl border border-(--color-border) text-sm font-medium
                       text-(--color-text-muted) hover:bg-(--color-bg) hover:text-(--color-text-body) transition-colors"
          >
            Ver estabelecimento →
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Card simplificado ───────────────────────────────────────────────────── */
function BookingCard({
  booking, partner, pet, onClick,
}: {
  booking: BookingResponse
  partner?: PartnerResponse
  pet?: PetResponse
  onClick: () => void
}) {
  const isBoarding  = !!booking.checkIn
  const serviceName = partner?.services?.find(s => s.id === booking.serviceId)?.name

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-(--color-surface) border border-(--color-border) rounded-2xl p-4 shadow-sm
                 hover:shadow-md hover:border-(--color-primary-300) transition-all cursor-pointer"
    >
      {/* Linha 1: tipo + status */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-(--color-text-heading) truncate">
          {serviceName ?? BOOKING_TYPE_LABEL[booking.type]}
        </p>
        <span className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLE[booking.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[booking.status] ?? 'bg-gray-400'}`} />
          {BOOKING_STATUS_LABEL[booking.status] ?? booking.status}
        </span>
      </div>

      {/* Linha 2: data */}
      <div className="flex items-center gap-1.5 mt-2 text-sm text-(--color-text-body)">
        <Clock size={13} className="text-(--color-text-muted) shrink-0" />
        {isBoarding
          ? `${formatDate(booking.checkIn)} → ${formatDate(booking.checkOut)}`
          : formatDateTime(booking.bookingDate)
        }
      </div>

      {/* Linha 3: pet + parceiro */}
      <div className="flex items-center gap-4 mt-1.5">
        {pet && (
          <span className="flex items-center gap-1.5 text-xs text-(--color-text-muted) truncate">
            <PawPrint size={12} />
            {pet.name}
          </span>
        )}
        <span className="flex items-center gap-1.5 text-xs text-(--color-text-muted) truncate">
          <MapPin size={12} />
          {partner?.name ?? '—'}
        </span>
      </div>
    </button>
  )
}

/* ── Filtro de status ────────────────────────────────────────────────────── */
type FilterStatus = 'ALL' | 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'ALL',         label: 'Todos'        },
  { value: 'PENDING',     label: 'Pendentes'    },
  { value: 'CONFIRMED',   label: 'Confirmados'  },
  { value: 'IN_PROGRESS', label: 'Em Andamento' },
  { value: 'COMPLETED',   label: 'Finalizados'  },
  { value: 'CANCELLED',   label: 'Cancelados'   },
]

/* ── Página principal ────────────────────────────────────────────────────── */
const PAGE_SIZE = 10

export default function MeusAgendamentosPage() {
  const [bookings,      setBookings]      = useState<BookingResponse[]>([])
  const [partners,      setPartners]      = useState<Record<string, PartnerResponse>>({})
  const [pets,          setPets]          = useState<Record<string, PetResponse>>({})
  const [total,         setTotal]         = useState(0)
  const [totalPages,    setTotalPages]    = useState(0)
  const [page,          setPage]          = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [refreshing,    setRefreshing]    = useState(false)
  const [filter,        setFilter]        = useState<FilterStatus>('ALL')
  const [selected,      setSelected]      = useState<BookingResponse | null>(null)
  const [creditBalance, setCreditBalance] = useState<number | null>(null)

  async function load(p: number, showRefresh = false) {
    if (showRefresh) setRefreshing(true)
    else             setLoading(true)
    try {
      const res = await bookingService.myBookings(p, PAGE_SIZE)
      setBookings(res.content)
      setTotal(res.totalElements)
      setTotalPages(res.totalPages)
      setPage(p)

      const uniquePartners = [...new Set(res.content.map(b => b.partnerId))]
      const uniquePets     = [...new Set(res.content.map(b => b.petId))]

      const [partnerEntries, petEntries] = await Promise.all([
        Promise.all(uniquePartners.map(id =>
          partnerService.getById(id).then(p => [id, p] as const).catch(() => null)
        )),
        Promise.all(uniquePets.map(id =>
          petService.getById(id).then(p => [id, p] as const).catch(() => null)
        )),
      ])

      const partnerMap: Record<string, PartnerResponse> = {}
      for (const e of partnerEntries) if (e) partnerMap[e[0]] = e[1]

      const petMap: Record<string, PetResponse> = {}
      for (const e of petEntries) if (e) petMap[e[0]] = e[1]

      setPartners(partnerMap)
      setPets(petMap)
    } catch {
      /* silencioso */
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function loadBalance() {
    try {
      const { balance } = await creditService.getBalance()
      setCreditBalance(balance)
    } catch {
      /* silencioso — usuário pode não ter saldo ainda */
    }
  }

  useEffect(() => {
    load(0)
    loadBalance()
  }, [])

  function handleCancelled(id: string) {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'CANCELLED' as const } : b))
    loadBalance()
  }

  const filtered = filter === 'ALL'
    ? bookings
    : bookings.filter(b => b.status === filter)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-(--color-text-heading)">Meus Agendamentos</h1>
          <p className="text-sm text-(--color-text-muted) mt-0.5">
            {total > 0
              ? `${total} agendamento${total !== 1 ? 's' : ''}`
              : 'Nenhum agendamento ainda'}
          </p>
        </div>
        <button
          onClick={() => load(page, true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-sm text-(--color-text-muted) hover:text-(--color-text-body)
                     transition-colors px-3 py-2 rounded-lg border border-(--color-border) hover:bg-(--color-bg)"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Banner de saldo de créditos */}
      {creditBalance !== null && creditBalance > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 border border-green-200">
          <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <Wallet size={16} className="text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-700">
              Você tem {formatBRL(creditBalance)} em créditos Easypet
            </p>
            <p className="text-xs text-green-600 mt-0.5">
              Use no próximo agendamento e pague menos.
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors
              ${filter === opt.value
                ? 'bg-(--color-primary-700) border-(--color-primary-700) text-white'
                : 'border-(--color-border) text-(--color-text-muted) hover:border-(--color-primary-300)'
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-(--color-primary-700)" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <CalendarDays size={40} className="text-(--color-text-placeholder)" />
          <p className="text-(--color-text-muted)">
            {filter === 'ALL'
              ? 'Você ainda não possui agendamentos.'
              : `Nenhum agendamento ${FILTER_OPTIONS.find(o => o.value === filter)?.label.toLowerCase()}.`}
          </p>
          {filter !== 'ALL' && (
            <button onClick={() => setFilter('ALL')}
                    className="text-sm text-(--color-secondary-500) hover:underline">
              Ver todos
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map(b => (
            <BookingCard
              key={b.id}
              booking={b}
              partner={partners[b.partnerId]}
              pet={pets[b.petId]}
              onClick={() => setSelected(b)}
            />
          ))}
        </div>
      )}

      {/* Paginação */}
      {!loading && filter === 'ALL' && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-(--color-text-muted)">
          <span>Página {page + 1} de {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => load(page - 1)}
              disabled={page === 0}
              className="p-2 rounded-lg border border-(--color-border) hover:bg-(--color-bg)
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => load(page + 1)}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-lg border border-(--color-border) hover:bg-(--color-bg)
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {selected && (
        <BookingDetailModal
          booking={selected}
          partner={partners[selected.partnerId]}
          pet={pets[selected.petId]}
          onClose={() => setSelected(null)}
          onCancelled={handleCancelled}
        />
      )}
    </div>
  )
}
