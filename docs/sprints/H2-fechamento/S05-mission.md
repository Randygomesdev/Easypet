# S05 — Adicionais aprovados e caixa investigável H2

Leia `spec.md`. Ownership histórico Payment e caixa. Checkout/créditos permanecem desabilitados.

Inspecione cobrança/adicionais atuais e publique contrato antes da integração S03. Aplique adicionais de atendimento somente a partir de autorização válida obtida do Booking por canal interno autenticado: reserva/estabelecimento/versão/valor devem corresponder ao snapshot aprovado. Não confiar em preço/aceite booleano recebido do navegador. Aplicação explícita, idempotente e auditada; concorrência/replay não duplicam valor, indisponibilidade do Booking não libera cobrança. Preservar dias fechados, recebimentos existentes e a ausência de cobrança/estorno automático na interrupção.

Entregue projeção mínima ADMIN de cobrança, recebimentos/reversões e histórico por reserva para investigação S01, sem ampliar acesso de tutor/parceiro nem expor segredos financeiros. Comece pela auditoria do domínio, contrato e casos negativos enquanto S03 implementa a autorização.

Teste valor divergente, ausência/rejeição de aceite, contexto alheio, falha de dependência, repetição/concorrência e caixa fechado. Documente impactos/compatibilidade do comportamento legado. Docker aguarda S07. Relatórios em `S05-caixa/h2-contracts.md`, h2-status e h2-integration.
