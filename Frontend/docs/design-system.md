# Design System — Easypet Frontend

Os tokens do frontend ficam em `src/index.css` via `@theme` do Tailwind CSS v4. A galeria `/design-system` mostra as escalas de cor, a tipografia e os componentes com exemplos TSX. Em desenvolvimento, abra a URL diretamente. No build, entre com uma conta `ADMIN` e use o item **Design system** no menu.

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
| `--color-text-danger` | `--color-red-700` | `--color-red-300` |
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

| Componente em `src/components/ui/` | Composição |
| --- | --- |
| `Button.tsx` | `Button` usa `type="button"` por padrão. Declare `type="submit"` em formulários. Variantes `primary`, `accent`, `secondary` e `danger`, com tamanhos `default` e `sm`. Dê nome acessível a botões que exibem apenas um ícone. |
| `Field.tsx` | `TextField` e `SelectField` associam `label`, `hint` e `error` ao controle. Aceitam `ref` e props nativas. `SelectField` usa `<option>` como filhos. |
| `Badge.tsx` | `Badge` recebe o rótulo do domínio e um tom `neutral`, `success`, `info`, `warning` ou `danger`. |
| `Card.tsx` | `Card` define superfície, borda, raio e sombra. Combine com `CardHeader` e `CardContent` quando precisar de título, ação e espaçamento interno. |
| `Dialog.tsx` | `Dialog` usa o elemento nativo e o estado `open` do consumidor. Mantenha-o montado enquanto `open` alterna para que o foco retorne ao acionador. Use `onOpenChange` para aplicar a solicitação de fechamento por botão ou Escape. |
| `Table.tsx` | `Table` fornece `caption` e região com rolagem horizontal acessível por teclado. Componha com `<thead>`, `<tbody>`, `TableHeaderCell` e `TableCell`. |
| `Pagination.tsx` | `Pagination` recebe `page` com base 1, `totalPages` e `onPageChange`. Ajuste a base no consumidor se o endpoint começar em zero. |
| `FeedbackState.tsx` | `LoadingState`, `ErrorState` e `EmptyState` recebem textos e ações da página. `EmptyState` recebe um ícone de `lucide-react`. |
| `TimePicker.tsx` e `UserAvatar.tsx` | Componentes existentes para escala e identidade visual. `TimePicker` recebe `value` e `onChange`. `UserAvatar` recebe `name`, `pictureUrl?` e `size?`. |

```tsx
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { TextField } from '../../components/ui/Field'

<Card>
  <CardHeader title="Dados do tutor" />
  <CardContent>
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextField label="E-mail" name="email" type="email" autoComplete="email"
        required error={errors.email} />
      <Button type="submit" disabled={saving}>Salvar</Button>
    </form>
  </CardContent>
</Card>
```

Primitivas de `components/ui` recebem valores, conteúdo e callbacks por props. Mantenha acesso a serviços, permissões e estados de negócio nas páginas, hooks e features. Reaproveite as variantes e os tokens semânticos. Ao introduzir um padrão em outra sprint, envie a composição e os estados usados para a galeria em `src/pages/design-system/`.

### KPI Card
```tsx
<div className="bg-surface border border-(--color-border) rounded-2xl p-4 shadow-sm
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

```tsx
import { Users } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/FeedbackState'

if (loading) return <LoadingState label="Carregando clientes…" />
if (error) return <ErrorState message={error}
  action={<Button variant="secondary" onClick={reload}>Tentar novamente</Button>} />
if (customers.length === 0) return <EmptyState icon={Users} title="Nenhum cliente cadastrado." />
```

---

## Badges de Status

Em agendamentos, os exemplos da galeria usam `success` para concluído, `info` para confirmado, `warning` para pendente e `danger` para cancelado. Inclua sempre o rótulo de status junto da cor.

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

## Verificação local

Execute `npm run test:design-system` em `Frontend/` com Chromium do Playwright disponível. Para usar Chrome instalado, configure `EASYPET_S01_BROWSER_CHANNEL=chrome` no ambiente do comando. O teste sobe Vite e o preview em `127.0.0.1:19141` e `127.0.0.1:19142`, respectivamente. Ele ativa as rotas da onda B e verifica navegação, permissões, revogação, indisponibilidade da sessão e componentes com respostas de API simuladas. A suíte de aceite com os serviços reais é executada pela S07.
