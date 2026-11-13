import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { SelectField, TextField } from '../../components/ui/Field'
import { customerApiError, customerService } from '../../services/customer.service'
import { GENDER_LABEL, SPECIES_LABEL, type PetGender, type PetSpecies } from '../../services/pet.service'

type Props = { customerId: string; onSaved: () => void; onSavingChange: (saving: boolean) => void }

export function ReceptionPetCreateForm({ customerId, onSaved, onSavingChange }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<ReturnType<typeof customerApiError>>()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const values = new FormData(event.currentTarget)
    setError(undefined)
    setSaving(true)
    onSavingChange(true)
    try {
      await customerService.createPet(customerId, {
        name: String(values.get('name')).trim(),
        species: values.get('species') as PetSpecies,
        breed: String(values.get('breed')).trim(),
        gender: values.get('gender') as PetGender,
        weight: Number(values.get('weight')),
        birthDate: String(values.get('birthDate')),
        microchipNumber: String(values.get('microchipNumber')).trim() || undefined,
      })
      onSaved()
    } catch (cause) {
      setError(customerApiError(cause, 'Não foi possível cadastrar o pet. Tente novamente.'))
    } finally {
      setSaving(false)
      onSavingChange(false)
    }
  }

  return (
    <form className="mt-4 space-y-4" onSubmit={submit} aria-busy={saving}>
      <TextField label="Nome" name="name" required maxLength={255} error={error?.fields.name} disabled={saving} />
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Espécie" name="species" required error={error?.fields.species} disabled={saving}>
          {Object.entries(SPECIES_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </SelectField>
        <SelectField label="Sexo" name="gender" required error={error?.fields.gender} disabled={saving}>
          {Object.entries(GENDER_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </SelectField>
      </div>
      <TextField label="Raça" name="breed" required maxLength={255} hint="Use SRD quando aplicável."
        error={error?.fields.breed} disabled={saving} />
      <TextField label="Nascimento" name="birthDate" type="date" required
        error={error?.fields.birthDate} disabled={saving} />
      <TextField label="Peso (kg)" name="weight" type="number" inputMode="decimal" required min="0.01" step="any"
        error={error?.fields.weight} disabled={saving} />
      <TextField label="Microchip" name="microchipNumber" maxLength={100}
        error={error?.fields.microchipNumber} disabled={saving} />
      {error && <p role="alert" className="text-sm text-text-danger">{error.message}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Cadastrar pet'}</Button>
      </div>
    </form>
  )
}
