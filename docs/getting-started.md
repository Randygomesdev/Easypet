# Como executar o Easypet localmente

## Pré-requisitos

- Docker e Docker Compose
- Java 21+
- Maven 3.9+ (auth-service e gateway-service)
- Gradle 8+ (pet-service, partner-service, booking-service)
- Node.js 20+ (frontend)

## 1. Subir a infraestrutura

```bash
# Na pasta Easypet/Infra
cp .env.example .env
# Edite o .env com as senhas desejadas

docker compose up -d
```

Aguarde todos os containers iniciarem. Verifique com:

```bash
docker compose ps
```

## 2. Subir os serviços backend

Cada serviço deve ser executado em um terminal separado. Crie o `.env` em cada pasta conforme o README de cada serviço.

```bash
# Auth Service
cd Easypet/Auth-service
mvn spring-boot:run

# Gateway Service
cd Easypet/Gateway-service
mvn spring-boot:run

# Pet Service
cd Easypet/Pet-service
./gradlew bootRun

# Partner Service
cd Easypet/Partner-service
./gradlew bootRun

# Booking Service
cd Easypet/Booking-service
./gradlew bootRun
```

## 3. Subir o frontend

```bash
cd Easypet/Frontend
npm install
npm run dev
```

## 4. Acessar

| Interface | URL |
|-----------|-----|
| Frontend | http://localhost:5173 |
| API Gateway | http://localhost:8080 |
| Swagger Auth | http://localhost:8081/api/v1/swagger-ui.html |
| Swagger Pet | http://localhost:8082/api/v1/swagger-ui.html |
| Swagger Partner | http://localhost:8083/api/v1/swagger-ui.html |
| Swagger Booking | http://localhost:8084/api/v1/swagger-ui.html |
| PgAdmin | http://localhost:5050 |
| MinIO Console | http://localhost:9001 |

## 5. Parar a infraestrutura

```bash
docker compose down
```

Para remover os volumes (apaga todos os dados):

```bash
docker compose down -v
```
