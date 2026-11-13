# Easypet — Auth Service

Microsserviço de autenticação da plataforma [Easypet](https://github.com/randygomesdev). Responsável pelo registro de usuários, login, OAuth2 com Google e redefinição de senha para todos os perfis do sistema.

> Este serviço é derivado do [auth-service](https://github.com/Randygomesdev/auth-service) genérico e estendido com os papéis específicos do Easypet.

## Papéis (Roles)

| Papel | Descrição |
|-------|-----------|
| `ADMIN` | Administrador da plataforma |
| `PARTNER` | Dono de estabelecimento pet (clínica, petshop, hotel) |
| `CUSTOMER` | Tutor de pet utilizando o app Easypet |
| `TEAM_MEMBER` | Colaborador com acesso individual por estabelecimento |
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

Gateway e serviços protegidos consultam `GET /api/v1/auth/session` com o bearer original. A assinatura de equipe usa `AUTH_TEAM_JWT_SECRET` exclusivamente no Auth. A consulta verifica o estado da conta e do vínculo a cada chamada.

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

GOOGLE_AUTH_ENABLED=false

AUTH_MAIL_ENABLED=false
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
| POST | `/auth/oauth2/exchange` | Trocar código OAuth2 por JWT fora do perfil homolog |
| GET | `/auth/session` | Verificar sessão e retornar papel, escopo e permissões |
| GET | `/users/{id}` | Buscar usuário por ID (autenticado) |

## Contas e e-mail na homologação interna

Depois de aplicar as migrations no banco da homologação, o operador pode criar uma conta fictícia com o CLI executado no contêiner Auth do próprio ambiente. O comando exige o perfil `homolog` e lê a senha e a confirmação no terminal.

```bash
java -Dloader.main=br.com.innkercode.auth.ProvisionPilotUser -cp /app/app.jar \
  org.springframework.boot.loader.launch.PropertiesLauncher \
  ADMIN admin@example.test 'Admin de homologação'
```

Os papéis `PARTNER` e `CUSTOMER` também podem ser provisionados. E-mails já cadastrados são recusados, preservando a conta e suas credenciais. Consulte a [matriz H1 do Auth](../../docs/sprints/S02-identidade/contracts.md#h1-02--homologação-interna-13112026) para coletor interno, flags, URLs e operação de contas.

## Google OAuth

Habilite com `GOOGLE_AUTH_ENABLED=true` e configure credenciais, origem, callback e a lista de e-mails autorizados no ambiente do Auth. A conta EasyPet deve existir antes do login. Consulte o [contrato de Google OAuth](../../docs/sprints/S02-identidade/contracts.md#google-oauth--13112026) para URLs, elegibilidade, cookies e troca de código.

## Migrações do Banco de Dados

| Versão | Descrição |
|--------|-----------|
| V1 | Criação da tabela de usuários |
| V2 | Criação da tabela de tokens de redefinição de senha |
| V3 | Constraint de papéis válidos (ADMIN, USER, CUSTOMER, PARTNER) |

---

Desenvolvido por [Innker Code](https://github.com/randygomesdev)
