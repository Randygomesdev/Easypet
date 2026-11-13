import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, MapPin, Star, StarHalf, Store,
  ChevronLeft, ChevronRight, PawPrint, ArrowUpDown, Clock,
} from 'lucide-react'
import { partnerService, type PartnerResponse } from '../../services/partner.service'
import { petService, type PetResponse, SPECIES_LABEL } from '../../services/pet.service'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { bookingError } from '../../features/booking/bookingUi'

// ── Helpers ────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return 'Bom dia'
  if (h >= 12 && h < 18) return 'Boa tarde'
  if (h >= 18 && h < 23) return 'Boa noite'
  return 'Olá'   // 23h–4h: madrugada
}

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

// ── Sub-components ─────────────────────────────────────────────────────────

// Quando o Promotion-service existir, substituir por: GET /promotions/banners?active=true
const BANNERS = [
  {
    title:    'Cuidado especializado para o seu pet',
    desc:     'Encontre clínicas, petshops e serviços de qualidade perto de você.',
    bg:       'from-violet-600 to-indigo-500',
    tag:      'Bem-vindo',
    imageUrl: undefined as string | undefined,
  },
  {
    title:    'Agende em poucos cliques',
    desc:     'Consultas, banho & tosa, hospedagem e muito mais — tudo em um lugar.',
    bg:       'from-teal-500 to-cyan-500',
    tag:      'Novidade',
    imageUrl: undefined as string | undefined,
  },
  {
    title:    'Prontuário digital completo',
    desc:     'Vacinas, consultas e medicamentos sempre à mão para todos os seus pets.',
    bg:       'from-rose-500 to-pink-500',
    tag:      'Saúde',
    imageUrl: undefined as string | undefined,
  },
]

