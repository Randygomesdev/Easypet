import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Loader2, PawPrint, UploadCloud, X } from 'lucide-react'
import { petService, type PetRequest, type PetSpecies, type PetGender, SPECIES_LABEL, GENDER_LABEL } from '../../services/pet.service'
import { env } from '../../config/env'
import { uploadService } from '../../services/upload.service'

const SPECIES_OPTIONS: { label: string; value: PetSpecies }[] = [
  { label: 'Cão',   value: 'DOG'   },
  { label: 'Gato',  value: 'CAT'   },
  { label: 'Ave',   value: 'BIRD'  },
  { label: 'Outro', value: 'OTHER' },
]

const GENDER_OPTIONS: { label: string; value: PetGender }[] = [
  { label: 'Macho',  value: 'MALE'   },
  { label: 'Fêmea',  value: 'FEMALE' },
]

function ImageUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const inputRef               = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setUploadError('Selecione uma imagem.'); return }
    if (file.size > 5 * 1024 * 1024)    { setUploadError('Tamanho máximo: 5 MB.'); return }
    setUploadError('')
    setUploading(true)
    try {
      const url = await uploadService.uploadImage(file)
      onChange(url)
    } catch {
      setUploadError('Erro ao enviar a imagem. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setDragging(true)  }
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragging(false) }
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  if (value) return (
    <div className="relative rounded-2xl overflow-hidden border border-(--color-border) h-40">
      <img src={value} alt="Preview" className="w-full h-full object-cover" />
      <button
        type="button"
        onClick={() => onChange('')}
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white
                   flex items-center justify-center hover:bg-black/70 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        disabled={uploading}
        className={`w-full h-40 rounded-2xl border-2 border-dashed transition-colors
                    flex flex-col items-center justify-center gap-3 cursor-pointer
                    ${dragging
                      ? 'border-(--color-secondary-500) bg-(--color-secondary-500)/5'
                      : 'border-(--color-border) hover:border-(--color-secondary-400) bg-(--color-bg)'
                    }`}
      >
        {uploading
          ? <Loader2 size={28} className="animate-spin text-(--color-secondary-500)" />
          : <UploadCloud size={28} className={dragging ? 'text-(--color-secondary-500)' : 'text-(--color-text-muted)'} />
        }
        <div className="text-center">
          <p className={`text-sm font-medium ${dragging ? 'text-(--color-secondary-500)' : 'text-(--color-text-body)'}`}>
            {uploading ? 'Enviando…' : dragging ? 'Solte a imagem aqui' : 'Arraste uma foto ou clique para selecionar'}
          </p>
          {!uploading && !dragging && (
            <p className="text-xs text-(--color-text-muted) mt-0.5">PNG, JPG ou WEBP · máx. 5 MB</p>
          )}
        </div>
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={onInputChange} className="hidden" />
      {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
    </div>
  )
}

const EMPTY: PetRequest = {
  name: '', species: 'DOG', breed: '', gender: 'MALE',
  weight: 0, birthDate: '', microchipNumber: '', pictureUrl: '',
}

function LabeledInput({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wide">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = `w-full px-3 py-2.5 text-sm rounded-xl border border-(--color-border)
                  bg-(--color-bg) text-(--color-text-body) outline-none
                  focus:ring-2 focus:ring-(--color-primary-500)`

export default function PetFormPage() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const isEdit   = Boolean(id)

  const [form,    setForm]    = useState<PetRequest>(EMPTY)
  const [loading, setLoading] = useState(isEdit)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!id) return
    petService.getById(id)
      .then(p => setForm({
        name:            p.name,
        species:         p.species,
        breed:           p.breed,
        gender:          p.gender,
        weight:          p.weight,
        birthDate:       p.birthDate,
        microchipNumber: p.microchipNumber ?? '',
        pictureUrl:      p.pictureUrl ?? '',
      }))
      .catch(() => setError('Não foi possível carregar o pet.'))
      .finally(() => setLoading(false))
  }, [id])

  function set<K extends keyof PetRequest>(key: K, value: PetRequest[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.name.trim() || !form.breed.trim() || !form.birthDate || form.weight <= 0) {
      setError('Preencha os campos obrigatórios.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload: PetRequest = {
        ...form,
        microchipNumber: form.microchipNumber || undefined,
        pictureUrl:      form.pictureUrl || undefined,
      }
      if (isEdit && id) await petService.update(id, payload)
      else              await petService.create(payload)
      navigate('/app/pets')
    } catch {
      setError('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-32">
      <Loader2 size={28} className="animate-spin text-(--color-primary-700)" />
    </div>
  )

  const ageLabel = (() => {
    if (!form.birthDate) return null
    const diff   = Date.now() - new Date(form.birthDate).getTime()
    const years  = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
    if (years < 1) {
      const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44))
      return `${months} ${months === 1 ? 'mês' : 'meses'}`
    }
    return `${years} ${years === 1 ? 'ano' : 'anos'}`
  })()

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
                className="p-2 rounded-xl hover:bg-(--color-bg) text-(--color-text-muted) transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-(--color-text-heading)">
            {isEdit ? 'Editar Pet' : 'Novo Pet'}
          </h1>
          <p className="text-sm text-(--color-text-muted)">
            {isEdit ? 'Atualize as informações do seu pet' : 'Preencha os dados do seu pet'}
          </p>
        </div>
      </div>

      {/* Layout: preview (lg left) + form (lg right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 lg:items-start">

        {/* Preview card — sticky no desktop */}
        <div className="lg:sticky lg:top-6 bg-(--color-surface) border border-(--color-border) rounded-2xl p-6
                        flex flex-col items-center gap-4 text-center">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-(--color-secondary-400)
                          bg-(--color-bg) flex items-center justify-center">
            {form.pictureUrl
              ? <img src={form.pictureUrl} alt={form.name} className="w-full h-full object-cover"
                     onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              : <PawPrint size={36} className="text-(--color-text-muted) opacity-40" />
            }
          </div>

          <div className="space-y-1 w-full">
            <p className="text-xl font-bold text-(--color-text-heading) truncate">
              {form.name || <span className="text-(--color-text-muted) font-normal text-base">Nome do pet</span>}
            </p>
            <p className="text-sm text-(--color-text-muted)">
              {form.breed || '—'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full">
            {[
              { label: 'Espécie', value: form.species ? SPECIES_LABEL[form.species] : '—' },
              { label: 'Gênero',  value: form.gender  ? GENDER_LABEL[form.gender]   : '—' },
              { label: 'Peso',    value: form.weight > 0 ? `${form.weight} kg` : '—' },
              { label: 'Idade',   value: ageLabel ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-(--color-bg) rounded-xl p-2.5">
                <p className="text-[10px] text-(--color-text-muted) uppercase tracking-wide">{label}</p>
                <p className="text-sm font-semibold text-(--color-text-heading) mt-0.5 truncate">{value}</p>
              </div>
            ))}
          </div>

          {form.microchipNumber && (
            <p className="text-xs text-(--color-text-muted) text-center">
              Microchip: {form.microchipNumber}
            </p>
          )}
        </div>

        {/* Formulário */}
        <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-5 space-y-4">

          {/* Nome */}
          <LabeledInput label="Nome" required>
            <input value={form.name} onChange={e => set('name', e.target.value)}
                   placeholder="Ex: Rex" className={inputCls} />
          </LabeledInput>

          {/* Espécie + Gênero */}
          <div className="grid grid-cols-2 gap-3">
            <LabeledInput label="Espécie" required>
              <select value={form.species} onChange={e => set('species', e.target.value as PetSpecies)} className={inputCls}>
                {SPECIES_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </LabeledInput>
            <LabeledInput label="Gênero" required>
              <select value={form.gender} onChange={e => set('gender', e.target.value as PetGender)} className={inputCls}>
                {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </LabeledInput>
          </div>

          {/* Raça */}
          <LabeledInput label="Raça" required>
            <input value={form.breed} onChange={e => set('breed', e.target.value)}
                   placeholder="Ex: Labrador" className={inputCls} />
          </LabeledInput>

          {/* Nascimento + Peso */}
          <div className="grid grid-cols-2 gap-3">
            <LabeledInput label="Nascimento" required>
              <input type="date" value={form.birthDate} onChange={e => set('birthDate', e.target.value)} className={inputCls} />
            </LabeledInput>
            <LabeledInput label="Peso (kg)" required>
              <input type="number" min="0.1" step="0.1" value={form.weight || ''}
                     onChange={e => set('weight', parseFloat(e.target.value) || 0)}
                     placeholder="Ex: 12.5" className={inputCls} />
            </LabeledInput>
          </div>

          {/* Microchip */}
          <LabeledInput label="Nº do Microchip">
            <input value={form.microchipNumber} onChange={e => set('microchipNumber', e.target.value)}
                   placeholder="Opcional" className={inputCls} />
          </LabeledInput>

          {/* Foto */}
          {!env.internalPilot && <LabeledInput label="Foto do Pet">
            <ImageUpload
              value={form.pictureUrl ?? ''}
              onChange={url => set('pictureUrl', url)}
            />
          </LabeledInput>}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Ações */}
          <div className="flex gap-3 pt-1">
            <button onClick={() => navigate(-1)}
                    className="flex-1 py-2.5 text-sm rounded-xl border border-(--color-border)
                               text-(--color-text-body) hover:bg-(--color-bg) transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm rounded-xl
                               bg-(--color-secondary-500) text-white hover:bg-(--color-secondary-600)
                               disabled:opacity-50 transition-colors">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {isEdit ? 'Salvar' : 'Criar Pet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
