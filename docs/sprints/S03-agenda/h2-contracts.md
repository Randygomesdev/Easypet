# H2 — contratos do Booking

Todas as rotas abaixo usam o prefixo `/api/v1`. Sessões de usuário são verificadas no Auth. `403` indica papel insuficiente, `404` indica recurso ausente ou fora do escopo, `503` indica dependência temporariamente indisponível. IDs e valores abaixo são ilustrativos.

## Interrupção

`POST /bookings/{bookingId}/interrupt`, com `{ "reason": "Atendimento interrompido a pedido do tutor" }` (obrigatório, até 500 caracteres). Mesmo escopo de quem pode finalizar aquele atendimento. `200 BookingResponse` com `status: "INTERRUPTED"`, `interruptionReason` e `interruptedAt` (UTC). Transição exclusivamente de `IN_PROGRESS`. Mesmo ator e motivo normalizado repetidos retornam o mesmo estado e data, sem duplicar histórico ou outbox. Mudança do motivo ou do ator após interrupção retorna `409`. Outros estados retornam `400`. O PATCH genérico de status não aceita a operação.

`INTERRUPTED` é terminal. Uma transação serializa a mudança com a agenda e libera a alocação para novas reservas futuras, preservando o intervalo anterior e o checklist no histórico. Propostas pendentes expiram. A interrupção não cria movimentação financeira. Autorizações já registradas continuam como evidência e só podem ser aplicadas por operação explícita do caixa.

O outbox usa o envelope v1 existente, com `eventType: "BOOKING_INTERRUPTED"`, `status: "INTERRUPTED"`, `bookingVersion` superior e sem motivo. S06 deve invalidar lembretes e tentativas `BOOKING_READY` ainda não enviadas, inclusive tentativas reprocessadas. Todos os tipos de evento de reserva incluem o campo aditivo `receptionCustomerId`, nulo na origem Auth. Eventos novos de balcão trazem `userId: null` e `receptionCustomerId` persistido. O contato não faz parte do envelope e depende da autorização da S04, consultada pela S06. Eventos históricos da origem balcão não são recriados.

## Adicionais

DTO de leitura `BookingExtra` com `id`, `bookingId`, `partnerId`, `version`, `description`, `quantity`, `unitPriceCents`, `amountCents`, `status` (`PENDING`, `APPROVED`, `REJECTED`, `EXPIRED`), `createdAt`, `decisionAt` e `channel` (`DIGITAL` ou `IN_PERSON`, anulável). Valor total é calculado no Booking. Moeda BRL. Cada ID identifica um snapshot imutável, na versão 1. Uma correção exige proposta nova. O operador e os dados de prova ficam na auditoria; somente o ADMIN pode consultá-los pelo detalhe de investigação.

| Método e rota | Acesso e comportamento |
| --- | --- |
| `GET /bookings/{bookingId}/extras?page=0&size=20` | Mesmas regras de leitura da reserva. Página de snapshots em ordem decrescente de criação, limite 100. |
| `POST /bookings/{bookingId}/extras` | Operador autorizado a atuar no atendimento. Header obrigatório `Idempotency-Key`, de 1 a 128 caracteres ASCII visíveis. Corpo `{ "description": "Hidratação", "quantity": 1, "unitPriceCents": 1500 }` (descrição de 1 a 300 caracteres, quantidade de 1 a 100, valor total positivo e até 100.000.000 centavos). `201 BookingExtra`. Mesmo ator/reserva/chave/corpo retorna a proposta existente. Corpo diferente retorna `409`. |
| `POST /bookings/{bookingId}/extras/{extraId}/decisions/digital` | Somente tutor dono ou titular do vínculo reivindicado da reserva. Corpo `{ "version": 1, "decision": "APPROVE" }`. `decision` aceita `APPROVE` ou `REJECT`. Identidade vem da sessão. `200 BookingExtra`. |
| `POST /bookings/{bookingId}/extras/{extraId}/decisions/in-person` | Titular do estabelecimento ou equipe com `BOOKINGS_WRITE` e `DESK_CUSTOMERS_MANAGE` no estabelecimento. Corpo `{ "version": 1, "decision": "APPROVE", "reason": "Tutor conferiu a proposta", "evidence": "Aceite assinado no balcão, protocolo interno 41" }`. Motivo e evidência declarada obrigatórios, até 500 caracteres cada. O autor de registro permanece o operador e o tutor é identificado pela própria reserva. `200 BookingExtra`. |
| `GET /internal/booking-extra-authorizations/{authorizationId}?partnerId={uuid}&bookingId={uuid}&version=1` | Somente Payment por `Authorization: Bearer <BOOKING_PAYMENT_AUTHORIZATION_TOKEN>` dedicado. Retorna `200` apenas para `APPROVED` com par e versão exatos. Transporta `authorizationId`, `partnerId`, `bookingId`, `version`, `description`, `quantity`, `unitPriceCents`, `amountCents`, `currency: "BRL"`, `approvedAt`, `approvedBy`, `tutorId`, `tutorIdentityType`, `channel`. `404` para par divergente, inexistente, pendente, recusado ou expirado, `409` para versão divergente de autorização aprovada do par. Token ausente/incorreto `401`. |

