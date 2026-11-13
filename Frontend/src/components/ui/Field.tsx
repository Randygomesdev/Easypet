import { useId } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

type FieldProps = {
  label: string
  hint?: string
  error?: string
}

type FieldLayoutProps = FieldProps & {
  controlId: string
  required?: boolean
  children: ReactNode
}

function FieldLayout({ controlId, label, required, hint, error, children }: FieldLayoutProps) {
  return (
    <div className="min-w-0 space-y-1">
      <label htmlFor={controlId} className="block text-xs font-semibold uppercase tracking-wide text-text-body">
        {label}{required && <span className="ml-1 text-text-danger" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && <p id={`${controlId}-hint`} className="text-xs text-text-body">{hint}</p>}
      {error && <p id={`${controlId}-error`} className="text-xs font-medium text-text-danger">{error}</p>}
    </div>
  )
}

const controlClass = `w-full min-w-0 rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text-body
  [color-scheme:var(--ui-color-scheme)] outline-none focus:ring-2 focus:ring-primary-400
  disabled:opacity-50 aria-invalid:border-text-danger`

function fieldDescription(id: string, describedBy: string | undefined, hint?: string, error?: string) {
  return [describedBy, hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
}

type TextFieldProps = Omit<ComponentProps<'input'>, 'children' | 'size'> & FieldProps

export function TextField({ label, hint, error, required, id, className, ...props }: TextFieldProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId

  return (
    <FieldLayout controlId={controlId} label={label} required={required} hint={hint} error={error}>
      <input
        {...props}
        id={controlId}
        required={required}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={fieldDescription(controlId, props['aria-describedby'], hint, error)}
        className={twMerge(controlClass, className)}
      />
    </FieldLayout>
  )
}

type SelectFieldProps = ComponentProps<'select'> & FieldProps

export function SelectField({ label, hint, error, required, id, className, ...props }: SelectFieldProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId

  return (
    <FieldLayout controlId={controlId} label={label} required={required} hint={hint} error={error}>
      <select
        {...props}
        id={controlId}
        required={required}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={fieldDescription(controlId, props['aria-describedby'], hint, error)}
        className={twMerge(controlClass, className)}
      />
    </FieldLayout>
  )
}
