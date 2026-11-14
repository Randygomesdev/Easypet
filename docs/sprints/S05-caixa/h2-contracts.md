# S05 — Contratos H2

Publicado em 14/11/2026. Todos os caminhos têm prefixo `/api/v1`.

## Caixa e adicionais

| Método e caminho | Autorização e entrada | Sucesso |
| --- | --- | --- |
| `POST /payments/cashier/charges` | Titular ou equipe com `CASH_RECEIVE`, estabelecimento ativo. Mesmo payload e `Idempotency-Key` UUID da H1. Novas cobranças exigem `extrasCents: 0`. | `200 {id}`. A cobrança começa com zero adicionais e zero recebido. |
| `POST /payments/cashier/charges/{chargeId}/approved-extras` | Mesmo acesso. `Idempotency-Key` UUID, corpo `{"approvalId":"<uuid>","version":1}`. O valor, a descrição e o aceite vêm do Booking. | `200 {"id":"<id-da-aplicação>"}`. A aplicação soma o valor aprovado ao total e saldo, sem criar movimento de recebimento. |
| `GET /payments/cashier/charges/{chargeId}` | Mesmo acesso, sem corpo. | Resposta H1 acrescida de `approvedExtras`, lista de aplicações gravadas, em ordem de aplicação. |

O pagamento parcial, a reversão e o fechamento mantêm o contrato H1. A aplicação exige dia atual aberto. Cada aceite pode ser aplicado uma só vez à cobrança da própria reserva, sob a mesma trava do caixa. Repetição com a mesma chave, ator e comando retorna a mesma aplicação, mesmo depois do fechamento. Nova chave para aceite já aplicado retorna `409`. Não são aceitos valores ou declarações de aprovação do navegador como fonte financeira. A interrupção do atendimento não dispara cobrança, recebimento nem reversão.

Uma reserva `INTERRUPTED` pode ser selecionada em uma operação explícita do caixa, inclusive para vincular aceite registrado antes da interrupção. A criação é única por reserva e continua sujeita ao vínculo, dia aberto e bloqueio para `PACKAGE_CREDIT`. Um adicional indisponível retorna `404` com `code: "CASHIER_EXTRA_APPROVAL_NOT_FOUND"`.

Um adicional aplicado inclui `id`, `approvalId`, `version`, `description`, `amountCents`, `acceptedAt`, `channel`, `appliedAt` e `appliedBy`, além de `acceptedBy` e `tutorIdentityType`. O ID do tutor de origem fica preservado no snapshot do Payment e a prova fica na auditoria ADMIN do Booking. Valores usam BRL em centavos inteiros. Erros seguem H1: `400` entrada inválida, `401` sessão inválida, `403` papel recusado, `404` cobrança ou aceite fora de escopo, ausente, pendente, recusado ou expirado, `409` dia fechado, versão divergente, duplicidade ou novo `extrasCents` manual maior que zero, `503` validação Booking indisponível ou snapshot incoerente. Cliente H1 que enviava extras manuais precisa migrar. Dados históricos conservam valores e recebimentos. Reenvio de criação H1 já gravada continua retornando o resultado original. Para evitar somar duas vezes ao histórico, cobrança antiga com adicionais manuais não aceita nova aplicação na H2.

O Payment consulta `GET /internal/booking-extra-authorizations/{authorizationId}?partnerId=…&bookingId=…&version=…` com `BOOKING_PAYMENT_AUTHORIZATION_TOKEN`. Confere identidade do aceite, reserva, parceiro, versão, moeda BRL e `quantity × unitPriceCents = amountCents` fora da transação de escrita do caixa. O mapeamento usa `authorizationId → approvalId`, `approvedAt → acceptedAt` e `approvedBy → acceptedBy`. `acceptedBy` é o tutor autenticado no digital ou o operador que registrou a prova presencial. O par `tutorIdentityType/tutorId` distingue a origem da reserva desse ator. Em falha de consulta, a operação não lança valor ou grava chave de sucesso.

O snapshot aplicado preserva e expõe `quantity` e `unitPriceCents` junto ao total aprovado. O `tutorId` permanece apenas no snapshot persistido.

## Projeção ADMIN por reserva

`GET /admin/cashier/bookings/{bookingId}?partnerId={id}&page=0&size=20`. Exige sessão Auth `ADMIN`, inclusive direto no Payment. `partnerId` é obrigatório e vem da reserva já consultada pelo ADMIN. `page` é baseado em zero e `size` aceita 1 a 100. Leitura repetível, sem corpo nem chave de idempotência.

`200 {"bookingId":"<uuid>","partnerId":"<uuid>","charge":null,"approvedExtras":[],"movements":{"content":[],"number":0,"size":20,"totalElements":0,"totalPages":0}}` quando não há cobrança para esse par. Quando há cobrança, `charge` contém apenas ID, valores em centavos, autoria e horário. `movements.content` contém ID, data, tipo, método, valor, motivo de ajuste, referência ao recebimento original, horário e autor. A lista de adicionais mostra os campos acima, com referência ao aceite. Permite investigar registros de estabelecimento inativo; não há acesso de escrita, dados de pagamento de provedor, dados cadastrais, conteúdo fiscal, nem consulta transversal para outros papéis. Erros `400` para entrada inválida, `401` para sessão ausente/inválida, `403` para outro papel, `503` se Auth não confirmar a sessão.

## Persistência

Flyway Payment V5 aditiva. Tabela de aplicações com FK composta para a cobrança e unicidade do aceite por estabelecimento, snapshot monetário, referência, data e autor do aceite, identidade tutora de origem, canal e autoria da aplicação. Mantém `cashier_charges.extras_cents` histórico e deriva o total de adicionais da soma do legado com as aplicações. A aplicação e o resultado idempotente persistem na mesma transação. Não altera movimentos ou fechamentos existentes.
