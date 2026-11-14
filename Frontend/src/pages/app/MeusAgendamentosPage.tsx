import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays, ChevronLeft, ChevronRight, Loader2, MapPin,
  Clock, RefreshCw, X, PawPrint, CreditCard, FileText, Tag,
  Ban, Wallet,
} from 'lucide-react'
import { bookingService, type BookingResponse, BOOKING_STATUS_LABEL, BOOKING_TYPE_LABEL } from '../../services/booking.service'
import { partnerService, type PartnerResponse } from '../../services/partner.service'
import { petService, type PetResponse } from '../../services/pet.service'
import { creditService } from '../../services/payment.service'
import { Button } from '../../components/ui/Button'
import { BookingHistory } from '../../features/booking/BookingHistory'
import { BookingExtrasPanel } from '../../features/booking/BookingExtrasPanel'
import { BookingReasonDialog } from '../../features/booking/BookingReasonDialog'
import { RescheduleBookingDialog } from '../../features/booking/RescheduleBookingDialog'
import { bookingError, bookingStatusLabel, isEditableBooking, noticeDuration } from '../../features/booking/bookingUi'
import type { TutorBookingActions } from '../../services/booking.service'
import type { BookingStatus } from '../../services/booking.service'

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
  NO_SHOW:     'bg-pink-100   text-pink-700   border-pink-200',
  INTERRUPTED: 'bg-red-100    text-red-700    border-red-200',
}
const STATUS_DOT: Record<string, string> = {
  PENDING:     'bg-amber-400',
  CONFIRMED:   'bg-blue-400',
  IN_PROGRESS: 'bg-purple-500',
  COMPLETED:   'bg-green-500',
  CANCELLED:   'bg-red-400',
  NO_SHOW:     'bg-pink-500',
  INTERRUPTED: 'bg-red-500',
}

type BookingPartner = Pick<PartnerResponse,
  'name' | 'services' | 'address' | 'number' | 'neighborhood' | 'city' | 'state'
>

