# S07 — Infraestrutura, integração e aceite

## Objetivo

Implementar esta fatia do roadmap obedecendo às regras de [execução paralela](../README.md).

## Ownership exclusivo

Backend/Infra/, Backend/Gateway-Service/, compose.homolog.yml, Frontend/nginx.homolog.conf, Frontend/e2e/, Frontend/playwright.config.ts, scripts/production/, docs/production/, .github/. Também pode editar esta pasta de sprint. Outros caminhos exigem pedido de integração ao dono; não editar diretamente.

## Entregas

- [ ] Preparar scripts e documentação de backup/restauração, healthchecks, diagnóstico e publicação/reversão sem realizar deploy externo.
- [ ] Revisar Gateway/proxy preservando controles existentes e integrar endpoints novos somente após contratos dos respectivos donos.
- [ ] Preparar suíte de aceite com ambientes, portas, volumes e credenciais de teste isolados; não derrubar stack compartilhada ou volumes do usuário.
- [ ] Integrar Notification-Service no Compose após S06 fornecer contrato e build funcional, sem ativar envio real.
- [ ] Executar aceite integrado quando dependências estiverem prontas, registrar resultados e pendências honestamente. Não alterar domínio ou componentes para corrigir falhas de outro dono; registrar pedido no próprio integration.md.

## Dependências e início imediato

Preparação começa já. Aceite completo depende S01–S06. Não esperar ociosamente: entregar infraestrutura/testes e documentar dependências restantes.

## Critérios de aceite

Procedimentos de restauração exercitados em recursos descartáveis quando disponíveis; smoke tests e jornadas integradas com evidência. Ambiente indisponível é bloqueio registrado, não teste aprovado.

## Validação

Validação Compose, scripts e testes de backup/restore isolado; suíte E2E após contratos estabilizados; diagnóstico de isolamento e acesso.

## Entrega obrigatória

contracts.md antes de integrar; integration.md para pedidos externos; status.md com evidências. Não alegar envio real, publicação, execução de teste ou conclusão integrada sem evidência. Qualquer frontend segue padrão visual, baixo acoplamento, atomização e galeria conforme README.
