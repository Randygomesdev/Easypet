# Easypet — Frontend

Interface web da plataforma [Easypet](https://github.com/randygomesdev), construída com React 19, Vite e Tailwind CSS v4. Inclui o painel do parceiro, landing page e estrutura base para o app do cliente.

## Funcionalidades

- Landing page pública
- Autenticação: login com e-mail/senha e Google OAuth2
- Cadastro de parceiros (`/seja-parceiro`)
- **Painel do Parceiro** (`/partner`):
  - Dashboard com KPIs e gráficos
  - Cadastro do estabelecimento
  - Gestão de colaboradores e agenda
  - Gestão de serviços e pacotes
  - Agendamentos com filtros e ações por status
  - Tela de atendimento com prontuário do pet
- Estrutura base para o painel Admin (`/admin`)
- Estrutura base para o app do cliente (`/app`)

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Framework | React 19 |
| Build | Vite 8 |
| Estilização | Tailwind CSS v4 |
| Linguagem | TypeScript |
| Roteamento | React Router v7 |
| HTTP | Axios |
| Gráficos | Recharts |
| Ícones | Lucide React |
| Componentes | Radix UI |

## Parte do Ecossistema Easypet

```
Frontend :5173
      │
      ▼
API Gateway :8080
      │
      ├── Auth Service    :8081
      ├── Pet Service     :8082
      ├── Partner Service :8083
      └── Booking Service :8084
```

## Como executar

### 1. Pré-requisitos

- Node.js 20+
- API Gateway em execução (`http://localhost:8080`)

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```properties
VITE_API_URL=http://localhost:8080/api/v1
VITE_GOOGLE_AUTH_URL=http://localhost:8081/api/v1/oauth2/authorization/google
```

### 3. Instalar dependências

```bash
npm install
```

### 4. Executar em desenvolvimento

```bash
npm run dev
```

O frontend iniciará em `http://localhost:5173`.

### 5. Build para produção

```bash
npm run build
```

## Estrutura do projeto

```
src/
├── assets/          # Imagens e SVGs
├── components/      # Componentes reutilizáveis e layout
├── contexts/        # AuthContext
├── pages/
│   ├── auth/        # Login, LoginSuccess, SejaParceiroPage
│   ├── partner/     # Dashboard, Agendamentos, Atendimento, etc.
│   └── LandingPage
├── routes/          # ProtectedRoute, RoleRouter
└── services/        # Camada de integração com a API
```

---

Desenvolvido por [Innker Code](https://github.com/randygomesdev)
