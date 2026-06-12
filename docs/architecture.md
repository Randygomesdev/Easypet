# Arquitetura do Easypet

## Visão Geral

O Easypet é uma plataforma de gestão de cuidados pet baseada em microsserviços. Cada serviço é independente, tem seu próprio banco de dados e se comunica através do API Gateway.

## Diagrama

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
│              React 19 + Vite + Tailwind v4                  │
│                     :5173                                   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                            │
│         Spring Cloud Gateway + JWT + Rate Limiting          │
│                        :8080                                │
└──┬──────────┬──────────┬──────────┬──────────┬─────────────┘
   │          │          │          │          │
   ▼          ▼          ▼          ▼          ▼
┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
│ Auth │  │ Pet  │  │Part. │  │Book. │  │Pay.  │
│:8081 │  │:8082 │  │:8083 │  │:8084 │  │:8085 │
└──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘
   │          │          │          │          │
   ▼          ▼          ▼          ▼          ▼
┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
│PG    │  │PG    │  │PG    │  │PG    │  │PG    │
│:5432 │  │:5433 │  │:5434 │  │:5435 │  │:5436 │
└──────┘  └──────┘  └──────┘  └──────┘  └──────┘

Infraestrutura compartilhada:
  Redis  :6379  — Rate limiting e cache
  MinIO  :9000  — Armazenamento de arquivos
  PgAdmin:5050  — Interface visual dos bancos
```

## Fluxo de Autenticação

```
1. Usuário faz login → Auth Service emite JWT
2. Frontend armazena o JWT no localStorage
3. Todas as requisições seguintes incluem: Authorization: Bearer <token>
4. API Gateway valida o JWT antes de repassar ao serviço
5. Gateway injeta X-User-Id, X-User-Role e X-User-Email como headers
6. Serviços downstream confiam nos headers sem revalidar o token
```

## Papéis (Roles)

| Role | Descrição | Painel |
|------|-----------|--------|
| `ADMIN` | Administrador da plataforma | `/admin` |
| `PARTNER` | Dono de estabelecimento pet | `/partner` |
| `CUSTOMER` | Tutor de pet | `/app` |
