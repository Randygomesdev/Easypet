import type { ReactNode } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center" role="status">
      <Loader2 size={28} className="text-icon-active motion-safe:animate-spin" aria-hidden="true" />
      <span className="text-sm text-text-body">{label}</span>
    </div>
  )
}

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  size?: 'default' | 'sm'
}

export function EmptyState({ icon: Icon, title, description, action, size = 'default' }: EmptyStateProps) {
  const compact = size === 'sm'

  return (
    <div className={`flex flex-col items-center justify-center gap-3 px-4 text-center ${compact ? 'py-10' : 'py-12'}`}>
      <div className={`flex items-center justify-center rounded-full bg-bg ${compact ? 'size-12' : 'size-14 border border-border'}`}>
        <Icon size={22} className="text-text-muted" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-medium text-text-body">{title}</p>
        {description && <p className={`mt-0.5 text-xs ${compact ? 'text-text-muted' : 'text-text-body'}`}>{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <div className="flex flex-col items-center gap-3 text-text-danger" role="alert">
        <AlertCircle size={22} aria-hidden="true" />
        <p className="text-sm font-medium">{message}</p>
      </div>
      {action}
    </div>
  )
}
