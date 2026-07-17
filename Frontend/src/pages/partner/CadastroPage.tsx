import { useState, useEffect } from 'react'
import { Camera, Save, Loader2 } from 'lucide-react'
import EnderecoTab from './tabs/EnderecoTab'
import HorarioTab from './tabs/HorarioTab'
import { partnerService, type PartnerPayload, type PartnerResponse } from '../../services/partner.service'

type Tab = 'dados' | 'endereco' | 'horario'
export type FormErrors = Partial<Record<keyof PartnerPayload, string>>

/* ─── Máscaras ─── */
export function formatCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  if (d.length <=  2) return d
  if (d.length <=  5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <=  8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

export function formatPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (!d.length)      return ''
  if (d.length <=  2) return `(${d}`
  if (d.length <=  6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/* ─── Validação ─── */
const DADOS_FIELDS:    (keyof PartnerPayload)[] = ['legalName', 'name', 'cnpj', 'email', 'contactPhone', 'description']
const ENDERECO_FIELDS: (keyof PartnerPayload)[] = ['zipCode', 'address', 'neighborhood', 'city', 'state']

export default function CadastroPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dados')
  const [partner, setPartner]     = useState<PartnerResponse | null>(null)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [success, setSuccess]     = useState(false)
  const [error, setError]         = useState('')
  const [errors, setErrors]       = useState<FormErrors>({})

  const [form, setForm] = useState<PartnerPayload>({
    name: '', legalName: '', cnpj: '',
    email: '', contactPhone: '', description: '',
    stateRegistration: '', stateRegistrationExempt: false,
    municipalRegistration: '', municipalRegistrationExempt: false,
    zipCode: '', address: '', number: '', neighborhood: '', complement: '', city: '', state: '',
    businessHours: [],
  })

  useEffect(() => {
    partnerService.getMe()
      .then((data) => {
        setPartner(data)
        setForm({
          name:                        data.name                        ?? '',
          legalName:                   data.legalName                   ?? '',
          cnpj:                        data.cnpj                        ?? '',
          email:                       data.email                       ?? '',
          contactPhone:                data.contactPhone                ?? '',
          description:                 data.description                 ?? '',
          stateRegistration:           data.stateRegistration           ?? '',
          stateRegistrationExempt:     data.stateRegistrationExempt     ?? false,
          municipalRegistration:       data.municipalRegistration       ?? '',
          municipalRegistrationExempt: data.municipalRegistrationExempt ?? false,
          zipCode:                     data.zipCode                     ?? '',
          address:                     data.address                     ?? '',
          number:                      data.number                      ?? '',
          neighborhood:                data.neighborhood                ?? '',
          complement:                  data.complement                  ?? '',
          city:                        data.city                        ?? '',
          state:                       data.state                       ?? '',
          businessHours:               data.businessHours               ?? [],
        })
      })
      .catch(() => setPartner(null))
      .finally(() => setLoading(false))
  }, [])

  function handleChange(field: keyof PartnerPayload, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  function validate(): FormErrors {
    const e: FormErrors = {}
    if (!form.legalName?.trim())   e.legalName    = 'Campo obrigatório'
    if (!form.name?.trim())        e.name         = 'Campo obrigatório'
    const cnpjD = (form.cnpj ?? '').replace(/\D/g, '')
    if (cnpjD.length === 0)        e.cnpj         = 'Campo obrigatório'
    else if (cnpjD.length !== 14)  e.cnpj         = 'CNPJ inválido'
    if (!form.email?.trim())       e.email        = 'Campo obrigatório'
    const phoneD = (form.contactPhone ?? '').replace(/\D/g, '')
    if (phoneD.length === 0)       e.contactPhone = 'Campo obrigatório'
    else if (phoneD.length < 10)   e.contactPhone = 'Telefone inválido'
    if (!form.description?.trim()) e.description  = 'Campo obrigatório'
    const zipD = (form.zipCode ?? '').replace(/\D/g, '')
    if (zipD.length === 0)         e.zipCode      = 'Campo obrigatório'
    else if (zipD.length !== 8)    e.zipCode      = 'CEP inválido'
    if (!form.address?.trim())     e.address      = 'Campo obrigatório'
    if (!form.neighborhood?.trim()) e.neighborhood = 'Campo obrigatório'
    if (!form.city?.trim())        e.city         = 'Campo obrigatório'
    if (!form.state?.trim())       e.state        = 'Campo obrigatório'
    return e
  }

  async function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      setError('Corrija os campos destacados antes de salvar.')
      if (DADOS_FIELDS.some(f => errs[f]))         setActiveTab('dados')
      else if (ENDERECO_FIELDS.some(f => errs[f])) setActiveTab('endereco')
      return
    }
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      if (partner) {
        const updated = await partnerService.updateMe(form)
        setPartner(updated)
      } else {
        const created = await partnerService.create(form)
        setPartner(created)
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Erro ao salvar. Verifique os dados e tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dados',    label: 'Dados Cadastrais' },
    { id: 'endereco', label: 'Endereço' },
    { id: 'horario',  label: 'Horário Atendimento' },
  ]

  function tabHasError(id: Tab) {
    if (id === 'dados')    return DADOS_FIELDS.some(f => !!errors[f])
    if (id === 'endereco') return ENDERECO_FIELDS.some(f => !!errors[f])
    return false
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-(--color-primary-700)" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-(--color-text-heading)">Cadastro</h1>
        <p className="text-sm text-(--color-text-muted) mt-1">
          Mantenha as suas informações sempre atualizadas
        </p>
      </div>

      <div className="bg-surface rounded-xl shadow-md border border-(--color-border)">

        {/* Tabs */}
        <div className="flex border-b border-(--color-border) overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-max px-4 py-4 text-xs lg:text-sm font-medium transition-colors relative whitespace-nowrap
                ${activeTab === tab.id
                  ? 'text-(--color-text-heading)'
                  : 'text-(--color-text-muted) hover:text-(--color-text-body)'
                }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                {tab.label}
                {tabHasError(tab.id) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                )}
              </span>
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary-500" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 lg:p-8">
          {activeTab === 'dados' && (
            <DadosCadastrais form={form} onChange={handleChange} errors={errors} />
          )}
          {activeTab === 'endereco' && (
            <EnderecoTab
              form={form}
              onChange={handleChange}
              errors={errors}
              onLatChange={v => setForm(prev => ({ ...prev, latitude:  v }))}
              onLngChange={v => setForm(prev => ({ ...prev, longitude: v }))}
            />
          )}
          {activeTab === 'horario'  && (
            <HorarioTab
              value={form.businessHours ?? []}
              onChange={hours => setForm(prev => ({ ...prev, businessHours: hours }))}
            />
          )}
        </div>

        {/* Feedback + Botão */}
        <div className="px-4 lg:px-8 pt-4 pb-6 lg:pb-8 flex flex-col items-center gap-3">
          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg w-full text-center">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg w-full text-center">
              Dados salvos com sucesso!
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full lg:w-auto flex items-center justify-center gap-2
                       bg-secondary-500 hover:bg-secondary-600
                       text-white font-semibold px-16 py-3 rounded-full
                       transition-colors cursor-pointer disabled:opacity-60"
          >
            {saving
              ? <><Loader2 size={16} className="animate-spin" /> Salvando...</>
              : <><Save size={16} /> Salvar Alterações</>
            }
          </button>
        </div>

      </div>
    </div>
  )
}

