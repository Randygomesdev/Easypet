# Easypet — Auth Service

Microsserviço de autenticação da plataforma [Easypet](https://github.com/randygomesdev). Responsável pelo registro de usuários, login, OAuth2 com Google e redefinição de senha para todos os perfis do sistema.

> Este serviço é derivado do [auth-service](https://github.com/Randygomesdev/auth-service) genérico e estendido com os papéis específicos do Easypet.

## Papéis (Roles)

| Papel | Descrição |
|-------|-----------|
| `ADMIN` | Administrador da plataforma |
| `PARTNER` | Dono de estabelecimento pet (clínica, petshop, hotel) |
| `CUSTOMER` | Tutor de pet utilizando o app Easypet |
| `USER` | Usuário autenticado genérico |

## Parte do Ecossistema Easypet

O Easypet é uma plataforma de gestão de cuidados pet baseada em microsserviços. Este serviço é responsável pela identidade e controle de acesso em todos os outros serviços.

```
┌─────────────────────────────────────────────────────┐
│                    API Gateway                      │
└──────────┬──────────────────────────────────────────┘
           │
     ┌─────▼──────┐   ┌─────────────┐   ┌──────────────┐
     │ Auth       │   │ Pet Service │   │    Booking   │
     │ Service ◄──┼───┤             │   │    Service   │
     │ :8081      │   │ :8082       │   │    :8084     │
     └────────────┘   └─────────────┘   └──────────────┘
```

Os tokens JWT emitidos por este serviço são validados em todos os outros serviços através do `JWT_SECRET` compartilhado.

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Linguagem | Java 21 |
| Framework | Spring Boot 3.4 |
| Segurança | Spring Security 6 + JJWT 0.12.6 |
| OAuth2 | Google |
| Banco de dados | PostgreSQL + Flyway |
| E-mail | Spring Mail (SMTP) |
| Documentação | SpringDoc OpenAPI 2.7 |

## Como executar

### 1. Pré-requisitos

- Java 21+
- Maven 3.9+
- PostgreSQL em execução (veja o `docker-compose.yml` no repositório de infraestrutura do Easypet)

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```properties
SERVER_PORT=8081

AUTH_DB_URL=jdbc:postgresql://localhost:5432/auth_db
AUTH_DB_USERNAME=seu_usuario
AUTH_DB_PASSWORD=sua_senha

JWT_SECRET=sua_chave_secreta_compartilhada
JWT_EXPIRATION=86400000

GOOGLE_CLIENT_ID=seu_google_client_id
GOOGLE_CLIENT_SECRET=seu_google_client_secret

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=seu_email@gmail.com
MAIL_PASSWORD=sua_app_password
```

### 3. Executar

```bash
mvn spring-boot:run
```

O serviço iniciará em `http://localhost:8081/api/v1`.  
Swagger UI: `http://localhost:8081/api/v1/swagger-ui.html`

## Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/register` | Registrar novo usuário |
| POST | `/auth/login` | Autenticar e receber JWT |
| POST | `/auth/forgot-password` | Enviar e-mail de redefinição de senha |
| POST | `/auth/reset-password` | Redefinir senha com token |
| POST | `/auth/exchange` | Trocar código OAuth2 por JWT |
| GET | `/users/{id}` | Buscar usuário por ID (autenticado) |

## Migrações do Banco de Dados

| Versão | Descrição |
|--------|-----------|
| V1 | Criação da tabela de usuários |
| V2 | Criação da tabela de tokens de redefinição de senha |
| V3 | Constraint de papéis válidos (ADMIN, USER, CUSTOMER, PARTNER) |

---

Desenvolvido por [Innker Code](https://github.com/randygomesdev)
