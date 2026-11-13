import { useState, useEffect, useRef } from 'react'
import {
  Loader2, Wrench, Plus, Pencil, Trash2,
  Clock, Tag, CheckCircle2, XCircle, X,
} from 'lucide-react'
import {
  partnerService, buildPayload,
  type PartnerResponse, type ServiceOffer, type ServiceOfferRequest,
} from '../../../services/partner.service'

/* ─── Helpers ─── */
const DURATION_OPTIONS = [
  { label: '30 min', value: 30 }, { label: '1h', value: 60 },
  { label: '1h 30min', value: 90 }, { label: '2h', value: 120 },
  { label: '2h 30min', value: 150 }, { label: '3h', value: 180 },
  { label: '4h', value: 240 }, { label: '5h', value: 300 },
  { label: '6h', value: 360 }, { label: '8h', value: 480 },
  { label: '1 dia', value: 1440 },
]

function formatDuration(min: number) {
  const found = DURATION_OPTIONS.find(o => o.value === min)
  if (found) return found.label
  const h = Math.floor(min / 60), m = min % 60
  return min < 60 ? `${min} min` : m ? `${h}h ${m}min` : `${h}h`
}

function formatPrice(v: number) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const BILLING_LABEL: Record<string, string> = { HOURLY: 'Por hora', DAILY: 'Por diária' }
const EMPTY_FORM: ServiceOfferRequest = { name: '', description: '', price: 0, durationMinutes: 60, billingUnit: 'HOURLY' }

/* ─── Input primitivos ─── */
function Input(p: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={['w-full border border-(--color-border) rounded-xl px-3 py-2.5 text-sm',
    'bg-(--color-surface) text-(--color-text-body) focus:outline-none focus:ring-2',
    'focus:ring-(--color-primary-700)/20 focus:border-(--color-primary-700)/40 disabled:opacity-50 transition-colors',
    p.className ?? ''].join(' ')} />
}

function Select(p: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={['w-full border border-(--color-border) rounded-xl px-3 py-2.5 text-sm',
    'bg-(--color-surface) text-(--color-text-body) focus:outline-none focus:ring-2',
    'focus:ring-(--color-primary-700)/20 focus:border-(--color-primary-700)/40 disabled:opacity-50 transition-colors',
    p.className ?? ''].join(' ')} />
}

