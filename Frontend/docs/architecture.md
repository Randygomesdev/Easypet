# Arquitetura — Easypet Frontend

## Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | React | 19 |
| Build | Vite | - |
| Linguagem | TypeScript | - |
| Estilos | Tailwind CSS v4 | - |
| Roteamento | React Router | v7 |
| HTTP | Axios | - |
| Ícones | lucide-react | - |
| Gráficos | recharts | - |

---

## Estrutura de Pastas

```
src/
├── assets/                     # Imagens e SVGs
│
├── components/
│   ├── layout/
│   │   ├── Layout.tsx           # Wrapper principal (sidebar + header + main)
│   │   ├── Sidebar.tsx          # Navegação lateral (role-aware)
│   │   └── Header.tsx           # Topo com hamburguer e user avatar
│   └── ui/
│       ├── TimePicker.tsx       # Seletor de hora customizado
│       └── UserAvatar.tsx       # Avatar de usuário
│
├── config/
│   └── env.ts                   # VITE_API_URL, VITE_GOOGLE_AUTH_URL
│
├── contexts/
│   ├── AuthContext.tsx           # user, token, login(), logout()
│   └── ThemeContext.tsx          # dark/light mode
│
├── lib/
│   └── api.ts                   # Axios instance — JWT interceptor, 401 redirect
│
├── pages/
│   ├── LandingPage.tsx          # Home pública (vitrine estática)
│   ├── auth/
│   │   ├── LoginPage.tsx        # Login + registro
│   │   ├── LoginSuccessPage.tsx # Callback OAuth2
│   │   └── SejaParceiroPage.tsx # Cadastro de parceiro
│   ├── partner/                 # Painel do parceiro (PARTNER role)
│   │   ├── DashboardPage.tsx    # KPIs + gráficos
│   │   ├── CadastroPage.tsx     # Perfil do estabelecimento
│   │   ├── ColaboradoresPage.tsx
│   │   ├── ColaboradorPage.tsx
│   │   ├── ServicosPage.tsx
│   │   ├── PacotesPage.tsx
│   │   ├── AgendamentosPage.tsx
│   │   └── AtendimentoPage.tsx
│   ├── admin/                   # Painel admin (ADMIN role) — a construir
│   │   ├── ParceiroListPage.tsx
│   │   └── ClienteListPage.tsx
│   └── app/                     # App do cliente (CUSTOMER role) — a construir
│       ├── HomePage.tsx          # Vitrine de estabelecimentos
│       ├── MeusPetsPage.tsx
│       └── PetDetalhesPage.tsx
│
├── routes/
│   ├── ProtectedRoute.tsx        # Redireciona para /login se não autenticado
│   └── RoleRouter.tsx            # Redireciona por role após login
│
├── services/
│   ├── auth.service.ts          # login, register, forgotPassword, resetPassword
│   ├── partner.service.ts       # getMe, create, updateMe, addService
│   ├── staff.service.ts         # CRUD staff + agenda + ausências
│   ├── pet.service.ts           # CRUD pets + histórico (appointments, vaccines…)
│   ├── booking.service.ts       # CRUD bookings + analytics
│   └── package.service.ts       # CRUD pacotes
│
├── types/
│   └── auth.types.ts            # UserRole, User, LoginRequest, RegisterRequest
│
├── App.tsx                      # Router principal
├── main.tsx                     # Entry point
└── index.css                    # Design tokens (@theme Tailwind v4)
```

---

## Fluxo de Autenticação

```
1. Usuário faz login → AuthContext armazena { token, id, name, email, role } no localStorage
2. api.ts injeta "Authorization: Bearer <token>" em todas as requisições via interceptor
3. RoleRouter redireciona por role:
   PARTNER  → /partner/dashboard
   ADMIN    → /admin/dashboard
   CUSTOMER → /app/home
4. ProtectedRoute protege todas as rotas autenticadas
5. Se o backend retornar 401, api.ts limpa localStorage e redireciona para /login
```

---

## Roles e Rotas

| Role | Rota base | Sidebar |
|------|-----------|---------|
| `PARTNER` | `/partner/*` | Dashboard, Cadastro, Colaboradores, Serviços, Pacotes, Agendamentos, Atendimento |
| `ADMIN` | `/admin/*` | Parceiros, Clientes |
| `CUSTOMER` | `/app/*` | Home, Meus Pets |

---

## Integração com Backend

Toda comunicação passa pelo **API Gateway** em `http://localhost:8080/api/v1`.

```
Frontend :5173
    │
    └── API Gateway :8080
            ├── /auth/*      → Auth Service :8081
            ├── /pets/*      → Pet Service :8082
            ├── /partners/*  → Partner Service :8083
            └── /bookings/*  → Booking Service :8084
```

O Gateway injeta `X-User-Id`, `X-User-Role` e `X-User-Email` nos headers downstream — os serviços confiam nesses headers sem revalidar o JWT.

---

## Variáveis de Ambiente

```env
# .env
VITE_API_URL=http://localhost:8080/api/v1
VITE_GOOGLE_AUTH_URL=http://localhost:8081/api/v1/oauth2/authorization/google
```

---

## Padrões de Código

- **Um componente por arquivo**, nomeado igual ao arquivo (PascalCase)
- **Services** são objetos literais exportados (não classes)
- **Tipos** definidos com `interface` (não `type`) para DTOs de API
- **useState + useEffect** para dados assíncronos (sem biblioteca de estado global)
- **useCallback** em funções de fetch que são dependência de outros `useEffect`
- **Textos** sempre em português
- **CSS** sempre via CSS variables do design system — nunca cores hardcoded em JSX
  - Exceção: recharts (SVG não aceita CSS vars) — usar constantes literais
