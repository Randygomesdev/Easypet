import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

type PaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  label?: string
}

export function Pagination({ page, totalPages, onPageChange, label = 'Paginação' }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav
      aria-label={label}
      className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-bg/30 px-5 py-3.5"
    >
      <span className="text-xs font-medium text-text-body" role="status">Página {page} de {totalPages}</span>
      <div className="flex gap-1">
        <Button variant="secondary" size="sm" className="min-h-11 min-w-11 p-2 sm:min-h-0 sm:min-w-0" aria-label="Página anterior"
          disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft size={15} aria-hidden="true" />
        </Button>
        <Button variant="secondary" size="sm" className="min-h-11 min-w-11 p-2 sm:min-h-0 sm:min-w-0" aria-label="Próxima página"
          disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight size={15} aria-hidden="true" />
        </Button>
      </div>
    </nav>
  )
}
