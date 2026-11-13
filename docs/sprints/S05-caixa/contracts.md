# Contratos S05 — Caixa local

## H1-06 — preparação para homologação interna, 13/11/2026

- `GET /days` acrescenta `closingId` (UUID do fechamento, ou `null` enquanto o dia estiver aberto). Os demais campos, permissões e códigos continuam conforme a onda B. Clientes podem ignorar o campo novo. O detalhe da cobrança continua fornecendo `bookingId`, `createdAt`, `createdBy` e a relação entre cada reversão e seu recebimento original.
- Um novo lançamento recusado porque o dia corrente já fechou recebe `409` com `code: "CASHIER_DAY_CLOSED"` no corpo de erro. Reenvios com chave já confirmada continuam retornando o ID original. Exemplo de recusa: `{"status":409,"message":"O caixa de hoje já foi fechado.","code":"CASHIER_DAY_CLOSED"}`. A tela atualiza o estado ao receber esse código.
- Adicionais são valores informados manualmente conforme `extrasCents`. O campo não registra consentimento nem importa anotações de atendimento. A UI informa essa limitação, sem oferecer autorização, reembolso ou cobrança externa.
- O Payment registra `cashier_request` em logs locais com `requestId`, operação fixa, status HTTP e duração em milissegundos. São registradas mutações e falhas de leitura. O log não contém URLs, corpos, credenciais, IDs de recursos, valores ou motivos. A investigação de dados de negócio usa as leituras já autorizadas do caixa. [Roteiro H1](h1-acceptance.md).

Base `/api/v1/payments/cashier` no Payment Service. Onda B implementada e validada localmente em 13/11/2026. O Payment confirma o Bearer JWT em `GET /api/v1/auth/session` com o token original para cada operação protegida, inclusive em acesso direto. O titular `PARTNER` resolve seu estabelecimento em `GET /api/v1/partners/me`. A equipe usa o `partnerId` devolvido pelo Auth. O Payment confirma que o estabelecimento está ativo com `GET /api/v1/partners/catalog/{id}` e confere cada recurso no escopo resolvido. O autor é o `userId` individual da sessão.

## Endpoints

| Método e caminho relativo | Request | Resposta |
| --- | --- | --- |
| `GET /context` | Sem corpo | `200 { partnerId, actorId, businessDate, closedToday, canReceive, canClose }` |
| `GET /charges` | `openOnly` opcional (default `true`), `page` (0), `size` (20, máximo 100) | `200` com página de cobranças, mais recentes primeiro |
| `GET /charges/{chargeId}` | Sem corpo | `200` com `{ charge, movements }`, incluindo movimentos de todos os dias da cobrança |
| `POST /charges` | `{ bookingId, description, baseCents, extrasCents, discountCents }` | `200 { id }` da cobrança |
| `POST /charges/{chargeId}/receipts` | `{ method, amountCents }` | `200 { id }` do recebimento |
| `POST /receipts/{receiptId}/reverse` | `{ reason }` | `200 { id }` do ajuste |
| `GET /days` | `date` opcional (`YYYY-MM-DD`, padrão dia corrente), `page`, `size` | `200` com `{ date, businessDate, closedAt, closedBy, totals, movements }`. `movements` é uma página, mais recentes primeiro |
| `POST /days/{date}/close` | Sem corpo | `200 { id }` do fechamento |

Página: `{ content, number, size, totalElements, totalPages }`. Cobrança: `{ id, bookingId, description, baseCents, extrasCents, discountCents, totalCents, receivedCents, balanceCents, createdAt, createdBy }`. Movimento: `{ id, chargeId, chargeDescription, date, type, method, amountCents, reason, reversesReceiptId, createdAt, createdBy }`. `type` é `RECEIPT` ou `REVERSAL`. O ajuste tem valor negativo, forma idêntica à original, motivo e referência ao recebimento. Em recebimentos, `reason` e `reversesReceiptId` são nulos. `totals` retorna `{ receivedCents, adjustmentCents, netCents, byMethod }`. `byMethod` contém todos os métodos com o líquido em centavos de cada um. `closedAt` e `closedBy` são nulos para dia aberto. Timestamps usam ISO 8601 UTC.

## Regras

