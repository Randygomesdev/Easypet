import { useState, useEffect, Fragment } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Star, Phone, Clock, Loader2,
  MessageCircle, ExternalLink, ChevronLeft, ChevronRight,
  Store, Package, Send, CalendarDays, CheckCircle, CreditCard, X,
  ShoppingCart,
} from 'lucide-react'
import { partnerService, type PartnerResponse, type ReviewResponse, type ReviewRequest, type ServiceOffer } from '../../services/partner.service'
import { packageService, type CustomerPackageResponse, type PackageTemplateResponse } from '../../services/package.service'
import { bookingService, type AvailabilitySlot, type StaffSlot } from '../../services/booking.service'
import { petService, type PetResponse, SPECIES_LABEL } from '../../services/pet.service'
import { useAuth } from '../../contexts/AuthContext'
import { env } from '../../config/env'
import { useCart } from '../../contexts/CartContext'
import type { EasypetCartMeta, EasypetPackageMeta } from '../../services/payment.service'

// ── Helpers ─────────────────────────────────────────────────────────────────

function isOpenNow(businessHours: PartnerResponse['businessHours']): boolean {
  if (!businessHours?.length) return false
  const now  = new Date()
  const days = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY']
  const bh   = businessHours.find(h => h.dayOfWeek === days[now.getDay()])
  if (!bh || bh.closed) return false
  const cur  = now.getHours() * 60 + now.getMinutes()
  const [sh, sm] = bh.businessStartHour.split(':').map(Number)
  const [eh, em] = bh.businessEndHour.split(':').map(Number)
  const start = sh * 60 + sm
  const end   = eh * 60 + em
  if (cur < start || cur >= end) return false
  if (bh.lunchStartHour && bh.lunchEndHour) {
    const [lsh, lsm] = bh.lunchStartHour.split(':').map(Number)
    const [leh, lem] = bh.lunchEndHour.split(':').map(Number)
    if (cur >= lsh * 60 + lsm && cur < leh * 60 + lem) return false
  }
  return true
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function RatingStars({ value, size = 14 }: { value: number; size?: number }) {
  const full  = Math.floor(value)
  const half  = value - full >= 0.5
  const empty = 5 - full - (half ? 1 : 0)
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: full  }).map((_, i) => <Star key={`f${i}`} size={size} className="fill-amber-400 text-amber-400" />)}
      {half && <Star size={size} className="fill-amber-300 text-amber-300" />}
      {Array.from({ length: empty }).map((_, i) => <Star key={`e${i}`} size={size} className="text-(--color-border)" />)}
    </span>
  )
}

// ── Gallery ──────────────────────────────────────────────────────────────────

