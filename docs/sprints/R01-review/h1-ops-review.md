# R01 — Fechamento operacional H1-01

**Aprovado localmente em 13/11/2026.** A S07 concluiu a retomada solicitada pelo usuário: recursos Docker residuais removidos, stack real saudável, diagnóstico/alerta revalidados e ADMIN provisionado pelo console. R01 conferiu os scripts, logs, hashes, snapshots e limpeza por leitura independente. [Evidência consolidada](h1-ops/evidence.json) · [Execução S07](../S07-infra-integracao/h1-operational-acceptance.json) · [Despacho](h1-ops-dispatch.json).

## Resultado e cobertura

Projeto `easypet-h1-ops-resume-49d24eb7`, com `compose.homolog.yml` sem overlays e volumes novos. Configuração e subida retornaram `0`; os **16 serviços ficaram saudáveis**. PostgreSQL concluiu a inicialização e aceitou conexões TCP. O bloqueio anterior não se repetiu; sua causa raiz continua indeterminada. Não houve alteração de fontes, reinício global do Docker/WSL ou interrupção das demais stacks.

| Verificação | Evidência aprovada |
| --- | --- |
| Diagnóstico | Saídas **0 → 1 → 0**: stack saudável, Notification parada deliberadamente e saúde restabelecida. Conferiu cinco sondas HTTP (204/401/401/404/404), ID de requisição, publicação de portas e fila SMTP com polling ativo. |
| Alerta local | Saídas **0 → 2 → 0 → 1 → 0**: fila normal, entrega sintética FAILED excedendo os limites de falhas/destinatários, remoção da fixture, endpoint indisponível e recuperação. O teste prova sinalização local por código/saída, não recebimento de alerta por operador externo. |
| ADMIN pelo console | Provisionador real no contêiner Auth retornou `0`. Login, sessão com papel ADMIN e consulta administrativa pelo ingresso HTTP retornaram `200`; consulta anônima retornou `401`. São verificações HTTP pelo ingresso, sem alegar novo teste de interface no navegador. |
| Duplicidade e restrições | Mesmo e-mail em maiúsculas, outro papel e outra senha recusados com saída `1`; ID, nome, papel e senha original preservados. Senha da tentativa recusada não autenticou (`401`). Sem terminal, fora de homolog e domínio não fictício também recusados com saída `1`. |
| Limpeza | `compose down` retornou `0`. S07 conferiu ausência de recursos/imagens dos quatro projetos. R01 confirmou independentemente zero contêineres, volumes e redes nos quatro, inclusive no antigo projeto com contêiner Dead. Arquivo temporário de credenciais fictícias removido. |

Os projetos conferidos foram `easypet-h1-ops-d23b9fe1`, `easypet-h1-ops-f03c6b1a`, `easypet-h1-ops-c5a80f3e` e `easypet-h1-ops-resume-49d24eb7`. A limpeza foi restrita aos ensaios; não houve prune global ou remoção de dados de outras stacks. [Conferência de limpeza](h1-ops/cleanup-verification.json).

## Preservação do aceite funcional

Cinco snapshots — base funcional H1, antes/depois S07 e antes/depois R01 — conferem o mesmo HEAD `ceba61cc4ae325ddd8ff5012020508c6e55e5966` e **640 entradas idênticas** (630 presentes e dez exclusões). Não houve correção de código nesta retomada. [Comparação independente](h1-ops/snapshot-verification.json).

Continuam aplicáveis os **22/22 cenários funcionais**, os 162 testes Java conferidos, o typecheck e a recuperação de seis bancos/55 tabelas/12 consultas de referência do [aceite H1](h1-review.md). Essas suítes não foram reexecutadas nesta retomada: a S07 executou o complemento operacional que faltava, sem mudanças nas fontes/configuração. R01 verificou os três hashes dos logs operacionais e preservou uma [cópia das sondas sem credenciais](h1-ops/checks.log).

## Limites e próximo aceite

O H1-01 local está encerrado. O timeout anterior de PostgreSQL e a retenção temporária do contêiner foram preservados como histórico; o sucesso atual não estabelece a causa da falha anterior nem comprova capacidade da VPS.

Permanecem gates de publicação: release versionado/checkout limpo, preflight de capacidade/porta/proxy/acesso/credenciais na VPS e smoke no endereço HTTPS publicado. Alertas recebidos por responsáveis, agendamentos de backup, anexos, políticas operacionais e demais requisitos de piloto/dados reais continuam nos cards correspondentes. Nenhum deploy, envio externo ou habilitação de checkout/créditos foi realizado.

R01 alterou apenas seus relatórios/evidências e o roadmap autorizado. A S07 executou os procedimentos operacionais e encerrou o chat com resultado aprovado localmente. Não há acompanhamento futuro agendado.
