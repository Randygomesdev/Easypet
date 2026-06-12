# Easypet — Infraestrutura

Repositório de infraestrutura e documentação da plataforma [Easypet](https://github.com/randygomesdev). Contém o `docker-compose.yml` para subir toda a infraestrutura local e a documentação arquitetural do ecossistema.

## O que é o Easypet?

O Easypet é uma plataforma de gestão de cuidados pet baseada em microsserviços. Conecta tutores de pets a estabelecimentos parceiros (clínicas veterinárias, petshops, hotéis e banho & tosa), oferecendo agendamento online, prontuário digital e painel de gestão para os parceiros.

## Repositórios

| Repositório | Descrição |
|-------------|-----------|
| [Easypet-infra](https://github.com/Randygomesdev/Easypet-infra) | Infraestrutura e documentação (este repo) |
| [Easypet-auth-service](https://github.com/Randygomesdev/Easypet-auth-service) | Autenticação JWT e OAuth2 |
| [Easypet-gateway-service](https://github.com/Randygomesdev/Easypet-gateway-service) | API Gateway |
| [Easypet-pet-service](https://github.com/Randygomesdev/Easypet-pet-service) | Gestão de pets e prontuários |
| [Easypet-partner-service](https://github.com/Randygomesdev/Easypet-partner-service) | Gestão de estabelecimentos |
| [Easypet-booking-service](https://github.com/Randygomesdev/Easypet-booking-service) | Agendamentos e atendimentos |
| [Easypet-frontend](https://github.com/Randygomesdev/Easypet-frontend) | Interface web React |

## Arquitetura

```
┌──────────────────────────────────────────────────────────┐
│                       Frontend :5173                     │
│             React 19 + Vite + Tailwind CSS v4            │
└─────────────────────────┬────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│                   API Gateway :8080                      │
│        Spring Cloud Gateway + JWT + Rate Limiting        │
└──┬──────────┬──────────┬──────────┬─────────────────────┘
   │          │          │          │
   ▼          ▼          ▼          ▼
:8081      :8082      :8083      :8084
Auth       Pet       Partner   Booking
Service   Service   Service   Service
```

## Como executar

### 1. Subir a infraestrutura

```bash
cp .env.example .env
docker compose up -d
```

### 2. Subir os serviços

Consulte o guia completo em [docs/getting-started.md](docs/getting-started.md).

## Documentação

- [Arquitetura](docs/architecture.md) — diagrama e fluxo de autenticação
- [Serviços](docs/services.md) — portas, tecnologias e variáveis compartilhadas
- [Como executar](docs/getting-started.md) — passo a passo para rodar localmente

## Serviços de Infraestrutura

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| PostgreSQL (auth) | 5432 | Banco do auth-service |
| PostgreSQL (pet) | 5433 | Banco do pet-service |
| PostgreSQL (partner) | 5434 | Banco do partner-service |
| PostgreSQL (booking) | 5435 | Banco do booking-service |
| PostgreSQL (payment) | 5436 | Banco do payment-service |
| Redis | 6379 | Cache e rate limiting |
| MinIO | 9000/9001 | Armazenamento de arquivos |
| PgAdmin | 5050 | Interface visual dos bancos |

---

Desenvolvido por [Innker Code](https://github.com/randygomesdev)
