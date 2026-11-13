import { useState, useEffect } from 'react'
import {
  Loader2, Package, Plus, Pencil, Trash2,
  Layers, CalendarDays, BadgePercent, X,
} from 'lucide-react'
import { partnerService, type ServiceOffer } from '../../../services/partner.service'
import { packageService, type PackageRequest, type PackageResponse } from '../../../services/package.service'

/* ─── Helpers ─── */
function formatPrice(v: number) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const EMPTY_FORM: Omit<PackageRequest, 'partnerId'> = {
  name: '', description: '', serviceId: '', quantity: 4, price: 0, validityDays: 90,
}

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
function PackageModal({ open, editingId, form, saving, formError, services, onChange, onSave, onClose }: {
  open: boolean; editingId: string | null
  form: Omit<PackageRequest, 'partnerId'>
  saving: boolean; formError: string; services: ServiceOffer[]
  onChange: <K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) => void
  onSave: () => void; onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  const selectedService = services.find(s => s.id === form.serviceId)
  const fullPrice = selectedService && form.quantity >= 1 ? selectedService.price * form.quantity : null
  const discountPct = fullPrice && form.price > 0 && form.price < fullPrice
    ? Math.round((1 - form.price / fullPrice) * 100) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-(--color-surface) rounded-2xl shadow-2xl border border-(--color-border) overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--color-border)">
          <h2 className="text-base font-bold text-(--color-text-heading)">{editingId ? 'Editar pacote' : 'Novo pacote'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-(--color-bg) text-(--color-text-muted) hover:text-(--color-text-body) transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <span className="block text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide mb-1.5">Nome do pacote *</span>
            <Input value={form.name} onChange={e => onChange('name', e.target.value)} placeholder="Ex: Combo 4 Banhos" autoFocus />
          </div>
          <div>
            <span className="block text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide mb-1.5">Descrição (opcional)</span>
            <textarea value={form.description} onChange={e => onChange('description', e.target.value)} rows={3}
              placeholder="Ex: 4 sessões de banho com 15% de desconto"
              className="w-full border border-(--color-border) rounded-xl px-3 py-2.5 text-sm bg-(--color-surface)
              text-(--color-text-body) resize-none focus:outline-none focus:ring-2
              focus:ring-(--color-primary-700)/20 focus:border-(--color-primary-700)/40 transition-colors" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide mb-1.5">Serviço vinculado *</span>
            <Select value={form.serviceId} onChange={e => onChange('serviceId', e.target.value)} disabled={services.length === 0}>
              <option value="">Selecione um serviço…</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name} — {formatPrice(s.price)}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="block text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide mb-1.5">Sessões *</span>
              <Input type="number" min={1} value={form.quantity || ''} onChange={e => onChange('quantity', parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <span className="block text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide mb-1.5">Validade (dias) *</span>
              <Input type="number" min={1} value={form.validityDays || ''} onChange={e => onChange('validityDays', parseInt(e.target.value) || 1)} />
            </div>
          </div>
          <div>
            <span className="block text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide mb-1.5">Preço total (R$) *</span>
            <Input type="number" min={0} step={0.01} value={form.price || ''} onChange={e => onChange('price', parseFloat(e.target.value) || 0)} />
            {discountPct !== null && discountPct > 0 && (
              <p className="text-xs text-green-600 font-semibold mt-1.5 flex items-center gap-1">
                <BadgePercent size={12} /> {discountPct}% de desconto
              </p>
            )}
          </div>
          {formError && <p className="text-xs text-red-500 font-medium">{formError}</p>}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-(--color-border) bg-(--color-bg)/50">
          <button onClick={onClose} disabled={saving}
            className="flex-1 border border-(--color-border) text-(--color-text-body) hover:bg-(--color-bg) font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60">
            Cancelar
          </button>
          <button onClick={onSave} disabled={saving || services.length === 0}
            className="flex-1 flex items-center justify-center gap-2 bg-(--color-primary-700) hover:bg-(--color-primary-800)
            text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60">
            {saving && <Loader2 size={15} className="animate-spin" />}
            {editingId ? 'Salvar alterações' : 'Criar pacote'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Card ─── */
function PackageCard({ pkg, services, isRemoving, onEdit, onRemove }: {
  pkg: PackageResponse; services: ServiceOffer[]; isRemoving: boolean
  onEdit: () => void; onRemove: () => void
}) {
  const linked = services.find(s => s.id === pkg.serviceId)
  const pps    = pkg.quantity > 0 ? Number(pkg.price) / pkg.quantity : null
  const full   = linked ? linked.price * pkg.quantity : null
  const disc   = full && Number(pkg.price) < full ? Math.round((1 - Number(pkg.price) / full) * 100) : null

  return (
    <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-5 shadow-sm flex flex-col gap-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-(--color-text-heading) text-base truncate">{pkg.name}</h3>
          {linked && <span className="text-[11px] text-(--color-primary-700) font-semibold">{linked.name}</span>}
        </div>
        <span className={['text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full shrink-0',
          pkg.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-(--color-text-muted)'].join(' ')}>
          {pkg.isActive ? 'Ativo' : 'Inativo'}
        </span>
      </div>
      {pkg.description && <p className="text-xs text-(--color-text-muted) leading-relaxed line-clamp-2 -mt-1">{pkg.description}</p>}
      <div className="grid grid-cols-2 gap-3 border-t border-(--color-border) pt-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold text-(--color-text-muted) uppercase tracking-wide flex items-center gap-1"><Layers size={10} /> Sessões</span>
          <span className="text-sm font-bold text-(--color-text-body)">{pkg.quantity}x</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold text-(--color-text-muted) uppercase tracking-wide flex items-center gap-1"><CalendarDays size={10} /> Validade</span>
          <span className="text-sm font-bold text-(--color-text-body)">{pkg.validityDays} dias</span>
        </div>
      </div>
      <div className="flex items-end justify-between gap-2 border-t border-(--color-border) pt-3">
        <div>
          <span className="text-xl font-bold text-(--color-primary-700)">{formatPrice(Number(pkg.price))}</span>
          {pps !== null && <p className="text-xs text-(--color-text-muted) mt-0.5">{formatPrice(pps)} / sessão</p>}
        </div>
        {disc !== null && disc > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-1 rounded-full uppercase tracking-wide">
            <BadgePercent size={10} /> {disc}% off
          </span>
        )}
      </div>
      <div className="flex gap-2 border-t border-(--color-border) pt-3">
        <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1.5 border border-(--color-border) hover:border-(--color-primary-700)/40 hover:text-(--color-primary-700) text-(--color-text-muted) font-semibold text-xs py-2 rounded-xl transition-colors">
          <Pencil size={13} /> Editar
        </button>
        <button onClick={onRemove} disabled={isRemoving} className="flex-1 flex items-center justify-center gap-1.5 border border-(--color-border) hover:border-red-300 hover:text-red-500 hover:bg-red-50 text-(--color-text-muted) font-semibold text-xs py-2 rounded-xl transition-colors disabled:opacity-50">
          {isRemoving ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          Excluir
        </button>
      </div>
    </div>
  )
}

/* ─── Tab principal ─── */
export default function PacotesTab({ partnerId }: { partnerId: string }) {
  const [services,  setServices]  = useState<ServiceOffer[]>([])
  const [packages,  setPackages]  = useState<PackageResponse[]>([])
  const [loading,   setLoading]   = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [removing,  setRemoving]  = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form,      setForm]      = useState<Omit<PackageRequest, 'partnerId'>>(EMPTY_FORM)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    partnerService.getById(partnerId)
      .then(async p => {
        setServices((p.services ?? []).filter(s => s.active !== false))
        const pkgs = await packageService.getByPartner(partnerId)
        setPackages(pkgs)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [partnerId])

  function openNew() { setEditingId(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true) }

  function openEdit(pkg: PackageResponse) {
    setEditingId(pkg.id)
    setForm({ name: pkg.name, description: pkg.description ?? '', serviceId: pkg.serviceId,
      quantity: pkg.quantity, price: Number(pkg.price), validityDays: pkg.validityDays })
    setFormError('')
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return
    setModalOpen(false); setEditingId(null); setForm(EMPTY_FORM); setFormError('')
  }

  function handleChange<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm(prev => ({ ...prev, [key]: value })); setFormError('')
  }

  function validate() {
    if (!form.name.trim() || form.name.length < 3) return 'O nome deve ter pelo menos 3 caracteres.'
    if (!form.serviceId)    return 'Selecione o serviço vinculado.'
    if (form.quantity < 1)  return 'A quantidade mínima é 1 sessão.'
    if (form.price <= 0)    return 'O preço deve ser maior que R$ 0,00.'
    if (form.validityDays < 1) return 'A validade mínima é 1 dia.'
    return ''
  }

  async function handleSave() {
    const err = validate()
    if (err) { setFormError(err); return }
    setSaving(true); setFormError('')
    try {
      const body: PackageRequest = { ...form, partnerId }
      if (editingId === null) {
        const created = await packageService.create(body)
        setPackages(prev => [created, ...prev])
      } else {
        const updated = await packageService.update(editingId, body)
        setPackages(prev => prev.map(p => p.id === editingId ? updated : p))
      }
      closeModal()
    } catch { setFormError('Ocorreu um erro ao salvar. Tente novamente.') }
    finally  { setSaving(false) }
  }

  async function handleRemove(id: string) {
    if (!confirm('Deseja excluir este pacote?')) return
    setRemoving(id)
    try {
      await packageService.remove(id)
      setPackages(prev => prev.filter(p => p.id !== id))
      if (editingId === id) closeModal()
    } catch { alert('Erro ao excluir pacote.') }
    finally  { setRemoving(null) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={28} className="animate-spin text-(--color-primary-700)" />
    </div>
  )

  const activeCount = packages.filter(p => p.isActive).length

  return (
    <div>
      <PackageModal open={modalOpen} editingId={editingId} form={form} saving={saving} formError={formError}
        services={services} onChange={handleChange} onSave={handleSave} onClose={closeModal} />

      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h2 className="text-lg font-bold text-(--color-text-heading)">Pacotes Promocionais</h2>
          <p className="text-sm text-(--color-text-muted) mt-1">Combos de sessões com desconto para fidelizar clientes</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-(--color-secondary-500) hover:bg-(--color-secondary-600)
          text-white font-semibold px-4 py-2.5 rounded-full text-sm transition-colors shrink-0">
          <Plus size={16} /> Novo Pacote
        </button>
      </div>

      {services.length === 0 && (
        <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <span className="text-xl mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Nenhum serviço ativo</p>
            <p className="text-xs text-amber-700 mt-0.5">Cadastre serviços na aba <strong>Serviços</strong> antes de criar pacotes.</p>
          </div>
        </div>
      )}

      {packages.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center border-2 border-dashed border-(--color-border) rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-(--color-surface) border border-(--color-border) flex items-center justify-center">
            <Package size={28} className="text-(--color-text-muted)" />
          </div>
          <p className="text-sm font-medium text-(--color-text-body)">Nenhum pacote cadastrado</p>
          <button onClick={openNew} className="flex items-center gap-2 bg-(--color-secondary-500) hover:bg-(--color-secondary-600) text-white font-semibold px-5 py-2.5 rounded-full text-sm transition-colors">
            <Plus size={15} /> Criar primeiro pacote
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide mb-4">
            {activeCount} pacote{activeCount !== 1 ? 's' : ''} ativo{activeCount !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {packages.map(pkg => (
              <PackageCard key={pkg.id} pkg={pkg} services={services} isRemoving={removing === pkg.id}
                onEdit={() => openEdit(pkg)} onRemove={() => handleRemove(pkg.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
