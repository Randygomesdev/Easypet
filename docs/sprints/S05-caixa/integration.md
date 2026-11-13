# Integração S05

## S01 — navegação, rota e galeria

- S01 já conectou o export default de `Frontend/src/pages/partner/CaixaPage.tsx` em `/partner/caixa`, com o guard e o menu do caixa.
- Exemplos para a galeria, com os componentes e props da tela:
  - `<CashierLedger day={day} onPageChange={setPage} onOpenCharge={openCharge} onCloseDay={openClosing} />` usa um `CashierDay` com `totals` de R$ 40,00 recebidos em PIX e −R$ 40,00 de ajuste, líquido zero, movimentos com tipo `RECEIPT` e `REVERSAL`, e reversão com motivo e autor. Com `closedAt` e `closedBy` preenchidos, a mesma composição mostra o estado fechado.
  - `<Badge tone="warning">{money(6000)}</Badge>` ilustra o saldo pendente de uma cobrança de R$ 100,00 com R$ 40,00 recebidos. Usar `tone="success"` para saldo zero.
  - `<EmptyState icon={ReceiptText} title="Nenhum movimento registrado" size="sm" />` representa um dia sem lançamentos.

## S02 e S04 — identidade e estabelecimento

- S05 consome o vínculo de proprietário de `GET /api/v1/partners/me`, verifica que está ativo com `GET /api/v1/partners/catalog/{id}` e usa o JWT com `role=PARTNER` e `userId`. Preservar o retorno de `id`, a resolução pelo usuário autenticado e o filtro de ativos no catálogo.
- O Payment consulta `GET /api/v1/auth/session` para titulares e equipe, inclusive quando chamado diretamente. A equipe usa o vínculo do Auth, e o catálogo do Partner confirma que o estabelecimento está ativo. O Payment usa a matriz `CASH_RECEIVE` e `CASH_CLOSE` acordada com S02.

## S03 — vínculo com reserva

- Preservar `GET /api/v1/bookings/{id}` com Bearer do operador, verificação de propriedade e campos `id`, `partnerId`, `status`, `paymentMethod`. A tela usa também a listagem paginada `GET /api/v1/bookings/partner/{partnerId}`. Publicar quaisquer mudanças de status/escopo que afetem a elegibilidade. O atendimento não cria movimentos financeiros.

## S07 — infraestrutura e aceite

- Configurar `BOOKING_SERVICE_URL=http://booking-service:8084/api/v1` no ambiente do Payment, com acesso interno ao Booking e ao Partner. Manter `PARTNER_SERVICE_URL` apontando para o Partner interno com o prefixo `/api/v1`.
- No Nginx, liberar exclusivamente a subárvore autenticada `/api/v1/payments/cashier/` para o Gateway, preservando o header `Idempotency-Key` e o bloqueio das demais rotas de pagamento. O Gateway já inclui a subárvore em `/api/v1/payments/**`.
- No aceite integrado, validar migration V4, consulta/autorização nos serviços reais, conta de outro parceiro tentando usar IDs conhecidos, lançamento parcial, reenvio de POST, ajuste e fechamento simultâneo. Verificar indisponibilidade dos endpoints de checkout/créditos.

## Coordenação do frontend

- A correção de `NO_SHOW` entrou em R01. O build global da onda B passou no checkout compartilhado em 13/11/2026.

## Revisão R01

- S07 pode repetir `GET /api/v1/payments/cashier/charges/{id}` na stack com JWT válido de tutor. A expectativa continua `403` com corpo JSON. Uma requisição sem JWT ou com token inválido recebe `401`. A correção está no filtro de segurança do Payment.
- Ao integrar R01-001, usar a versão do Partner com `GET /api/v1/internal/partners/{id}/operations` e manter o endereço interno já configurado em `PARTNER_SERVICE_URL`. Criação e alteração de vínculo de templates usam a projeção com Bearer original. O caixa mantém a consulta autenticada ao próprio perfil e ao catálogo ativo.

## Onda B — aceite integrado

- **S01**. A rota e o menu já usam `access.cashier`. O contexto da API orienta os controles de reversão e fechamento com `CASH_CLOSE`. Na galeria, a recepção vê cobranças e seus movimentos, e o gestor vê também o extrato e o fechamento. O componente `<PendingCashierIntent command={{ type: 'receipt', chargeId, method: 'PIX', amountCents: 4000 }} error="" saving={false} canRetry onRetry={retry} />` exibe “Lançamento aguardando confirmação” com a ação “Retomar lançamento”.
- **S03/S04**. A tela consulta a agenda pelo mesmo JWT em `GET /bookings/partner/{partnerId}` e o Payment confere a reserva em `GET /bookings/{id}`. A equipe precisa de `BOOKINGS_READ` no próprio estabelecimento. A tela usa a projeção `GET /bookings/{id}/pet-summary` para nomes de pets de tutor e de balcão. Quando a projeção está indisponível, o seletor mostra a referência abreviada do pet. A equipe usa o catálogo ativo para nomes de serviços e o backend continua conferindo o estabelecimento e a reserva.
- **S07**. O Nginx já inclui `GET /api/v1/payments/cashier/context` e o Compose configura `AUTH_SERVICE_URL=http://auth-service:8081/api/v1` no Payment. O Payment consulta Auth também em acesso direto. No navegador, perder a resposta depois de enviar o POST ao servidor, recarregar `/partner/caixa`, acionar “Retomar lançamento” e conferir que há um só movimento. Testar também recepção sem extrato/reversão/fechamento, gestor, profissional, revogação e Auth indisponível.
- **S07**. Configurar a mesma credencial descartável `BOOKING_PET_SUMMARY_TOKEN` somente no Booking e no Pet para exibir os nomes de pets no seletor. O caminho interno do Pet continua fora do ingresso.

## H1-06 — roteiro para a S07

- [Fixture e aceite H1](h1-acceptance.md) complementam os cenários da onda B. Use a mesma rota pública, os mesmos papéis e um estabelecimento fictício com dia corrente aberto. A jornada acrescenta trilha no celular, reversão autorizada e recusas, fechamento concorrente, estado de outra aba após fechar e investigação.
- O log `cashier_request` pode entrar na coleta local do diagnóstico por operação/status, correlacionado pelo `X-Request-Id` do Nginx. Exemplo de linha `cashier_request requestId=9de058cd01eb4f25a7d7532f878e17ce operation=reverse status=200 durationMs=34`. Não há endpoint novo de diagnóstico. Use os endpoints autorizados de extrato e cobrança para reconstruir o evento de negócio.
- S04 altera o estado do estabelecimento por operação administrativa auditada. O Payment verifica atividade via projeção do catálogo em cada chamada, inclusive replay, sem mudar o estado da conta. S03 preserva o histórico de anotações de adicionais do atendimento. A tela do caixa deixa claro que o campo financeiro é manual e que consentimento do tutor continua fora desse fluxo.
