# Design System — Easypet Frontend

Documentação do sistema de design utilizado no frontend React do Easypet.  
Definido em `src/index.css` via `@theme` do Tailwind CSS v4.

---

## Paleta de Cores

### Brand

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `--color-primary-700` | `#16426b` | Azul escuro — cor principal |
| `--color-primary-500` | `#2e78be` | Azul médio |
| `--color-primary-400` | `#4f8ec8` | Azul claro |
| `--color-secondary-500` | `#ee9019` | Laranja — accent |
| `--color-secondary-400` | `#f7aa30` | Laranja claro |

### Tokens Semânticos (mode-aware)

| Variável | Light | Dark |
|----------|-------|------|
| `--color-bg` | `#f6f6f8` | `#16426b` |
| `--color-surface` | `#ffffff` | `#0f2f50` |
| `--color-border` | `#ebebef` | `#2a6090` |
| `--color-text-heading` | `#16426b` | `#e8f0f7` |
| `--color-text-body` | `#484860` | `#c5d8ec` |
| `--color-text-muted` | `#808098` | `#7a9ab8` |
| `--color-text-placeholder` | `#c0c0cc` | `#4a6880` |
| `--color-icon-default` | `#808098` | `#7a9ab8` |
| `--color-icon-active` | `#16426b` | `#9dbfdf` |

---

## Anatomia de uma Página

```
┌─────────────────────────────────────────────────────┐
│  Header (h-16, bg-surface, border-b)                │
├──────────┬──────────────────────────────────────────┤
│ Sidebar  │  <main> p-4 lg:p-8                       │
│  (w-56)  │                                          │
│          │  <div className="space-y-5">             │
│          │    Cabeçalho da página                   │
│          │    Filtros / busca                       │
│          │    Grid de cards ou tabela               │
│          │    Paginação                             │
│          │  </div>                                  │
└──────────┴──────────────────────────────────────────┘
```

---

## Componentes

### Card Base
```tsx
<div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-5 shadow-sm">
```

### Card com Header
```tsx
<div className="bg-(--color-surface) border border-(--color-border) rounded-2xl shadow-sm overflow-hidden">
  <div className="px-5 py-4 border-b border-(--color-border)">
    <h2 className="text-sm font-bold text-(--color-text-heading)">Título</h2>
    <p className="text-xs text-(--color-text-muted) mt-0.5">Subtítulo</p>
  </div>
  <div className="p-5">...</div>
</div>
```

### KPI Card
```tsx
<div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-4 shadow-sm
                hover:shadow-md transition-shadow flex flex-col gap-3">
  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-100">
    <span className="text-violet-600"><Icon size={20} /></span>
  </div>
  <div>
    <p className="text-2xl font-black text-(--color-text-heading) tabular-nums leading-none">42</p>
    <p className="text-[11px] font-semibold text-(--color-text-heading) mt-0.5">Label</p>
    <p className="text-[10px] text-(--color-text-muted) mt-0.5">Sublabel</p>
  </div>
</div>
```

---

## Grids Padrão

| Layout | Classe |
|--------|--------|
| Página | `space-y-5` |
| 2 colunas | `grid grid-cols-1 lg:grid-cols-2 gap-5` |
| 3 colunas | `grid grid-cols-1 lg:grid-cols-3 gap-5` |
| 6 KPIs | `grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4` |
| Cards de parceiros | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4` |

---

## Estados de UI

### Loading
```tsx
<div className="flex items-center justify-center h-64">
  <Loader2 size={28} className="animate-spin text-(--color-primary-700)" />
</div>
```

### Vazio (empty state)
```tsx
<div className="flex flex-col items-center justify-center py-12 gap-3">
  <div className="w-14 h-14 rounded-full bg-(--color-bg) border border-(--color-border) flex items-center justify-center">
    <IconName size={22} className="text-(--color-text-muted)" />
  </div>
  <p className="text-xs text-(--color-text-muted)">Mensagem de vazio</p>
</div>
```

### Erro
```tsx
<div className="flex items-center justify-center h-64">
  <p className="text-sm text-red-500">Mensagem de erro</p>
</div>
```

---

## Badges de Status

```tsx
// Agendamentos
COMPLETED → 'bg-emerald-100 text-emerald-700'
CONFIRMED → 'bg-violet-100  text-violet-700'
PENDING   → 'bg-amber-100   text-amber-700'
CANCELLED → 'bg-pink-100    text-pink-600'

// Roles
ADMIN    → 'bg-red-100    text-red-700'
PARTNER  → 'bg-blue-100   text-blue-700'
CUSTOMER → 'bg-green-100  text-green-700'

// Estrutura
<span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${style}`}>
  {label}
</span>
```

---

## Tipografia

| Elemento | Classes Tailwind |
|----------|-----------------|
| H1 — Título de página | `text-2xl lg:text-3xl font-bold text-(--color-text-heading)` |
| H2 — Título de card | `text-sm font-bold text-(--color-text-heading)` |
| Subtítulo | `text-xs text-(--color-text-muted) mt-0.5` |
| Corpo | `text-sm text-(--color-text-body)` |
| Muted label | `text-xs text-(--color-text-muted)` |
| KPI valor | `text-2xl font-black text-(--color-text-heading) tabular-nums` |
| KPI label | `text-[11px] font-semibold text-(--color-text-heading)` |

---

## Recharts — Constantes de Cor

> CSS variables não funcionam dentro de SVG. Use sempre valores literais:

```ts
const C_PRIMARY   = '#16426b'   // primary-700
const C_SECONDARY = '#ee9019'   // secondary-500
const C_MUTED     = '#808098'   // gray-500
const C_BORDER    = '#ebebef'   // gray-100
const C_BG        = '#f6f6f8'   // gray-50
```
