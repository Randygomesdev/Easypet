# Serviços do Easypet

| Serviço | Porta | Tecnologia | Repositório |
|---------|-------|-----------|-------------|
| API Gateway | 8080 | Spring Cloud Gateway | Easypet-gateway-service |
| Auth Service | 8081 | Spring Boot + PostgreSQL | Easypet-auth-service |
| Pet Service | 8082 | Spring Boot + PostgreSQL | Easypet-pet-service |
| Partner Service | 8083 | Spring Boot + PostgreSQL | Easypet-partner-service |
| Booking Service | 8084 | Spring Boot + PostgreSQL | Easypet-booking-service |
| Frontend | 5173 | React 19 + Vite | Easypet-frontend |

## Infraestrutura

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| auth-db | 5432 | PostgreSQL — usuários e autenticação |
| pet-db | 5433 | PostgreSQL — pets e prontuários |
| partner-db | 5434 | PostgreSQL — estabelecimentos e serviços |
| booking-db | 5435 | PostgreSQL — agendamentos |
| payment-db | 5436 | PostgreSQL — pagamentos |
| Redis | 6379 | Cache e rate limiting |
| MinIO | 9000 | Armazenamento de arquivos (S3-compatible) |
| PgAdmin | 5050 | Interface visual para os bancos |

## Variáveis de ambiente compartilhadas

O `JWT_SECRET` deve ser **idêntico** em todos os serviços:
- Auth Service (emite o token)
- API Gateway (valida o token)
- Pet Service, Partner Service, Booking Service (validam o token)
