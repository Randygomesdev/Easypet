# Contratos S06

## H1 — homologação interna, 13/11/2026

- O perfil publicável usa `NOTIFICATION_TRANSPORT=SMTP`, `NOTIFICATION_MAIL_HOST=smtp-capture`, `NOTIFICATION_MAIL_PORT=1025`, `NOTIFICATION_MAIL_FROM=notifications@example.test` e `NOTIFICATION_MAIL_ALLOWED_DOMAIN=example.test`. O domínio tem correspondência exata e deve estar sob `.test`. Remetente fora do domínio invalida a configuração. Destinatário fora do domínio nunca chega ao coletor e gera `FAILED/RECIPIENT_DOMAIN_BLOCKED`, com `canRetry:false`. `LOCAL` continua disponível para diagnóstico e regressão.
- Auth usa o mesmo coletor (`MAIL_HOST=smtp-capture`, `MAIL_PORT=1025`, `MAIL_FROM=auth@example.test`), `FRONTEND_URL=${HOMOLOG_ORIGIN}`, `AUTH_S02_ENABLED=true`, `AUTH_MAIL_ENABLED=true`. TLS/autenticação SMTP desabilitados apenas na rede interna sem saída do coletor. `BOOKING_OUTBOX_TOKEN` e `NOTIFICATION_RECIPIENT_TOKEN` são distintos e compartilhados somente com o respectivo produtor. O browser usa a origem publicada, API relativa `/api/v1` e o guard ADMIN. S07 é dono da configuração Compose, ingressos e perfis. [Roteiro H1](integration.md#h1--perfil-publicável-e-alerta-local).
- `GET http://127.0.0.1:8089/actuator/notificationqueue` na porta de gerenciamento do container. Resposta `200` com `transport`, `outboxPollingEnabled`, `lastOutboxCheckAt`, `outboxSyncState`, `due`, `oldestDueAgeSeconds`, `retryScheduled`, `sending`, `failedLastHour`, `unknownLastHour` e `unroutableLastHour`. Os últimos três números contam entregas no estado indicado com atualização na última hora. `due` e idade incluem somente fila vencida e elegível para execução. Estado do outbox em memória reinicia com o processo: `WAITING`, `UP_TO_DATE`, `BACKLOG`, `UNAVAILABLE` ou `DISABLED`. Sem identificadores, endereços, conteúdo ou erros de provedores. Recurso somente leitura, sem autenticação na porta restrita ao loopback, fora do ingresso. Falha de consulta ao banco gera erro HTTP, nunca um zero sintético.
- A tela mantém a API administrativa da onda B. Quando a lista inicial está vazia, consulta `GET /api/v1/bookings/{id}` com a sessão ADMIN existente e usa apenas a presença de `receptionCustomerId` para explicar por que uma reserva de balcão ainda não tem envio. O erro `404` de Booking indica reserva indisponível. Sem novo endpoint de contato ou ampliação de papéis.

Exemplo de resposta do diagnóstico com uma entrega vencida:

```json
{"transport":"SMTP","outboxPollingEnabled":true,"lastOutboxCheckAt":"2026-11-13T15:05:00Z","outboxSyncState":"UP_TO_DATE","due":1,"oldestDueAgeSeconds":15,"retryScheduled":0,"sending":0,"failedLastHour":0,"unknownLastHour":0,"unroutableLastHour":0}
```

H1 usa as migrations V1 e V2 existentes. As leituras de diagnóstico e origem da reserva são repetíveis e sem efeitos de escrita.

## Onda B — 13/11/2026

Atualizado em 13/11/2026 para a onda B. As rotas administrativas e o envelope Booking v1 conservam o formato da R01.

## Consumo do outbox

Notification consulta `GET /api/v1/internal/booking-events?limit=50` e confirma por `POST /api/v1/internal/booking-events/{eventId}/ack`, seguindo o [envelope v1 de S03](../S03-agenda/contracts.md#outbox-para-s06). Ambas as operações usam `Authorization: Bearer <BOOKING_OUTBOX_TOKEN>` e trafegam na rede interna. Configuração ausente mantém a consulta e o disparo desativados. O ACK acontece depois da transação que grava o evento e a fila. Erro de leitura, aplicação ou ACK interrompe o processamento do lote e a próxima consulta pode repetir IDs. O disparo só ocorre após uma consulta sem pendências, para aplicar cancelamentos e reagendamentos já visíveis antes de disparar lembretes. Erro transitório de envio permanece na fila de Notification e independe do ACK.

Cada `eventId` é processado uma vez. `bookingVersion` crescente determina o estado atual por reserva. Versões anteriores são registradas e confirmadas sem produzir novas entregas. A nova revisão invalida os avisos anteriores que ainda aguardam envio ou reenvio. Confirmação e reagendamento confirmado agendam um lembrete para 24 horas antes do horário, ou para a próxima execução se faltarem menos de 24 horas. Cancelamento, falta e pronto invalidam o lembrete. `BOOKING_CREATED` atualiza a revisão e aguarda confirmação. O horário local segue o contrato de Booking e é interpretado com `NOTIFICATION_BOOKING_ZONE` (padrão `America/Sao_Paulo`). A invalidação passa a valer assim que a nova revisão é recebida. Mensagens aceitas pelo transporte são irreversíveis.

## Acompanhamento administrativo

As rotas ficam sob `/api/v1/admin/notifications`. Todas exigem sessão `ADMIN` validada a cada chamada pelo Auth em `GET /api/v1/auth/session`, encaminhando o bearer original. A resposta usa `Cache-Control: no-store`. A API não retorna endereço, conteúdo da mensagem nem a exceção bruta do provedor.

| Método e rota | Entrada | Sucesso |
| --- | --- | --- |
| GET `/admin/notifications?bookingId=<uuid>&page=0&size=20` | UUID obrigatório, página a partir de 0 e tamanho de 1 a 100 | `200 {content,page,size,totalElements,totalPages}`, ordem decrescente por criação e ID |
| GET `/admin/notifications/{id}/attempts` | ID da notificação | `200` com tentativas em ordem decrescente de número |
| POST `/admin/notifications/{id}/retry` | Sem corpo. Header `Idempotency-Key` obrigatório, UUID | `202` sem corpo. Repetir a mesma chave para a mesma notificação e o mesmo administrador mantém o resultado sem abrir novo ciclo |

Item de listagem `{id,bookingId,type,status,attemptCount,dueAt,updatedAt,lastError,canRetry}`. Tipos `CONFIRMATION`, `RESCHEDULED`, `CANCELLED`, `REMINDER` e `READY`. Estados `PENDING`, `SENDING`, `RETRY_SCHEDULED`, `SENT`, `FAILED`, `SUPERSEDED` e `UNKNOWN`. Exemplo de tentativa `{"number":2,"startedAt":"2026-11-13T15:00:00Z","finishedAt":"2026-11-13T15:00:01Z","outcome":"TRANSIENT_FAILURE","error":"SMTP_TEMPORARY"}`. Durante envio, `finishedAt` e `error` são nulos e `outcome` é `STARTED`.

`400` entrada inválida, `401` sessão ausente ou rejeitada pelo Auth, `403` sessão sem papel ADMIN, `404` notificação inexistente, `409` reenvio indisponível ou chave já registrada por outro administrador, `503` falha de autorização por indisponibilidade do Auth. Erros da aplicação incluem `status` e `message`. Reenvio abre novo ciclo para `FAILED` ainda válido e registra ator, chave e data. Lembretes vencidos e avisos obsoletos não podem ser reenfileirados. Falha transitória confirmada tem três tentativas por ciclo, com esperas de 1 e 2 minutos. Uma tentativa interrompida ou com resultado de SMTP ambíguo fica em `UNKNOWN` para investigação. `SENT` significa aceite pelo transporte configurado.

## Transporte e banco

`LOCAL` grava uma captura no banco de Notification, com destinatário fixo `notifications@example.test`. Na onda B, `SMTP` usa exclusivamente o coletor descartável da S07, com destinatário fictício resolvido no Auth a cada tentativa. Esta fatia cobre mensagens transacionais para o tutor com conta Auth elegível. Preferências de canal e opt-out ficam fora desta entrega. Cadastro de balcão sem conta exige contrato próprio. WhatsApp segue com a porta Java de provedor.

| Variável | Exemplo para o aceite descartável |
| --- | --- |
| `NOTIFICATION_DB_URL`, `NOTIFICATION_DB_USERNAME`, `NOTIFICATION_DB_PASSWORD` | Banco dedicado de Notification |
| `BOOKING_SERVICE_URL`, `AUTH_SERVICE_URL` | `http://booking-service:8084/api/v1`, `http://auth-service:8081/api/v1` |
| `BOOKING_OUTBOX_TOKEN`, `NOTIFICATION_RECIPIENT_TOKEN` | Segredos distintos, compartilhados apenas com o produtor correspondente |
| `NOTIFICATION_TRANSPORT` | `SMTP` no cenário novo, `LOCAL` no cenário de regressão com captura SQL |
| `NOTIFICATION_MAIL_HOST`, `NOTIFICATION_MAIL_PORT`, `NOTIFICATION_MAIL_FROM` | Host interno do coletor, `1025`, `notifications@example.test` |
| `NOTIFICATION_MAIL_SMTP_AUTH`, `NOTIFICATION_MAIL_STARTTLS_REQUIRED` | `false`, `false` na rede isolada do coletor. TLS obrigatório por padrão |
| `NOTIFICATION_MAIL_USERNAME`, `NOTIFICATION_MAIL_PASSWORD` | Vazios para o coletor local |
| `NOTIFICATION_BOOKING_ZONE` | `America/Sao_Paulo`, alinhado ao Booking |
| `NOTIFICATION_POLL_DELAY_MS` | `5000` por padrão, controla intervalo e espera inicial da tarefa |

O cliente usa `GET /api/v1/internal/notification-recipients/{userId}` com `Authorization: Bearer <NOTIFICATION_RECIPIENT_TOKEN>`, conforme [contrato de S02](../S02-identidade/contracts.md#destinatário-de-notificação). O sucesso contém apenas `{"email":"tutor@example.test"}`. `404` indica ausência de destinatário elegível e encerra a tentativa com `RECIPIENT_UNAVAILABLE`. Falhas de autenticação ou disponibilidade do serviço de destinatário são tratadas como indisponibilidade de resolução, sem disparo. A rota de destinatário deve permanecer na rede interna. A rota administrativa verifica a sessão com o token original do ADMIN em toda chamada, inclusive no replay de reenvio. [Cenários de aceite](integration.md#onda-b--aceite-s07).

O número persistido da tentativa vincula cada disparo à sua própria transação de início. Após dois minutos, uma tentativa interrompida é encerrada como `UNKNOWN` com `ATTEMPT_INTERRUPTED`, mesmo durante indisponibilidade do Booking. O envio de novos itens continua condicionado à sincronização do outbox. Repetir o evento após falha de ACK mantém a mesma entrega. Eventos sem `userId` atualizam a revisão e invalidam avisos pendentes, sem criar entrega para cadastro de balcão.

Migration `V1` cria as tabelas próprias do serviço para revisão da reserva, eventos consumidos, entregas, tentativas, reenvios e captura local. A `V2` adiciona índice para recuperar tentativas interrompidas preservando as linhas existentes. Bancos de Booking e Auth não são consultados diretamente. A sonda `GET /actuator/health` retorna estado da aplicação e do banco na porta de gerenciamento, com detalhes desativados.
