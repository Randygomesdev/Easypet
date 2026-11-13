import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, Search, ChevronLeft, ChevronRight,
  Pencil,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SelectField } from '../../components/ui/Field'
import { ErrorState } from '../../components/ui/FeedbackState'
import { useCustomerQuery } from '../../features/customers/useCustomerQuery'
import { partnerService } from '../../services/partner.service'

const PAGE_SIZE = 10

export default function ParceirosPage() {
  const navigate = useNavigate()

  const [search,      setSearch]      = useState('')
  const [debSearch,   setDebSearch]   = useState('')
  const [page,        setPage]        = useState(0)
  const [active, setActive] = useState(true)

  // debounce da busca
  useEffect(() => {
    const t = setTimeout(() => { setDebSearch(search); setPage(0) }, 400)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback((signal: AbortSignal) =>
    partnerService.listAdminPartners({ name: debSearch || undefined, page, size: PAGE_SIZE, active }, signal),
  [debSearch, page, active])
  const { data, error: loadError, loading, reload } = useCustomerQuery(load, 'Não foi possível carregar os estabelecimentos.')
  const partners = data?.content ?? []
  const totalItems = data?.totalElements ?? 0
  const totalPages = data?.totalPages ?? 0

  const firstItem = page * PAGE_SIZE + 1
  const lastItem  = Math.min(page * PAGE_SIZE + partners.length, totalItems)

  return (
    <div className="space-y-5">

      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-(--color-text-heading)">Parceiros</h1>
        <p className="text-sm text-(--color-text-muted) mt-1">
          Gerencie todos os estabelecimentos cadastrados na plataforma
        </p>
      </div>

      {/* Busca */}
      <div className="flex flex-wrap items-end gap-3">
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome…"
          className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-(--color-border)
                     bg-(--color-surface) text-(--color-text-body)
                     focus:outline-none focus:border-(--color-primary-700)"
        />
      </div>

      <SelectField label="Situação" value={String(active)} onChange={event => {
        setActive(event.target.value === 'true'); setPage(0)
      }}>
        <option value="true">Ativos</option>
        <option value="false">Inativos</option>
      </SelectField>
      </div>

      {/* Tabela */}
      <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-(--color-border)">
                {['Nome', 'Cidade', 'Telefone', 'E-mail', 'Avaliação', 'Status', 'Ações'].map(col => (
                  <th key={col}
                    className="text-left px-5 py-3.5 text-[11px] font-bold text-(--color-text-muted)
                               uppercase tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <Loader2 size={24} className="animate-spin text-(--color-primary-700) mx-auto" />
                  </td>
                </tr>
              ) : loadError ? (
                <tr><td colSpan={7}><ErrorState message={loadError}
                  action={<Button variant="secondary" onClick={reload}>Tentar novamente</Button>} />
                </td></tr>
              ) : partners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-sm text-(--color-text-muted) font-medium">
                    Nenhum parceiro encontrado.
                  </td>
                </tr>
              ) : partners.map(p => (
                <tr key={p.id} className="border-b border-(--color-border) hover:bg-(--color-bg)/60 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-(--color-text-body) text-sm leading-tight">{p.name}</p>
                    {p.legalName && (
                      <p className="text-xs text-(--color-text-muted) mt-0.5">{p.legalName}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-(--color-text-body) whitespace-nowrap">
                    {p.city && p.state ? `${p.city}, ${p.state}` : (p.city ?? '–')}
                  </td>
                  <td className="px-5 py-4 text-sm text-(--color-text-body) whitespace-nowrap">
                    {p.contactPhone ?? '–'}
                  </td>
                  <td className="px-5 py-4 text-sm text-(--color-text-body)">
                    {p.email ?? '–'}
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-(--color-text-heading) tabular-nums">
                    {p.rating != null ? p.rating.toFixed(1) : '–'}
                  </td>
                  <td className="px-5 py-4">
                    {p.active ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                        Ativo
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-100 text-pink-600">
                        Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/admin/parceiros/${p.id}`)}
                        title="Editar"
                        className="p-1.5 rounded-lg border border-(--color-border) text-(--color-text-muted)
                                   hover:text-(--color-primary-700) hover:border-(--color-primary-700)/50 transition-colors">
                        <Pencil size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {!loadError && !loading && totalItems > 0 && (
          <div className="flex items-center justify-between px-5 py-3.5
                          border-t border-(--color-border) bg-(--color-bg)/30">
            <span className="text-xs text-(--color-text-muted) font-medium">
              Mostrando {firstItem}–{lastItem} de {totalItems}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg border border-(--color-border) hover:bg-(--color-bg)
                           text-(--color-text-muted) disabled:opacity-40 transition-colors">
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg border border-(--color-border) hover:bg-(--color-bg)
                           text-(--color-text-muted) disabled:opacity-40 transition-colors">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