function Gallery({ pictures, name }: { pictures: string[]; name: string }) {
  const [active, setActive] = useState(0)
  const list = pictures.length ? pictures : []
  const prev = () => setActive(i => Math.max(0, i - 1))
  const next = () => setActive(i => Math.min(list.length - 1, i + 1))

  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl overflow-hidden bg-(--color-bg) h-64 lg:h-80 flex items-center justify-center">
        {list.length ? (
          <img src={list[active]} alt={name} className="w-full h-full object-cover" />
        ) : (
          <Store size={64} className="text-(--color-text-muted) opacity-20" />
        )}
        {list.length > 1 && (
          <>
            <button onClick={prev} disabled={active === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full
                               bg-black/40 text-white flex items-center justify-center disabled:opacity-30">
              <ChevronLeft size={16} />
            </button>
            <button onClick={next} disabled={active === list.length - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full
                               bg-black/40 text-white flex items-center justify-center disabled:opacity-30">
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>
      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {list.map((src, i) => (
            <button key={i} onClick={() => setActive(i)}
                    className={`shrink-0 w-16 h-14 rounded-xl overflow-hidden border-2 transition-colors
                      ${i === active ? 'border-(--color-secondary-500)' : 'border-transparent'}`}>
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Reviews ──────────────────────────────────────────────────────────────────

function ReviewSection({ partnerId }: { partnerId: string }) {
  const { user }      = useAuth()
  const [reviews, setReviews]     = useState<ReviewResponse[]>([])
  const [loading, setLoading]     = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm]   = useState(false)
  const [rating,  setRating]      = useState(5)
  const [comment, setComment]     = useState('')

  useEffect(() => {
    partnerService.getReviews(partnerId)
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setLoading(false))
  }, [partnerId])

  async function handleSubmit() {
    if (!user) return
    setSubmitting(true)
    try {
      const req: ReviewRequest = { rating, comment: comment || undefined, authorName: user.name }
      const created = await partnerService.submitReview(partnerId, req)
      setReviews(r => [created, ...r])
      setShowForm(false)
      setComment('')
      setRating(5)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-(--color-text-heading)">Avaliações</h3>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
                  className="text-sm text-(--color-secondary-500) hover:underline">
            Avaliar
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-(--color-bg) border border-(--color-border) rounded-xl p-4 space-y-3">
          <div className="flex gap-1">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setRating(n)}>
                <Star size={22} className={n <= rating ? 'fill-amber-400 text-amber-400' : 'text-(--color-border)'} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Deixe um comentário (opcional)…"
            rows={3}
            className="w-full text-sm px-3 py-2 rounded-xl border border-(--color-border)
                       bg-(--color-surface) text-(--color-text-body) outline-none
                       focus:ring-2 focus:ring-(--color-primary-500) resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)}
                    className="px-4 py-1.5 text-sm rounded-lg border border-(--color-border)
                               text-(--color-text-body) hover:bg-(--color-surface)">
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={submitting}
                    className="px-4 py-1.5 text-sm rounded-lg bg-(--color-secondary-500) text-white
                               hover:bg-(--color-secondary-600) disabled:opacity-50 flex items-center gap-1.5">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Enviar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-(--color-primary-700)" /></div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-(--color-text-muted) text-center py-8">Ainda não há avaliações.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="bg-(--color-bg) border border-(--color-border) rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-(--color-text-heading)">{r.authorName}</span>
                <div className="flex items-center gap-1.5">
                  <RatingStars value={r.rating} size={12} />
                  <span className="text-xs text-(--color-text-muted)">
                    {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
              {r.comment && <p className="text-sm text-(--color-text-body)">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Shared ───────────────────────────────────────────────────────────────────

const inputCls = `w-full px-3 py-2.5 text-sm rounded-xl border border-(--color-border)
                  bg-(--color-bg) text-(--color-text-body) outline-none
                  focus:ring-2 focus:ring-(--color-primary-500)`

// ── BookingModal ──────────────────────────────────────────────────────────────

type BookingView = 'config' | 'slots' | 'confirm' | 'added' | 'booked'

function BookingModal({
  service, partnerId, partnerName, onClose,
}: {
  service:     ServiceOffer
  partnerId:   string
  partnerName: string
  onClose:     () => void
}) {
  const navigate = useNavigate()
  const { addItem } = useCart()
  const isDaily = service.billingUnit === 'DAILY'

  const [view,           setView]           = useState<BookingView>('config')
  const [pets,           setPets]           = useState<PetResponse[]>([])
  const [petId,          setPetId]          = useState('')
  // Slots flow
  const [date,           setDate]           = useState('')
  const [slots,          setSlots]          = useState<AvailabilitySlot[]>([])
  const [loadingSlots,   setLoadingSlots]   = useState(false)
  const [selectedSlot,   setSelectedSlot]   = useState<AvailabilitySlot | null>(null)
  const [staffId,        setStaffId]        = useState<string | null>(null)
  const [requestFitting, setRequestFitting] = useState(false)
  // Daily flow
  const [checkInDate,  setCheckInDate]  = useState('')
  const [checkInTime,  setCheckInTime]  = useState('08:00')
  const [checkOutDate, setCheckOutDate] = useState('')
  const [checkOutTime, setCheckOutTime] = useState('18:00')
  // Package credits
  const [activePackages,  setActivePackages]  = useState<CustomerPackageResponse[]>([])
  const [usePackage,      setUsePackage]       = useState(false)
  const [bookingPkg,      setBookingPkg]       = useState<CustomerPackageResponse | null>(null)
  const [bookingLoading,  setBookingLoading]   = useState(false)
  // Submit
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    petService.list()
      .then(p => {
        const list: PetResponse[] = Array.isArray(p) ? p : (p as any).content ?? []
        setPets(list)
        if (list.length === 1) setPetId(list[0].id)
      })
      .catch(() => {})
    // Carregar pacotes ativos do usuário para este parceiro/serviço
    if (env.internalPilot) return
    packageService.myBalances()
      .then(pkgs => {
        const compatible = pkgs.filter(
          pkg => pkg.packageTemplate.partnerId === partnerId
              && pkg.packageTemplate.serviceId === service.id
        )
        setActivePackages(compatible)
        if (compatible.length > 0) setBookingPkg(compatible[0])
      })
      .catch(() => {})
  }, [])

  function handleDateChange(newDate: string) {
    setDate(newDate)
    setSelectedSlot(null)
    setStaffId(null)
    if (!newDate) return
    setLoadingSlots(true)
    bookingService.getAvailability(partnerId, newDate, service.id)
      .then(s => setSlots(s))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }

  function handleSlotSelect(slot: AvailabilitySlot) {
    if (!slot.available && !slot.allowFittingRequest) return
    setSelectedSlot(slot)
    setStaffId(null)
    setRequestFitting(!slot.available && !!slot.allowFittingRequest)
  }

  function goNext() {
    setError('')
    if (view === 'config') {
      if (!petId) { setError('Selecione um pet.'); return }
      if (isDaily) {
        if (!checkInDate || !checkOutDate) { setError('Preencha as datas de check-in e check-out.'); return }
        setView('confirm')
      } else {
        if (!date) { setError('Selecione uma data.'); return }
        setView('slots')
      }
    } else if (view === 'slots') {
      if (!selectedSlot) { setError('Selecione um horário.'); return }
      setView('confirm')
    }
  }

  function goBack() {
    setError('')
    if (view === 'slots')   setView('config')
    if (view === 'confirm') setView(isDaily ? 'config' : 'slots')
  }

  async function handleAddToCart() {
    const pet = pets.find(p => p.id === petId)
    const staffMember = staffId
      ? (selectedSlot?.staff as StaffSlot[] | undefined)?.find(s => s.id === staffId)
      : undefined

    const meta: EasypetCartMeta = {
      partnerId,
      partnerName,
      bookingType: isDaily ? 'BOARDING' : (service.bookingType as EasypetCartMeta['bookingType'] | undefined) ?? 'OTHER',
      scheduledDate: isDaily ? checkInDate : date,
      scheduledTime: isDaily ? checkInTime : (selectedSlot?.time ?? ''),
      checkIn:  isDaily ? `${checkInDate}T${checkInTime}:00`  : undefined,
      checkOut: isDaily ? `${checkOutDate}T${checkOutTime}:00` : undefined,
      durationMinutes: service.durationMinutes ?? undefined,
      staffId:   staffId ?? undefined,
      staffName: staffMember?.name,
      petId,
      petName: pet?.name ?? '',
    }

    if (env.internalPilot) {
      setBookingLoading(true)
      setError('')
      try {
        await bookingService.create({
          petId, partnerId, serviceId: service.id,
          type: meta.bookingType,
          price: isDaily ? dailyNights * service.price : service.price,
          staffId: staffId ?? undefined,
          requestFitting: !isDaily && requestFitting,
          ...(isDaily
            ? { checkIn: meta.checkIn, checkOut: meta.checkOut }
            : { bookingDate: `${date}T${selectedSlot?.time}:00` }),
        })
        setView('booked')
      } catch {
        setError('Não foi possível criar a reserva. Verifique o horário e tente novamente.')
      } finally {
        setBookingLoading(false)
      }
      return
    }

    addItem({
      productId:   service.id,
      label:       service.name,
      description: service.description ?? undefined,
      price:       isDaily ? dailyNights * service.price : service.price,
      quantity:    1,
      metadata:    meta as unknown as Record<string, unknown>,
    })

    setView('added')
  }

  async function handleBookWithPackage() {
    if (!bookingPkg || !petId) return
    setBookingLoading(true)
    setError('')
    try {
      // Consumir 1 crédito do pacote
      await bookingService.create({
        petId,
        partnerId,
        serviceId:     service.id,
        type:          'OTHER',
        price:         isDaily ? dailyNights * service.price : service.price,
        staffId:       staffId ?? undefined,
        paymentMethod: 'PACKAGE_CREDIT',
        customerPackageId: bookingPkg.id,
        ...(isDaily
          ? { checkIn: `${checkInDate}T${checkInTime}:00`, checkOut: `${checkOutDate}T${checkOutTime}:00` }
          : { bookingDate: `${date}T${selectedSlot?.time}:00` }
        ),
      })
      setView('booked')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Não foi possível confirmar o agendamento.')
    } finally {
      setBookingLoading(false)
    }
  }

  // Step indicator
  const STEPS = isDaily ? ['Dados', 'Confirmar'] : ['Dados', 'Horário', 'Confirmar']
  const stepIdx = view === 'config' ? 0 : view === 'slots' ? 1 : view === 'confirm' ? (isDaily ? 1 : 2) : 99

  // Daily total calc
  const dailyNights = (checkInDate && checkOutDate)
    ? Math.max(1, Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86400000))
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-lg bg-(--color-surface) rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-(--color-border) shrink-0">
          <div>
            <h2 className="text-base font-semibold text-(--color-text-heading)">Agendar serviço</h2>
            <p className="text-sm text-(--color-text-muted)">
              {service.name} · {formatBRL(service.price)}{isDaily ? '/dia' : '/sessão'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-(--color-bg) text-(--color-text-muted)">
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        {view !== 'added' && (
          <div className="flex items-center px-5 py-3 border-b border-(--color-border) shrink-0">
            {STEPS.map((label, i) => (
              <Fragment key={label}>
                {i > 0 && (
                  <div className={`flex-1 h-px mx-2 ${i <= stepIdx ? 'bg-(--color-secondary-500)' : 'bg-(--color-border)'}`} />
                )}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                    ${i < stepIdx  ? 'bg-(--color-secondary-500) text-white'
                    : i === stepIdx ? 'bg-(--color-secondary-500) text-white ring-4 ring-(--color-secondary-500)/20'
                    : 'bg-(--color-border) text-(--color-text-muted)'}`}>
                    {i < stepIdx ? <CheckCircle size={13} /> : i + 1}
                  </div>
                  <span className={`text-xs ${i === stepIdx ? 'font-semibold text-(--color-text-heading)' : 'text-(--color-text-muted)'}`}>
                    {label}
                  </span>
                </div>
              </Fragment>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* ── VIEW: config ── */}
          {view === 'config' && (
            <>
              {/* Pet */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide">
                  Pet <span className="text-red-500">*</span>
                </label>
                {pets.length === 0 ? (
                  <p className="text-sm text-(--color-text-muted)">
                    Você não tem pets cadastrados.{' '}
                    <a href="/app/pets/novo" className="text-(--color-secondary-500) hover:underline">Cadastrar agora</a>
                  </p>
                ) : (
                  <select value={petId} onChange={e => setPetId(e.target.value)} className={inputCls}>
                    <option value="">Selecione um pet</option>
                    {pets.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({SPECIES_LABEL[p.species]})</option>
                    ))}
                  </select>
                )}
              </div>

              {isDaily ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide">
                        Check-in <span className="text-red-500">*</span>
                      </label>
                      <input type="date" min={today} value={checkInDate}
                             onChange={e => setCheckInDate(e.target.value)} className={inputCls} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide">Horário</label>
                      <input type="time" value={checkInTime}
                             onChange={e => setCheckInTime(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide">
                        Check-out <span className="text-red-500">*</span>
                      </label>
                      <input type="date" min={checkInDate || today} value={checkOutDate}
                             onChange={e => setCheckOutDate(e.target.value)} className={inputCls} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide">Horário</label>
                      <input type="time" value={checkOutTime}
                             onChange={e => setCheckOutTime(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  {dailyNights > 0 && (
                    <div className="bg-(--color-bg) rounded-xl px-4 py-3 flex justify-between text-sm">
                      <span className="text-(--color-text-muted)">{dailyNights} diária(s)</span>
                      <span className="font-semibold text-(--color-text-heading)">{formatBRL(dailyNights * service.price)}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide">
                    Data <span className="text-red-500">*</span>
                  </label>
                  <input type="date" min={today} value={date}
                         onChange={e => handleDateChange(e.target.value)} className={inputCls} />
                  {loadingSlots && (
                    <p className="text-xs text-(--color-text-muted) flex items-center gap-1 mt-1">
                      <Loader2 size={11} className="animate-spin" /> Verificando disponibilidade…
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── VIEW: slots ── */}
          {view === 'slots' && (
            <>
              <div className="space-y-3">
                <p className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide">
                  Horários — {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>

                {loadingSlots ? (
                  <div className="flex justify-center py-10">
                    <Loader2 size={26} className="animate-spin text-(--color-primary-700)" />
                  </div>
                ) : slots.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <p className="text-sm text-(--color-text-muted)">Sem horários disponíveis para este dia.</p>
                    <button onClick={() => setView('config')}
                            className="text-sm text-(--color-secondary-500) hover:underline">
                      Escolher outra data
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {slots.map(slot => {
                      const isSelected = selectedSlot?.time === slot.time
                      const canSelect  = slot.available || slot.allowFittingRequest
                      return (
                        <button key={slot.time} onClick={() => handleSlotSelect(slot)} disabled={!canSelect}
                                className={`px-3.5 py-2 rounded-xl text-sm font-medium border-2 transition-all
                                  ${isSelected
                                    ? 'border-(--color-secondary-500) bg-(--color-secondary-500) text-white shadow-md'
                                    : slot.available
                                      ? 'border-green-200 bg-green-50 text-green-700 hover:border-green-400'
                                      : slot.allowFittingRequest
                                        ? 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400'
                                        : 'border-(--color-border) bg-(--color-bg) text-(--color-text-muted) opacity-40 cursor-not-allowed'
                                  }`}>
                          {slot.time}
                          {!slot.available && slot.allowFittingRequest && <span className="ml-0.5 text-[10px]">*</span>}
                        </button>
                      )
                    })}
                  </div>
                )}

                {slots.length > 0 && (
                  <div className="flex flex-wrap gap-4 pt-1">
                    <span className="flex items-center gap-1.5 text-xs text-(--color-text-muted)">
                      <span className="w-3 h-3 rounded-sm bg-green-100 border border-green-300 shrink-0" />
                      Disponível
                    </span>
                    {slots.some(s => !s.available && s.allowFittingRequest) && (
                      <span className="flex items-center gap-1.5 text-xs text-(--color-text-muted)">
                        <span className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-300 shrink-0" />
                        Encaixe * (sujeito a confirmação)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Fitting request notice */}
              {requestFitting && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                  Horário de encaixe selecionado. O parceiro analisará a disponibilidade e confirmará o agendamento.
                </div>
              )}

              {/* Staff selection */}
              {selectedSlot && (selectedSlot.staff?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide">Profissional</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setStaffId(null)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border-2 transition-colors
                              ${staffId === null
                                ? 'border-(--color-secondary-500) bg-(--color-secondary-500)/10 text-(--color-secondary-500) font-medium'
                                : 'border-(--color-border) text-(--color-text-body) hover:border-(--color-secondary-400)'
                              }`}>
                      ✨ Qualquer profissional
                    </button>
                    {(selectedSlot.staff as StaffSlot[]).map(s => (
                      <button key={s.id} onClick={() => setStaffId(s.id)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border-2 transition-colors
                                ${staffId === s.id
                                  ? 'border-(--color-secondary-500) bg-(--color-secondary-500)/10 text-(--color-secondary-500) font-medium'
                                  : 'border-(--color-border) text-(--color-text-body) hover:border-(--color-secondary-400)'
                                }`}>
                        {s.photoUrl && (
                          <img src={s.photoUrl} alt={s.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
                        )}
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── VIEW: confirm ── */}
          {view === 'confirm' && (
            <>
              {/* Resumo */}
              <div className="bg-(--color-bg) rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-(--color-text-muted)">Serviço</span>
                  <span className="font-medium text-(--color-text-heading)">{service.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-(--color-text-muted)">Estabelecimento</span>
                  <span className="font-medium text-(--color-text-heading)">{partnerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-(--color-text-muted)">Pet</span>
                  <span className="font-medium text-(--color-text-heading)">{pets.find(p => p.id === petId)?.name}</span>
                </div>
                {isDaily ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-(--color-text-muted)">Check-in</span>
                      <span className="font-medium text-(--color-text-heading)">
                        {new Date(checkInDate + 'T12:00:00').toLocaleDateString('pt-BR')} {checkInTime}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-(--color-text-muted)">Check-out</span>
                      <span className="font-medium text-(--color-text-heading)">
                        {new Date(checkOutDate + 'T12:00:00').toLocaleDateString('pt-BR')} {checkOutTime}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-(--color-text-muted)">Data / Horário</span>
                    <span className="font-medium text-(--color-text-heading)">
                      {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')} às {selectedSlot?.time}
                    </span>
                  </div>
                )}
                {requestFitting && (
                  <div className="flex justify-between text-amber-600">
                    <span>Tipo</span>
                    <span className="font-medium">Encaixe (aguarda confirmação)</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-(--color-border) pt-2 mt-1">
                  <span className="text-(--color-text-muted)">Total</span>
                  <span className="font-bold text-(--color-text-heading)">
                    {formatBRL(isDaily ? dailyNights * service.price : service.price)}
                  </span>
                </div>
              </div>

              {/* Opção de pacote */}
              {activePackages.length > 0 && bookingPkg && (
                <div className={`border rounded-xl p-3.5 transition-colors cursor-pointer
                  ${usePackage
                    ? 'border-green-400 bg-green-50'
                    : 'border-(--color-border) hover:border-green-300'
                  }`}
                  onClick={() => setUsePackage(v => !v)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Package size={16} className={usePackage ? 'text-green-600' : 'text-(--color-text-muted)'} />
                      <div>
                        <p className={`text-sm font-semibold ${usePackage ? 'text-green-700' : 'text-(--color-text-heading)'}`}>
                          {bookingPkg.packageTemplate.name}
                        </p>
                        <p className="text-xs text-(--color-text-muted)">
                          {bookingPkg.remainingCredits} crédito{bookingPkg.remainingCredits !== 1 ? 's' : ''} disponíve{bookingPkg.remainingCredits !== 1 ? 'is' : 'l'}
                        </p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                      ${usePackage ? 'border-green-500 bg-green-500' : 'border-(--color-border)'}`}>
                      {usePackage && <CheckCircle size={12} className="text-white" />}
                    </div>
                  </div>
                  {usePackage && (
                    <p className="text-xs text-green-600 mt-2 ml-6.5">
                      1 crédito será debitado. O agendamento será confirmado imediatamente.
                    </p>
                  )}
                </div>
              )}

              {!usePackage && (
                <p className="text-xs text-(--color-text-muted) text-center">
                  {env.internalPilot ? 'O estabelecimento precisa confirmar a solicitação.' : 'O pagamento será realizado no carrinho antes de confirmar o agendamento.'}
                </p>
              )}
            </>
          )}

          {/* ── VIEW: added ── */}
          {view === 'added' && (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                <ShoppingCart size={32} className="text-green-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-(--color-text-heading)">Adicionado ao carrinho!</p>
                <p className="text-sm text-(--color-text-muted) mt-1">
                  {service.name} foi adicionado ao seu carrinho.
                </p>
              </div>
            </div>
          )}

          {/* ── VIEW: booked ── */}
          {view === 'booked' && (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-(--color-text-heading)">{env.internalPilot ? 'Agendamento solicitado!' : 'Agendamento confirmado!'}</p>
                <p className="text-sm text-(--color-text-muted) mt-1">
                  {env.internalPilot ? 'Acompanhe a confirmação em Meus Agendamentos.' : '1 crédito do pacote foi utilizado.'}
                </p>
              </div>
            </div>
          )}

          {error && view !== 'added' && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-(--color-border) shrink-0">
          {(view === 'added' || view === 'booked') ? (
            <>
              <button onClick={onClose}
                      className="flex-1 py-2.5 text-sm rounded-xl border border-(--color-border)
                                 text-(--color-text-body) hover:bg-(--color-bg) transition-colors">
                {view === 'booked' ? 'Fechar' : 'Continuar comprando'}
              </button>
              {view === 'added' && (
                <button onClick={() => navigate('/app/carrinho')}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm rounded-xl
                                   bg-(--color-secondary-500) text-white hover:bg-(--color-secondary-600) transition-colors">
                  <ShoppingCart size={15} /> Ver carrinho
                </button>
              )}
              {view === 'booked' && (
                <button onClick={() => navigate('/app/agendamentos')}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm rounded-xl
                                   bg-(--color-primary-700) text-white hover:bg-(--color-primary-800) transition-colors">
                  <CalendarDays size={15} /> Ver agendamentos
                </button>
              )}
            </>
          ) : (
            <>
              {view === 'config' ? (
                <button onClick={onClose}
                        className="flex-1 py-2.5 text-sm rounded-xl border border-(--color-border)
                                   text-(--color-text-body) hover:bg-(--color-bg) transition-colors">
                  Cancelar
                </button>
              ) : (
                <button onClick={goBack}
                        className="flex-1 py-2.5 text-sm rounded-xl border border-(--color-border)
                                   text-(--color-text-body) hover:bg-(--color-bg) transition-colors">
                  Voltar
                </button>
              )}

              {view !== 'confirm' ? (
                <button onClick={goNext} disabled={pets.length === 0}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm rounded-xl
                                   bg-(--color-secondary-500) text-white hover:bg-(--color-secondary-600)
                                   disabled:opacity-50 transition-colors">
                  {view === 'config' && !isDaily ? 'Ver horários' : 'Próximo'}
                  <ChevronRight size={15} />
                </button>
              ) : usePackage ? (
                <button onClick={handleBookWithPackage} disabled={bookingLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm rounded-xl
                                   bg-green-600 text-white hover:bg-green-700
                                   disabled:opacity-50 transition-colors">
                  {bookingLoading
                    ? <Loader2 size={15} className="animate-spin" />
                    : <CheckCircle size={15} />
                  }
                  {bookingLoading ? 'Confirmando...' : 'Confirmar com pacote'}
                </button>
              ) : (
                <button onClick={handleAddToCart} disabled={bookingLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm rounded-xl
                                   bg-(--color-secondary-500) text-white hover:bg-(--color-secondary-600)
                                   transition-colors">
                  <ShoppingCart size={15} /> {env.internalPilot ? 'Solicitar agendamento' : 'Adicionar ao carrinho'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── PurchaseModal ─────────────────────────────────────────────────────────────

function PurchaseModal({
  pkg, partnerId, partnerName, onClose,
}: {
  pkg:         PackageTemplateResponse
  partnerId:   string
  partnerName: string
  onClose:     () => void
}) {
  const navigate    = useNavigate()
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)

  function handleAddToCart() {
    const meta: EasypetPackageMeta = {
      isPackage:    true,
      partnerId,
      partnerName,
      sessions:     pkg.quantity,
      validityDays: pkg.validityDays,
    }
    addItem({
      productId:   pkg.id,
      label:       pkg.name,
      description: pkg.description ?? undefined,
      price:       pkg.price,
      quantity:    1,
      metadata:    meta as unknown as Record<string, unknown>,
    })
    setAdded(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-sm bg-(--color-surface) rounded-2xl shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between p-5 border-b border-(--color-border)">
          <h2 className="text-base font-semibold text-(--color-text-heading)">Comprar pacote</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-(--color-bg) text-(--color-text-muted)">
            <X size={18} />
          </button>
        </div>

        {added ? (
          <>
            <div className="flex flex-col items-center gap-4 py-10 px-5 text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                <ShoppingCart size={32} className="text-green-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-(--color-text-heading)">Adicionado ao carrinho!</p>
                <p className="text-sm text-(--color-text-muted) mt-1">
                  {pkg.name} foi adicionado ao seu carrinho.
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-(--color-border)">
              <button onClick={onClose}
                      className="flex-1 py-2.5 text-sm rounded-xl border border-(--color-border)
                                 text-(--color-text-body) hover:bg-(--color-bg) transition-colors">
                Continuar comprando
              </button>
              <button onClick={() => navigate('/app/carrinho')}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm rounded-xl
                                 bg-(--color-secondary-500) text-white hover:bg-(--color-secondary-600) transition-colors">
                <ShoppingCart size={15} /> Ver carrinho
              </button>
            </div>
          </>
        ) : (
          <div className="p-5 space-y-4">

            <div className="bg-(--color-bg) rounded-xl p-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <Package size={15} className="text-(--color-secondary-500)" />
                <p className="text-sm font-semibold text-(--color-text-heading)">{pkg.name}</p>
              </div>
              {pkg.description && <p className="text-xs text-(--color-text-muted)">{pkg.description}</p>}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-(--color-text-muted)">{pkg.quantity} sessões · validade {pkg.validityDays} dias</span>
                <span className="text-base font-bold text-(--color-text-heading)">{formatBRL(pkg.price)}</span>
              </div>
            </div>

            <p className="text-xs text-(--color-text-muted) text-center">
              O pagamento será realizado no carrinho ao finalizar o pedido.
            </p>

            <div className="flex gap-3 pt-1">
              <button onClick={onClose}
                      className="flex-1 py-2.5 text-sm rounded-xl border border-(--color-border)
                                 text-(--color-text-body) hover:bg-(--color-bg) transition-colors">
                Cancelar
              </button>
              <button onClick={handleAddToCart}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm rounded-xl
                                 bg-(--color-secondary-500) text-white hover:bg-(--color-secondary-600)
                                 transition-colors">
                <ShoppingCart size={15} /> Adicionar ao carrinho
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PartnerDetailPage() {
  const { id }       = useParams<{ id: string }>()
  const navigate     = useNavigate()
  const [partner,         setPartner]         = useState<PartnerResponse | null>(null)
  const [packages,        setPackages]        = useState<PackageTemplateResponse[]>([])
  const [loading,         setLoading]         = useState(true)
  const [selectedService, setSelectedService] = useState<ServiceOffer | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<PackageTemplateResponse | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      partnerService.getCatalogPartner(id),
      env.internalPilot ? Promise.resolve([]) : packageService.getByPartner(id).catch(() => []),
    ]).then(([p, pkgs]) => {
      setPartner(p)
      setPackages(Array.isArray(pkgs) ? pkgs : (pkgs as any).content ?? [])
    }).catch(() => setPartner(null)).finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex justify-center py-32">
      <Loader2 size={32} className="animate-spin text-(--color-primary-700)" />
    </div>
  )
  if (!partner) return (
    <div className="text-center py-32 text-(--color-text-muted)">Parceiro não encontrado.</div>
  )

  const open     = isOpenNow(partner.businessHours)
  const address  = [partner.address, partner.number, partner.neighborhood].filter(Boolean).join(', ')
  const cityState = [partner.city, partner.state].filter(Boolean).join(' - ')
  const whatsapp = partner.phone?.replace(/\D/g, '') ?? partner.contactPhone?.replace(/\D/g, '')
  const mapsUrl  = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([address, cityState].filter(Boolean).join(', '))}`
    : null
  const pictures = [
    ...(partner.pictureUrl ? [partner.pictureUrl] : []),
    ...(partner.galleryPictures ?? []),
  ]

  return (
    <div className="space-y-6">

      {/* Back */}
      <button onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-(--color-text-muted)
                         hover:text-(--color-text-heading) transition-colors">
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-6 lg:items-start">

        {/* ── Coluna principal ── */}
        <div className="space-y-6">

          {/* Galeria */}
          <Gallery pictures={pictures} name={partner.name} />

          {/* Identidade */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-(--color-text-heading)">{partner.name}</h1>
                {partner.description && (
                  <p className="text-sm text-(--color-text-body) mt-1 leading-relaxed">{partner.description}</p>
                )}
              </div>
              <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full
                               ${open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {open ? 'Aberto agora' : 'Fechado'}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <RatingStars value={partner.rating ?? 0} />
              <span className="text-sm text-(--color-text-muted)">{(partner.rating ?? 0).toFixed(1)}</span>
              {partner.categories?.map(c => (
                <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-(--color-bg) border border-(--color-border) text-(--color-text-muted)">
                  {c}
                </span>
              ))}
            </div>

            {partner.city && (
              <div className="flex items-center gap-1.5 text-sm text-(--color-text-muted)">
                <MapPin size={14} /> {[partner.neighborhood, partner.city, partner.state].filter(Boolean).join(', ')}
              </div>
            )}
          </div>

          {/* Serviços */}
          {(partner.services?.length ?? 0) > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-(--color-text-heading)">Serviços</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {partner.services.map(s => (
                  <div key={s.id}
                       className="flex flex-col gap-3 p-4 rounded-xl
                                  bg-(--color-surface) border border-(--color-border)">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-(--color-text-heading)">{s.name}</p>
                        {s.description && <p className="text-xs text-(--color-text-muted) mt-0.5 line-clamp-2">{s.description}</p>}
                        {s.durationMinutes && (
                          <p className="text-xs text-(--color-text-muted) mt-1">
                            <Clock size={10} className="inline mr-1" />
                            {s.durationMinutes} min
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-(--color-text-heading)">{formatBRL(s.price)}</p>
                        <span className="text-[10px] text-(--color-text-muted)">
                          {s.billingUnit === 'DAILY' ? '/dia' : '/sessão'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedService(s)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium
                                 rounded-lg bg-(--color-secondary-500) text-white
                                 hover:bg-(--color-secondary-600) transition-colors">
                      <CalendarDays size={14} /> Agendar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pacotes */}
          {packages.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-(--color-text-heading)">Pacotes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {packages.map(pkg => (
                  <div key={pkg.id}
                       className="flex flex-col gap-3 p-4 rounded-xl bg-(--color-surface) border border-(--color-border)">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-(--color-secondary-500) shrink-0" />
                      <p className="text-sm font-medium text-(--color-text-heading)">{pkg.name}</p>
                    </div>
                    {pkg.description && <p className="text-xs text-(--color-text-muted)">{pkg.description}</p>}
                    <div className="flex items-center justify-between text-xs text-(--color-text-muted)">
                      <span>{pkg.quantity} sessões · {pkg.validityDays} dias</span>
                      <span className="font-semibold text-(--color-text-heading)">{formatBRL(pkg.price)}</span>
                    </div>
                    <button
                      onClick={() => setSelectedPackage(pkg)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium
                                 rounded-lg bg-(--color-primary-700) text-white
                                 hover:bg-(--color-primary-800) transition-colors">
                      <CreditCard size={14} /> Comprar pacote
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews — mobile: aqui. Desktop: na sidebar */}
          {id && (
            <div className="lg:hidden">
              {!env.internalPilot && <ReviewSection partnerId={id} />}
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">

          {/* Contato */}
          <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-(--color-text-heading)">Contato</h3>

            {whatsapp && (
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl
                            bg-green-500 text-white text-sm font-medium
                            hover:bg-green-600 transition-colors">
                <MessageCircle size={16} /> WhatsApp
              </a>
            )}

            {(partner.phone || partner.contactPhone) && (
              <div className="flex items-center gap-2 text-sm text-(--color-text-body)">
                <Phone size={14} className="text-(--color-text-muted)" />
                {partner.phone ?? partner.contactPhone}
              </div>
            )}
          </div>

          {/* Endereço */}
          {(address || cityState) && (
            <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-(--color-text-heading)">Endereço</h3>
              <div className="flex items-start gap-2 text-sm text-(--color-text-body)">
                <MapPin size={14} className="text-(--color-text-muted) mt-0.5 shrink-0" />
                <div>
                  {address && <p>{address}</p>}
                  {partner.complement && <p>{partner.complement}</p>}
                  {cityState && <p>{cityState}</p>}
                  {partner.zipCode && <p className="text-(--color-text-muted)">{partner.zipCode}</p>}
                </div>
              </div>
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-1.5 text-sm text-(--color-secondary-500) hover:underline">
                  <ExternalLink size={13} /> Ver no Google Maps
                </a>
              )}
            </div>
          )}

          {/* Horários */}
          {(partner.businessHours?.length ?? 0) > 0 && (
            <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-(--color-text-heading)">Horários</h3>
              <div className="space-y-1.5">
                {partner.businessHours!.map(bh => {
                  const DAY: Record<string, string> = {
                    MONDAY: 'Seg', TUESDAY: 'Ter', WEDNESDAY: 'Qua',
                    THURSDAY: 'Qui', FRIDAY: 'Sex', SATURDAY: 'Sáb', SUNDAY: 'Dom',
                  }
                  return (
                    <div key={bh.dayOfWeek} className="flex justify-between text-xs">
                      <span className="text-(--color-text-muted) w-8">{DAY[bh.dayOfWeek] ?? bh.dayOfWeek}</span>
                      {bh.closed
                        ? <span className="text-red-500">Fechado</span>
                        : <span className="text-(--color-text-body)">{bh.businessStartHour} – {bh.businessEndHour}</span>
                      }
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Reviews — desktop only (mobile shows in main column) */}
          {id && (
            <div className="hidden lg:block">
              {!env.internalPilot && <ReviewSection partnerId={id} />}
            </div>
          )}
        </div>
      </div>

      {/* Modais */}
      {selectedService && id && (
        <BookingModal
          service={selectedService}
          partnerId={id}
          partnerName={partner.name}
          onClose={() => setSelectedService(null)}
        />
      )}
      {selectedPackage && id && (
        <PurchaseModal
          pkg={selectedPackage}
          partnerId={id}
          partnerName={partner.name}
          onClose={() => setSelectedPackage(null)}
        />
      )}
    </div>
  )
}
