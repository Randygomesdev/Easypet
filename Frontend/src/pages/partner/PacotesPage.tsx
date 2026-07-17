import { useState, useEffect } from 'react'
import {
  Loader2, Package, Plus, Pencil, Trash2,
  Layers, CalendarDays, BadgePercent, X,
} from 'lucide-react'
import { partnerService, type ServiceOffer } from '../../services/partner.service'
import {
  packageService,
  type PackageRequest,
  type PackageResponse,
} from '../../services/package.service'

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function formatPrice(value: number) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const EMPTY_FORM: Omit<PackageRequest, 'partnerId'> = {
  name: '', description: '', serviceId: '', quantity: 4, price: 0, validityDays: 90,
}

/* ─────────────────────────────────────────────
   Primitivos de formulário
───────────────────────────────────────────── */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide mb-1.5">
      {children}
    </span>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        'w-full border border-(--color-border) rounded-xl px-3 py-2.5 text-sm',
        'bg-(--color-surface) text-(--color-text-body)',
        'focus:outline-none focus:ring-2 focus:ring-(--color-primary-700)/20 focus:border-(--color-primary-700)/40',
        'disabled:opacity-50 transition-colors',
        props.className ?? '',
      ].join(' ')}
    />
  )
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        'w-full border border-(--color-border) rounded-xl px-3 py-2.5 text-sm',
        'bg-(--color-surface) text-(--color-text-body)',
        'focus:outline-none focus:ring-2 focus:ring-(--color-primary-700)/20 focus:border-(--color-primary-700)/40',
        'disabled:opacity-50 transition-colors',
        props.className ?? '',
      ].join(' ')}
    />
  )
}

