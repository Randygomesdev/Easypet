# Easypet — Partner Service

Microsserviço de gestão de estabelecimentos da plataforma [Easypet](https://github.com/randygomesdev). Responsável pelo cadastro de parceiros (clínicas, petshops, hotéis), seus serviços, profissionais, horários e avaliações.

## Funcionalidades

- Cadastro e gerenciamento de estabelecimentos parceiros
- Categorias: clínica veterinária, petshop, hotel, banho e tosa
- Gestão de serviços oferecidos por cada estabelecimento
- Gestão de profissionais (staff): cadastro, agenda semanal e ausências
- Horário de funcionamento por dia da semana
- Avaliações de clientes (`/reviews`)
- Geolocalização do estabelecimento (coordenadas)
- Listagem pública de parceiros (marketplace)
- Autenticação via JWT

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Linguagem | Java 21 |
| Framework | Spring Boot 3.5 + Gradle |
| Segurança | Spring Security 6 + JJWT 0.12.6 |
| Banco de dados | PostgreSQL + Flyway |
| Mapeamento | MapStruct |
| Documentação | SpringDoc OpenAPI 2.7 |

## Parte do Ecossistema Easypet

```
API Gateway :8080
      │
      ▼
Partner Service :8083
      │
      ├── /api/v1/partners/**      (GET público — marketplace)
      ├── /api/v1/partners/staff/**
      └── integrado com Booking Service :8084
```

## Como executar

### 1. Pré-requisitos

- Java 21+
- Gradle 8+
- PostgreSQL em execução

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```properties
SERVER_PORT=8083

PARTNER_DB_URL=jdbc:postgresql://localhost:5434/partner_db
PARTNER_DB_USERNAME=seu_usuario
PARTNER_DB_PASSWORD=sua_senha

# JWT — mesmo segredo do auth-service e gateway
JWT_SECRET=sua_chave_secreta
```

### 3. Executar

```bash
./gradlew bootRun
```

O serviço iniciará em `http://localhost:8083/api/v1`.  
Swagger UI: `http://localhost:8083/api/v1/swagger-ui.html`

## Migrações do Banco de Dados

| Versão | Descrição |
|--------|-----------|
| V1 | Criação das tabelas de parceiros |
| V2 | Atualização de campos do parceiro |
| V3 | Galeria de fotos e avaliações |
| V4 | Telefone do parceiro |
| V5 | Coordenadas geográficas |
| V6 | Horário de funcionamento (campo legado) |
| V7 | Tabela de horários de funcionamento |
| V8 | Capacidade de hospedagem e unidade de cobrança |
| V9 | Seed de parceiros em Florianópolis |
| V10 | Dados fiscais |
| V11 | Tabelas de profissionais e agenda |
| V12 | Vínculo do parceiro com usuário do auth-service |
| V13 | Campos de contato do profissional |
| V14 | Intervalo de almoço na agenda do profissional |

---

Desenvolvido por [Innker Code](https://github.com/randygomesdev)
