# R01 — Parecer de revalidação

**Resultado em 13/11/2026: correções concluídas e aceite integrado R01 aprovado.** Os cinco workers acionados (S01, S03, S04, S05 e S07) encerraram suas entregas. Os três achados foram corrigidos e revalidados; os três erros TypeScript de `NO_SHOW` também foram resolvidos. Este aceite cobre a rodada R01, não todas as jornadas futuras nem a publicação em produção.

## Achados encerrados

| Achado | Correção e evidência de aceite |
| --- | --- |
| R01-001 — P2 — Partner | Lista completa restrita a ADMIN; detalhe a ADMIN ou titular. Booking e Payment usam projeção interna autenticada, sem dados fiscais/contato. Testes HTTP do S04 e aceite S07 confirmam recusas por identidade/papel, acesso autorizado, consumidores e bloqueio da rota interna no ingresso público. |
| R01-002 — P2 — Booking | Limites de conexão de 750 ms, resposta HTTP de 2 s, espera de trava de 4 s e transação de 12 s; leitura limitada também pelo orçamento restante da transação. Teste PostgreSQL do S03 comprova resposta parcial parada, espera real pela trava, rollback sem registros parciais e sucesso da segunda operação. Na stack S07, Pet sem responder resultou em 503 em 2.252 ms, seguido de reserva bem-sucedida no mesmo intervalo/chave. |
| R01-003 — P3 — Payment | Handler escreve 403 JSON diretamente, preservando 401 para JWT ausente/inválido. Regressão em Tomcat/PostgreSQL do S05 e aceite S07 pelo Gateway e diretamente no Payment passaram; isolamento, baixa parcial idempotente e fechamento preservados. |

Reprodução original e fechamento detalhado em [findings.md](findings.md). O [parecer da primeira entrega](review-initial.md), seus snapshots e as provas isoladas foram preservados como histórico.

## Evidência conferida pelo R01

- **Workers:** cinco entregas com estado `completed`, cursores e mensagens finais preservados em [worker-observations.json](revalidation/worker-observations.json).
- **Identidade do código:** mesmo HEAD `ceba61cc4ae325ddd8ff5012020508c6e55e5966`, com alterações locais identificadas por SHA-256. Os 18 arquivos únicos registrados no snapshot S07 coincidem com o checkout: [comparação](s07-snapshot-comparison.json). O [snapshot de revalidação](revalidation/source-snapshot.json) amplia o registro das fontes.
- **Aceite integrado executado pela S07:** build completo; stack descartável com 16 containers saudáveis, Chromium e PostgreSQL 15; **12 testes Playwright aprovados em 28,2 s**, nenhum teste falhou. Duas confirmações distintas foram verificadas no transporte LOCAL. Recursos do ensaio removidos ao final, conforme entrega S07.
- **Relatórios Java dos responsáveis:** **104 testes em 18 relatórios**, zero falhas, erros ou skips: Auth 8, Booking 40, Partner 20, Pet 9, Payment 11, Notification 16. Fontes dos testes e resultados foram inspecionados; R01 não reexecutou essas suítes. [Manifesto dos relatórios](revalidation/test-report-summary.json).
- **Verificação independente R01:** `node Frontend/node_modules/typescript/bin/tsc --project Frontend/tsconfig.app.json --noEmit --incremental false` terminou com código 0 e sem diagnósticos. Nenhum artefato de build foi emitido.
- **Registro do aceite:** [evidence.json](revalidation/evidence.json) contém hashes dos logs e somente trechos de resultado, sem copiar os logs completos. [Status S07](../S07-infra-integracao/status.md) e [snapshot S07](../S07-infra-integracao/r01-snapshot.txt) documentam a execução.

O primeiro ensaio S07 encontrou problemas na conta fictícia da galeria e limite 429 no login. O reteste corrigiu a fixture e passou a repetir somente o login limitado, mantendo o rate limiter e as expectativas de autorização. A expectativa 403 continua capaz de reprovar a suíte. O proxy de falha intercepta somente o pet sintético do cenário R01-002 e encaminha as demais chamadas ao Pet real.

O teste integrado de timeout comprova erro recuperável e retomada. A evidência explícita da espera pelo lock e da ausência de histórico/outbox/idempotência parciais vem do teste PostgreSQL do S03; não é atribuída ao Playwright. R01 conferiu fontes, configurações, relatórios, hashes e logs e não iniciou Compose ou outra suíte integrada.

## Limites e trabalho restante

As rotas web de recuperação, equipe, caixa e notificações, autorização/sessão transversal dos serviços, chave estável nas telas legadas de reserva, reivindicação de cadastro e resolução de destinatário SMTP seguem pendentes. Reinício/falhas avançadas de Notification, recuperação representativa com anexos, alertas operacionais e publicação também ficam fora deste aceite. A galeria e a navegação existente aprovadas não comprovam essas novas jornadas. Há ainda lint preexistente reportado por S01 (sete erros e três avisos nas duas telas).

Detalhes em [test-gaps.md](test-gaps.md). Checkout e créditos continuam bloqueados. O encerramento dos achados R01 não altera os critérios de piloto/produção do [roadmap](../../ROADMAP.md).
