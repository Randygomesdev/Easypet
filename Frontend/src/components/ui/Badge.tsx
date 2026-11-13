import type { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

const tones = {
  neutral: 'bg-bg text-text-body',
  success: 'bg-emerald-100 text-emerald-700',
  info: 'bg-violet-100 text-violet-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-pink-100 text-pink-700',
}

type BadgeProps = ComponentProps<'span'> & { tone?: keyof typeof tones }

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={twMerge('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone], className)}
      {...props}
    />
  )
}
