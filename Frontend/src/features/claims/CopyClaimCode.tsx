import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Field'

export function CopyClaimCode({ label, value }: { label: string; value: string }) {
  const [message, setMessage] = useState('')
  return (
    <div className="space-y-2">
      <TextField label={label} value={value} readOnly onFocus={event => event.currentTarget.select()} />
      <Button variant="secondary" size="sm" onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setMessage('Código copiado.')
        } catch {
          setMessage('Selecione o código e copie manualmente.')
        }
      }}>Copiar {label.toLowerCase()}</Button>
      {message && <p className="text-sm text-text-body" role="status">{message}</p>}
    </div>
  )
}
