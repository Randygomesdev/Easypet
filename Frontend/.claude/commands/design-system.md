# Design System — Easypet Frontend

## Paleta de Cores (Tailwind v4 — `src/index.css`)

### Brand
| Token | Valor | Uso |
|-------|-------|-----|
| `--color-primary-700` | `#16426b` | Cor principal, headings, ícones ativos |
| `--color-primary-500` | `#2e78be` | Links, botões secundários |
| `--color-secondary-500` | `#ee9019` | Accent, badge ativo, hover |

### Semânticos (mudam no dark mode)
| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--color-bg` | `#f6f6f8` | `#16426b` | Fundo da página |
| `--color-surface` | `#ffffff` | `#0f2f50` | Cards, header, sidebar |
| `--color-border` | `#ebebef` | `#2a6090` | Bordas |
| `--color-text-heading` | `#16426b` | `#e8f0f7` | Títulos |
| `--color-text-body` | `#484860` | `#c5d8ec` | Texto corrido |
| `--color-text-muted` | `#808098` | `#7a9ab8` | Labels, subtítulos |
| `--color-text-placeholder` | `#c0c0cc` | `#4a6880` | Placeholders |
| `--color-icon-default` | `#808098` | `#7a9ab8` | Ícones inativos |
| `--color-icon-active` | `#16426b` | `#9dbfdf` | Ícones ativos |

### Como usar no JSX
```tsx
// CORRETO — Tailwind v4 com CSS var
className="text-(--color-text-heading)"
className="bg-(--color-surface)"
className="border-(--color-border)"

// ERRADO — não funciona em SVG (recharts)
// use valores literais: '#16426b'
```

---

## Padrões de Componentes

### Card padrão
```tsx
<div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-5 shadow-sm">
  {/* conteúdo */}
</div>
```

### Card com header separado
```tsx
<div className="bg-(--color-surface) border border-(--color-border) rounded-2xl shadow-sm overflow-hidden">
  <div className="px-5 py-4 border-b border-(--color-border) flex items-center justify-between">
    <div>
      <h2 className="text-sm font-bold text-(--color-text-heading)">Título</h2>
      <p className="text-xs text-(--color-text-muted) mt-0.5">Subtítulo</p>
    </div>
    <button className="text-xs font-semibold text-(--color-primary-700) hover:text-(--color-secondary-500) transition-colors">
      Ação
    </button>
  </div>
  {/* corpo */}
</div>
```

### Cabeçalho de página
```tsx
<div>
  <h1 className="text-2xl lg:text-3xl font-bold text-(--color-text-heading)">
    Título da Página
  </h1>
  <p className="text-sm text-(--color-text-muted) mt-1">
    Descrição opcional
  </p>
</div>
```

### Loading state
```tsx
import { Loader2 } from 'lucide-react'

if (loading) {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin text-(--color-primary-700)" />
    </div>
  )
}
```

### Empty state
```tsx
<div className="flex flex-col items-center justify-center py-12 gap-3">
  <div className="w-14 h-14 rounded-full bg-(--color-bg) border border-(--color-border) flex items-center justify-center">
    <IconName size={22} className="text-(--color-text-muted)" />
  </div>
  <p className="text-xs text-(--color-text-muted)">Mensagem de vazio</p>
</div>
```

### Botão primário
```tsx
<button className="px-4 py-2 rounded-xl bg-(--color-primary-700) text-white text-sm font-semibold
                   hover:bg-(--color-primary-600) transition-colors">
  Ação
</button>
```

### Botão ghost/outline
```tsx
<button className="px-4 py-2 rounded-xl border border-(--color-border) text-sm font-semibold
                   text-(--color-text-body) hover:bg-(--color-bg) transition-colors">
  Cancelar
</button>
```

### Botão destrutivo
```tsx
<button className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold
                   hover:bg-red-600 transition-colors">
  Excluir
</button>
```

### Input
```tsx
<input
  className="w-full border border-(--color-border) rounded-xl px-3 py-2 text-sm
             bg-(--color-surface) text-(--color-text-body) placeholder-(--color-text-placeholder)
             focus:outline-none focus:ring-2 focus:ring-(--color-primary-500)/30 transition"
  placeholder="Buscar..."
/>
```

### Select
```tsx
<select className="border border-(--color-border) rounded-xl px-3 py-2 text-sm
                   bg-(--color-surface) text-(--color-text-body)
                   focus:outline-none focus:ring-2 focus:ring-(--color-primary-500)/30">
  <option value="">Todos</option>
</select>
```

### Badge de status (padrão)
```tsx
// Cores por semântica
const STATUS_STYLE = {
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CONFIRMED: 'bg-violet-100  text-violet-700',
  PENDING:   'bg-amber-100   text-amber-700',
  CANCELLED: 'bg-pink-100    text-pink-600',
}

<span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[status]}`}>
  {label}
</span>
```

### Tabela / lista com divisor
```tsx
<div className="divide-y divide-(--color-border)">
  {items.map(item => (
    <div key={item.id}
      className="px-5 py-3.5 flex items-center gap-3 hover:bg-(--color-bg)/60 transition-colors">
      {/* conteúdo da linha */}
    </div>
  ))}
</div>
```

### Modal de confirmação
```tsx
{showModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="bg-(--color-surface) rounded-2xl p-6 shadow-xl w-full max-w-sm mx-4">
      <h3 className="text-base font-bold text-(--color-text-heading) mb-2">Confirmar ação</h3>
      <p className="text-sm text-(--color-text-muted) mb-5">Texto explicativo da ação.</p>
      <div className="flex gap-3 justify-end">
        <button onClick={() => setShowModal(false)}
          className="px-4 py-2 rounded-xl border border-(--color-border) text-sm font-semibold
                     text-(--color-text-body) hover:bg-(--color-bg) transition-colors">
          Cancelar
        </button>
        <button onClick={handleConfirm}
          className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold
                     hover:bg-red-600 transition-colors">
          Confirmar
        </button>
      </div>
    </div>
  </div>
)}
```

### Toast / notificação simples
```tsx
// Padrão usado no projeto: estado local com auto-dismiss
const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

function showToast(msg: string, type: 'success' | 'error' = 'success') {
  setToast({ msg, type })
  setTimeout(() => setToast(null), 3000)
}

{toast && (
  <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white
    ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
    {toast.msg}
  </div>
)}
```

---

## Grid e Espaçamento

```tsx
// Layout de página
<div className="space-y-5">...</div>

// Grid de KPIs
<div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">

// Grid de 2 colunas
<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

// Grid de 3 colunas
<div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
```

---

## Recharts (gráficos)

> CSS variables **não funcionam** dentro de SVG. Use valores literais.

```tsx
const C_PRIMARY   = '#16426b'
const C_SECONDARY = '#ee9019'
const C_MUTED     = '#808098'
const C_BORDER    = '#ebebef'
const C_BG        = '#f6f6f8'

// Estilo padrão de Tooltip
<Tooltip
  contentStyle={{
    borderRadius: '12px',
    border: '1px solid #ebebef',
    fontSize: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,.06)',
  }}
/>
```

---

## Tipografia

| Uso | Classe |
|-----|--------|
| Título de página | `text-2xl lg:text-3xl font-bold text-(--color-text-heading)` |
| Título de card/seção | `text-sm font-bold text-(--color-text-heading)` |
| Subtítulo/descrição | `text-xs text-(--color-text-muted) mt-0.5` |
| Texto de corpo | `text-sm text-(--color-text-body)` |
| Label muted | `text-xs text-(--color-text-muted)` |
| Valor numérico KPI | `text-2xl font-black text-(--color-text-heading) tabular-nums` |
