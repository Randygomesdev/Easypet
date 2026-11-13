# Easypet Frontend — Contexto do Projeto

## Visão Geral
Frontend React 19 da plataforma Easypet — conecta tutores de pets a estabelecimentos parceiros
(clínicas, petshops, hotéis, banho & tosa). Migrado do Angular para React 19 + Vite + Tailwind v4.

**Repositório:** https://github.com/Randygomesdev/Easypet-frontend  
**Dev:** `npm run dev` → http://localhost:5173  
**API Gateway:** http://localhost:8080/api/v1

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Estilos | Tailwind CSS v4 (CSS variables via `@theme`) |
| Roteamento | React Router v7 |
| HTTP | Axios (`src/lib/api.ts`) — JWT injetado via interceptor |
| Ícones | lucide-react |
| Gráficos | recharts |
| Auth | JWT no localStorage (`token` e `user`) |

---

## Estrutura de Arquivos

```
src/
├── assets/           # Imagens e SVGs
├── components/
│   ├── layout/       # Layout.tsx, Header.tsx, Sidebar.tsx

│   └── ui/           # Componentes reutilizáveis (TimePicker, UserAvatar…)
├── config/           # env.ts (VITE_API_URL)
├── contexts/         # AuthContext.tsx, ThemeContext.tsx
├── lib/              # api.ts (axios instance)
├── pages/
│   ├── auth/         # LoginPage, LoginSuccessPage, SejaParceiroPage
│   ├── partner/      # Painel do parceiro (completo)
│   ├── admin/        # Painel admin (a construir)
│   └── app/          # App do cliente (a construir)
├── routes/           # ProtectedRoute.tsx, RoleRouter.tsx
├── services/         # auth, partner, staff, pet, booking, package
├── types/            # auth.types.ts
└── index.css         # Design tokens (@theme)
```

---

## Roles e Rotas

| Role | Rota base | Status |
|------|-----------|--------|
| `PARTNER` | `/partner/*` | Completo |
| `ADMIN` | `/admin/*` | A construir |
| `CUSTOMER` | `/app/*` | A construir |

O `Sidebar` precisa ser **role-aware** — exibir nav items diferentes por role.

---

## Serviços de Backend (via Gateway :8080)

| Serviço | Base path | Porta direta |
|---------|-----------|-------------|
| Auth | `/api/v1/auth` | :8081 |
| Pets + Prontuário | `/api/v1/pets` | :8082 |
| Parceiros | `/api/v1/partners` | :8083 |
| Agendamentos | `/api/v1/bookings` | :8084 |

### Endpoints relevantes para as páginas pendentes

```
# Admin — Parceiros
GET    /partners?name=&page=&size=   lista paginada
PUT    /partners/{id}                edita parceiro
DELETE /partners/{id}                remove parceiro

# Admin — Clientes (auth-service)
GET    /users?role=CUSTOMER&page=&size=   lista clientes (endpoint a verificar/criar)
PUT    /users/{id}                        edita cliente

# Cliente — Vitrine
GET    /partners?category=&name=&page=   busca pública de estabelecimentos

# Cliente — Meus Pets
GET    /pets                 lista pets do usuário autenticado
POST   /pets                 cria pet
PUT    /pets/{id}            edita pet
DELETE /pets/{id}            remove pet

# Cliente — Prontuário do Pet
GET    /pets/{id}/history    histórico completo (appointments, meds, exams, vaccines)
```

---

## Status de Implementação

### Concluído
- [x] LandingPage (vitrine pública)
- [x] Auth: Login, OAuth2, Seja Parceiro
- [x] `/partner/dashboard` — KPIs + gráficos
- [x] `/partner/cadastro` — perfil completo do estabelecimento
- [x] `/partner/colaboradores` — CRUD de staff com agenda e ausências
- [x] `/partner/servicos` — CRUD de serviços
- [x] `/partner/pacotes` — CRUD de pacotes
- [x] `/partner/agendamentos` — lista + filtros + busca
- [x] `/partner/atendimento` — workflow de atendimento do dia

### Pendente
- [ ] Sidebar role-aware (pré-requisito para admin e app)
- [ ] `/admin/parceiros` — lista todos os parceiros + edição
- [ ] `/admin/clientes` — lista todos os clientes + edição
- [ ] `/app/home` — vitrine de estabelecimentos (marketplace)
- [ ] `/app/pets` — meus pets (CRUD)
- [ ] `/app/pets/:id` — detalhes e prontuário do pet

---

## Guia Rápido de Desenvolvimento

Use `/design-system` para ver todos os tokens de cor e padrões de componentes.  
Use `/new-page` para o template padrão de uma nova página.

### Regras obrigatórias
1. Sempre usar CSS variables do design system (`--color-*`)
2. Cards: `bg-(--color-surface) border border-(--color-border) rounded-2xl shadow-sm`
3. Textos: `text-(--color-text-heading)` / `text-(--color-text-body)` / `text-(--color-text-muted)`
4. Loading state: `<Loader2 size={28} className="animate-spin text-(--color-primary-700)" />`
5. Ícones via lucide-react
6. Chamadas HTTP via `api` de `../../lib/api` (nunca fetch nativo)
7. Toda string voltada ao usuário em **português**
