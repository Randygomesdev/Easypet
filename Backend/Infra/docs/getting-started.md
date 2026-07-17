# Como executar o Easypet localmente

## Pré-requisitos

- Docker e Docker Compose
- Java 21+
- Maven 3.9+ (auth-service e gateway-service)
- Gradle 8+ (pet-service, partner-service, booking-service)
- Node.js 20+ (frontend)

## Opção A — Script automático (Windows Terminal)

Na pasta `C:\Projects\Easypet\`, execute:

```powershell
.\start-all.ps1
```

O Windows Terminal abre com uma aba por serviço, cada uma já executando o comando correto.

> O `docker compose up` não recria containers que já estão rodando — apenas exibe os logs existentes ou inicia os que estiverem parados.

---

## Opção B — Manual (terminal por terminal)

### 1. Subir a infraestrutura

```powershell
# Na pasta Easypet/Easypet-infra
cp .env.example .env
# Edite o .env com as senhas desejadas

docker compose up -d
```

Verifique com:

```powershell
docker compose ps
```

### 2. Subir os serviços backend

Cada serviço em um terminal separado. Certifique-se de que cada pasta tem um `.env` na raiz.

```powershell
# Auth Service (:8081)
cd Easypet/Auth-service
mvn spring-boot:run

# Gateway Service (:8080)
cd Easypet/Gateway-service
mvn spring-boot:run

# Pet Service (:8082)
cd Easypet/Pet-service
.\gradlew bootRun

# Partner Service (:8083)
cd Easypet/Partner-service
.\gradlew bootRun

# Booking Service (:8084)
cd Easypet/Booking-service
.\gradlew bootRun
```

### 3. Subir o frontend

```powershell
cd Easypet/Frontend
npm install
npm run dev
```

---

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

---

## 5. Parar

```powershell
# Na pasta Easypet/Easypet-infra
docker compose down
```

Para remover os volumes (apaga todos os dados):

```powershell
docker compose down -v
```
