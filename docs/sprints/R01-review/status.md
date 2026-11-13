# R01 — Estado da revisão

**Versionamento autorizado pelo usuário:** código e infraestrutura organizados em oito commits por domínio; documentação/roadmap consolidados no commit deste registro. [Organização](versionamento.md). Conteúdo de produto preservado, sem nova execução das suítes. O envio é da branch `codex/unificar-develop`, sem merge na main ou deploy.

**H1-01 concluído localmente em 13/11/2026:** S07 encerrou a retomada com 16 serviços saudáveis no Compose real, diagnóstico/alerta nos caminhos saudável e de falha e ADMIN criado pelo console com login/acesso administrativo e negativas de duplicidade/restrições. R01 conferiu 640 entradas sem mudanças, hashes dos logs e limpeza completa dos quatro projetos. [Parecer operacional atual](h1-ops-review.md) · [Evidência](h1-ops/evidence.json) · [Despacho](h1-ops-dispatch.json). Aceite funcional 22/22 e restauração preservados. Código versionado; preflight VPS e smoke HTTPS pendentes.

## Histórico — revisão antes da retomada operacional

**H1 — aceite funcional local revalidado em 13/11/2026; fechamento operacional H1-01 incompleto:** S01–S07 entregaram as implementações. A S07 aprovou 22/22 cenários no artefato real de homologação e recuperação após migration incompatível (seis bancos, 55 tabelas, 12 consultas de referência). R01 conferiu 162 testes Java em 26 relatórios, typecheck independente, 640 entradas estáveis e limpeza dos projetos. [Parecer H1 atual](h1-review.md) · [Evidências](h1/evidence.json) · [Workers](h1-worker-observations.json) · [Missões](pre-homolog-dispatch.md). Duas tentativas complementares não chegaram às sondas operacionais (timeout de bancos e auth-db unhealthy). S07 encerrou a revalidação com causa indeterminada e limpeza parcial: um contêiner Dead, seu volume e rede retidos pelo daemon. Retomar limpeza dirigida e sondas após normalizar Docker local. Publicação e critérios operacionais/dados reais continuam pendentes.

**Histórico — onda B concluída em 13/11/2026:** integrações e correções dos responsáveis entregues; S07 aprovou 18/18 cenários e restauração representativa dos seis bancos. R01 conferiu 140 testes Java, typecheck, 619 registros de snapshot iguais e limpeza dos projetos. R01-B01/B02 corrigidos e revalidados. [Parecer da onda B](wave-b-review.md) · [Evidência final](wave-b/final-evidence.json) · [Achados](wave-b-findings.md).

## Aceite R01 anterior — histórico preservado

**Estado: revalidação concluída em 13/11/2026; aceite integrado das correções R01 aprovado.** HEAD `ceba61cc4ae325ddd8ff5012020508c6e55e5966`; alterações locais identificadas nos snapshots.

S01, S03, S04, S05 e S07 concluíram as correções solicitadas. R01-001, R01-002 e R01-003 estão **encerrados como corrigidos e revalidados**. Os três erros de `NO_SHOW` também foram resolvidos.

- S07: build completo e 12/12 cenários Playwright aprovados em 28,2 s; duas confirmações LOCAL; stack descartável removida conforme relatório do responsável.
- R01: 18/18 hashes do snapshot S07 conferidos, 104 testes Java aprovados em 18 relatórios dos workers e typecheck independente sem diagnósticos.
- O teste PostgreSQL S03 comprova rollback e liberação da trava; o integrado S07 confirma 503 em 2.252 ms e sucesso da operação seguinte.

Não há achado R01 aberto. Permanecem integrações e critérios de piloto/produção fora desta rodada, descritos em [cobertura/lacunas](test-gaps.md) e no [roadmap](../../ROADMAP.md).

[Parecer atual](review.md) · [Achados e fechamento](findings.md) · [Parecer inicial preservado](review-initial.md) · [Evidência de aceite](revalidation/evidence.json) · [Conclusão dos workers](revalidation/worker-observations.json).

R01 não alterou código de produto, não executou Compose/suíte integrada e não fez deploy. As mensagens de correção aos responsáveis e a atualização do roadmap foram autorizadas pelo usuário. Não há monitoramento futuro associado ao encerramento.
