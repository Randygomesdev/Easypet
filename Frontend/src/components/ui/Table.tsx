import { useId } from 'react'
import type { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

type TableProps = ComponentProps<'table'> & { caption: string }

export function Table({ caption, children, className, ...props }: TableProps) {
  const captionId = useId()

  return (
    <div
      role="region"
      aria-labelledby={captionId}
      tabIndex={0}
      className="overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-400"
    >
      <table className={twMerge('w-full', className)} {...props}>
        <caption className="sr-only" id={captionId}>{caption}</caption>
        {children}
      </table>
    </div>
  )
}

export function TableHeaderCell({ scope = 'col', className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      scope={scope}
      className={twMerge('px-5 py-3.5 text-left text-[11px] font-bold tracking-wider whitespace-nowrap text-text-body uppercase', className)}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return <td className={twMerge('px-5 py-4 text-sm text-text-body', className)} {...props} />
}
