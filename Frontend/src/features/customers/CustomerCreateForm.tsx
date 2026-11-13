import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Field'
import { customerApiError, customerService, type ReceptionCustomer } from '../../services/customer.service'

type Props = { onSaved: (customer: ReceptionCustomer) => void; onSavingChange: (saving: boolean) => void }

export function CustomerCreateForm({ onSaved, onSavingChange }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<ReturnType<typeof customerApiError>>()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const values = new FormData(event.currentTarget)
    const name = String(values.get('name')).trim()
    const email = String(values.get('email')).trim()
    const phone = String(values.get('phone')).trim()
    if (!email && !phone) {
      setError({ message: 'Informe e-mail ou telefone do tutor.', fields: {} })
      return
    }
    setError(undefined)
    setSaving(true)
    onSavingChange(true)
    try {
      const customer = await customerService.create({ name, email: email || undefined, phone: phone || undefined })
      onSaved(customer)
    } catch (cause) {
      setError(customerApiError(cause, 'Não foi possível cadastrar o cliente. Tente novamente.'))
    } finally {
      setSaving(false)
      onSavingChange(false)
    }
  }

  return (
    <form className="mt-4 space-y-4" onSubmit={submit} aria-busy={saving}>
      <TextField label="Nome do tutor" name="name" autoComplete="name" required maxLength={150}
        error={error?.fields.name} disabled={saving} />
      <TextField label="E-mail" name="email" type="email" autoComplete="email" maxLength={254}
        error={error?.fields.email} disabled={saving} />
      <TextField label="Telefone" name="phone" type="tel" autoComplete="tel" maxLength={40}
        error={error?.fields.phone} disabled={saving} />
      {error && <p role="alert" className="text-sm text-text-danger">{error.message}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Cadastrar cliente'}</Button>
      </div>
    </form>
  )
}
