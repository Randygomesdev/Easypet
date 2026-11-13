# Contrato S03 — Booking v1

## H1-05 — 13/11/2026, validado localmente

- `GET /bookings/policy` com sessão válida retorna `{"tutorNoticeMinutes":120,"defaultAppointmentDurationMinutes":30}`. O prazo vem da configuração vigente do Booking e vale para cancelamento e reagendamento de reserva pendente ou confirmada. `GET /bookings/{id}/tutor-actions` é leitura do tutor autorizado e retorna `{"canCancel":true,"canReschedule":true,"tutorNoticeMinutes":120}`, calculados com o relógio do Booking. As escritas voltam a validar estado e prazo.
- `GET /bookings/my-bookings?status=CANCELLED&page=0&size=10` filtra antes de paginar, no mesmo escopo de reservas próprias e histórico reivindicado. `status` é opcional e usa `BookingStatus`.
- Uma nova reserva ou troca de horário exige `active: true` em `GET /internal/partners/{partnerId}/operations` do Partner. Reserva anterior continua consultável e cancelável pelas regras vigentes. Um replay válido de criação mantém a resposta da reserva existente. Estabelecimento ausente ou inativo retorna `404` em novas alocações.
- Na criação avulsa, o preço informado é comparado ao preço vigente do catálogo ou à diária multiplicada pelo período. Valor divergente retorna `409` com `errors.price` antes de persistir a reserva, o evento ou a chave de idempotência. A ação **Atualizar preço do serviço** recarrega o catálogo para o tutor conferir o novo valor antes de confirmar.
- Administração: `PATCH /bookings/partner/{partnerId}/{bookingId}/status?status=…` e `POST /bookings/partner/{partnerId}/{bookingId}/fitting-decision` aceitam o mesmo corpo das operações atuais e exigem `ADMIN`. IDs de contextos diferentes retornam `404` antes de qualquer escrita. Transição inválida retorna `400`.
- Atendimento iniciado permite conclusão e, no banho e tosa, checklist e pronto para retirada. Cancelamento, reagendamento e exclusão ficam indisponíveis nesse estado. O campo histórico `authorizedExtras` continua legível no checklist; gravar uma autorização nova por esse formulário fica indisponível. A rodada não define interrupção, reembolso ou consentimento de adicionais.

## Onda B — 13/11/2026, implementado localmente

