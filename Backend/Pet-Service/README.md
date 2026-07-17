# Easypet — Pet Service

Microsserviço de gerenciamento de pets da plataforma [Easypet](https://github.com/randygomesdev). Responsável pelo cadastro de pets e todo o prontuário médico: consultas, vacinas, medicamentos, exames, cirurgias e registros de peso.

## Funcionalidades

- Cadastro e gerenciamento de pets (nome, espécie, raça, gênero, data de nascimento, microchip)
- Prontuário médico completo:
  - Consultas (`/appointments`)
  - Vacinas (`/vaccines`)
  - Medicamentos (`/medications`)
  - Exames (`/exams`)
  - Cirurgias (`/surgeries`)
  - Registros de peso (`/weight-records`)
- Histórico consolidado do pet (`/pets/{id}/history`)
- Soft delete em todas as entidades
- Autenticação via JWT (validação do token emitido pelo auth-service)

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Linguagem | Java 21 |
| Framework | Spring Boot 3.5 |
| Segurança | Spring Security 6 + JJWT 0.12.6 |
| Banco de dados | PostgreSQL + Flyway |
| Cache | Redis |
| Documentação | SpringDoc OpenAPI 2.7 |

## Parte do Ecossistema Easypet

```
API Gateway :8080
      │
      ▼
Pet Service :8082
      │
      ├── /api/v1/pets/**
      ├── /api/v1/appointments/**
      ├── /api/v1/vaccines/**
      ├── /api/v1/medications/**
      ├── /api/v1/exams/**
      ├── /api/v1/surgeries/**
      └── /api/v1/weight-records/**
```

## Como executar

### 1. Pré-requisitos

- Java 21+
- Gradle 8+
- PostgreSQL e Redis em execução

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```properties
SERVER_PORT=8082

PET_DB_URL=jdbc:postgresql://localhost:5433/pet_db
PET_DB_USERNAME=seu_usuario
PET_DB_PASSWORD=sua_senha

# JWT — mesmo segredo do auth-service e gateway
JWT_SECRET=sua_chave_secreta
```

### 3. Executar

```bash
./gradlew bootRun
```

O serviço iniciará em `http://localhost:8082/api/v1`.  
Swagger UI: `http://localhost:8082/api/v1/swagger-ui.html`

## Migrações do Banco de Dados

| Versão | Descrição |
|--------|-----------|
| V1 | Criação da tabela de pets |
| V2 | Adição do campo microchip |
| V3 | Criação da tabela de consultas |
| V4 | Criação da tabela de medicamentos |
| V5 | Criação da tabela de cirurgias |
| V6 | Criação da tabela de exames |
| V7 | Criação da tabela de vacinas |
| V8 | Criação da tabela de registros de peso |

---

Desenvolvido por [Innker Code](https://github.com/randygomesdev)