/* ─────────────────────────────────────────────
   Modal
───────────────────────────────────────────── */
function PackageModal({
  open, editingId, form, saving, formError, services, onChange, onSave, onClose,
}: {
  open:      boolean
  editingId: string | null
  form:      Omit<PackageRequest, 'partnerId'>
  saving:    boolean
  formError: string
  services:  ServiceOffer[]
  onChange:  <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) => void
  onSave:    () => void
  onClose:   () => void
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const isEditing       = editingId !== null
  const selectedService = services.find(s => s.id === form.serviceId)
  const fullPrice       = selectedService && form.quantity >= 1
    ? selectedService.price * form.quantity
    : null
  const discountPct = fullPrice && form.price > 0 && form.price < fullPrice
    ? Math.round((1 - form.price / fullPrice) * 100)
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-md bg-(--color-surface) rounded-2xl shadow-2xl
                      border border-(--color-border) overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--color-border)">
          <h2 className="text-base font-bold text-(--color-text-heading)">
            {isEditing ? 'Editar pacote' : 'Novo pacote'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-(--color-bg) text-(--color-text-muted)
                       hover:text-(--color-text-body) transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Nome */}
          <div>
            <FieldLabel>Nome do pacote *</FieldLabel>
            <Input
              value={form.name}
              onChange={e => onChange('name', e.target.value)}
              placeholder="Ex: Combo 4 Banhos"
              autoFocus
            />
          </div>

          {/* Descrição */}
          <div>
            <FieldLabel>Descrição (opcional)</FieldLabel>
            <textarea
              value={form.description}
              onChange={e => onChange('description', e.target.value)}
              rows={3}
              placeholder="Ex: 4 sessões de banho com 15% de desconto. Use quando preferir."
              className="w-full border border-(--color-border) rounded-xl px-3 py-2.5 text-sm
                         bg-(--color-surface) text-(--color-text-body) resize-none
                         focus:outline-none focus:ring-2 focus:ring-(--color-primary-700)/20
                         focus:border-(--color-primary-700)/40 transition-colors"
            />
          </div>

          {/* Serviço vinculado */}
          <div>
            <FieldLabel>Serviço vinculado *</FieldLabel>
            <Select
              value={form.serviceId}
              onChange={e => onChange('serviceId', e.target.value)}
              disabled={services.length === 0}
            >
              <option value="">Selecione um serviço…</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} — {formatPrice(s.price)}
                </option>
              ))}
            </Select>
          </div>

          {/* Sessões + Validade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Sessões *</FieldLabel>
              <Input
                type="number"
                min={1}
                value={form.quantity || ''}
                onChange={e => onChange('quantity', parseInt(e.target.value) || 1)}
                placeholder="Ex: 4"
              />
            </div>
            <div>
              <FieldLabel>Validade (dias) *</FieldLabel>
              <Input
                type="number"
                min={1}
                value={form.validityDays || ''}
                onChange={e => onChange('validityDays', parseInt(e.target.value) || 1)}
                placeholder="Ex: 90"
              />
            </div>
          </div>

          {/* Preço + preview desconto */}
          <div>
            <FieldLabel>Preço total do pacote (R$) *</FieldLabel>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.price || ''}
              onChange={e => onChange('price', parseFloat(e.target.value) || 0)}
              placeholder="Ex: 280,00"
            />
            {discountPct !== null && discountPct > 0 && (
              <p className="text-xs text-green-600 font-semibold mt-1.5 flex items-center gap-1">
                <BadgePercent size={12} />
                {discountPct}% de desconto — preço cheio seria {formatPrice(fullPrice!)}
              </p>
            )}
            {selectedService && form.quantity >= 1 && form.price > 0 && (
              <p className="text-xs text-(--color-text-muted) mt-1">
                {formatPrice(form.price / form.quantity)} / sessão
              </p>
            )}
          </div>

          {formError && (
            <p className="text-xs text-red-500 font-medium">{formError}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-(--color-border) bg-(--color-bg)/50">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 border border-(--color-border) text-(--color-text-body) hover:bg-(--color-bg)
                       font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={saving || services.length === 0}
            className="flex-1 flex items-center justify-center gap-2 bg-(--color-primary-700)
                       hover:bg-(--color-primary-800) text-white font-semibold px-4 py-2.5
                       rounded-xl text-sm transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {isEditing ? 'Salvar alterações' : 'Criar pacote'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function PacotesPage() {
  const [partnerId, setPartnerId] = useState<string | null>(null)
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
    partnerService.getMe()
      .then(async p => {
        setPartnerId(p.id)
        setServices((p.services ?? []).filter(s => s.active !== false))
        const pkgs = await packageService.getByPartner(p.id)
        setPackages(pkgs)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function openNew() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(pkg: PackageResponse) {
    setEditingId(pkg.id)
    setForm({
      name:         pkg.name,
      description:  pkg.description ?? '',
      serviceId:    pkg.serviceId,
      quantity:     pkg.quantity,
      price:        Number(pkg.price),
      validityDays: pkg.validityDays,
    })
    setFormError('')
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return
    setModalOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
  }

  function handleChange<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    setFormError('')
  }

  function validate() {
    if (!form.name.trim() || form.name.length < 3) return 'O nome deve ter pelo menos 3 caracteres.'
    if (!form.serviceId)                            return 'Selecione o serviço vinculado.'
    if (form.quantity < 1)                          return 'A quantidade mínima é 1 sessão.'
    if (form.price <= 0)                            return 'O preço deve ser maior que R$ 0,00.'
    if (form.validityDays < 1)                      return 'A validade mínima é 1 dia.'
    return ''
  }

  async function handleSave() {
    const err = validate()
    if (err) { setFormError(err); return }
    if (!partnerId) return
    setSaving(true)
    setFormError('')
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
    } catch {
      setFormError('Ocorreu um erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(id: string) {
    if (!confirm('Deseja excluir este pacote? Clientes com pacotes ativos não serão afetados.')) return
    setRemoving(id)
    try {
      await packageService.remove(id)
      setPackages(prev => prev.filter(p => p.id !== id))
      if (editingId === id) closeModal()
    } catch {
      alert('Erro ao excluir pacote.')
    } finally {
      setRemoving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-(--color-primary-700)" />
      </div>
    )
  }

  const activeCount = packages.filter(p => p.isActive).length

  return (
    <div>
      {/* Modal */}
      <PackageModal
        open={modalOpen}
        editingId={editingId}
        form={form}
        saving={saving}
        formError={formError}
        services={services}
        onChange={handleChange}
        onSave={handleSave}
        onClose={closeModal}
      />

      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-(--color-text-heading)">Pacotes Promocionais</h1>
          <p className="text-sm text-(--color-text-muted) mt-1">
            Crie combos de sessões com desconto para fidelizar seus clientes
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-(--color-secondary-500) hover:bg-(--color-secondary-600)
                     text-white font-semibold px-4 py-2.5 rounded-full text-sm transition-colors shrink-0"
        >
          <Plus size={16} /> Novo Pacote
        </button>
      </div>

      {/* Aviso sem serviços */}
      {services.length === 0 && (
        <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <span className="text-xl mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Nenhum serviço ativo encontrado</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Cadastre pelo menos um serviço em <strong>Serviços</strong> antes de criar pacotes.
            </p>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      {packages.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center
                        border-2 border-dashed border-(--color-border) rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-(--color-surface) border border-(--color-border)
                          flex items-center justify-center">
            <Package size={28} className="text-(--color-text-muted)" />
          </div>
          <div>
            <p className="text-sm font-medium text-(--color-text-body)">Nenhum pacote cadastrado</p>
            <p className="text-xs text-(--color-text-muted) mt-1">
              Clique em <strong>Novo Pacote</strong> para começar.
            </p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-(--color-secondary-500) hover:bg-(--color-secondary-600)
                       text-white font-semibold px-5 py-2.5 rounded-full text-sm transition-colors"
          >
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
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                services={services}
                isRemoving={removing === pkg.id}
                onEdit={() => openEdit(pkg)}
                onRemove={() => handleRemove(pkg.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Card de pacote
───────────────────────────────────────────── */
function PackageCard({
  pkg, services, isRemoving, onEdit, onRemove,
}: {
  pkg:       PackageResponse
  services:  ServiceOffer[]
  isRemoving: boolean
  onEdit:    () => void
  onRemove:  () => void
}) {
  const linkedService = services.find(s => s.id === pkg.serviceId)
  const pps           = pkg.quantity > 0 ? Number(pkg.price) / pkg.quantity : null
  const fullPrice     = linkedService ? linkedService.price * pkg.quantity : null
  const discountPct   = fullPrice && Number(pkg.price) < fullPrice
    ? Math.round((1 - Number(pkg.price) / fullPrice) * 100)
    : null

  return (
    <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-5 shadow-sm
                    flex flex-col gap-4 hover:shadow-md transition-all">

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-(--color-text-heading) text-base truncate">{pkg.name}</h3>
          {linkedService && (
            <span className="text-[11px] text-(--color-primary-700) font-semibold">
              {linkedService.name}
            </span>
          )}
        </div>
        <span className={[
          'text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full shrink-0',
          pkg.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-(--color-text-muted)',
        ].join(' ')}>
          {pkg.isActive ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      {/* Descrição */}
      {pkg.description && (
        <p className="text-xs text-(--color-text-muted) leading-relaxed line-clamp-2 -mt-1">
          {pkg.description}
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 border-t border-(--color-border) pt-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold text-(--color-text-muted) uppercase tracking-wide
                           flex items-center gap-1">
            <Layers size={10} /> Sessões
          </span>
          <span className="text-sm font-bold text-(--color-text-body)">{pkg.quantity}x</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold text-(--color-text-muted) uppercase tracking-wide
                           flex items-center gap-1">
            <CalendarDays size={10} /> Validade
          </span>
          <span className="text-sm font-bold text-(--color-text-body)">{pkg.validityDays} dias</span>
        </div>
      </div>

      {/* Preço */}
      <div className="flex items-end justify-between gap-2 border-t border-(--color-border) pt-3">
        <div>
          <span className="text-xl font-bold text-(--color-primary-700)">
            {formatPrice(Number(pkg.price))}
          </span>
          {pps !== null && (
            <p className="text-xs text-(--color-text-muted) mt-0.5">{formatPrice(pps)} / sessão</p>
          )}
        </div>
        {discountPct !== null && discountPct > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-green-700
                           bg-green-50 px-2 py-1 rounded-full uppercase tracking-wide">
            <BadgePercent size={10} /> {discountPct}% off
          </span>
        )}
      </div>

      {/* Ações */}
      <div className="flex gap-2 border-t border-(--color-border) pt-3">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 border border-(--color-border)
                     hover:border-(--color-primary-700)/40 hover:text-(--color-primary-700)
                     text-(--color-text-muted) font-semibold text-xs py-2 rounded-xl transition-colors"
        >
          <Pencil size={13} /> Editar
        </button>
        <button
          onClick={onRemove}
          disabled={isRemoving}
          className="flex-1 flex items-center justify-center gap-1.5 border border-(--color-border)
                     hover:border-red-300 hover:text-red-500 hover:bg-red-50
                     text-(--color-text-muted) font-semibold text-xs py-2 rounded-xl transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRemoving ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          Excluir
        </button>
      </div>
    </div>
  )
}
