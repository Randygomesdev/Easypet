# Easypet — Gateway Service

API Gateway da plataforma [Easypet](https://github.com/randygomesdev). Ponto de entrada único para todos os microsserviços — valida JWT, aplica CORS, rate limiting via Redis e injeta informações do usuário autenticado como headers para os serviços downstream.

> Este serviço é derivado do [gateway-service](https://github.com/Randygomesdev/Gateway-service) genérico e configurado com as rotas específicas do Easypet.

## Parte do Ecossistema Easypet

```
Frontend (5173)
      │
      ▼
┌─────────────────┐
│  Gateway :8080  │  ← validação JWT + rate limiting
└────────┬────────┘
         │
    ┌────┴─────────────────────────────────┐
    │             │            │           │
    ▼             ▼            ▼           ▼
Auth :8081   Pet :8082  Partner :8083  Booking :8084
```

## Rotas

| Serviço | Rota | Autenticação |
|---------|------|-------------|
| auth-service | `/api/v1/auth/**` | Pública (login, registro, OAuth2) |
| pet-service | `/api/v1/pets/**` | JWT obrigatório |
| partner-service | `/api/v1/partners/**` | GET público (marketplace), demais JWT |
| booking-service | `/api/v1/bookings/**` | JWT obrigatório |
| payment-service | `/api/v1/payments/**` | JWT obrigatório |

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Linguagem | Java 21 |
| Framework | Spring Boot 3.4 + Spring Cloud Gateway |
| Autenticação | JJWT 0.12.6 |
| Rate Limiting | Redis (Spring Data Redis Reactive) |

## Como executar

### 1. Pré-requisitos

- Java 21+
- Maven 3.9+
- Redis em execução

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```properties
SERVER_PORT=8080

# JWT — mesmo segredo do auth-service
JWT_SECRET=sua_chave_secreta

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# CORS
ALLOWED_ORIGINS=http://localhost:5173

# URLs dos serviços (opcional — usa localhost por padrão)
AUTH_SERVICE_URL=http://localhost:8081
PET_SERVICE_URL=http://localhost:8082
PARTNER_SERVICE_URL=http://localhost:8083
BOOKING_SERVICE_URL=http://localhost:8084
PAYMENT_SERVICE_URL=http://localhost:8085
```

### 3. Executar

```bash
mvn spring-boot:run
```

O gateway iniciará em `http://localhost:8080`.

## Headers injetados nos serviços downstream

| Header | Conteúdo |
|--------|----------|
| `X-User-Id` | UUID do usuário autenticado |
| `X-User-Role` | Role do usuário (`ADMIN`, `PARTNER`, `CUSTOMER`) |
| `X-User-Email` | E-mail do usuário autenticado |

---

Desenvolvido por [Innker Code](https://github.com/randygomesdev)
