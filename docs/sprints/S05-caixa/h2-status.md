# S05 — Status H2

14/11/2026. S05 implementada e validada localmente. Contrato Booking consumido e verificado contra o controlador e DTO da S03. Aceite entre serviços reais fica no slot integrado da S07.

## Entrega

- Payment `cashier/`, migration `V5__create_cashier_approved_extras.sql`, configuração e segurança. Validação de autorização pelo cliente HTTP interno, aplicação explícita com autoria, isolamento, limite e unicidade por aceite, replay sob a trava do caixa e projeção ADMIN somente leitura por par reserva/estabelecimento.
- Painel `features/cashier/`, `CaixaPage.tsx` e `cashier.service.ts`. Retira o valor manual, lista apenas aprovações ainda disponíveis, confirma valor antes da aplicação e conserva a intenção após perda de resposta. Cobranças históricas mantêm valores. Uma reserva interrompida pode ser escolhida para operação explícita.
- [Contratos](h2-contracts.md) e [integração](h2-integration.md). A S03 fornece a prova persistida. O Payment mapeia identificadores e datas e mantém autoria e identidade tutora de origem distintas.

## Validação e slot

- Gradle `--offline --no-daemon --max-workers=2 test` com JDK 21, sem Docker, compilou produção e testes. Sete testes independentes passaram, incluindo o contrato HTTP simulado do Booking e recusa de centavos fracionários. Os nove testes do ledger exigem `S05_TEST_DB_URL` e foram pulados nessa execução.
- TypeScript e ESLint direcionados ao caixa passaram. Chrome headless a 390 px, com Vite em porta exclusiva e APIs simuladas, confirmou opção recusada oculta, confirmação explícita, mesma chave e corpo após perda de resposta/reload e exibição do aceite presencial aplicado uma única vez.
- Slot da S05 iniciado após liberação escrita da S07. PostgreSQL 15 Alpine `easypet-s05-h2-pg-56245`, bind `127.0.0.1:56245`, `tmpfs`, com credencial fictícia efêmera.
- Suíte completa no slot: Gradle `--offline --no-daemon --max-workers=2 test --rerun`, JDK 21 e PostgreSQL 15.20. **16 testes passaram, nove com PostgreSQL, zero falhas ou skips**. Flyway aplicou V1–V5. Cobriu ausência de aceite, versão divergente, alteração de valor pelo cliente, valor incoerente/fracionário vindo do Booking, indisponibilidade, escopo alheio, replay concorrente, dia fechado, histórico legado, ADMIN revogado e projeção mínima. Booking, Partner e Auth usam doubles HTTP controlados.
- Slot concluído às 02:16 BRT. `docker stop` executado no container exclusivo com remoção automática. `docker ps -a` filtrado pelo nome exato confirmou ausência. Slot devolvido à S07.

## Handoff

- Gateway, Nginx e Compose no checkout já incluem as rotas H2 e a variável dedicada nos dois serviços. S01 já consome a projeção ADMIN no painel de ocorrências. A S07 verifica a integração, regressões H1, vínculo real do aceite presencial/digital e a restauração representativa.
- Compatibilidade: novas criações exigem `extrasCents: 0`. Cobranças históricas mantêm valores e recebimentos. A aplicação H2 fica bloqueada em cobrança antiga com adicional manual, para evitar dupla contabilização. O autor individual do registro presencial permanece distinto do tutor de origem.
