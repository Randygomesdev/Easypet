import type { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

const variants = {
  primary: 'bg-primary-700 text-white hover:bg-primary-800',
  accent: 'bg-secondary-500 text-primary-900 hover:bg-secondary-400',
  secondary: 'border border-border text-text-body hover:bg-bg',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

const sizes = {
  default: 'px-4 py-2.5 text-sm',
  sm: 'px-3 py-1.5 text-xs',
}

type ButtonProps = ComponentProps<'button'> & {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
}

export function Button({ type = 'button', variant = 'primary', size = 'default', className, ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={twMerge(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors',
        'enabled:cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400',
        variants[variant], sizes[size], className,
      )}
      {...props}
    />
  )
}
