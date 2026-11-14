# Status S04 — H2

14/11/2026. Catálogo, autorização de e-mail de balcão e trilha de contas implementados. Aceite integrado sob S07.

- Catálogo Partner aceita termo e categoria juntos, usa `EXISTS` para busca por serviço ativo, mantém paginação sem duplicação e exclui serviços inativos da projeção. Busca, projeção operacional e administração seguem caminhos distintos. A S01 controla os filtros da interface.
- A V21 persiste concessões/revogações de balcão com operador, canal e horário. A API interna exige credencial exclusiva, confere estabelecimento/cadastro e retorna apenas destinatário autorizado, ID da autorização e data. A tela de balcão registra confirmação presencial e exige nova consulta se a revisão ou o e-mail mudar. Essa escrita preserva a reivindicação e o vínculo de tutor da H1.
- A tela de contas da plataforma usa as operações publicadas pela S02 em `auth.service.ts` para registrar motivo e consultar histórico por tutor. Fluxo usa o ADMIN e a sessão existentes. A administração geral permanece com S01.

## Validação e slot

- Partner `gradlew.bat test --offline --no-daemon --max-workers=2`, perfil local H2, 36 testes e zero falhas. Cinco cenários H2 do catálogo/consentimento exercitam persistência via JPA, filtros cumulativos, literal `%`/`_`, paginação, serviços inativos, credencial, escopo, autorização/revogação e concorrência.
- Pet `gradlew.bat test --offline --no-daemon --max-workers=2 --rerun --tests '*ControllerTest' --tests '*PetAccessServiceTest' --tests '*AuthSessionClientTest'`, 17 testes de regressão aprovados.
- Chrome headless em 390 px, Vite local com respostas simuladas e perfil temporário, após liberação da S07. Aprovados motivo obrigatório, ativação/desativação, histórico vazio e paginado por tutor, autor, confirmação presencial, conflito de revisão e revogação por clique e teclado.
- ESLint dos arquivos S04, empacotamento Vite e diagnóstico TypeScript focado aprovados. Na última tentativa de `npm run build`, o TypeScript apontou mapas de estado sem `INTERRUPTED` em `Frontend/src/pages/admin/tabs/AgendamentosTab.tsx` e `Frontend/src/pages/partner/DashboardPage.tsx`. Reteste após a atualização dos respectivos donos.
- Slot PostgreSQL S04 concluído em 14/11/2026. PostgreSQL 15 descartável `easypet-s04-h2-pg-56244`, bind `127.0.0.1:56244`, dados em `tmpfs`. `gradlew.bat test --offline --no-daemon --max-workers=2 --rerun --tests '*CatalogAndReceptionNotificationTest'` com PostgreSQL, Flyway ativo e Hibernate `validate` passou com cinco testes. Consulta SQL confirmou 21 migrations aplicadas e os dois índices da V21. O primeiro inventário consultou durante a remoção automática após o stop. O reteste pelo nome exato confirmou ausência do container. Slot devolvido à S07 para passagem à S05.

## Dependências de aceite

- [Integração S01, S02, S06 e S07](h2-integration.md). Somente S07 roda o aceite integrado. Transporte autorizado local e ausência de vazamento após revogação ainda precisam de prova integrada com Notification. Publicação e envio externo seguem pendentes.