- O Booking consulta `GET /api/v1/auth/session` com o bearer original a cada chamada protegida, inclusive direta. Sessão revogada, inativa ou antiga retorna `401`. Sessão sem permissão retorna `403`. Recurso de outro estabelecimento ou de outro profissional retorna `404` quando consultado por ID. Auth indisponível ou resposta inválida retorna `503`. Outbox mantém autenticação própria. O ambiente de Booking precisa de `AUTH_SERVICE_URL=http://auth-service:8081/api/v1`.
- `BOOKINGS_READ` permite listar e consultar reservas e histórico do estabelecimento associado. `BOOKINGS_WRITE` permite criar, confirmar, reagendar, cancelar, registrar falta e operar o atendimento. Para criação de balcão, a sessão também exige `DESK_CUSTOMERS_MANAGE`. `BOOKINGS_ASSIGNED_READ` limita lista, detalhe, histórico e checklist à escala vinculada. `BOOKINGS_ASSIGNED_ATTEND` permite iniciar e finalizar atendimento, salvar checklist e marcar pronto nas mesmas reservas. O vínculo da escala vem do Partner, conforme contrato S04. Um filtro `staffId` incompatível com esse vínculo retorna `404`. Ator registrado é sempre o `userId` Auth.
- `GET /bookings/agenda-access` resolve o contexto do titular ou da equipe. `GET /bookings/partner/{partnerId}/access` permite consultar o contexto de um estabelecimento explícito, inclusive pela administração. Exemplo para profissional vinculado `{ "partnerId": "<uuid>", "canManage": false, "canAttend": true, "staffId": "<uuid>", "teamMember": true }`. Titular/administrador e gestor/recepção com leitura e escrita recebem `canManage: true`, `canAttend: true`, `staffId: null`. A API de agenda repete essas verificações em cada operação.
- `GET /bookings/my-bookings`, leitura por ID e operações do tutor sobre reservas históricas de balcão usam o par de IDs do endpoint S04 `GET /internal/partners/customer-claims/me`. A origem de balcão e a autoria histórica permanecem registradas. A reivindicação permite acesso sem transferir ou reescrever a reserva.
- `GET /bookings/{id}/pet-summary` retorna `{ "id": "<petId>", "name": "Luna", "species": "DOG" }` após aplicar as mesmas regras do detalhe da reserva. Booking obtém a projeção S04 usando `BOOKING_PET_SUMMARY_TOKEN` e a origem registrada na reserva. `GET /bookings/partner/{partnerId}/summary` aplica escopo da agenda e retorna `{ "id": "<partnerId>", "name": "Petshop", "services": [{ "id": "<serviceId>", "name": "Banho" }] }`. As leituras são repetíveis. A projeção da equipe fica separada das operações clínicas.
- S04 pode montar `<ReceptionBookingDialog actorId={session.userId} partnerId={customer.partnerId} customerId={customer.id} petId={pet.id} petName={pet.name} onClose={close} onBooked={handleBooked} />` de `Frontend/src/features/booking/ReceptionBookingDialog.tsx`. Montar ao clicar em **Agendar** no pet e desmontar ao fechar. `onBooked(booking: BookingResponse)` recebe a resposta efetiva. O componente consulta catálogo e disponibilidade, gera uma intenção por tentativa e reenvia o mesmo corpo e a mesma chave após erro recuperável ou reload.
- Catálogo, carrinho e balcão persistem tentativas pendentes no navegador por ator e contexto. Exemplo de requisição repetida `POST /bookings`, `Idempotency-Key: 8df3dc28-ab68-443a-b3fd-9f7adc048611`, mesmo JSON da primeira tentativa. `503`, perda de resposta ou erro de transporte permitem tentar de novo com a mesma chave. Em resposta definitiva de validação/conflito, a intenção pode ser corrigida. Os fluxos existentes de checkout e créditos seguem com seus gates.

Todas as rotas usam `/api/v1`. Nas rotas de usuário, enviar `Authorization: Bearer <JWT>`. O tutor atua em reservas próprias e o parceiro nas reservas do seu estabelecimento. O administrador mantém o acesso existente. Horários da agenda são ISO 8601 locais, sem offset, no fuso `BOOKING_ZONE` (padrão `America/Sao_Paulo`). Intervalos ocupados incluem o início e excluem o fim.