function PromoBanners() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % BANNERS.length), 5000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="relative rounded-2xl overflow-hidden h-[200px] sm:h-[240px] lg:h-[300px]">
      {BANNERS.map((b, i) => (
        <div key={i}
             className={`absolute inset-0 bg-gradient-to-r ${b.bg} transition-opacity duration-700
                         ${i === idx ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {/* Imagem de fundo — quando vier do backend substituir por <img> com object-cover */}
          {b.imageUrl && (
            <img src={b.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}

          {/* Overlay escuro só quando tiver imagem */}
          {b.imageUrl && <div className="absolute inset-0 bg-black/40" />}

          {/* Conteúdo */}
          <div className="relative z-10 h-full flex flex-col justify-end p-5 sm:p-6">
            <p className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-1">
              {b.tag ?? 'Destaque'}
            </p>
            <h2 className="text-base sm:text-xl font-bold text-white leading-tight">{b.title}</h2>
            <p className="text-xs sm:text-sm text-white/80 mt-1 line-clamp-2">{b.desc}</p>
          </div>
        </div>
      ))}

      {/* Indicadores */}
      <div className="absolute bottom-3 right-4 flex gap-1.5 z-20">
        {BANNERS.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
                  className={`h-1.5 rounded-full transition-all duration-300
                              ${i === idx ? 'bg-white w-5' : 'bg-white/50 w-1.5'}`} />
        ))}
      </div>
    </div>
  )
}

function PetCarousel({ pets }: { pets: PetResponse[] }) {
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  const scroll = (dir: 1 | -1) => {
    ref.current?.scrollBy({ left: dir * 160, behavior: 'smooth' })
  }
  if (!pets.length) return null
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-(--color-text-heading)">Meus Pets</h2>
        <div className="flex gap-1">
          <button onClick={() => scroll(-1)} className="p-1 rounded-lg hover:bg-(--color-bg) text-(--color-text-muted)"><ChevronLeft size={16} /></button>
          <button onClick={() => scroll(1)}  className="p-1 rounded-lg hover:bg-(--color-bg) text-(--color-text-muted)"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div ref={ref} className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
        {pets.map(pet => (
          <button key={pet.id} onClick={() => navigate(`/app/pets/${pet.id}`)}
                  className="flex flex-col items-center gap-2 shrink-0 w-24 p-3 rounded-xl
                             bg-(--color-surface) border border-(--color-border)
                             hover:shadow-md transition-shadow text-center">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-(--color-bg) border-2 border-(--color-secondary-400) flex items-center justify-center">
              {pet.pictureUrl
                ? <img src={pet.pictureUrl} alt={pet.name} className="w-full h-full object-cover" />
                : <PawPrint size={20} className="text-(--color-text-muted)" />
              }
            </div>
            <span className="text-xs font-medium text-(--color-text-heading) truncate w-full">{pet.name}</span>
            <span className="text-[10px] text-(--color-text-muted)">{SPECIES_LABEL[pet.species]}</span>
          </button>
        ))}
        <button onClick={() => navigate('/app/pets')}
                className="flex flex-col items-center justify-center gap-2 shrink-0 w-24 p-3 rounded-xl
                           border border-dashed border-(--color-border) text-(--color-text-muted)
                           hover:border-(--color-secondary-400) transition-colors">
          <span className="text-xl font-light">+</span>
          <span className="text-xs">Adicionar</span>
        </button>
      </div>
    </div>
  )
}

function RatingStars({ value }: { value: number }) {
  const full  = Math.floor(value)
  const half  = value - full >= 0.5
  const empty = 5 - full - (half ? 1 : 0)
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: full  }).map((_, i) => <Star     key={`f${i}`} size={11} className="fill-amber-400 text-amber-400" />)}
      {half && <StarHalf size={11} className="fill-amber-400 text-amber-400" />}
      {Array.from({ length: empty }).map((_, i) => <Star     key={`e${i}`} size={11} className="text-(--color-border)" />)}
    </span>
  )
}

function PartnerCard({ partner }: { partner: PartnerResponse }) {
  const navigate = useNavigate()
  const open     = isOpenNow(partner.businessHours)
  const location = [partner.city, partner.state].filter(Boolean).join(', ')
  const tags     = partner.services?.slice(0, 3) ?? []

  return (
    <div onClick={() => navigate(`/app/parceiros/${partner.id}`)}
         className="bg-(--color-surface) border border-(--color-border) rounded-2xl shadow-sm
                    overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer">
      <div className="h-36 bg-(--color-bg) flex items-center justify-center overflow-hidden relative">
        {partner.pictureUrl
          ? <img src={partner.pictureUrl} alt={partner.name} className="w-full h-full object-cover" />
          : <Store size={36} className="text-(--color-text-muted) opacity-30" />
        }
        <span className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full
                         ${open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
          {open ? 'Aberto' : 'Fechado'}
        </span>
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <h3 className="font-semibold text-(--color-text-heading) text-sm leading-tight line-clamp-1">{partner.name}</h3>
        {location && (
          <div className="flex items-center gap-1 text-(--color-text-muted)">
            <MapPin size={11} /><span className="text-xs">{location}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <RatingStars value={partner.rating ?? 0} />
          <span className="text-xs text-(--color-text-muted)">{(partner.rating ?? 0).toFixed(1)}</span>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto pt-1">
            {tags.map(s => (
              <span key={s.id} className="text-[10px] px-1.5 py-0.5 rounded-full
                                          bg-(--color-bg) border border-(--color-border) text-(--color-text-muted)">
                {s.name}
              </span>
            ))}
            {(partner.services?.length ?? 0) > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-(--color-bg) border border-(--color-border) text-(--color-text-muted)">
                +{(partner.services?.length ?? 0) - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: 'Todos',      value: '' },
  { label: 'Clínica',   value: 'CLINIC' },
  { label: 'Petshop',   value: 'PETSHOP' },
  { label: 'Banho & Tosa', value: 'GROOMER' },
  { label: 'Hospedagem', value: 'SITTER' },
  { label: 'Adestramento', value: 'TRAINER' },
]

type SortMode = '' | 'open' | 'alpha'

export default function HomePage() {
  const { user }       = useAuth()
  const [input,        setInput]        = useState('')
  const [search,       setSearch]       = useState('')
  const [category,     setCategory]     = useState('')
  const [sort,         setSort]         = useState<SortMode>('')
  const [page,         setPage]         = useState(0)
  const [partners,     setPartners]     = useState<PartnerResponse[]>([])
  const [total,        setTotal]        = useState(0)
  const [loadedQuery, setLoadedQuery] = useState('')
  const [catalogError, setCatalogError] = useState('')
  const [retry, setRetry] = useState(0)
  const [pets,         setPets]         = useState<PetResponse[]>([])
  const [petError, setPetError] = useState(false)
  const [petRetry, setPetRetry] = useState(0)

  // load pets
  useEffect(() => {
    let active = true
    petService.list().then(p => {
      if (active) { setPets(Array.isArray(p) ? p : (p.content ?? [])); setPetError(false) }
    }).catch(() => { if (active) setPetError(true) })
    return () => { active = false }
  }, [petRetry])

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(input.trim()); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [input])

  const queryKey = JSON.stringify([search, category, page, sort, retry])
  const loading = loadedQuery !== queryKey
  useEffect(() => {
    let cancelled = false
    partnerService
      .listCatalog({ name: search || undefined, category: category || undefined, page, size: 12 })
      .then(data => {
        if (cancelled) return
        let list = data.content
        if (sort === 'open')  list = [...list].sort((a, b) => (isOpenNow(b.businessHours) ? 1 : 0) - (isOpenNow(a.businessHours) ? 1 : 0))
        if (sort === 'alpha') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
        setPartners(list)
        setTotal(data.totalPages)
        setCatalogError('')
      })
      .catch(err => { if (!cancelled) setCatalogError(bookingError(err, 'Não foi possível carregar o catálogo.')) })
      .finally(() => { if (!cancelled) setLoadedQuery(queryKey) })
    return () => { cancelled = true }
  }, [search, category, page, sort, queryKey])

  function handleCategory(val: string) { setInput(''); setSearch(''); setCategory(val); setPage(0) }
  function handleSort(val: SortMode)   { setSort(s => s === val ? '' : val); setPage(0) }

  return (
    <div className="space-y-5">

      {/* Greeting */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-(--color-text-heading)">
          {greeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
        </h1>
        <p className="text-sm text-(--color-text-muted) mt-0.5">
          O que o seu pet precisa hoje?
        </p>
      </div>

      {/* Banners */}
      <PromoBanners />

      {/* Pet Carousel */}
      {petError ? <ErrorState message="Não foi possível carregar seus pets." action={
        <Button variant="secondary" onClick={() => setPetRetry(value => value + 1)}>Tentar novamente</Button>
      } /> : <PetCarousel pets={pets} />}

      {/* Busca + sort */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)" />
          <input
            type="search"
            aria-label="Buscar no catálogo"
            value={input}
            onChange={e => { setInput(e.target.value); setCategory('') }}
            placeholder="Buscar por estabelecimento ou cidade"
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-(--color-border)
                       bg-(--color-surface) text-(--color-text-body)
                       placeholder:text-(--color-text-muted) outline-none
                       focus:ring-2 focus:ring-(--color-primary-500)"
          />
        </div>
        <button onClick={() => handleSort('open')} aria-label="Priorizar estabelecimentos abertos" aria-pressed={sort === 'open'}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm border transition-colors
                  ${sort === 'open'
                    ? 'bg-(--color-secondary-500) border-(--color-secondary-500) text-white'
                    : 'border-(--color-border) bg-(--color-surface) text-(--color-text-body) hover:border-(--color-secondary-400)'}`}>
          <Clock size={14} /><span className="hidden sm:inline">Abertos</span>
        </button>
        <button onClick={() => handleSort('alpha')} aria-label="Ordenar por nome" aria-pressed={sort === 'alpha'}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm border transition-colors
                  ${sort === 'alpha'
                    ? 'bg-(--color-secondary-500) border-(--color-secondary-500) text-white'
                    : 'border-(--color-border) bg-(--color-surface) text-(--color-text-body) hover:border-(--color-secondary-400)'}`}>
          <ArrowUpDown size={14} /><span className="hidden sm:inline">A-Z</span>
        </button>
      </div>

      {/* Categoria chips */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(c => (
          <button key={c.value} onClick={() => handleCategory(c.value)} aria-pressed={category === c.value}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors
                    ${category === c.value
                      ? 'bg-(--color-secondary-500) border-(--color-secondary-500) text-white'
                      : 'bg-(--color-surface) border-(--color-border) text-(--color-text-body) hover:border-(--color-secondary-400)'}`}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <LoadingState label="Carregando catálogo…" />
      ) : catalogError ? (
        <ErrorState message={catalogError} action={
          <Button variant="secondary" onClick={() => setRetry(value => value + 1)}>Tentar novamente</Button>
        } />
      ) : partners.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="w-14 h-14 rounded-full bg-(--color-bg) border border-(--color-border) flex items-center justify-center">
            <Store size={24} className="text-(--color-text-muted)" />
          </div>
          <p className="text-sm font-semibold text-(--color-text-body)">Nenhum estabelecimento encontrado</p>
          <p className="text-xs text-(--color-text-muted)">Tente ajustar os filtros ou a busca</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {partners.map(p => <PartnerCard key={p.id} partner={p} />)}
          </div>
          {total > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                      className="px-4 py-2 text-sm rounded-lg border border-(--color-border)
                                 text-(--color-text-body) disabled:opacity-40 hover:bg-(--color-bg)">
                Anterior
              </button>
              <span className="text-sm text-(--color-text-muted)">{page + 1} / {total}</span>
              <button onClick={() => setPage(p => Math.min(total - 1, p + 1))} disabled={page >= total - 1}
                      className="px-4 py-2 text-sm rounded-lg border border-(--color-border)
                                 text-(--color-text-body) disabled:opacity-40 hover:bg-(--color-bg)">
                Próximo
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
