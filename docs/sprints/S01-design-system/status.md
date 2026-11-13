# Status S01

## Google OAuth — 13/11/2026

Implementação S01 pronta para o aceite integrado da S07. [Contrato frontend](contracts.md#google-oauth--frontend-13112026) e [dependências](integration.md#google-oauth--13112026) publicados.

- `Frontend/src/config/env.ts` fornece flag padrão desligada e URL relativa fixa de início. `Frontend/src/App.tsx` libera o retorno somente com a flag. `Frontend/docs/architecture.md` documenta a configuração de build.
- Typecheck completo, `npm run build -- --outDir <temporário>` com `VITE_INTERNAL_PILOT=true`, `VITE_GOOGLE_AUTH_ENABLED=true` e `VITE_API_URL=/api/v1`, e ESLint dos caminhos S01 passaram. O Vite emitiu o aviso de tamanho do bundle principal.
- `EASYPET_S01_BROWSER_CHANNEL=chrome` e `node src/routes/google-oauth.browser.mjs` aprovaram dois builds de produção. Com a flag ausente, o login oculta o botão e o retorno redireciona a `/login` sem troca. Com a flag ligada, o botão inicia o caminho da mesma origem, o retorno usa `POST` JSON com `Origin`, remove o código do endereço, mostra falha em `401` e entra no painel em sucesso. Ambos preservaram cadastro público fechado e redirecionamentos de carrinho e retorno de pagamento. O ensaio usa APIs simuladas em loopback e bloqueia destinos externos. Login no provedor real e smoke no domínio publicado continuam no aceite coordenado.

## H1 — 13/11/2026

Implementação S01 pronta para o aceite local da S07 com o artefato real de homologação. [Contrato](contracts.md#h1--frontend-de-homologação-13112026), [integrações](integration.md#h1--13112026) e [roteiro móvel](h1-mobile-acceptance.md).

- `Frontend/src/pages/partner/DashboardPage.tsx` e `Frontend/src/features/onboarding/` exibem o checklist de titular. Consultam estabelecimento, serviços ativos, colaboradores vinculados e escala no contexto do estabelecimento, conforme S04. Dados ausentes ou inativos aparecem como pendência ou inatividade. Falhas de leitura ficam não verificadas e oferecem retry. A primeira entrada de titular sem estabelecimento passa pelo dashboard e oferece **Abrir cadastro**. Os indicadores continuam consultando o Booking e agora apresentam falha explícita se a leitura não puder ser confirmada.
- `Frontend/src/routes/InternalSupportPage.tsx`, `SessionBoundary.tsx`, `App.tsx` e `components/layout/` ligam `/suporte` ao menu e ao estado de sessão indisponível. A URL de build é opcional e só gera link externo se for HTTPS sem credenciais, query ou fragmento. Menu móvel com foco inicial, Escape, ciclo de Tab e devolução de foco. Fechar diálogo e navegar na paginação têm alvos de 44 px no mobile.
- Revisão do `api.ts` e contexto S02 manteve `401` para invalidar somente a credencial corrente, `403` preservando sessão e `429`/`503` propagados ao consumidor, sem retry de escrita. A verificação de sessão usa o cliente independente S02. O formulário S02 conserva o e-mail após `429` e repete mediante ação explícita.
- `tsc --project tsconfig.app.json --noEmit --incremental false`, `npm run build -- --outDir <diretório-temporário-exclusivo>` com as quatro flags do Dockerfile real e ESLint do escopo S01 com `--max-warnings 0` passaram. O Vite manteve o aviso sobre o tamanho do bundle principal. Dois erros transitórios da mudança concorrente de `partner.service.ts` em `ParceiroDetailPage.tsx` e `ParceirosPage.tsx` foram resolvidos no checkout pelo dono S04 antes da execução aprovada.
- `npm run test:design-system` passou duas vezes no Chrome local, com suporte vazio e com URL HTTPS fictícia. Usou APIs simuladas para comprovar progressão do checklist, URL de escala com `partnerId`, inatividade, `503` com retry, `429` sem repetição automática, rotas e menus da onda B, foco do menu, ausência de overflow a 360 px e regressões da galeria.
- Conferidos no código da S07 o `Frontend/Dockerfile` real com as flags da onda B, o argumento `VITE_INTERNAL_SUPPORT_URL` repassado por `HOMOLOG_SUPPORT_URL` e as rotas publicáveis no Nginx. A S07 executa Compose, confirma o comportamento na imagem e adapta a fixture inicial de onboarding ao dashboard. Publicação e smoke no endereço final seguem separados.

## Onda B — 13/11/2026

Implementação S01 pronta para o aceite integrado da S07. [Contratos](contracts.md#onda-b--frontend-publicado-em-13112026) e [integrações por dono](integration.md#onda-b--13112026).

- `Frontend/src/App.tsx`, `src/routes/` e `src/components/layout/` conectam recuperação, reset, convite, gestão de equipe, caixa, notificações e vinculação do cadastro. A navegação e o acesso direto aplicam as mesmas políticas a partir da sessão verificada. A entrada de equipe leva ao módulo que o vínculo pode usar. Titularidade, operações atribuídas e escopo do recurso são verificados pelos serviços.
- `Frontend/src/lib/api.ts` preserva o bearer explicitamente fornecido e invalida a sessão somente quando o `401` corresponde ao token ainda ativo. `403` e `503` conservam o usuário. A consulta de sessão da S02 tem cliente separado e oferece retry no guard quando indisponível.
- `Frontend/src/pages/design-system/` inclui padrões de recuperação, convite, vinculação, checklist de banho e tosa, recebimento parcial, retomada de lançamento e tentativas de notificação. Os exemplos usam dados fictícios.
- `npm run build -- --outDir <diretório-temporário-exclusivo>` passou com `VITE_WAVE_B_ENABLED=true`, `VITE_AUTH_RECOVERY_ENABLED=true`, `VITE_INTERNAL_PILOT=true` e `VITE_API_URL=/api/v1`. Incluiu `tsc -b`. A checagem separada `node node_modules/typescript/bin/tsc --project tsconfig.app.json --noEmit --incremental false` e o ESLint do escopo S01 passaram. Vite manteve o aviso de tamanho do bundle principal.
- `npm run test:design-system` passou no Chrome com APIs simuladas. Incluiu recuperação e reset expirado, convite e login de equipe, bloqueio de titularidade, recepção com cobrança e sem extrato, gestor com extrato, profissional limitado, prova enviada no corpo, consulta de contas, `PATCH` de desativação e reativação com bearer e atualização da lista, consulta de notificações, `401`, `403` e retry após `503`.

A consulta, desativação e reativação de contas usam a rota existente `/admin/clientes`, o componente S04 e a API S02. A disponibilidade das APIs depende do ambiente Auth. O aceite ponta a ponta, incluindo SMTP descartável, APIs reais e política de referrer dos links públicos, pertence à S07.

## Onda A e revisão R01 — histórico

Estado em 13/11/2026: implementação independente pronta e validada no navegador. Integração com serviços pendente.

## Entregas

- `Frontend/src/index.css` mantém as escalas e os temas existentes, inclui token semântico de erro e disponibiliza a paleta completa para a galeria.
- `Frontend/src/components/ui/` inclui botão, campos, select, badge, card, diálogo, tabela, paginação e estados. Os controles recebem props tipadas e usam os estilos, fontes e ícones do painel.
- `Frontend/src/pages/design-system/` reúne exemplos interativos e TSX, incluindo a busca de clientes da S04 e a composição do diálogo de motivo de falta da S03. `Frontend/src/App.tsx`, `routes/DesignSystemRoute.tsx`, `routes/ProtectedRoute.tsx` e `components/layout/` conectam a rota, a proteção e a navegação. Em build, a galeria exige papel `ADMIN`. Em desenvolvimento, aceita acesso direto.
- `Frontend/src/components/layout/Header.tsx` adota `EmptyState` no painel de notificações do layout existente. A S04 adotou as primitivas nas listas reais de clientes, preservando `/admin/clientes`. A S01 adicionou `/partner/clientes` e o item **Clientes** sob o guard `PARTNER`.
- `Frontend/docs/design-system.md` documenta tokens, inventário de componentes e composição. `Frontend/package.json` expõe o teste de navegador com as dependências existentes. Contratos publicados em [contracts.md](contracts.md) e pedidos externos em [integration.md](integration.md).

## Validação local

- `npm run test:design-system` com `EASYPET_S01_BROWSER_CHANNEL=chrome` passou. Cobriu acesso anônimo em desenvolvimento, recarga direta no preview do build, papéis `ADMIN`, `PARTNER` e `CUSTOMER`, redirecionamento de visitante, teclado, validação e descrição acessível de campos, seleção, diálogo, retorno de foco, paginação, recuperação de erro, snippets, temas, menu mobile e navegação nas duas listas de clientes com API simulada.
- Inspeção de capturas em desktop (1440 × 960) e mobile (360 × 800), em claro e escuro. Verificação de largura do conteúdo e cores semânticas no navegador.
- `node node_modules/eslint/bin/eslint.js src/App.tsx src/routes src/components src/pages/design-system --max-warnings 0` passou. `npm run lint` no frontend compartilhado registrou os mesmos 30 erros e 8 avisos do baseline da sprint, em arquivos fora da S01.
- `npm run build` passou após a implementação da galeria, com aviso do Vite sobre o tamanho do bundle principal. A revisão R01 reproduziu três erros `TS2741` após a introdução de `NO_SHOW` pela S03. A rodada de correção abaixo validou novamente o build completo.

## Correção R01

- `Frontend/src/pages/admin/tabs/AgendamentosTab.tsx` e `Frontend/src/pages/partner/DashboardPage.tsx` incluem `NO_SHOW` nos três mapas tipados. Usam o rótulo **Falta** da S03 e a cor de badge da agenda. O gráfico usa um tom rosa distinto de **Cancelado**. O estado permanece terminal e a correção se limita aos mapas de apresentação. Atribuição registrada em [integration.md](integration.md#desbloqueios-do-build-no-checkout-compartilhado).
- `node node_modules/typescript/bin/tsc --project tsconfig.app.json --noEmit` reproduziu os três erros antes da edição e passou depois. `npm run build -- --outDir <diretório-temporário-exclusivo>` passou, com aviso de tamanho do bundle. `npm run test:design-system` passou novamente no Chrome local. `git diff --check` passou nos caminhos da correção.
- Lint das duas telas conserva problemas anteriores. `AgendamentosTab.tsx` tem sete erros (`no-explicit-any`, `no-empty` e `set-state-in-effect`) e dois avisos de dependências de hooks. `DashboardPage.tsx` tem um aviso de dependências de hooks. S07 tem o aceite integrado e a atualização da imagem local.

## Pendências

- S07 executa o aceite integrado da galeria com autenticação real e das listas de clientes com Gateway, Nginx e serviços. O teste S01 exercitou apenas o frontend com sessão e respostas de teste.
- S02, S03, S05 e S06 têm integrações e exemplos ainda dependentes dos pontos publicados em [integration.md](integration.md#rotas-solicitadas).