/* ─── Modal ─── */
function ServiceModal({ open, editingId, form, saving, formError, onChange, onSave, onClose }: {
  open: boolean; editingId: string | null; form: ServiceOfferRequest
  saving: boolean; formError: string
  onChange: <K extends keyof ServiceOfferRequest>(k: K, v: ServiceOfferRequest[K]) => void
  onSave: () => void; onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-(--color-surface) rounded-2xl shadow-2xl border border-(--color-border) overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--color-border)">
          <h2 className="text-base font-bold text-(--color-text-heading)">
            {editingId ? 'Editar serviço' : 'Novo serviço'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-(--color-bg) text-(--color-text-muted) hover:text-(--color-text-body) transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <span className="block text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide mb-1.5">Nome do serviço *</span>
            <Input value={form.name} onChange={e => onChange('name', e.target.value)} placeholder="Ex: Banho e Tosa" autoFocus />
          </div>
          <div>
            <span className="block text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide mb-1.5">Descrição (opcional)</span>
            <textarea value={form.description} onChange={e => onChange('description', e.target.value)} rows={3}
              placeholder="O que está incluso?" className="w-full border border-(--color-border) rounded-xl px-3 py-2.5 text-sm
              bg-(--color-surface) text-(--color-text-body) resize-none focus:outline-none focus:ring-2
              focus:ring-(--color-primary-700)/20 focus:border-(--color-primary-700)/40 transition-colors" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide mb-1.5">Preço (R$) *</span>
            <Input type="number" min={0} step={0.01} value={form.price || ''} onChange={e => onChange('price', parseFloat(e.target.value) || 0)} placeholder="0,00" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="block text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide mb-1.5">Duração *</span>
              <Select value={form.durationMinutes} onChange={e => onChange('durationMinutes', Number(e.target.value))}>
                {DURATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>
            <div>
              <span className="block text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide mb-1.5">Cobrança *</span>
              <Select value={form.billingUnit} onChange={e => onChange('billingUnit', e.target.value as 'HOURLY' | 'DAILY')}>
                <option value="HOURLY">Por hora</option>
                <option value="DAILY">Por diária</option>
              </Select>
            </div>
          </div>
          {formError && <p className="text-xs text-red-500 font-medium">{formError}</p>}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-(--color-border) bg-(--color-bg)/50">
          <button onClick={onClose} disabled={saving}
            className="flex-1 border border-(--color-border) text-(--color-text-body) hover:bg-(--color-bg)
            font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60">
            Cancelar
          </button>
          <button onClick={onSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-(--color-primary-700) hover:bg-(--color-primary-800)
            text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60">
            {saving && <Loader2 size={15} className="animate-spin" />}
            {editingId ? 'Salvar alterações' : 'Adicionar serviço'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Card ─── */
function ServiceCard({ service, isRemoving, onEdit, onRemove }: {
  service: ServiceOffer; isRemoving: boolean; onEdit: () => void; onRemove: () => void
}) {
  return (
    <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-5 shadow-sm flex flex-col gap-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-(--color-text-heading) text-base truncate">{service.name}</h3>
          {service.description && <p className="text-xs text-(--color-text-muted) mt-1 line-clamp-2">{service.description}</p>}
        </div>
        {service.active !== false
          ? <span className="flex items-center gap-1 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full shrink-0"><CheckCircle2 size={10} /> Ativo</span>
          : <span className="flex items-center gap-1 bg-red-50 text-red-500 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full shrink-0"><XCircle size={10} /> Inativo</span>
        }
      </div>
      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-(--color-text-muted) border-t border-(--color-border) pt-3">
        <span className="font-bold text-(--color-primary-700) text-sm">{formatPrice(service.price)}</span>
        <span className="text-(--color-border)">·</span>
        <span className="flex items-center gap-1"><Clock size={12} /> {formatDuration(service.durationMinutes)}</span>
        <span className="text-(--color-border)">·</span>
        <span className="flex items-center gap-1"><Tag size={12} /> {BILLING_LABEL[service.billingUnit] ?? service.billingUnit}</span>
      </div>
      <div className="flex gap-2 border-t border-(--color-border) pt-3">
        <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1.5 border border-(--color-border) hover:border-(--color-primary-700)/40 hover:text-(--color-primary-700) text-(--color-text-muted) font-semibold text-xs py-2 rounded-xl transition-colors">
          <Pencil size={13} /> Editar
        </button>
        <button onClick={onRemove} disabled={isRemoving} className="flex-1 flex items-center justify-center gap-1.5 border border-(--color-border) hover:border-red-300 hover:text-red-500 hover:bg-red-50 text-(--color-text-muted) font-semibold text-xs py-2 rounded-xl transition-colors disabled:opacity-50">
          {isRemoving ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          Remover
        </button>
      </div>
    </div>
  )
}

/* ─── Tab principal ─── */
export default function ServicosTab({ partnerId }: { partnerId: string }) {
  const [partner,   setPartner]   = useState<PartnerResponse | null>(null)
  const [services,  setServices]  = useState<ServiceOffer[]>([])
  const [loading,   setLoading]   = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [removing,  setRemoving]  = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form,      setForm]      = useState<ServiceOfferRequest>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    partnerService.getById(partnerId)
      .then(p => { setPartner(p); setServices(p.services ?? []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [partnerId])

  function openNew() { setEditingId(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true) }

  function openEdit(s: ServiceOffer) {
    setEditingId(s.id)
    setForm({ name: s.name, description: s.description ?? '', price: s.price, durationMinutes: s.durationMinutes, billingUnit: s.billingUnit })
    setFormError('')
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return
    setModalOpen(false); setEditingId(null); setForm(EMPTY_FORM); setFormError('')
  }

  function handleChange<K extends keyof ServiceOfferRequest>(key: K, value: ServiceOfferRequest[K]) {
    setForm(prev => ({ ...prev, [key]: value })); setFormError('')
  }

  function validate() {
    if (!form.name.trim()) return 'O nome do serviço é obrigatório.'
    if (form.price <= 0)   return 'O preço deve ser maior que R$ 0,00.'
    return ''
  }

  async function handleSave() {
    const err = validate()
    if (err) { setFormError(err); return }
    if (!partner) return
    setSaving(true); setFormError('')
    try {
      if (editingId === null) {
        const created = await partnerService.addService(partnerId, form)
        const nextServices = [...services, created]
        setServices(nextServices); setPartner({ ...partner, services: nextServices })
      } else {
        const updatedServices: ServiceOfferRequest[] = services.map(s =>
          s.id === editingId
            ? { name: form.name, description: form.description, price: form.price, durationMinutes: form.durationMinutes, billingUnit: form.billingUnit }
            : { name: s.name,    description: s.description,    price: s.price,    durationMinutes: s.durationMinutes,    billingUnit: s.billingUnit }
        )
        const updated = await partnerService.updateById(partnerId, buildPayload(partner, { services: updatedServices }))
        setPartner(updated); setServices(updated.services ?? [])
      }
      closeModal()
    } catch { setFormError('Erro ao salvar. Tente novamente.') }
    finally  { setSaving(false) }
  }

  async function handleRemove(id: string) {
    if (!confirm('Deseja remover este serviço?')) return
    if (!partner) return
    setRemoving(id)
    try {
      const updatedServices: ServiceOfferRequest[] = services
        .filter(s => s.id !== id)
        .map(s => ({ name: s.name, description: s.description, price: s.price, durationMinutes: s.durationMinutes, billingUnit: s.billingUnit }))
      const updated = await partnerService.updateById(partnerId, buildPayload(partner, { services: updatedServices }))
      setPartner(updated); setServices(updated.services ?? [])
    } catch { alert('Erro ao remover serviço.') }
    finally  { setRemoving(null) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={28} className="animate-spin text-(--color-primary-700)" />
    </div>
  )

  return (
    <div>
      <ServiceModal open={modalOpen} editingId={editingId} form={form} saving={saving} formError={formError}
        onChange={handleChange} onSave={handleSave} onClose={closeModal} />

      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h2 className="text-lg font-bold text-(--color-text-heading)">Serviços</h2>
          <p className="text-sm text-(--color-text-muted) mt-1">Configure os serviços oferecidos, preços e duração</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-(--color-secondary-500) hover:bg-(--color-secondary-600)
          text-white font-semibold px-4 py-2.5 rounded-full text-sm transition-colors shrink-0">
          <Plus size={16} /> Novo Serviço
        </button>
      </div>

      {services.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center border-2 border-dashed border-(--color-border) rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-(--color-surface) border border-(--color-border) flex items-center justify-center">
            <Wrench size={28} className="text-(--color-text-muted)" />
          </div>
          <p className="text-sm font-medium text-(--color-text-body)">Nenhum serviço cadastrado</p>
          <button onClick={openNew} className="flex items-center gap-2 bg-(--color-secondary-500) hover:bg-(--color-secondary-600) text-white font-semibold px-5 py-2.5 rounded-full text-sm transition-colors">
            <Plus size={15} /> Adicionar primeiro serviço
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {services.map(s => (
            <ServiceCard key={s.id} service={s} isRemoving={removing === s.id}
              onEdit={() => openEdit(s)} onRemove={() => handleRemove(s.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
