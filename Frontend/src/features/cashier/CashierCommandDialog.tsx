import { useId } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'

type Props = {
  title: string
  description?: string
  submitLabel: string
  saving: boolean
  error?: string
  children?: ReactNode
  onClose: () => void
  onSubmit: (data: FormData) => void
}

export function CashierCommandDialog({
  title, description, submitLabel, saving, error, children, onClose, onSubmit,
}: Props) {
  const formId = useId()
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!saving) onSubmit(new FormData(event.currentTarget))
  }
  return (
    <Dialog
      open
      title={title}
      description={description}
      onOpenChange={open => { if (!open && !saving) onClose() }}
      actions={
        <>
          <Button variant="secondary" disabled={saving} onClick={onClose}>Cancelar</Button>
          <Button type="submit" form={formId} disabled={saving}>{saving ? 'Salvando…' : submitLabel}</Button>
        </>
      }
    >
      <form id={formId} className="mt-4 space-y-3" onSubmit={submit} aria-busy={saving}>
        <fieldset disabled={saving} className="min-w-0 space-y-3">{children}</fieldset>
        {error && <p className="text-sm text-text-danger" role="alert">{error}</p>}
      </form>
    </Dialog>
  )
}