/* ── Modal de detalhes ───────────────────────────────────────────────────── */
function BookingDetailModal({
  booking, partner, pet, onClose, onUpdated,
}: {
  booking:     BookingResponse
  partner?:    BookingPartner
  pet?:        PetResponse
  onClose:     () => void
  onUpdated: (booking: BookingResponse) => void
}) {
  const navigate       = useNavigate()
  const isBoarding     = !!booking.checkIn
  const isFitting      = booking.isFittingRequest
  const serviceName    = partner?.services?.find(s => s.id === booking.serviceId)?.name
  const cityState      = [partner?.city, partner?.state].filter(Boolean).join(' - ')
  const address        = [partner?.address, partner?.number, partner?.neighborhood, cityState]
    .filter(Boolean).join(', ')
  const editable = isEditableBooking(booking)
  const ready = bookingStatusLabel(booking)
  const [action, setAction] = useState<'reschedule' | 'cancel' | null>(null)
  const [actions, setActions] = useState<TutorBookingActions | null>(null)
  const [actionsError, setActionsError] = useState('')
  const [actionsAttempt, setActionsAttempt] = useState(0)

  useEffect(() => {
    if (!editable) return
    let active = true
    bookingService.tutorActions(booking.id)
      .then(result => { if (active) setActions(result) })
      .catch(err => { if (active) setActionsError(bookingError(err, 'Não foi possível consultar as opções da reserva.')) })
    return () => { active = false }
  }, [booking.id, booking.updatedAt, editable, actionsAttempt])

  function handleSaved(updated: BookingResponse) {
    onUpdated(updated)
    setAction(null)
  }

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        role="dialog" aria-modal="true" aria-label="Detalhes do agendamento"
        className="bg-(--color-surface) rounded-2xl shadow-xl w-full max-w-md max-h-[90dvh] overflow-y-auto"
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
            aria-label="Fechar detalhes do agendamento"
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
              {ready ?? BOOKING_STATUS_LABEL[booking.status] ?? booking.status}
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
              <p><strong>{partner?.name ?? 'Estabelecimento indisponível'}</strong></p>
              {address && (
                <p className="text-(--color-text-muted) text-xs mt-0.5">{address}</p>
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

          {(booking.cancellationReason || booking.noShowReason || booking.interruptionReason) && (
            <p className="text-sm text-text-body break-words">{booking.cancellationReason || booking.noShowReason || booking.interruptionReason}</p>
          )}
          {(['IN_PROGRESS', 'COMPLETED', 'INTERRUPTED'] as BookingStatus[]).includes(booking.status) && (
            <BookingExtrasPanel bookingId={booking.id} mode="tutor" inProgress={booking.status === 'IN_PROGRESS'} />
          )}
          <BookingHistory key={booking.updatedAt ?? booking.id} bookingId={booking.id} />

          <hr className="border-(--color-border)" />
          <p className="text-xs text-(--color-text-muted)">
            Criado em {formatDateTime(booking.createdAt)}
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex flex-col gap-2">
          {editable && actionsError && (
            <div className="space-y-2">
              <p role="alert" className="text-sm text-text-danger">{actionsError}</p>
              <Button variant="secondary" onClick={() => { setActionsError(''); setActions(null); setActionsAttempt(value => value + 1) }}>Consultar opções novamente</Button>
            </div>
          )}
          {editable && !actions && !actionsError && <p role="status" className="text-sm text-text-muted">Consultando opções da reserva…</p>}
          {editable && actions && !actions.canCancel && (
            <p className="text-sm text-text-muted">
              O prazo de {noticeDuration(actions.tutorNoticeMinutes)} de antecedência para cancelar ou reagendar terminou.
            </p>
          )}
          {editable && actions?.canCancel && !actions.canReschedule && (
            <p className="text-sm text-text-muted">O estabelecimento está indisponível para novos horários.</p>
          )}
          {booking.status === 'IN_PROGRESS' && <p className="text-sm text-text-muted">Após o início do atendimento, cancelamento e reagendamento ficam indisponíveis.</p>}
          {editable && actions?.canReschedule && <Button variant="secondary" onClick={() => setAction('reschedule')}>Reagendar</Button>}
          {editable && actions?.canCancel && (
              <Button variant="secondary" onClick={() => setAction('cancel')}>
                <Ban size={14} aria-hidden="true" /> Cancelar agendamento
              </Button>
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
      {action === 'reschedule' && (
        <RescheduleBookingDialog booking={booking} onClose={() => setAction(null)} onSaved={handleSaved} />
      )}
      {action === 'cancel' && (
        <BookingReasonDialog bookingId={booking.id} status="CANCELLED"
          onClose={() => setAction(null)} onSaved={handleSaved} />
      )}
    </>
  )
}

/* ── Card simplificado ───────────────────────────────────────────────────── */
function BookingCard({
  booking, partner, pet, onClick,
}: {
  booking: BookingResponse
  partner?: BookingPartner
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
          {bookingStatusLabel(booking) ?? BOOKING_STATUS_LABEL[booking.status] ?? booking.status}
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
          {partner?.name ?? 'Estabelecimento indisponível'}
        </span>
      </div>
    </button>
  )
}

/* ── Filtro de status ────────────────────────────────────────────────────── */
type FilterStatus = 'ALL' | BookingStatus

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'ALL',         label: 'Todos'        },
  { value: 'PENDING',     label: 'Pendentes'    },
  { value: 'CONFIRMED',   label: 'Confirmados'  },
  { value: 'IN_PROGRESS', label: 'Em Andamento' },
  { value: 'COMPLETED',   label: 'Finalizados'  },
  { value: 'CANCELLED',   label: 'Cancelados'   },
  { value: 'NO_SHOW',     label: 'Faltas'       },
  { value: 'INTERRUPTED', label: 'Interrompidos' },
]

/* ── Página principal ────────────────────────────────────────────────────── */
const PAGE_SIZE = 10

export default function MeusAgendamentosPage() {
  const [bookings,      setBookings]      = useState<BookingResponse[]>([])
  const [partners,      setPartners]      = useState<Record<string, BookingPartner>>({})
  const [pets,          setPets]          = useState<Record<string, PetResponse>>({})
  const [total,         setTotal]         = useState(0)
  const [totalPages,    setTotalPages]    = useState(0)
  const [page,          setPage]          = useState(0)
  const [request, setRequest] = useState({ page: 0, refreshing: false, status: 'ALL' as FilterStatus })
  const [completedRequest, setCompletedRequest] = useState<typeof request | null>(null)
  const [loadError, setLoadError] = useState('')
  const filter = request.status
  const [selected,      setSelected]      = useState<BookingResponse | null>(null)
  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  const pending = request !== completedRequest
  const loading = pending && !request.refreshing
  const refreshing = pending && request.refreshing

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const res = await bookingService.myBookings(request.page, PAGE_SIZE, request.status === 'ALL' ? undefined : request.status)
        const uniquePartners = [...new Set(res.content.map(b => b.partnerId))]
        const uniquePets = [...new Set(res.content.map(b => b.petId))]
        const [partnerEntries, petEntries] = await Promise.all([
          Promise.allSettled(uniquePartners.map(async id => [id, await partnerService.getCatalogPartner(id)] as const)),
          Promise.allSettled(uniquePets.map(async id => [id, await petService.getById(id)] as const)),
        ])
        if (!active) return
        setBookings(res.content)
        setTotal(res.totalElements)
        setTotalPages(res.totalPages)
        setPage(res.number)
        setPartners(Object.fromEntries(partnerEntries.flatMap(result =>
          result.status === 'fulfilled' ? [result.value] : []
        )))
        setPets(Object.fromEntries(petEntries.flatMap(result =>
          result.status === 'fulfilled' ? [result.value] : []
        )))
        setLoadError('')
      } catch (err) {
        if (active) setLoadError(bookingError(err, 'Não foi possível carregar os agendamentos.'))
      } finally {
        if (active) setCompletedRequest(request)
      }
    }
    void load()
    return () => { active = false }
  }, [request])

  function changePage(next: number, showRefresh = false) {
    setRequest(current => ({ ...current, page: next, refreshing: showRefresh }))
  }

  function setFilter(status: FilterStatus) {
    if (status !== filter) setRequest({ page: 0, refreshing: false, status })
  }

  useEffect(() => {
    let active = true
    creditService.getBalance()
      .then(({ balance }) => { if (active) setCreditBalance(balance) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  function handleUpdated(updated: BookingResponse) {
    setBookings(prev => prev.map(b => b.id === updated.id ? updated : b))
    setSelected(updated)
    changePage(page, true)
  }

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
          onClick={() => changePage(page, true)}
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
            aria-pressed={filter === opt.value}
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
      ) : !pending && loadError ? (
        <div className="space-y-2 text-center">
          <p role="alert" className="text-sm text-text-danger">{loadError}</p>
          <Button variant="secondary" onClick={() => changePage(request.page)}>Tentar novamente</Button>
        </div>
      ) : bookings.length === 0 ? (
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
          {bookings.map(b => (
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
      {!pending && !loadError && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-(--color-text-muted)">
          <span>Página {page + 1} de {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => changePage(page - 1)}
              aria-label="Página anterior"
              disabled={page === 0}
              className="p-2 rounded-lg border border-(--color-border) hover:bg-(--color-bg)
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => changePage(page + 1)}
              aria-label="Próxima página"
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
          key={`${selected.id}:${selected.updatedAt ?? selected.bookingDate}:${selected.status}`}
          booking={selected}
          partner={partners[selected.partnerId]}
          pet={pets[selected.petId]}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  )
}
