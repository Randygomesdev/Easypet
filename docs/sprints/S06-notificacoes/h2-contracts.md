# S06 · Contratos H2 · 14/11/2026

Base HTTP `/api/v1`. Respostas sem cache. A API valida sessão no Auth a cada operação. Erros incluem `status` e `message`; 400 entrada inválida, 401 sessão/token inválido, 403 papel insuficiente, 404 item ausente ou fora do escopo, 409 conflito de idempotência ou estado, 503 dependência indisponível.

| Método e rota | Entrada e resultado |
| --- | --- |
| GET /notifications/preferences | CUSTOMER. 200 `{bookingEmail:true}` no padrão legado. |
| PUT /notifications/preferences | CUSTOMER. `{"bookingEmail":false}`. 200 com a preferência efetiva. Repetir o valor mantém o mesmo estado. Afeta avisos de reserva quando a próxima tentativa ainda não iniciou o transporte, inclusive reenvios. Recuperação de senha e convites pertencem ao Auth e ficam fora da preferência. |
| POST /support/tickets | Sessão válida. `Idempotency-Key` UUID, `{"subject":"Dúvida no agendamento","message":"Preciso revisar meu horário.","bookingId":null}`. Se informado, `bookingId` exige autorização de leitura do Booking com o bearer original. 201 com chamado. Replay por autor e chave retorna o mesmo chamado; conteúdo divergente recebe 409. |
| GET /support/tickets | Sessão válida. Somente chamados do autor. |
| GET /support/tickets/{id} | Sessão válida. Detalhe somente do autor. |
| GET /admin/operations/inbox | ADMIN. Filtros opcionais `kind=ALERT\|TICKET`, `status=OPEN\|ACKNOWLEDGED\|RESOLVED`. |
| GET /admin/operations/inbox/unread | ADMIN. 200 `{"count":3}` de itens ainda sem leitura coletiva. |
| POST /admin/operations/inbox/{id}/read | ADMIN. 204 e grava primeiro leitor e data. |
| POST /admin/operations/inbox/{id}/acknowledge | ADMIN. 204 e grava primeiro responsável e data. Marca como lido. |
| POST /admin/operations/inbox/{id}/resolve | ADMIN. Para TICKET, exige `{"resolutionMessage":"Orientação ao solicitante."}`, até 2000 caracteres. ALERT aceita corpo vazio. 204 e grava responsável e data. Marca como lido. Replay da mesma resposta preserva autoria; resposta divergente recebe 409. |
| POST /internal/operations/alerts | Bearer `NOTIFICATION_OPERATIONS_TOKEN` dedicado, somente na rede interna. 202 com corpo vazio. Exemplo abaixo. |

Listas aceitam `page=0&size=20`, até 100 itens por página, e retornam `{content,page,size,totalElements,totalPages}`. Ordem decrescente por criação e ID. Chamado do solicitante `{id,bookingId,subject,message,status,createdAt,updatedAt}`. Item ADMIN contém `id,kind,severity,status,source,code,correlationId,bookingId,subject,message,requesterId,createdAt,updatedAt,readAt,readBy,acknowledgedAt,acknowledgedBy,resolvedAt,resolvedBy`. Campos não aplicáveis são nulos. Estado inicial OPEN. As transições são monotônicas e repetíveis, preservando o primeiro autor registrado para cada ação. Reconhecimento de item já resolvido recebe 409 se não havia reconhecimento anterior. Título até 120 e mensagem até 2000 caracteres. A interface renderiza texto simples.

O detalhe e a lista do próprio chamado incluem `resolutionMessage,resolvedAt,resolvedBy`. ADMIN também recebe esses campos e `resolutionOrigin:ADMIN|SYSTEM|null`. O corpo do chamado e sua resposta ficam acessíveis ao solicitante e ao ADMIN.

Alertas internos aceitam severidade `INFO|WARNING|ERROR` e pares autorizados: `BACKUP/BACKUP_FAILED`, `BACKUP/RESTORE_FAILED`, `NOTIFICATION/QUEUE_DELAY`, `NOTIFICATION/DELIVERY_FAILED`, `NOTIFICATION/DELIVERY_UNKNOWN`, `INFRA/SERVICE_UNAVAILABLE`, `INFRA/RELEASE_CHECK_FAILED`. `service` é allowlist `BACKUP|NOTIFICATION|AUTH|BOOKING|PARTNER|PET|PAYMENT|GATEWAY|FRONTEND|INFRA`; BACKUP e NOTIFICATION exigem seu serviço de mesmo nome. `correlationId` é UUID opcional. Sem texto livre, payload original ou contato na ingestão.

```json
{"incidentId":"43bf8767-c38a-4ca8-a09a-bb680a2897be","sequence":1,"state":"OPEN","source":"BACKUP","service":"BACKUP","code":"BACKUP_FAILED","severity":"ERROR","correlationId":null}
```

Reusar `incidentId` por serviço enquanto o incidente estiver ativo, com `sequence` positiva e crescente nas transições; para recuperação, enviar os mesmos metadados com `state:"RECOVERED"` e sequência maior. Metadados são imutáveis por serviço/incidente. Replay igual e sequência atrasada são inócuos (202); mesma sequência com estado divergente ou reabertura de incidente recuperado com sequência maior retorna 409. Recuperação anterior à abertura grava uma resolução SYSTEM, preserva o estado fechado ao chegar a abertura atrasada e não cria outro item. Novo incidente após recuperação exige novo UUID. ADMIN pode ler/reconhecer/resolver independentemente do sinal operacional. Recuperação automática fecha item ainda ativo com `resolutionOrigin:"SYSTEM"` e `resolvedBy:null`; preserva resolução e autoria ADMIN existentes. A projeção de alerta inclui `service,incidentId,signalState,signalSequence`.

Investigação reutiliza `GET /admin/notifications?bookingId=<uuid>` e `GET /admin/notifications/{id}/attempts` de H1. A listagem inclui `SUPPRESSED` para preferência/consentimento, com motivo sanitizado e sem retry. Transporte LOCAL captura somente após avaliação de preferência e, em reservas de balcão, resolução autenticada de consentimento. SMTP continua limitado ao coletor fictício.

Migration V3 aditiva para preferências e caixa de entrada. V4 acrescenta origem de balcão à projeção, horário da ocorrência ao inbox de eventos e autorização do primeiro envio à entrega. O endereço autorizado não é persistido. O token `RECEPTION_NOTIFICATION_TOKEN` habilita balcão e é exclusivo de Partner/Notification. Suprime-se aviso sem autorização elegível, anterior à concessão ou com autorização diferente da primeira usada. SMTP e LOCAL consultam o Partner antes de cada tentativa para esta origem. Interrupção v1 invalida fila anterior, inclusive READY, sem emitir outro aviso. A central independe dos bancos dos outros serviços. Alertas da central exigem plataforma disponível.