| Método e rota | Request | Response |
| --- | --- | --- |
| `POST /bookings` | `BookingRequest` existente e header opcional `Idempotency-Key` (1 a 128 caracteres ASCII visíveis) | `201`, `Location`, `BookingResponse`. Mesma chave, ator, estabelecimento e corpo retorna o mesmo ID, com o estado atual da reserva. Chave com corpo divergente retorna `409`. |
| `GET /bookings/availability` | `partnerId`, `serviceId`, `date` e `excludeBookingId` opcional para reagendamento autorizado | Lista existente de slots de 30 min. `BLOCKED_EXCEPTION` indica bloqueio sem opção de encaixe quando nenhum profissional está livre. A escrita revalida a disponibilidade. |
| `POST /bookings/{id}/reschedule` | `{ "bookingDate": "2026-11-20T09:30:00", "staffId": "<uuid>" }`. Em hospedagem, `{ "checkIn": "2026-11-20T09:30:00", "checkOut": "2026-11-22T09:30:00" }`. `staffId` omitido mantém o profissional atual, se houver. | `200 BookingResponse`, mesmo ID, preservando o estado pendente ou confirmado. Repetição para a mesma alocação é inócua. Em erro, data, histórico e eventos da reserva original permanecem íntegros. |
| `PATCH /bookings/{id}/status?status=…` | Body opcional `{ "reason": "…" }` no cancelamento ou falta, até 500 caracteres. Cancelamentos legados sem body recebem um motivo padrão. | `200 BookingResponse`. `NO_SHOW` é terminal e pode ser registrado pelo estabelecimento a partir de `CONFIRMED` no horário previsto ou depois. A repetição de estado não cria outro evento. |
| `GET`, `POST /bookings/partner/{partnerId}/blocks` | GET com `start`, `end` opcionais ISO locais. POST com `{ "start": "2026-11-20T09:00:00", "end": "2026-11-20T12:00:00", "staffId": null, "reason": "Manutenção" }` | `200` lista ou `201` bloqueio com `id`, `partnerId`, `staffId`, `start`, `end`, `reason`. Bloqueio geral aplica-se também a hospedagem. Conflito com reserva ocupante retorna `409`. |
| `DELETE /bookings/partner/{partnerId}/blocks/{blockId}` | Sem body | `204`, inclusive após remoção da mesma chave no mesmo estabelecimento. |
| `GET`, `PUT /bookings/{id}/check-in` | PUT de banho e tosa com `{ "petIdentified": true, "instructionsConfirmed": true, "allergies": "…", "behavior": "…", "observations": "…" }`, textos até 1000 caracteres. | `200` checklist, ou `204` em GET quando ainda não preenchido. Exclusivo do estabelecimento/admin. PUT atualiza o checklist em `CONFIRMED` ou `IN_PROGRESS`, antes de marcar pronto. O valor histórico de `authorizedExtras` é preservado. |
| `POST /bookings/{id}/ready` | Sem body | `200 BookingResponse` com `readyAt`. Banho e tosa em `IN_PROGRESS` com checklist preenchido. Repetição não cria outro evento. `COMPLETED` continua sendo o encerramento. |
| `GET /bookings/{id}/history` | Sem body | `200` lista de alterações de agenda, com tipo, data do registro, estados/horários anteriores e atuais. Sem dados de checklist nem ID do operador na resposta. |

Para reserva de balcão sem conta Auth, `POST /bookings` aceita `receptionCustomerId` junto com `petId` e `partnerId`. A operação exige o titular `PARTNER` ou equipe com `BOOKINGS_WRITE` e `DESK_CUSTOMERS_MANAGE`. O Booking encaminha o JWT ao Pet em `GET /pets/reception/customers/{receptionCustomerId}/{petId}` e confere os três IDs retornados. `BookingResponse` traz `receptionCustomerId` e `userId: null`; nas reservas de tutor, ocorre o inverso. O cadastro de balcão não autoriza prontuário. Eventos do outbox continuam sendo publicados para reservas com tutor Auth. Notificações para clientes sem conta dependem do contrato de destinatário.

`BookingResponse` acrescenta `scheduledEnd`, `cancellationReason`, `noShowReason` e `readyAt`, todos anuláveis. `PUT /bookings/{id}` continua aceitando o formato legado para reservas pendentes ou confirmadas. Alterações de alocação seguem a mesma validação e histórico. Tipo, serviço, pet e parceiro são fixos após a criação. Preço de hospedagem é recalculado por diária ao reagendar. Cancelamento/reagendamento do tutor respeitam antecedência padrão de duas horas para o horário original, configurável por `BOOKING_TUTOR_NOTICE_MINUTES`. Reagendamento exige horário novo futuro. A confirmação de encaixe pode usar horário fora da escala, conforme fluxo existente, se o intervalo estiver livre de reservas, ausências e bloqueios. Encaixe pendente não consome vaga.

Erros com `status` e `message` no formato existente. `400` para validação e transição inválida, `401` para credencial ausente ou inválida, `403` para papel insuficiente em rotas exclusivas de operação, `404` para recurso ausente ou fora do escopo, `409` para conflito de horário, capacidade, bloqueio ou idempotência, `503` quando o vínculo do pet de balcão não puder ser validado.

