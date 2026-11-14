# S07 — Status H2

14/11/2026. Aceite integrado H2 local aprovado, com 35 cenários no reteste, um cenário complementar com Google desligado, snapshot estável e restauração dos seis bancos. [Gate e fila](h2-resource-gate.md) · [Contratos](h2-contracts.md) · [Handoffs](h2-integration.md).

## Entregas

- Gateway, Nginx e Compose encaminham auditoria, investigação Booking/caixa, consentimento, preferências, suporte e central ADMIN nos caminhos dos donos. Compras, créditos, cadastro público e ingresso operacional interno permanecem fechados na entrada externa. O Compose passa as credenciais dedicadas somente aos serviços do contrato. O monitor operacional usa a porta privada do Notification e nenhuma aplicação recebe o socket Docker.
- `backup-scheduled.mjs` publica seis dumps com catálogo `pg_restore --list`, SHA-256, trava e retenção explícita. `operations-alerts.mjs` lê snapshot master e estado de backup, persiste alerta vencido e recuperação e repete o mesmo incidente após falha de transporte. Operação, unidades inativas e inventário de anexos no [guia de backup](../../production/backup-schedule.md).
- O runner `E2E_H2=1` exige H1, OAuth de fixture e snapshot. Os casos cobrem menu/ADMIN, auditoria, busca, aceite explícito, concorrência no caixa, interrupção, preferências, consentimento, privacidade dos chamados e recuperação de alerta. O ensaio de recuperação usa o wrapper agendável em diretório temporário e acrescenta consultas de referência H2. A fixture H1 preenche o motivo de conta e preserva a baixa parcial com adicionais manuais zerados conforme o contrato novo.

## Evidências independentes

| Verificação | Resultado |
| --- | --- |
| `node --test scripts/production/h2-operations.test.mjs` | 3/3 passaram com arquivos temporários e comandos PostgreSQL simulados. Cobre trava, falha de dump, sexto banco obrigatório, recuperação, retenção, adulteração, vencimento e replay do incidente. |
| Gateway `mvn -o -B test` | 6/6 passaram. Exercita filtros e limitador; validação dos novos caminhos no Nginx/Gateway depende do E2E. |
| `docker compose config` com valores sintéticos | 16 serviços e frontend como única porta publicada. Credenciais novas restritas a Booking/Payment, Partner/Notification e Notification. |
| Chrome local via Playwright | Sonda headless sintética aprovada. Descobertos 36 cenários, cinco novos da H2. Execução integrada pendente. |
| TypeScript da aplicação em 14/11/2026 | A checagem reproduziu três erros de `INTERRUPTED` em mapas de `AgendamentosTab.tsx` e `DashboardPage.tsx`. Ajustes sob os donos de frontend. |

## Escopo operacional

Entrega externa, agendamento, credenciais reais, RPO/RTO, anexos externos, recuperação na VPS e smoke publicado seguem fora da prova local.

### Pré-checagem da rodada integrada

14/11/2026, 02:39 BRT. Docker 29.8.1 respondeu e o inventário não encontrou contêineres de aceite ou de bancos H2 dos domínios. O comando `tsc --project tsconfig.app.json --noEmit --incremental false` ainda sai com código `2`. Diagnósticos `TS2741` em `Frontend/src/pages/admin/tabs/AgendamentosTab.tsx:56` e `Frontend/src/pages/partner/DashboardPage.tsx:30,39` por falta de `INTERRUPTED`. `BookingNotificationPreferences` existe, mas a busca no frontend ainda encontra somente a declaração do componente. A subida aguarda a correção e a liberação S01. Nenhum projeto de aceite foi criado nesta pré-checagem.