- O titular tem acesso às operações de caixa. Equipe precisa de `CASH_RECEIVE` para consultar contexto, cobranças e seus movimentos, criar cobranças e registrar recebimentos. Extrato diário, reversão e fechamento exigem `CASH_CLOSE`. O contexto informa à recepção se o dia corrente está fechado sem expor o extrato. Exemplo de contexto da recepção: `{"partnerId":"b60b8e68-76f8-498b-95a5-d6c4bd84d095","actorId":"c26986e4-a64c-4a54-bdf8-d48b682ef481","businessDate":"2026-11-13","closedToday":false,"canReceive":true,"canClose":false}`.
- Para operações protegidas, Auth devolve `401` para JWT ausente/inválido, revogado, anterior ao reset ou de conta inativa. Payment aceita somente `200` com sessão válida. Indisponibilidade, corpo inválido e outros status do Auth resultam em `503`; a consulta tem limites de conexão e leitura e não segue redirecionamentos. Uma sessão válida sem permissão recebe `403`. A identidade vem da consulta Auth com Bearer original.
- Moeda BRL em centavos inteiros, sem arredondamento. Cada valor de entrada fica entre 0 e 99.999.999.999 centavos. A cobrança é `base + adicionais − desconto`, pode ser zero e exige descrição de 1 a 160 caracteres. O operador informa o valor praticado no balcão. A reserva não determina o valor recebido.
- O vínculo é único por estabelecimento e reserva. Payment valida `id`, `partnerId`, `status` e `paymentMethod` em `GET /api/v1/bookings/{bookingId}` com o mesmo JWT. Aceita `CONFIRMED`, `IN_PROGRESS` e `COMPLETED` para pagamento local, exceto reservas com `PACKAGE_CREDIT`. A criação da cobrança, inclusive após conclusão do serviço, começa com zero recebido.
- Formas locais `CASH`, `PIX`, `DEBIT_CARD`, `CREDIT_CARD`, `OTHER`. Recebimento maior que zero e até o saldo. Ajuste é reversão integral de um recebimento específico, uma vez, com motivo de 1 a 300 caracteres. Uma nova baixa pode registrar a forma e o valor corretos. O ajuste reabre saldo na cobrança e pertence ao dia em que foi lançado.
- O dia é calculado no servidor em `America/Sao_Paulo`. Movimentos e novas cobranças são registrados no dia corrente aberto. É possível fechar hoje ou dia anterior, inclusive sem movimentos. O fechamento congela o extrato daquele dia. Ajuste de movimento de dia fechado entra no dia corrente aberto, preservando o extrato original. O líquido diário pode ser negativo.
- Toda mutação exige header `Idempotency-Key` UUID. A mesma chave para estabelecimento, autor e comando equivalente retorna o ID da execução original, inclusive após o fechamento. Reuso para outro comando, corpo ou autor recebe `409`. Uma nova chave para fechar dia já fechado recebe o ID do fechamento existente. As gravações de um estabelecimento são serializadas no Payment.
- O painel salva a intenção e sua chave antes do envio, no armazenamento de sessão da aba, isolado por estabelecimento e autor. Após reload ou falha ambígua, oferece retomar a intenção com os mesmos dados e chave antes de um novo lançamento. O reenvio é explícito.
- Exemplos de corpos: cobrança `{"bookingId":"b60b8e68-76f8-498b-95a5-d6c4bd84d095","description":"Banho e tosa da Nina","baseCents":9000,"extrasCents":1500,"discountCents":500}`; recebimento parcial `{"method":"PIX","amountCents":4000}` deixa 6000 centavos pendentes; ajuste `{"reason":"Forma registrada incorretamente"}` repõe 4000 ao saldo e lança −4000 em PIX.
- Erros JSON com `status` e `message`. Erros do controlador também incluem `timestamp` e podem incluir `errors`. Códigos `400` para entrada inválida ou data futura; `401` sem JWT válido; `403` para papel autenticado sem permissão; `404` para estabelecimento, reserva ou recurso fora do escopo ou ausente; `409` para chave em conflito, dia fechado, vínculo duplicado, reserva inelegível, reversão duplicada ou valor acima do saldo; `503` quando Partner ou Booking não puder confirmar o acesso.

## Consulta operacional de pacotes

A criação ou alteração de vínculo de um template de pacote consulta `GET /api/v1/internal/partners/{partnerId}/operations` no Partner Service, com o JWT original. O Payment lê `id` e `services[].id` para verificar a associação. A projeção é compatível com os estabelecimentos inativos consultados anteriormente e é restrita à rede interna. A mudança de caminho não exige migration ou configuração adicional. [Contrato S04](../S04-balcao/contracts.md#leituras-de-estabelecimento--r01-001).

## Persistência

Flyway `V4__create_cashier_ledger.sql` adiciona tabelas próprias no banco do Payment para serialização por estabelecimento, cobranças, movimentos, fechamentos e idempotência. Vínculos de serviços externos são UUIDs, sem FKs externas. IDs internos do caixa usam FKs compostas com o estabelecimento. Extrato e trilha de ajustes são somente de acréscimo.
