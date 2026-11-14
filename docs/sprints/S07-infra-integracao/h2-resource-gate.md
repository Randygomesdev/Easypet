# H2 — Recursos de validação local

**Estado inicial em 14/11/2026: Compose, Testcontainers e testes de navegador aguardam liberação da S07.** A rodada anterior teve timeout de Docker e navegador. Nesta verificação inicial o PowerShell local respondeu, Node.js informou `v24.14.0` e havia 52,36 GiB livres no volume C:. A consulta de processos visíveis na sessão não listou Docker Desktop, backend Docker ou WSL em execução.

A S07 vai verificar o CLI, o endpoint local, inventário de projetos e saúde do navegador separadamente com prazos limitados. Testes sem Docker podem avançar em paralelo. Qualquer liberação será explícita neste arquivo e indicará como reservar a vez de cada worker. Os recursos existentes ficam preservados e a VPS compartilhada fica fora do ensaio.

## Liberação de PostgreSQL descartável em 14/11/2026

O CLI e o daemon responderam a sondas de até 6–7 s no contexto `desktop-linux`, ambos na versão 29.8.1. `docker info` confirmou 12 CPUs, 15,56 GiB e cgroup v2. Compose 5.5.1 e PostgreSQL 15 Alpine em cache. A consulta WSL autorizada listou `docker-desktop` em execução; a sessão restrita retornou `Wsl/E_ACCESSDENIED`. A leitura de processos restrita não representa o estado do daemon. As stacks locais EasyPet de desenvolvimento, P0 e Setoriza permanecem preservadas. As sondas apenas leram metadados.

**Liberados testes Docker de um domínio por vez**, por ordem S02 → S03 → S04 → S05 → S06 → S07. A S07 coordena o slot pelo `h2-status.md`. **Slot atual: reservado à S07 em 14/11/2026, aguardando handoff de frontend e estabilização das fontes.** S02 registrou 34 testes, S03 registrou 49 com 23 em PostgreSQL, S04 registrou cinco testes focados em PostgreSQL e S05 registrou 16, com nove em PostgreSQL. A S07 confirmou a remoção dos quatro containers pelo nome exato. Se o Docker voltar a expirar, suspenda novas partidas e registre o bloqueio. [S02](../S02-identidade/h2-status.md#validação-e-slot) · [S03](../S03-agenda/h2-status.md#validação-e-slot) · [S04](../S04-balcao/h2-status.md#validação-e-slot) · [S05](../S05-caixa/h2-status.md#validação-e-slot).

## Liberação de navegador em 14/11/2026

Playwright abriu Chrome 157.0.8103.51 em modo headless com perfil temporário, leu o título da página sintética e encerrou em 1,4 s. O binário padrão do Playwright está ausente no cache da sessão restrita, portanto o runner local aceita `E2E_CHROMIUM_CHANNEL=chrome`. Liberadas sondas de navegador independentes com perfil descartável e dados fictícios. A suíte integrada continua no slot S07.

A S06 registrou cessão do próprio slot. Após a limpeza confirmada de S05, a fila avança direto para S07, sujeito ao handoff de integração dos domínios. [Status S06](../S06-notificacoes/h2-status.md#validação-e-slot).

## Encerramento da H2 local

O slot integrado S07 foi encerrado em 14/11/2026 após o aceite e o controle Google desligado. Todos os projetos H2 de aceite e restore ficaram com zero containers, volumes, redes e imagens. [Resultados S07](h2-status.md#resultado-do-reteste-integrado).