A S01 corrigiu os mapas, montou a preferência em `/suporte` para CUSTOMER e liberou o frontend com build aprovado. A repetição do TypeScript da aplicação saiu com `0`. O ensaio integrado começou no projeto `easypet-e2e-97ef91b815`, com flags H2, H1, onda B e OAuth de fixture, Chromium local, 16 serviços de publicação e snapshot inicial com 722 entradas. O cenário de preferência agora grava pela UI e verifica o valor após recarga. [Handoff S01](../S01-design-system/h2-status.md#handoff-para-s07--14112026) · [Snapshot inicial](h2-run1-before.json).

A primeira execução compilou as imagens e passou no diagnóstico. O trace de `h2-integration.spec.ts` registrou `401` sem sessão e `404` para POST em `/admin/identity-audit`, conforme o contrato. A fixture tentou interpretar o HTML do `404` de Nginx como JSON e parou antes dos chamados. O reteste verificará o status diretamente nos casos de bloqueio do Nginx. Os cenários H2 de menu, adicionais/interrupção, SMTP de balcão/preferência e incidente operacional passaram nessa execução.

A primeira execução terminou com 34 aprovados em 6,7 min, uma falha de fixture e um cenário exclusivo de OAuth desligado pulado por condição. A restauração não foi disparada. O mesmo HEAD ficou nos dois snapshots, com alteração concorrente em `Frontend/src/pages/design-system/design-system.browser.mjs`. O runner recusou o snapshot como estável. Corrigi os dois pontos que usavam parser JSON no `404` do ingresso. [Snapshot final da tentativa](h2-run1-after.json).

O inventário confirmou zero containers, volumes, redes e imagens do primeiro projeto. Log local `%TEMP%/easypet-h2-run1.log`, SHA-256 `2795d103eb443c0c33ef1504bcff62d19b0ac62cddd1e035a54d3a60456bf3b1`. O reteste integral sem filtros iniciou em `easypet-e2e-b7114dd3eb`, com 722 entradas na captura inicial. [Snapshot do reteste](h2-run2-before.json).

### Resultado do reteste integrado

O Playwright aprovou **35 cenários em 5,5 min**, sem falhas. O caso exclusivo de Google desligado foi pulado por condição. O runner encerrou com código `0`. Passaram as cinco jornadas H2, regressões H1 e master, Google com provedor local, negativas de papel e tenant e `503` no Booking direto com Auth pausado. A sonda do limitador obteve 22 respostas `429` em 24 requisições, concorrência 8, em 124 ms. A confirmação de balcão autorizada chegou ao SMTP local, e a confirmação após revogação ficou `SUPPRESSED`.

O wrapper agendável publicou **seis dumps** com `pg_restore --list` e manifesto SHA-256. H1 renomeou uma coluna de Booking na origem descartável para simular migration incompatível. A restauração no projeto `easypet-restore-a5669f0e6e194a1a`, em volumes novos, recuperou **61 tabelas e 20 consultas de referência**. As consultas conferiram vínculos Google, auditoria Auth, reserva interrompida, aceites digital e presencial, valor aplicado no caixa, consentimento revogado, preferência, chamado, incidente recuperado e registros legados.

| Banco | Tabelas |
| --- | ---: |
| Auth | 5 |
| Pet | 8 |
| Partner | 18 |
| Booking | 9 |
| Payment | 12 |
| Notification | 9 |

Antes e depois coincidem no HEAD `021d6dfb80d0e86606c52c588c15544159a237c2` e nas 722 entradas presentes. O inventário pós-execução mostrou zero containers, volumes, redes e imagens dos projetos de aceite e restauração. O backup temporário foi removido. Log `%TEMP%/easypet-h2-run2.log`, SHA-256 `4f6afd1ea06dfa810c24395f51838bebd8206ed7f6095bada7e6d9f38234eca1`. [Snapshot inicial](h2-run2-before.json) · [Snapshot final](h2-run2-after.json).

### Controle com Google desligado

O projeto `easypet-e2e-c4ff13fda8` compilou o artefato com a flag desligada e saiu com `0`. O cenário filtrado passou e confirmou botão oculto e `404` nas três rotas OAuth. O inventário encontrou zero containers, volumes, redes e imagens. Os quatro manifestos aprovados coincidem entre si e com os 722 hashes do checkout conferido. Log `%TEMP%/easypet-h2-google-disabled.log`, SHA-256 `6d345e83d1dd0efc7586103ea7b6d71f839b121f71b914425e58d04c5c0826c8`. [Snapshot inicial](h2-google-disabled-before.json) · [Snapshot final](h2-google-disabled-after.json).