/* ─── Dados Cadastrais ─── */
function DadosCadastrais({ form, onChange, errors }: {
  form: PartnerPayload
  onChange: (field: keyof PartnerPayload, value: string | boolean) => void
  errors: FormErrors
}) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-start gap-6 xl:gap-8">

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 xl:shrink-0 xl:w-40 xl:pt-1">
        <div className="w-24 h-24 xl:w-32 xl:h-32 rounded-full bg-(--color-bg) flex items-center justify-center border-2 border-dashed border-(--color-border)">
          <Camera size={28} className="text-(--color-icon-default)" />
        </div>
        <button className="text-sm text-primary-600 hover:text-primary-500 transition-colors">
          Carregar Foto
        </button>
      </div>

      {/* Colunas */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-8">

        {/* Esquerda */}
        <div className="flex-1 flex flex-col gap-4">
          <Field label="Razão Social"  required error={errors.legalName} value={form.legalName ?? ''} onChange={v => onChange('legalName', v)} placeholder="Digite a Razão Social" />
          <Field label="Nome Fantasia" required error={errors.name}      value={form.name      ?? ''} onChange={v => onChange('name',      v)} placeholder="Digite o Nome Fantasia" />
          <Field
            label="CNPJ" required error={errors.cnpj}
            value={formatCnpj(form.cnpj ?? '')}
            onChange={v => onChange('cnpj', v.replace(/\D/g, '').slice(0, 14))}
            placeholder="00.000.000/0000-00"
          />
          <InscricaoField
            label="Inscrição Estadual"
            value={form.stateRegistration ?? ''}
            isento={form.stateRegistrationExempt ?? false}
            onChange={v => onChange('stateRegistration', v)}
            setIsento={v => onChange('stateRegistrationExempt', v)}
            placeholder="Digite a Inscrição Estadual"
          />
          <InscricaoField
            label="Inscrição Municipal"
            value={form.municipalRegistration ?? ''}
            isento={form.municipalRegistrationExempt ?? false}
            onChange={v => onChange('municipalRegistration', v)}
            setIsento={v => onChange('municipalRegistrationExempt', v)}
            placeholder="Digite a Inscrição Municipal"
          />
        </div>

        {/* Direita */}
        <div className="flex-1 flex flex-col gap-4">
          <Field label="Email"            required error={errors.email}        value={form.email        ?? ''} onChange={v => onChange('email',        v)} placeholder="Digite o Email" />
          <Field
            label="Telefone Contato" required error={errors.contactPhone}
            value={formatPhone(form.contactPhone ?? '')}
            onChange={v => onChange('contactPhone', v.replace(/\D/g, '').slice(0, 11))}
            placeholder="(00) 00000-0000"
          />
          <Field
            label="WhatsApp" optional
            value={formatPhone(form.phone ?? '')}
            onChange={v => onChange('phone', v.replace(/\D/g, '').slice(0, 11))}
            placeholder="(00) 00000-0000"
          />

          <div className="flex flex-col flex-1">
            <label className="flex items-center gap-1 text-sm font-medium text-(--color-text-heading) mb-1.5">
              Descrição da Loja <span className="text-red-400">*</span>
            </label>
            <textarea
              value={form.description ?? ''}
              onChange={e => onChange('description', e.target.value)}
              placeholder="Conte aos Clientes o que sua loja pode oferecer de especial"
              className={`flex-1 w-full border rounded-lg px-3 py-2 text-sm
                         text-(--color-text-body) placeholder:text-(--color-text-placeholder)
                         bg-(--color-bg) focus:outline-none focus:ring-2 resize-none min-h-32 lg:min-h-36
                         ${errors.description
                           ? 'border-red-400 focus:ring-red-200'
                           : 'border-(--color-border) focus:ring-primary-300'}`}
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
          </div>
        </div>

      </div>
    </div>
  )
}

