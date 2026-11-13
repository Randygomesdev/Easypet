import { useId, useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children?: ReactNode
  actions?: ReactNode
}

export function Dialog({ open, onOpenChange, title, description, children, actions }: DialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useLayoutEffect(() => {
    const element = dialog.current
    // Some consumers unmount the whole form after a confirmation.
    return () => { if (element?.open) element.close() }
  }, [])

  useLayoutEffect(() => {
    const element = dialog.current
    if (!element) return

    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open])

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={event => {
        event.preventDefault()
        onOpenChange(false)
      }}
      onClose={event => {
        if (open && !event.currentTarget.open) onOpenChange(false)
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-2xl
                 border border-border bg-surface p-6 text-text-body shadow-xl backdrop:bg-black/40"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 id={titleId} className="min-w-0 text-lg font-bold break-words text-text-heading">{title}</h2>
        <Button
          variant="secondary"
          size="sm"
          className="min-h-11 min-w-11 shrink-0 p-1.5 sm:min-h-0 sm:min-w-0"
          aria-label="Fechar"
          onClick={() => onOpenChange(false)}
        >
          <X size={16} aria-hidden="true" />
        </Button>
      </div>
      {description && <p id={descriptionId} className="text-sm">{description}</p>}
      {children}
      {actions && <div className="mt-4 flex flex-wrap justify-end gap-2">{actions}</div>}
    </dialog>
  )
}
