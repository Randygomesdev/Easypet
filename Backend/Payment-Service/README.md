# Easypet Payment Service

Serviço de pagamentos e pacotes de serviços da plataforma [Easypet](https://github.com/Randygomesdev/Easypet-infra).

## Responsabilidades

- Criação e gerenciamento de **templates de pacotes** pelos parceiros
- **Compra de pacotes** pelos clientes (créditos pré-pagos de serviços)
- **Consumo de créditos** no momento do agendamento
- Registro de transações de pagamento (CARD, PIX)
- Integração com o `partner-service` para validar serviços

## Tecnologias

| Tecnologia | Versão |
|-----------|--------|
| Java | 21 |
| Spring Boot | 3.4.1 |
| Spring Security | 6 |
| PostgreSQL | - |
| Flyway | - |
| JWT (JJWT) | 0.12.6 |
| MapStruct | 1.6.3 |
| Gradle | 8+ |

## Porta

| Ambiente | Porta |
|----------|-------|
| Local | `8085` |

## Configuração

Crie um arquivo `.env` na raiz do projeto:

```env
PAYMENT_DB_URL=jdbc:postgresql://localhost:5436/payment_db
PAYMENT_DB_USERNAME=admin
PAYMENT_DB_PASSWORD=admin_password

JWT_SECRET=seu_jwt_secret_aqui

PARTNER_SERVICE_URL=http://localhost:8083/api/v1
```

> O `JWT_SECRET` deve ser **idêntico** em todos os serviços do ecossistema Easypet.

## Como executar

```bash
./gradlew bootRun
```

A API estará disponível em `http://localhost:8085/api/v1`.

Documentação Swagger: `http://localhost:8085/api/v1/swagger-ui.html`

## Principais endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/payments/packages/templates` | Criar template de pacote (PARTNER) |
| `GET` | `/payments/packages/templates/partner/{id}` | Listar templates do parceiro |
| `PUT` | `/payments/packages/templates/{id}` | Editar template |
| `DELETE` | `/payments/packages/templates/{id}` | Remover template |
| `POST` | `/payments/packages/purchase/{templateId}` | Comprar pacote (CUSTOMER) |
| `GET` | `/payments/packages/my` | Meus pacotes ativos |
| `POST` | `/payments/packages/{id}/consume` | Consumir crédito do pacote |

## Infraestrutura necessária

Suba a infraestrutura antes de rodar o serviço:

```bash
# No repositório Easypet-infra
docker compose up -d
```

O banco `payment_db` fica na porta `5436`.

---

Parte do ecossistema [Easypet](https://github.com/Randygomesdev/Easypet-infra) — desenvolvido por [Innker Code](https://github.com/randygomesdev).
