# Status S03 — H2

14/11/2026. Implementação local da S03 entregue. Aceite entre serviços segue com a S07. [Contratos](h2-contracts.md) e [integração](h2-integration.md).

- O Booking grava `IN_PROGRESS → INTERRUPTED`, motivo, ator, data, histórico e outbox na mesma transação. A agenda volta a aceitar o intervalo quando ainda é futuro. O checklist e as propostas decididas permanecem consultáveis. Propostas pendentes expiram e não há escrita financeira.
- Atendimento e Meus Agendamentos oferecem proposta, revisão de valor e decisão explícita de adicional. A decisão digital usa a identidade da sessão do tutor. O registro presencial distingue a identidade de origem da reserva do operador que registra motivo e prova. A proposta conserva a chave e o corpo em caso de perda da resposta e reload. Payment consulta somente autorizações aprovadas pelo contrato interno do Booking.
- A investigação do Booking entrega ao ADMIN lista e detalhe paginados com histórico, autores e auditoria de adicionais. S01 compõe a tela com as projeções de Payment e Notification. O outbox v1 publica origem de balcão para novos eventos, e Notification aplica a autorização de destinatário do Partner.

## Validação e slot

Slot S03 iniciado após a liberação registrada pela S07. PostgreSQL 15 Alpine descartável `easypet-s03-h2-pg-56243`, bind `127.0.0.1:56243`, dados em `tmpfs`. Navegador usa Vite isolado em loopback e perfil Chrome temporário com dados sintéticos.

**Slot concluído e cedido para S04.** Suíte final em banco vazio terminou às 02:11 BRT. `docker stop -t 5` encerrou o container e `docker ps -a` com o nome exato confirmou sua remoção. Um reteste no banco reaproveitado encontrou interferência dos eventos antigos no limite global de 100 do fixture. A suíte final usou banco novo como no ensaio de migration e passou.

| Validação | Resultado |
| --- | --- |
| `gradle --offline --no-daemon --max-workers=2 test`, JDK 21, PostgreSQL 15.20 | 49 testes, 23 com PostgreSQL, incluindo V1–V8, liberação de horário, autoria/replay de interrupção, disputa de decisão, fora de escopo, token interno, paginação ADMIN e outbox de balcão. Auth/Partner/Pet usam fixtures HTTP controladas no teste do Booking. |
| `node src/features/booking/booking.browser.mjs` | Passou com Chrome e API simulada, incluindo 360/390 px, proposta com perda de resposta e reload, autorização presencial, recusa digital, interrupção e regressões da H1. |
| ESLint `--max-warnings 0` no escopo S03 e `git diff --check` no escopo | Passaram. |
| `tsc -b --pretty false` global | Três diagnósticos em mapas de `BookingStatus` fora do ownership H2 da S03. `AgendamentosTab.tsx` tem um mapa e `DashboardPage.tsx` tem dois aguardando `INTERRUPTED`. O ajuste está registrado para os donos. |
