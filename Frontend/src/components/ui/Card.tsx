import type { ComponentProps, ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div className={twMerge('min-w-0 rounded-2xl border border-border bg-surface shadow-sm', className)} {...props} />
}

type CardHeaderProps = {
  title: string
  description?: string
  action?: ReactNode
}

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-text-heading">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-text-body">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={twMerge('p-5', className)} {...props} />
}
