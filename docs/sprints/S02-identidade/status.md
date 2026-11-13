# Status S02

## Google OAuth — 13/11/2026

Implementação S02 validada localmente e disponível para o aceite integrado S07.

- Auth habilita Google por `GOOGLE_AUTH_ENABLED` e exige credenciais, origem, callback explícito e lista de e-mails elegíveis. Usa OIDC com state, nonce e PKCE. O cookie transitório é HttpOnly/SameSite=Lax, Secure em HTTPS, e seu ID muda após o callback. O código de troca fica no fragmento e vence em dois minutos, é associado à sessão que iniciou o fluxo e é consumido uma vez. JWT sai apenas no corpo JSON.
- V5 acrescenta `google_subject` e sua restrição de unicidade. Login requer conta prévia e elegível, associa o identificador estável do Google e revalida estado, papel e versão no exchange. Não cria contas Google no piloto nem promove papéis. O login por senha e as permissões de recuperação e equipe preservam os contratos anteriores.
- `LoginPage.tsx`, `LoginSuccessPage.tsx` e `auth.service.ts` usam a flag e a entrada de mesma origem da S01, apresentam recusa/cancelamento e limpam o fragmento antes de enviar a troca por JSON. O contexto verifica a sessão resultante normalmente.
- `mvn -o -B test` com Java 21 e PostgreSQL descartável passou com **26 testes**, incluindo seis OAuth com MockMvc, persistência real e um provedor OIDC local com token RSA assinado. Cobriu callback configurado, state/nonce/PKCE, assinatura/emissor/audiência inválidos, cancelamento, origem, corpo inválido, cookie/sessão ausente, expiração, replay, papéis, revogação entre callback e troca, conta não elegível e colisões de identidade. As 20 regressões Auth passaram no mesmo comando.
- ESLint S02 e TypeScript passaram. `node src/routes/google-oauth.browser.mjs` com Chrome passou nas duas builds do piloto, com APIs simuladas. Confirmou botão, fragmento, troca e navegação com flag ligada e bloqueios do piloto com flag desligada. O Vite manteve o aviso de tamanho do bundle.
- [Contrato](contracts.md#google-oauth--13112026) e [integrações](integration.md#google-oauth--13112026) registram o callback público, a operação de contas pré-provisionadas e a fixture local. O aceite pelo Gateway/Nginx fica com S07. O teste real no domínio exige DNS/HTTPS, credencial ativa, cadastro do callback e contas autorizadas.

## H1-02 — 13/11/2026

Implementação H1-02 validada localmente. Aceite do artefato de homologação em coordenação com S07.

- `Backend/Auth-Service/` provisiona `ADMIN` fictício via `ProvisionPilotUser` em `homolog`, com senha e confirmação em terminal. A inserção recusa duplicidade, inclusive e-mail legado com capitalização diferente, e preserva conta, papel e credenciais existentes.
- O perfil `homolog` usa métodos e rotas explícitos para login, sessão, recuperação, equipe e administração. Cadastro público e OAuth ficam bloqueados. O Auth valida flags, chave de equipe, origem web, URL Partner e configuração SMTP ao iniciar; os endpoints internos recusam acesso se sua credencial estiver ausente. O SMTP de homologação limita host e destinatário ao coletor e a `@example.test`. A resolução para Notification também aplica o domínio fictício nesse perfil.
- Login, registro, recuperação, reset, aceite de convite e equipe apresentam 429/503 com orientação de nova tentativa. Campos e confirmações continuam disponíveis após falha; a repetição de escrita exige outra ação. O painel de equipe conserva associação e revogação do contrato da onda B.
- `mvn -o -B package` com Java 21 e PostgreSQL 15 exclusivo em `S02_PG_URL` passou com **20 testes**, zero falhas, erros ou skips. Usou JavaMail com SMTP real em loopback. Cobriu duplicidade/elevação, configuração inválida, recusa de cadastro/OAuth em homologação, destinatário fictício, reset de uso único, sessão legada, revogação e indisponibilidade.
- JAR empacotado executado com `PropertiesLauncher` em terminal interativo, com schema e conta fictícios. Confirmados inserção `ADMIN`, estado ativo, versão inicial 0, hash BCrypt e saída sem senha. Testes de execução confirmaram recusa em `prod` sem `homolog` e em execução sem terminal. Banco e conta de teste removidos com o contêiner descartável.
- ESLint S02 com `--max-warnings 0` e TypeScript da aplicação com `--noEmit --incremental false` passaram. Chromium a 375 px, com rotas reais e APIs simuladas, aprovou 429/503 em login, recuperação, reset, aceite, convite e revogação. Conferiu valores preservados e ausência de nova escrita até reenvio explícito.
- [Configuração e operação](contracts.md#h1-02--homologação-interna-13112026) e [roteiro S07](integration.md#h1-02--13112026). O aceite integrado desta rodada ainda deve provar conta administrativa pelo procedimento, ativação/desativação pela tela e convite/aceite dos três perfis pela UI. Publicação na VPS e smoke no endereço publicado são etapas posteriores. A alteração de estado de CUSTOMER continua sem trilha persistida por mudança com o autor administrativo.

## Onda B — 13/11/2026

Estado: implementação S02 pronta para o aceite integrado da S07.

- O Auth verifica sessões legadas e de equipe no banco local e fornece escopo, permissões e `teamAccessId`. A consulta fica disponível no perfil de homologação sem habilitar as demais rotas S02. A equipe mantém assinatura privativa. Sessões invalidadas retornam 401 e indisponibilidade da verificação retorna 503.
- Auth expõe as rotas internas de destinatário de Notification e elegibilidade de tutor para reivindicação. Cada rota exige sua própria credencial de serviço. A elegibilidade retorna só o status e a resolução de destinatário retorna só o e-mail do tutor ativo.
- `AuthContext.tsx`, tipos e cliente Auth verificam a sessão com o bearer original. O contexto reage à invalidação do cliente compartilhado, mantém o estado recuperável após indisponibilidade e fornece a decisão para os guards S01. A tela de login usa `/painel` após autenticar.
- `Frontend/src/pages/partner/EquipePage.tsx` e `Frontend/src/features/team/` entregam listagem, convite, revogação e atribuição de profissional por seleção de conta e de nome na escala. Após recarga, o Partner devolve os vínculos persistidos, inclusive os que perderam acesso após revogação, para desvinculação explícita. S01 conectou a rota e a navegação.
- `mvn -o -B test` com Java 21 e `S02_PG_URL=jdbc:postgresql://127.0.0.1:15482/s02test`: 11 testes passaram. PostgreSQL 15 descartável, schema exclusivo e servidor SMTP de teste em loopback com JavaMail real. Cobriu links recebidos no e-mail fictício correto, uso único, concorrência, isolamento, revogação, sessão legada, projeção interna, segregação de chaves e falha fechada com indisponibilidade de banco injetada. Partner foi simulado no teste do módulo Auth. O contêiner foi encerrado.
- TypeScript completo da aplicação passou com `tsc --project Frontend/tsconfig.app.json --noEmit --incremental false`. `npm run build` passou com as flags da onda B e aviso do Vite para o tamanho do bundle principal. ESLint do escopo S02 passou com zero avisos. Chromium móvel (375 px) com as rotas reais da aplicação e APIs simuladas aprovou retry e invalidação de sessão, recusa de 202 mesmo com corpo válido, convite, revogação com retry, associação, recarga, desvinculação e login de equipe com recusa da rota de titular.
- [Contratos e exemplos](contracts.md#onda-b--contrato-de-consumo-publicado-em-13112026) e [integrações](integration.md#onda-b--13112026). Partner e Gateway já declaram a rota de listagem de vínculos usada na tela. O aceite integrado da S07 cobre ingresso, SMTP da stack, reivindicação e aplicação da sessão nos consumidores.

## Onda A — histórico de 13/11/2026

Estado da rodada: implementação independente validada.

### Entregas

- `Backend/Auth-Service/`: registro de tutor e parceiro com papel atribuído pelo servidor, recuperação com links de uso único e SMTP configurável, consulta paginada de contas `CUSTOMER` e ativação/desativação exclusivas de `ADMIN`.
- `Backend/Auth-Service/`: convite, aceite, listagem e revogação de acessos individuais por estabelecimento. O Auth consulta a titularidade no Partner Service. O JWT de equipe usa uma assinatura exclusiva do Auth. A versão de sessão invalida JWTs anteriores ao reset, à desativação e à revogação.
- `Backend/Auth-Service/src/main/resources/db/migration/V4__add_account_sessions_and_team_access.sql`: versão da sessão, digest dos tokens de recuperação e tabela de equipe com unicidade dos acessos ativos. Os tokens anteriores foram migrados para digest com a validade original.
- `Frontend/src/pages/auth/`: cadastro dedicado de parceiro com redirecionamento ao cadastro do estabelecimento, telas de recuperação e aceite de convite, além de tratamento de credenciais inválidas no formulário de login. As telas novas usam os componentes da S01. O cadastro de parceiro usa e-mail e senha. O login Google continua disponível na tela de login dos ambientes que o habilitam.
- `Frontend/src/services/auth.service.ts` e `Frontend/src/types/auth.types.ts`: clientes tipados para Auth, recuperação, aceite de convite e contas administrativas. As rotas operacionais da equipe dependem de autorização por estabelecimento.
- [Contratos publicados](contracts.md) e [pedidos de integração](integration.md) para S01, S03, S04, S05, S06 e S07.

### Evidências locais

- Auth: `mvn -o -B test` com Java 21 e `S02_PG_URL=jdbc:postgresql://127.0.0.1:15482/s02test`. Oito testes passaram em PostgreSQL 15 descartável. A suíte HTTP usou MockMvc, schema exclusivo por execução, SMTP capturado em memória e adaptador de Partner simulado. Cobriu atribuição de papel apesar de `role: "ADMIN"` no corpo, duplicidade, respostas de reset, consumo concorrente, administração paginada, isolamento, revogação, reinvitação e assinatura de equipe.
- PostgreSQL: Flyway aplicou V1 a V4 em schema novo. Uma verificação separada com `psql` executou V4 sobre uma conta e um token fictícios criados com V3 e conferiu o papel, a versão inicial, o digest e o prazo preservado.
- Frontend: ESLint da pasta `src/pages/auth`, de `src/services/auth.service.ts` e de `src/types/auth.types.ts` passou com `--max-warnings 0`. Vite gerou o bundle de produção. O build completo `npm run build` parou em três erros TypeScript de `NO_SHOW` em `AgendamentosTab.tsx` e `DashboardPage.tsx`, fora do escopo S02.
- Chromium em viewport móvel de 375 px, com roteamento de teste e respostas HTTP simuladas: erro 401 de login, solicitação de recuperação, link inválido/expirado/usado, confirmação de senha, aceite de convite e registro de parceiro com sessão e redirecionamento.

### Pendências da rodada

- S01 conecta as rotas web novas e exemplos da galeria. O uso de `TEAM_MEMBER` no painel depende dos guards e dos serviços de domínio.
- S07 integra Gateway, Nginx e Compose de aceite e executa o fluxo completo com SMTP descartável e Partner real. O transporte de e-mail é assíncrono após commit e depende da disponibilidade do SMTP.
- A consulta de sessão já rejeita JWTs revogados no Auth. O aceite da aplicação dessa decisão pelos demais serviços continua pendente, conforme [integrações](integration.md).