Mapeamento para Payment: `authorizationId → approvalId`, `approvedAt → acceptedAt`, `approvedBy → acceptedBy`. `approvedBy` é o usuário Auth autor do registro. Em `DIGITAL` é o tutor autenticado, inclusive após reivindicação. Em `IN_PERSON` é o operador que registrou a prova. `tutorId` e `tutorIdentityType` (`AUTH_USER` ou `RECEPTION_CUSTOMER`) são a identidade de origem da reserva e permanecem distintos do autor. `channel` deve permanecer na auditoria do caixa.

Propor e decidir exigem `IN_PROGRESS`, salvo replay de escrita já confirmada. Conclusão ou interrupção expiram propostas pendentes. Decisões serializam na reserva. Repetição da mesma versão, decisão, canal, ator e prova retorna o estado existente. Outra decisão sobre a mesma proposta, estado expirado ou versão divergente retorna `409`. A API não recebe ID de tutor arbitrário, valor aprovado no corpo de decisão ou flag de consentimento. Reserva de balcão registra a identidade de origem `receptionCustomerId`; quando reivindicada, o aceite digital também registra o ator Auth da sessão. A aplicação no caixa é responsabilidade da S05 e deduplica `authorizationId` com vínculo ao caixa e à reserva. A resposta existente de `GET /bookings/agenda-access` inclui `canRegisterInPersonExtraDecision` para habilitar o formulário de balcão conforme a sessão.

## Investigação ADMIN

`GET /admin/bookings/investigations?page=0&size=20&partnerId={uuid}&bookingId={uuid}&status=INTERRUPTED` lista projeções por data agendada e ID descendentes, paginadas (de 1 a 100 por página). Todos os filtros são opcionais. Sem reserva explícita e sem status, retorna `CANCELLED`, `NO_SHOW` e `INTERRUPTED`. Com `bookingId` explícito, qualquer status pode ser localizado. Campos `bookingId`, `partnerId`, `status`, `type`, `bookingDate`, `scheduledEnd`, `bookingVersion`, `updatedAt`. O contexto informado é aplicado junto aos filtros.

`GET /admin/bookings/investigations/{bookingId}?partnerId={uuid}` devolve `booking` com a projeção anterior, `reason`, `interruptedAt`, página `history` (`historyPage`, `historySize`) e página `extras` (`extrasPage`, `extrasSize`), ambas padrão 0/20, máximo 100. Histórico contém `actorId`, `action`, `recordedAt`, estados e horários anteriores/atuais e `reason`. Auditoria de adicional contém o snapshot, ator proponente, tipo de identidade tutora (`AUTH_USER` ou `RECEPTION_CUSTOMER`), ator da decisão, motivo e evidência declarada. Dados cadastrais, prontuário e movimentações financeiras ficam fora da projeção. Ambos os endpoints exigem ADMIN e o detalhe com parceiro divergente retorna `404`.

## Migração

V8 adiciona dados da interrupção, ajusta os predicados dos índices de alocação, permite `user_id` nulo quando o outbox referencia `reception_customer_id` e cria tabela de propostas com chaves de replay e decisão auditável. V1–V7 e as reservas legadas são preservadas.