/* ─── Input ─── */
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
                   ${error
                     ? 'border-red-400 focus:ring-red-200'
                     : 'border-(--color-border) focus:ring-primary-300'}`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

/* ─── Inscrição ─── */
function InscricaoField({ label, value, isento, onChange, setIsento, placeholder }: {
  label: string; value: string; isento: boolean; placeholder: string
  onChange: (v: string) => void; setIsento: (v: boolean) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-(--color-text-heading)">{label}</span>
        <label className="flex items-center gap-1.5 text-xs text-(--color-text-muted) cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isento}
            onChange={e => setIsento(e.target.checked)}
            className="accent-(--color-primary-700) w-3.5 h-3.5"
          />
          Isento
        </label>
      </div>
      <input
        type="text"
        disabled={isento}
        value={isento ? '' : value}
        onChange={e => onChange(e.target.value)}
        placeholder={isento ? 'Isento' : placeholder}
        className="w-full border border-(--color-border) rounded-lg px-3 py-2.5 text-sm
                   text-(--color-text-body) placeholder:text-(--color-text-placeholder)
                   bg-(--color-bg) focus:outline-none focus:ring-2
                   focus:ring-primary-300 transition-shadow
                   disabled:opacity-60 disabled:cursor-not-allowed"
      />
    </div>
  )
}