## Prazos e dependências da agenda

- O Booking usa `GET /api/v1/internal/partners/{partnerId}/operations` para expediente, capacidade e serviços conforme a [projeção S04](../S04-balcao/contracts.md#leituras-de-estabelecimento--r01-001). Encaminha o JWT original. `/partners/me` continua resolvendo o titular com o mesmo JWT. As leituras de profissionais, escala e ausência preservam suas rotas internas.
- `BOOKING_HTTP_CONNECT_TIMEOUT` (750 ms) e `BOOKING_HTTP_READ_TIMEOUT` (2 s) limitam conexão e resposta. O segundo prazo inclui a leitura do corpo e é limitado pelo tempo restante da transação quando houver. `BOOKING_TRANSACTION_TIMEOUT` (12 s) define o prazo padrão da transação, `BOOKING_AGENDA_LOCK_TIMEOUT` (4 s) limita a espera por trava no PostgreSQL e `BOOKING_DB_POOL_TIMEOUT_MS` (4000) limita a espera por conexão do pool.
- Em caso de falha temporária de Pet/Partner ou timeout da agenda, a API devolve `503` com mensagem de nova tentativa. A transação é revertida e a criação pode ser repetida com a mesma chave. `409` continua indicando conflito de negócio, como vaga ocupada.

## Outbox para S06

Autenticação interna dedicada `Authorization: Bearer <BOOKING_OUTBOX_TOKEN>`. A rota deve ficar somente na rede interna entre Booking e Notification. Sem token configurado, o acesso é negado. Não há compartilhamento de tabelas ou credenciais de banco.

| Método e rota | Comportamento |
| --- | --- |
| `GET /internal/booking-events?limit=50` | Retorna `200` com array de eventos pendentes, limite de 1 a 100. Leituras podem repetir IDs. |
| `POST /internal/booking-events/{eventId}/ack` | Confirma consumo após gravação durável no destinatário. Retorna `204`, também em ACK repetido. |

Envelope JSON por evento, versão `1`:

```json
{
  "eventId": "5ef0aa22-cecb-405a-b25d-67bedc4d9a60",
  "eventType": "BOOKING_RESCHEDULED",
  "version": 1,
  "occurredAt": "2026-11-13T15:00:00Z",
  "bookingId": "<uuid>",
  "bookingVersion": 3,
  "partnerId": "<uuid>",
  "userId": "<uuid>",
  "bookingDate": "2026-11-20T09:30:00",
  "previousBookingDate": "2026-11-20T08:00:00",
  "status": "CONFIRMED"
}
```

Tipos `BOOKING_CREATED`, `BOOKING_CONFIRMED`, `BOOKING_RESCHEDULED`, `BOOKING_CANCELLED`, `BOOKING_NO_SHOW`, `BOOKING_READY`. `previousBookingDate` é nulo fora do reagendamento. Usar `eventId` para deduplicação e `bookingVersion` monotônica por reserva para invalidar lembretes obsoletos. O outbox entrega eventos por ordem de inserção e revisão dentro de cada reserva. Cancelamento e falta invalidam o lembrete. `BOOKING_CREATED` pode ter `PENDING`, inclusive para encaixe. `userId` é o ID Auth do tutor, inclusive em reserva criada pelo parceiro. Entrega é pelo menos uma vez até ACK. A transação de reserva grava o evento junto com a alteração.

## Banco

Migration aditiva `V7` com fim do intervalo, revisão de eventos e campos de operação, tabela de serialização por estabelecimento, idempotência, histórico, bloqueios, checklist e outbox. O índice de horário legado é substituído para distinguir falta e encaixes pendentes. Reservas existentes conservam seus dados. Intervalos legados sem duração persistida usam a duração atual do catálogo e fallback de 30 minutos se indisponível no cadastro. A regra atual de hospedagem continua compartilhada entre serviços diários do estabelecimento.
