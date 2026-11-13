# R01 — Revisão independente das sprints

Modelo: gpt-6-astra. Esforço: high. Workers S01–S07 permanecem em gpt-6.1-sol/high.

## Missão

Acompanhar as sete sprints e revisar as entregas concretas, priorizando defeitos que possam causar acesso indevido, reservas conflitantes, inconsistência financeira ou falhas entre serviços. Ler README, roadmap, specs, contracts, integration e status das sprints. Código e testes são a evidência; não aprovar com base apenas no relato do implementador.

## Execução

1. Consultar os chats em ../threads.json com wait_threads, usando cursores e esperas de até 60 segundos. Começar pela inspeção dos contratos e código já disponível; acompanhar as entregas até cada worker concluir sua primeira entrega ou reportar bloqueio explícito. Não criar automação nem chats/subagentes.
2. Capturar o estado revisado (data, git HEAD, arquivos e hashes relevantes), pois o checkout está sendo modificado. Distinguir defeito confirmado, integração ainda em andamento e hipótese que exige teste. Revalidar achados se o arquivo mudar.
3. Priorizar S02/S04 (permissões), S03 (agenda), S05 (caixa), S06/S07 (integração), sem ignorar segurança das rotas S01.
4. Produzir findings.md incremental com ID, severidade P0–P3, sprint responsável, caminho/linha, cenário reproduzível, impacto, evidência, correção recomendada e estado aberto/corrigido/revalidado. Evitar sugestões genéricas ou acusações sem evidência.
5. Conferir testes existentes e executar apenas testes isolados que não disputem outputs ou recursos dos workers. Não iniciar Compose/suíte integrada: S07 é seu dono. Colocar cenários ainda não cobertos em test-gaps.md com resultado esperado; indisponibilidade de ambiente não equivale a aprovação.
6. Reexaminar correções e consolidar status.md e review.md por sprint: revisada, com bloqueadores ou não validada, com riscos residuais e dependências. Se uma sprint estiver bloqueada, revisar sua parte disponível e registrar a cobertura incompleta.

## Foco técnico obrigatório

- Permissões: validação efetiva no backend e serviços internos, isolamento por estabelecimento, troca de IDs, JWT adulterado/expirado, revogação, escalada de papel, dados mínimos, reivindicação de cliente/pet e acesso administrativo.
- Agenda: concorrência de intervalos e capacidade no banco, repetição de requisições, transações, reagendamento atômico, rollback, transições inválidas e eventos emitidos apenas para mudanças persistidas.
- Caixa: precisão monetária, validação de valores e vínculos, recebimento parcial, idempotência e corrida no fechamento, correções auditáveis, isolamento e distinção entre serviço concluído e recebimento. Checkout/créditos devem permanecer bloqueados.
- Integração: contratos compatíveis entre produtor/consumidor/UI, Gateway/proxy, autenticação interna, timeout/retry, eventos duplicados/fora de ordem, outbox, falhas parciais e migrations. Identificar explicitamente fluxos que funcionam apenas com mocks.
- Frontend: proteção de rotas não substitui autorização; preservar padrão visual, componentes reutilizáveis e baixo acoplamento, galeria sem expor dados reais.

## Limites de autoria

Pode ler todo o projeto e escrever apenas em docs/sprints/R01-review/. Não alterar código, migrations, dependências, arquivos de outros workers ou seus modelos. Não trocar branch, fazer reset/clean/stash, commit geral, deploy, cobrança ou envio real de mensagens. Não enviar mensagens a outros chats sem autorização humana explícita; registrar achados em arquivos compartilhados para consulta. Não imprimir segredos.

## Aceite da revisão

Relatório cobre a primeira entrega ou bloqueio explícito de cada S01–S07, com evidências e cenários críticos. Nenhum teste não executado é apresentado como aprovado. Distinguir conclusão da revisão de autorização de produção; bloqueadores abertos impedem parecer favorável nos fluxos afetados. Não prometer monitoramento futuro após encerrar este trabalho.
