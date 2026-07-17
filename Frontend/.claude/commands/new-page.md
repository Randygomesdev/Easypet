# Template — Nova Página

Use este guia para criar qualquer nova página no Easypet Frontend.

## Checklist de criação

1. Criar o arquivo em `src/pages/<módulo>/<NomeDaPágina>.tsx`
2. Importar na `App.tsx` e adicionar a rota
3. Se necessário, adicionar o nav item no `Sidebar.tsx`
4. Se o serviço ainda não existir, criá-lo em `src/services/`

---

## Template básico de página

```tsx
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
// import { minhaService, type MinhaResponse } from '../../services/minha.service'

export default function NomeDaPaginaPage() {
  const [data,    setData]    = useState<MinhaResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    minhaService.getAll()
      .then(setData)
      .catch(() => setError('Não foi possível carregar os dados.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-(--color-primary-700)" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-(--color-text-heading)">
            Título da Página
          </h1>
          <p className="text-sm text-(--color-text-muted) mt-1">
            Descrição opcional
          </p>
        </div>
        {/* Botão de ação principal (opcional) */}
        <button className="px-4 py-2 rounded-xl bg-(--color-primary-700) text-white text-sm font-semibold
                           hover:bg-(--color-primary-600) transition-colors">
          + Novo
        </button>
      </div>

      {/* Conteúdo principal */}
      <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl shadow-sm overflow-hidden">
        {/* ... */}
      </div>

    </div>
  )
}
```

---

## Template de página com busca e paginação

```tsx
import { useEffect, useState, useCallback } from 'react'
import { Loader2, Search } from 'lucide-react'

const PAGE_SIZE = 20

export default function ListagemPage() {
  const [items,       setItems]       = useState<MinhaResponse[]>([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [page,        setPage]        = useState(0)
  const [totalPages,  setTotalPages]  = useState(0)

  const load = useCallback((q: string, p: number) => {
    setLoading(true)
    minhaService.getAll({ name: q, page: p, size: PAGE_SIZE })
      .then(res => {
        setItems(res.content)
        setTotalPages(res.totalPages)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(search, page) }, [search, page])

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-(--color-text-heading)">Título</h1>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-icon-default)" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Buscar..."
            className="w-full pl-9 pr-4 py-2 border border-(--color-border) rounded-xl text-sm
                       bg-(--color-surface) text-(--color-text-body)
                       focus:outline-none focus:ring-2 focus:ring-(--color-primary-500)/30"
          />
        </div>
      </div>

      {/* Tabela/Lista */}
      <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={24} className="animate-spin text-(--color-primary-700)" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-sm text-(--color-text-muted)">Nenhum item encontrado.</p>
          </div>
        ) : (
          <div className="divide-y divide-(--color-border)">
            {items.map(item => (
              <div key={item.id}
                className="px-5 py-4 flex items-center gap-4 hover:bg-(--color-bg)/60 transition-colors">
                {/* conteúdo da linha */}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 rounded-lg border border-(--color-border) text-sm
                       disabled:opacity-40 hover:bg-(--color-bg) transition-colors">
            Anterior
          </button>
          <span className="text-sm text-(--color-text-muted)">
            {page + 1} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 rounded-lg border border-(--color-border) text-sm
                       disabled:opacity-40 hover:bg-(--color-bg) transition-colors">
            Próxima
          </button>
        </div>
      )}

    </div>
  )
}
```

---

## Adicionar rota em App.tsx

```tsx
// 1. Importar o componente
import NomeDaPaginaPage from './pages/modulo/NomeDaPaginaPage'

// 2. Adicionar dentro do bloco de rota correto
{ path: 'nome-da-rota', element: <NomeDaPaginaPage /> },
```

## Adicionar nav item no Sidebar

```tsx
// src/components/layout/Sidebar.tsx
import { IconName } from 'lucide-react'

// Adicionar no array navItems do role correto
{ icon: IconName, label: 'Rótulo', path: '/modulo/rota' },
```

---

## Criar novo service

```ts
// src/services/novo.service.ts
import { api } from '../lib/api'
import type { PageResponse } from './booking.service'  // reutilize o tipo genérico

export interface NovoResponse {
  id:   string
  name: string
  // ...
}

export interface NovoQueryParams {
  name?: string
  page?: number
  size?: number
}

export const novoService = {
  getAll: (params?: NovoQueryParams): Promise<PageResponse<NovoResponse>> =>
    api.get('/endpoint', { params }).then(r => r.data),

  getById: (id: string): Promise<NovoResponse> =>
    api.get(`/endpoint/${id}`).then(r => r.data),

  create: (data: Partial<NovoResponse>): Promise<NovoResponse> =>
    api.post('/endpoint', data).then(r => r.data),

  update: (id: string, data: Partial<NovoResponse>): Promise<NovoResponse> =>
    api.put(`/endpoint/${id}`, data).then(r => r.data),

  delete: (id: string): Promise<void> =>
    api.delete(`/endpoint/${id}`).then(r => r.data),
}
```
