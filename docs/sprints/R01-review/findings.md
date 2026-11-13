# R01 — Achados e revalidação

**13/11/2026 — três achados encerrados como corrigidos e revalidados com o aceite integrado S07.** S01 também resolveu os três erros de `NO_SHOW`. Foram conferidos código, fontes dos testes, relatórios e logs; os 18 hashes do snapshot S07 coincidem com o checkout.

A [reprodução original](findings-initial.md) foi preservada integralmente, incluindo impacto, severidade, caminhos/linhas e hashes anteriores. Os arquivos `isolated/`, `snapshot-final.json` e `integrated-failure-evidence.json` são provas históricas das falhas antes das correções. Não representam o estado atual. Veja o [parecer de revalidação](review.md) e a [evidência do aceite](revalidation/evidence.json).

## R01-001 — P2 — Leitura completa de parceiros sem autenticação no serviço interno

- **Dono:** S04, com migração dos consumidores S03/S05 e aceite S07.
- **Estado:** encerrado — corrigido e revalidado em 13/11/2026.
- **Correção conferida:** `Backend/Partner-Service/src/main/java/br/com/easypet/partner/config/SecurityConfig.java` restringe GET/HEAD da coleção a ADMIN e do detalhe a ADMIN/PARTNER. `PartnerController.findAll` exige ADMIN; `PartnerService.findById` aplica `PartnerAccess.requireOwnerOrAdmin`. A autorização de titular é conferida no serviço.
- **Consumidores preservados:** `InternalPartnerController` oferece `/internal/partners/{partnerId}/operations` autenticado. `PartnerOperationsResponse` contém id, nome, capacidade, expediente e serviços, sem dados fiscais/contato. Booking e Payment encaminham o bearer original para essa projeção.
- **Regressão do responsável:** seis testes de `PartnerReadAccessTest` com servidor HTTP real e H2 cobrem GET/HEAD, JWT ausente/inválido, tutor, parceiro alheio, titular, ADMIN, catálogo e projeção interna. A entrega contém 20 testes Partner e nove Pet aprovados.
- **Aceite S07:** `Frontend/e2e/pilot.spec.ts` verifica diretamente o serviço: 401 sem autenticação, 403 para tutor/parceiro alheio nas leituras completas, 200 para ADMIN e detalhe do titular. Confere campos exatos da projeção, recusa anônimo e 404 no ingresso público. Booking reserva e Payment cria template de pacote usando a projeção; a compra permanece bloqueada.
- **Conclusão R01:** eliminada a leitura completa sem autorização no próprio Partner e preservados os consumidores necessários. R01 não repetiu chamadas à stack; inspecionou a execução S07 e a identidade dos arquivos.

## R01-002 — P2 — Chamadas HTTP sem timeout mantêm a trava de toda a agenda

- **Dono:** S03, com aceite S07.
- **Estado:** encerrado — corrigido e revalidado em 13/11/2026.
- **Correção conferida:** `Backend/Booking-Service/src/main/java/br/com/easypet/booking/config/RestTemplateConfig.java` configura conexão e leitura finitas no cliente JDK, valida valores positivos e limita leitura ao orçamento restante da transação. `application.yaml` define 750 ms de conexão, 2 s de leitura, 4 s de espera pela trava e 12 s de transação. `BookingAgendaStore` aplica `lock_timeout` local no PostgreSQL. Falhas de dependência/espera retornam erro recuperável 503 com rollback.
- **Regressão do responsável:** quatro testes novos em `BookingDependencyPostgresTest`, incluídos nos 40 testes Booking aprovados. Com PostgreSQL 16 e doubles HTTP, Pet envia parte do corpo e para; o teste observa a segunda transação aguardando a trava, depois confirma 503 da primeira e 201 da segunda. Apenas a segunda grava reserva, outbox e idempotência; não há histórico parcial. Outros casos cobrem orçamento transacional, timeout de lock seguido de retry e contrato da projeção Partner.
- **Aceite S07:** proxy de falha para um pet sintético, mantendo os demais serviços reais. A primeira operação retornou 503 em **2.252 ms**; a segunda conseguiu reservar o mesmo intervalo com a mesma chave de idempotência. Log final: 12 cenários aprovados.
- **Limite da evidência:** a consulta de espera pelo lock e as contagens de registros parciais pertencem ao teste PostgreSQL S03. O Playwright comprova o prazo observado, a resposta recuperável e a retomada, sem essas consultas internas.
- **Conclusão R01:** a falha parcial não mantém a agenda bloqueada indefinidamente; concorrência e atomicidade foram preservadas nos testes examinados.

## R01-003 — P3 — Caixa responde 401 para papel autenticado sem permissão

- **Dono:** S05, com aceite S07.
- **Estado:** encerrado — corrigido e revalidado em 13/11/2026.
- **Correção conferida:** `Backend/Payment-Service/src/main/java/br/com/easypet/payment/config/SecurityConfig.java` instala `accessDeniedHandler` que escreve 403 JSON diretamente. O responsável reproduziu em Tomcat que `sendError(403)` iniciava despacho de erro sem a autenticação original. O entrypoint continua retornando 401 para autenticação ausente/inválida e o caixa continua exigindo PARTNER.
- **Regressão do responsável:** servidor HTTP real com cobrança persistida e PostgreSQL; 11 testes Payment aprovados, incluindo cliente da projeção Partner.
- **Aceite S07:** tutor autenticado recebe 403 pelo Gateway e diretamente no Payment; ausência/JWT inválido continuam 401. Outro parceiro recebe 404; baixa parcial idempotente e fechamento passam. A expectativa 403 foi mantida; `expect.soft` ainda reprova a suíte quando diverge.
- **Conclusão R01:** semântica de autenticação/autorização corrigida na cadeia real, sem relaxar a proteção do caixa.

## Bloqueador adicional — mapas NO_SHOW

S01 incluiu `NO_SHOW` nos três mapas de apresentação em `AgendamentosTab.tsx` e `DashboardPage.tsx`, com rótulo “Falta”. O typecheck independente R01 terminou com código 0 e sem diagnósticos; build completo e navegação existente passaram na S07. Lint preexistente relatado por S01 e novas jornadas ainda pendentes permanecem em [test-gaps.md](test-gaps.md).
