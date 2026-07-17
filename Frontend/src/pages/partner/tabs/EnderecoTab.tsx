import { useState, useEffect, useRef } from 'react'
import { Loader2, MapPin, ExternalLink, Info } from 'lucide-react'
import type { PartnerPayload } from '../../../services/partner.service'
import type { FormErrors } from '../CadastroPage'

interface Props {
  form:         PartnerPayload
  onChange:     (field: keyof PartnerPayload, value: string | boolean) => void
  onLatChange:  (v: number | undefined) => void
  onLngChange:  (v: number | undefined) => void
  errors?:      FormErrors
}

type ViaCepResponse = {
  logradouro: string
  bairro:     string
  localidade: string
  uf:         string
  erro?:      boolean
}

function formatCep(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
}

function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

export default function EnderecoTab({ form, onChange, onLatChange, onLngChange, errors = {} }: Props) {
  const [semNumero, setSemNumero]   = useState(false)
  const [loadingCep, setLoadingCep] = useState(false)
  const [cepError, setCepError]     = useState('')

  // String state local para os inputs de coordenadas (suporta digitação intermediária como "-23.")
  const [latStr, setLatStr] = useState(form.latitude?.toString()  ?? '')
  const [lngStr, setLngStr] = useState(form.longitude?.toString() ?? '')
  const coordsInitialized   = useRef(false)

  // Sincroniza uma única vez quando os dados do parceiro chegam da API
  useEffect(() => {
    if (!coordsInitialized.current && (form.latitude != null || form.longitude != null)) {
      coordsInitialized.current = true
      setLatStr(form.latitude?.toString()  ?? '')
      setLngStr(form.longitude?.toString() ?? '')
    }
  }, [form.latitude, form.longitude])

  function handleLatInput(v: string) {
    setLatStr(v)
    const parsed = parseFloat(v)
    onLatChange(isNaN(parsed) ? undefined : parsed)
  }

  function handleLngInput(v: string) {
    setLngStr(v)
    const parsed = parseFloat(v)
    onLngChange(isNaN(parsed) ? undefined : parsed)
  }

  function handleCepChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    onChange('zipCode', digits)
    setCepError('')
    if (digits.length === 8) fetchCep(digits)
  }

  async function fetchCep(digits: string) {
    setLoadingCep(true)
    setCepError('')
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json() as ViaCepResponse
      if (data.erro) { setCepError('CEP não encontrado.'); return }
      onChange('address',      data.logradouro)
      onChange('neighborhood', data.bairro)
      onChange('city',         data.localidade)
      onChange('state',        data.uf)
    } catch {
      setCepError('Erro ao consultar o CEP. Tente novamente.')
    } finally {
      setLoadingCep(false)
    }
  }

  const hasCoords = form.latitude != null && form.longitude != null

  return (
    <div className="flex flex-col gap-5">

      {/* CEP + Logradouro */}
      <div className="flex flex-col lg:flex-row gap-5">
        <div className="w-full lg:w-48 shrink-0">
          <label className="flex items-center gap-1 text-sm font-medium text-(--color-text-heading) mb-1.5">
            CEP <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={formatCep(form.zipCode ?? '')}
              onChange={e => handleCepChange(e.target.value)}
              placeholder="00000-000"
              maxLength={9}
              className={`w-full border rounded-lg px-3 py-2.5 pr-9 text-sm
                         text-(--color-text-body) placeholder:text-(--color-text-placeholder)
                         bg-(--color-bg) focus:outline-none focus:ring-2 transition-shadow
                         ${errors.zipCode
                           ? 'border-red-400 focus:ring-red-200'
                           : 'border-(--color-border) focus:ring-(--color-primary-300)'}`}
            />
            {loadingCep && (
              <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-text-muted) animate-spin" />
            )}
          </div>
          {(cepError || errors.zipCode) && (
            <p className="text-xs text-red-500 mt-1">{cepError || errors.zipCode}</p>
          )}
        </div>
        <div className="flex-1">
          <Field
            label="Logradouro" required error={errors.address}
            value={form.address ?? ''}
            onChange={v => onChange('address', v)}
            placeholder="Digite o Logradouro"
          />
        </div>
      </div>

      {/* Número + Bairro + Cidade */}
      <div className="flex flex-col lg:flex-row gap-5">
        <div className="w-full lg:w-48 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-(--color-text-heading)">
              Número <span className="text-red-400">*</span>
            </span>
            <label className="flex items-center gap-1.5 text-xs text-(--color-text-muted) cursor-pointer select-none">
              <input
                type="checkbox"
                checked={semNumero}
                onChange={e => setSemNumero(e.target.checked)}
                className="accent-(--color-primary-700) w-3.5 h-3.5"
              />
              Sem Número
            </label>
          </div>
          <input
            type="text"
            disabled={semNumero}
            value={semNumero ? '' : (form.number ?? '')}
            onChange={e => onChange('number', e.target.value)}
            placeholder="Digite o Número"
            className="w-full border border-(--color-border) rounded-lg px-3 py-2.5 text-sm
                       text-(--color-text-body) placeholder:text-(--color-text-placeholder)
                       bg-(--color-bg) focus:outline-none focus:ring-2
                       focus:ring-(--color-primary-300) transition-shadow
                       disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
        <div className="flex-1">
          <Field
            label="Bairro" required error={errors.neighborhood}
            value={form.neighborhood ?? ''}
            onChange={v => onChange('neighborhood', v)}
            placeholder="Digite o Bairro"
          />
        </div>
        <div className="flex-1">
          <Field
            label="Cidade" required error={errors.city}
            value={form.city ?? ''}
            onChange={v => onChange('city', v)}
            placeholder="Digite a Cidade"
          />
        </div>
      </div>

      {/* Estado + Complemento */}
      <div className="flex flex-col lg:flex-row gap-5">
        <div className="flex-1">
          <Field
            label="Estado" required error={errors.state}
            value={form.state ?? ''}
            onChange={v => onChange('state', v)}
            placeholder="UF"
          />
        </div>
        <div className="flex-1">
          <Field
            label="Complemento" optional
            value={form.complement ?? ''}
            onChange={v => onChange('complement', v)}
            placeholder="Apto, sala, bloco..."
          />
        </div>
      </div>

      {/* Geolocalização */}
      <div className="border border-(--color-border) rounded-xl p-4 flex flex-col gap-4">

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-(--color-primary-600) shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-(--color-text-heading)">Localização no Mapa</p>
              <p className="text-xs text-(--color-text-muted) mt-0.5">
                Coordenadas usadas para exibir sua loja no Google Maps.
              </p>
            </div>
          </div>

          {hasCoords && (
            <a
              href={mapsUrl(form.latitude!, form.longitude!)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-(--color-primary-600)
                         hover:text-(--color-primary-500) transition-colors shrink-0"
            >
              <ExternalLink size={13} />
              Ver no Google Maps
            </a>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          <div className="flex-1">
            <label className="flex items-center gap-1 text-sm font-medium text-(--color-text-heading) mb-1.5">
              Latitude <span className="text-(--color-text-muted) text-xs font-normal">Opcional</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={latStr}
              onChange={e => handleLatInput(e.target.value)}
              placeholder="-23.550520"
              className="w-full border border-(--color-border) rounded-lg px-3 py-2.5 text-sm
                         text-(--color-text-body) placeholder:text-(--color-text-placeholder)
                         bg-(--color-bg) focus:outline-none focus:ring-2
                         focus:ring-(--color-primary-300) transition-shadow"
            />
          </div>
          <div className="flex-1">
            <label className="flex items-center gap-1 text-sm font-medium text-(--color-text-heading) mb-1.5">
              Longitude <span className="text-(--color-text-muted) text-xs font-normal">Opcional</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={lngStr}
              onChange={e => handleLngInput(e.target.value)}
              placeholder="-46.633308"
              className="w-full border border-(--color-border) rounded-lg px-3 py-2.5 text-sm
                         text-(--color-text-body) placeholder:text-(--color-text-placeholder)
                         bg-(--color-bg) focus:outline-none focus:ring-2
                         focus:ring-(--color-primary-300) transition-shadow"
            />
          </div>
        </div>

        <div className="flex items-start gap-2 text-xs text-(--color-text-muted)">
          <Info size={13} className="shrink-0 mt-0.5" />
          <span>
            As coordenadas são calculadas automaticamente pelo endereço ao salvar.
            Preencha manualmente apenas para ajustar a posição do pin no mapa.
          </span>
        </div>

      </div>

    </div>
  )
}

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
                     : 'border-(--color-border) focus:ring-(--color-primary-300)'}`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
