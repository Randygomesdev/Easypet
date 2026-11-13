# Status S07

Em 13/11/2026, a S07 concluiu o aceite integrado da R01 e da onda B em stack descartável, incluindo a restauração dos seis bancos PostgreSQL. A H1 valida os arquivos de publicação com as mudanças posteriores.

## Login Google — 13/11/2026

- O Compose real usa `GOOGLE_AUTH_ENABLED` (padrão `false`) para o Auth, o ingresso e o build do frontend. O Nginx e o Gateway liberam somente autorização, callback e troca pelos métodos do [contrato S07](contracts.md#google-oauth). Os valores de credenciais e a lista de contas passam somente ao Auth. O ingresso não aceita cabeçalhos externos de encaminhamento para definir o callback.
- Maven offline aprovou 6 testes Gateway. O Playwright aprovou o cenário com a flag desligada na imagem real, com saída `0`, botão oculto, retorno do SPA ao login e `404` nos três endpoints. Projeto `easypet-e2e-914f23fdfa`, log em `%TEMP%/easypet-google-oauth-disabled.log`.
- A primeira tentativa com Google ligado, projeto `easypet-e2e-69c0617165`, compilou as imagens e parou antes das jornadas porque `payment-db` ficou `unhealthy`. A causa permanece indeterminada. Também houve mudanças de fontes durante a rodada. O runner removeu os recursos e preservou os [snapshots](google-oauth-run1-before.json). A rodada seguinte usa os arquivos finais e inicia os bancos antes do restante da stack.
- A segunda tentativa, `easypet-e2e-35adf1c140`, passou no diagnóstico, nos 22 cenários H1, no login CUSTOMER e no cancelamento pelo navegador. As quatro verificações de callback restantes pararam na duplicação do header `Referrer-Policy` entre Auth e Nginx. O Nginx passou a emitir um único valor `no-referrer`. Os contratos de sessão e o cenário de expiração real foram preservados.
- O callback HTTPS foi salvo no console Google e a R01 registrou nova credencial ativa preparada localmente. A instalação da configuração e das contas no ambiente, DNS, TLS e a jornada Google no endereço publicado ainda estão pendentes. O aceite local usa provedor simulado e nenhuma credencial Google real.

### Aceite integrado OAuth

`E2E_WAVE_B=1 E2E_H1=1 E2E_GOOGLE_OAUTH=1 node e2e/run-local.mjs` saiu com código `0` no projeto `easypet-e2e-69c2502629`. Foram **28 cenários aprovados em 4,8 minutos**: 22 regressões H1 e seis OAuth. O cenário exclusivo da flag desligada ficou condicionalmente pulado e passou em execução separada. O diagnóstico confirmou saúde, portas de loopback, cinco sondas HTTP e polling de Notification.

O Chromium usou HTTPS em loopback e o mesmo frontend, Nginx, Gateway e Auth do artefato de homologação. O provedor simulado assinou o ID token e verificou PKCE. Passaram login CUSTOMER, acesso administrativo com papel ADMIN preservado, cancelamento, state adulterado, callback/troca em navegador alheio, origem forjada, replay, expiração real de dois minutos, revogação depois do callback e recusa de contas inativa, de equipe e sem cadastro.

O backup restaurou seis bancos, **55 tabelas e 14 consultas de referência** após a simulação de migration incompatível. As duas consultas novas conferiram os vínculos Google fictícios, papéis e versões de sessão do Auth. O projeto de restauração foi `easypet-restore-9e2af5097c12be27`. O inventário por projeto confirmou zero containers, volumes, redes e imagens nos quatro ensaios e na restauração. O diretório temporário de dumps foi removido.

O mesmo HEAD `67d8db9175fe7cced3806ba81d8a883728f1eace` e as mesmas 641 entradas coincidiram nos snapshots [antes](google-oauth-run3-before.json), [depois](google-oauth-run3-after.json) e no checkout conferido. São 638 arquivos presentes e três exclusões. [Evidência estruturada](google-oauth-acceptance.json).

## H1 — artefato de homologação interna

- O Compose de publicação constrói `Frontend/Dockerfile`, com as flags da onda B e URL de suporte opcional. O Nginx real libera sessão, recuperação, equipe e Notification por caminhos e métodos explícitos. O coletor SMTP aceita somente `example.test`; a captura HTTP fica no loopback do container e o Compose real publica apenas o frontend. A fixture de SMTP acrescenta porta efêmera e simulação de falhas no projeto descartável.
- O Nginx aceita a origem do cliente por cabeçalho dedicado apenas de um IP de proxy configurado. O Gateway confere o segredo exclusivo do ingresso antes de usar esse IP no limitador, com fallback para o endereço da conexão. Maven offline aprovou cinco testes do Gateway, incluindo origens distintas e rejeição de cabeçalhos forjados.
- `docker compose config` confirmou 16 serviços, frontend como única porta publicada em loopback e rede de e-mail interna. O primeiro build integrado encontrou um tipo transitório da S04. A checagem TypeScript passou no checkout após a atualização. [Integração](integration.md#h1--bloqueios-da-primeira-build-integrada)
- O manifesto detectou checkout sujo, com código `2` na geração de diagnóstico e recusa da verificação com código `1`. Preflight de leitura, comandos de backup, alerta local, recuperação e roteiro de smoke estão no [guia operacional](../../production/operacao.md). Destino, HTTPS e restrição de acesso dependem do operador do ambiente, e o release ainda precisa ser versionado.
- Aceite H1 local aprovado com o artefato real de publicação. A verificação do release versionado e o smoke no endereço de homologação continuam pendentes.

### Primeira rodada H1

O projeto `easypet-e2e-653b78a2e5` compilou o frontend de publicação e aprovou **18 de 22 cenários em 3,1 minutos**. Passaram a gestão de contas, mudança de situação auditável de estabelecimento, negativas de escrita, onboarding com checklist, Auth pausado e SMTP com reinício, replay e estado `UNKNOWN`. A rajada local usou 24 POSTs inválidos de recuperação em grupos de 8 concorrentes, com IP forjado em cada requisição. Registrou 20 respostas `429` em 93 ms e retomou `400` após recarga do limite. O ensaio é uma sonda funcional do limitador em loopback.

Quatro falhas foram identificadas nas fixtures: seletor legado de busca no catálogo, papel `searchbox` no celular, ambiguidade do seletor do código de conta e a projeção interna passou a incluir `active`. A asserção continua exigindo exatamente os campos operacionais, inclusive `active: true`. As fontes de S03/S04 mudaram durante o build, identificadas nos snapshots [antes](h1-run1-before.json) e [depois](h1-run1-after.json). O runner encerrou com código `1`, removeu os recursos descartáveis e aguarda aprovação da suíte para restaurar os seis bancos.

### Aceite H1 final

`E2E_WAVE_B=1 E2E_H1=1 node e2e/run-local.mjs`, sem filtros, no projeto `easypet-e2e-7b39dda479`. O runner saiu com código `0`. **22 de 22 cenários passaram em 2,8 minutos**. O build usou `Frontend/Dockerfile`, o Nginx de publicação e o Compose real. A configuração descartável acrescentou portas e credenciais isoladas, falha de Pet e simulação SMTP.

| Evidência | Resultado |
| --- | --- |
| Regressões da onda B | As 18 passaram, incluindo Booking direto com `503` durante pausa do Auth, revogação, recuperação SMTP, replay do ACK e `UNKNOWN`. |
| Navegador móvel | Busca de estabelecimento, preço e duração, regra antes da confirmação, reserva, reagendamento e cancelamento reais a 390 px. |
| Administração e onboarding | Desativação/reativação de conta, JWT antigo recusado, situação de estabelecimento com motivo e ator, negativas de escrita e checklist baseado no cadastro, serviço, profissional e escala persistidos. |
| Equipe, vínculo e caixa | Convites dos três perfis aceitos pela UI. Código de vinculação emitido e resgatado na UI, com testes de expiração, conta incorreta e reutilização. Baixa idempotente, reversão pelo gestor com motivo e ator, negativas por papel e estabelecimento e fechamento pela UI. |
| Limitação no ingresso | 24 POSTs inválidos com cabeçalhos forjados, concorrência 8, duração de 104 ms e 22 respostas `429`. Retomada em `400` após recarga do limite. Sonda em loopback, sem medida de capacidade da VPS. |
| Incidente e restauração | Backup com seis dumps e hashes SHA-256. A origem descartável recebeu uma alteração incompatível em `bookings.reception_customer_id`. O destino novo `easypet-restore-503394f857220b96` recuperou os seis bancos pré-migration e conferiu as 12 consultas de referência, inclusive reserva de balcão, baixa e reversão. |

Foram restauradas 55 tabelas, sendo Auth 4, Pet 8, Partner 17, Booking 8, Payment 11 e Notification 7. A comparação com o checkout atual confirmou o mesmo HEAD e 640 entradas idênticas nos snapshots [inicial](h1-run2-before.json) e [final](h1-run2-after.json), com 630 arquivos presentes e 10 exclusões. Docker confirmou zero containers, volumes e redes dos dois projetos e o diretório temporário de dumps foi removido. Log em `%TEMP%/easypet-h1-run2.log`.

O ADMIN do Playwright foi semeado por SQL. O provisionador interativo foi exercitado pela [S02](../S02-identidade/status.md). O ensaio cobre PostgreSQL com dados fictícios. Operador, destino, domínio, confiança no proxy da VPS, acesso restrito e release versionado ainda precisam de verificação antes da publicação. O preflight local e o [smoke no endereço publicado](../../production/operacao.md#smoke-no-endereço-publicado) estão documentados. O SMTP é interno e a restauração cobre referências de anexos, enquanto os objetos externos dependem do armazenamento que vier a ser operado.

### Revalidação H1

A comparação atual com os dois manifestos H1 confirmou o mesmo HEAD `ceba61cc4ae325ddd8ff5012020508c6e55e5966` e as 640 entradas sem alterações, incluindo as 10 exclusões. A rodada aprovada de 22 cenários e a restauração dos seis bancos continuam aplicáveis.

Na validação operacional focada, a subida do Compose de publicação sem overlays atingiu o limite de saúde do PostgreSQL em volumes novos. A tentativa serial também atingiu o limite no primeiro banco, `auth-db`. Os logs do PostgreSQL chegaram à fase pós-bootstrap, e o healthcheck TCP recebeu `connection refused` antes da abertura da porta. O Docker respondeu às consultas e apresentou espaço disponível no filesystem. As fontes, a imagem PostgreSQL e a configuração de saúde conferem com a rodada aprovada. O ponto de espera ocorreu antes da inicialização de Auth, Gateway e Notification. Logs locais em `%TEMP%/easypet-h1-ops-d23b9fe1/smoke.log` e `%TEMP%/easypet-h1-ops-f03c6b1a/smoke.log`.

Naquela rodada, os caminhos positivo e de falha de `diagnose.mjs` e `alert-local.mjs` e o provisionamento de ADMIN pelo console da stack H1 ficaram pendentes. Uma tentativa diagnóstica com volumes temporários em memória foi interrompida durante a exportação das imagens, antes de criar containers. A causa da lentidão do Docker/PostgreSQL permanece indeterminada.

O projeto paralelo `easypet-h1-ops-d23b9fe1` foi limpo. O daemon reteve temporariamente o container `easypet-h1-ops-f03c6b1a-auth-db-1` em estado `Dead`, com o volume `easypet-h1-ops-f03c6b1a_auth-data` e a rede `easypet-h1-ops-f03c6b1a_default`. A remoção direta retornou `removal ... is already in progress`. Na retomada, a leitura por labels confirmou que os três recursos já tinham sido removidos, assim como os recursos dos outros projetos descartáveis.

### Fechamento operacional H1-01

O projeto `easypet-h1-ops-resume-49d24eb7` subiu os 16 serviços saudáveis com o Compose real, sem overlays, em volumes novos. O PostgreSQL concluiu o pós-bootstrap e aceitou TCP. O timeout anterior não foi reproduzido. A causa anterior segue indeterminada e não houve mudança nas fontes, reinício global ou intervenção em outras cargas.

| Verificação | Resultado |
| --- | --- |
| Diagnóstico em saúde, Notification parada e saúde restabelecida | Códigos `0 → 1 → 0`. Em saúde, conferiu portas, serviços, cinco sondas HTTP, ID de requisição e fila SMTP com polling ativo. |
| Alerta local, limiar, endpoint indisponível e recuperação | Fila saudável `0`. Entrega sintética `FAILED` elevou `failedLastHour` e `unroutableLastHour` a 1 com limite 0, saída `2`. Remoção da fixture retornou `0`. Notification parada retornou `1`, com `0` após a recuperação. |
| Provisionador ADMIN no console e acesso pelo ingresso | Provisionamento `0`. Login, sessão ADMIN e consulta administrativa devolveram `200`; acesso anônimo `401`. Tentativa com o mesmo e-mail em maiúsculas, papel CUSTOMER e senha diferente foi recusada com saída `1`. A conta original conservou ID, nome, papel e senha. O login com a senha da tentativa recusada devolveu `401`. |
| Restrições do provisionador | Execução sem terminal, sem perfil `homolog` e com domínio fora de `example.test` recusadas, cada uma com código `1`. A conferência SQL devolveu somente contagem, sem ler o hash da senha no console. |

Os [snapshots antes](h1-ops-resume-before.json) e [depois](h1-ops-resume-after.json) têm o mesmo HEAD e as mesmas 640 entradas do aceite funcional de 22 cenários e da restauração de seis bancos. O `compose down` saiu com código `0`. O inventário dos quatro projetos operacionais confirmou zero containers, volumes, redes e imagens, e o arquivo temporário de credenciais fictícias foi removido. [Evidência estruturada, comandos, códigos e hashes dos logs](h1-operational-acceptance.json). Release versionado, preflight na VPS e smoke no endereço publicado seguem pendentes.

## Entregas

- `Backend/Gateway-Service/src/main/resources/application.yml` e `JwtGlobalFilter.java`: rotas de balcão e administração, CORS para `Idempotency-Key`, autenticação dos caminhos de Partner e remoção de cabeçalhos de identidade do cliente nas rotas públicas de Auth. O serviço dono continua responsável por papel e escopo.
- `Frontend/nginx.homolog.conf` e `compose.homolog.yml`: ID de requisição e log de acesso sem URL ou query, liberação limitada ao caixa, bloqueios do piloto, healthcheck autenticado dos bancos e perfil opcional de Notification com transporte LOCAL.
- `scripts/production/{compose,database,diagnose}.mjs` e `docs/production/operacao.md`: backup com manifesto, ensaio isolado de recuperação, diagnóstico e roteiro de publicação/reversão. O [guia de homologação](../../../Backend/Infra/docs/homologacao.md) aponta para o procedimento.
- `Frontend/e2e/{run-local.mjs,compose.api.yml,ingress.spec.ts,pilot.spec.ts,admin-partners.spec.ts,README.md}`: porta alocada pelo Docker, execução integrada sem build da interface, regressões do proxy, isolamento de balcão, disputa de vaga, baixa e fechamento do caixa, acesso direto à galeria para ADMIN e verificação opcional da captura local.

## Evidências

| Verificação | Resultado |
| --- | --- |
| `docker compose -p easypet-s07-config -f compose.homolog.yml config --quiet`, com e sem `--profile notifications` | Passou. O perfil inclui 15 serviços no total. |
| `node --check` nos scripts S07 e `playwright test --list` | Passaram. Dez cenários descobertos. |
| `database.mjs backup` e `restore-drill` em PostgreSQL 15 descartável | Cinco bancos com dados sintéticos copiados e restaurados. O ensaio verificou tabelas em cada banco. Destino existente e dump adulterado recusados. Projetos descartáveis limpos. |
| Primeira tentativa de `node e2e/run-local.mjs` | Falhou na compilação do Auth em alteração concorrente. Gateway e frontend compilaram. |
| Segunda tentativa com `E2E_NOTIFICATIONS=1` | Auth, Gateway e Notification compilaram. Booking falhou por imports faltantes e frontend por mapas incompletos de `NO_SHOW`. As falhas precederam a subida da stack e o Playwright. |
| Smoke em projeto descartável Nginx + Gateway + Redis | Build do Gateway, `nginx -t`, healthchecks e cenário de ingresso Playwright passaram. Verificou ID de requisição, autenticação, rota do caixa e bloqueios de checkout e rotas internas. |
| Primeira rodada com `E2E_API_ONLY=1 E2E_NOTIFICATIONS=1` | Os 15 containers ficaram saudáveis e a única porta publicada foi a do Nginx em loopback. Três cenários passaram: administração, ingresso e balcão. O cenário de agenda e caixa confirmou concorrência, repetição da reserva, baixa parcial sem duplicidade e recusa do parceiro B. Falhou no contrato de autorização do caixa: tutor autenticado recebeu `401`, com `403` esperado. |
| Segunda rodada de API com Notification | Os 15 containers ficaram saudáveis. Três cenários passaram, inclusive a sonda do proxy com `Origin` da porta efêmera. As verificações de fechamento e saldo diário passaram. O cenário de caixa continuou reprovado pelo `401` divergente. O polling real Booking → Notification registrou uma confirmação em `notification_local_mail` para `notifications@example.test`, sem duplicidade na consulta final. |
| Backup e recuperação com Notification | O manifesto incluiu seis dumps. A restauração simultânea excedeu o tempo de inicialização do PostgreSQL. O script foi alterado para restaurar um banco por vez. A última execução restaurou o arquivo sintético em seis bancos, inclusive Notification, verificou uma tabela por banco e limpou os recursos com sucesso. |

## Pendências operacionais

- Validar a operação no ambiente de produção e no canal externo de e-mail. A homologação interna usa SMTP local com destinatários fictícios.
- Ensaiar a recuperação do armazenamento de anexos quando estiver disponível. Definir responsável por alertas e incidentes, política de retenção e objetivos de recuperação.

Contratos e bloqueios por dono em [contracts.md](contracts.md) e [integration.md](integration.md).

## Reteste R01

S01 corrigiu `NO_SHOW` e validou typecheck, build e galeria isolada. S04 validou 20 testes Partner e 9 Pet, incluindo HTTP real no Partner. S03 validou 40 testes Booking, incluindo PostgreSQL com a segunda transação esperando pela trava, `503` após cerca de 2,5 s e somente a segunda reserva persistida. S05 validou 11 testes Payment, incluindo Tomcat/PostgreSQL para a distinção 401/403 e migrou o consumidor da projeção. Essas evidências são dos donos. [S01](../S01-design-system/status.md), [S03](../S03-agenda/status.md), [S04](../S04-balcao/status.md), [S05](../S05-caixa/status.md).

O runner reconhece `E2E_R01=1` para habilitar as regressões de acesso direto e indisponibilidade do Pet no projeto descartável. `docker compose config --quiet`, `node --check` e a descoberta de 12 cenários Playwright passaram.

A primeira rodada integrada, `E2E_R01=1 E2E_NOTIFICATIONS=1 node e2e/run-local.mjs --reporter=list`, compilou o frontend completo, subiu os 16 containers e passou em sete cenários, incluindo reserva/atendimento no Chromium. `node scripts/production/diagnose.mjs --project easypet-e2e-4f0bbfc666 --env-file .env.homolog.example` passou na stack estável com variáveis fictícias. As sondas devolveram 204, 401, 404 e 404 conforme esperado. A captura LOCAL registrou uma confirmação. Quatro cenários de API ficaram bloqueados pelo `429` do login de teste. O cenário de galeria esperava o dashboard para uma conta ainda sem estabelecimento. A suíte passou a tentar novamente os logins de teste após `429` e usa a conta que já tem estabelecimento no teste da galeria.

### Resultado integrado

Segundo projeto `easypet-e2e-9ac58bebbb`, com o mesmo comando, Chromium e PostgreSQL 15. Os 16 containers ficaram saudáveis e os **12 cenários passaram em 28,2 s**. O Compose aplicou as migrations em volumes novos.

| Item | Resultado observado pela S07 |
| --- | --- |
| R01-001 | Partner direto na rede interna devolveu `401` a anônimo, `403` a CUSTOMER e parceiro alheio, e `200` a ADMIN nas leituras completas. O titular abriu o próprio detalhe. A projeção interna exigiu JWT e devolveu apenas os campos publicados. O ingresso respondeu `404` à rota interna. Booking criou reserva e Payment criou modelo de pacote com a projeção. A compra direta de pacote ficou bloqueada. |
| R01-002 | O Pet sintético deixou a requisição pendente. Booking devolveu `503` em 2.252 ms. A segunda requisição reservou a mesma vaga com a mesma chave. A espera efetiva pela trava e a ausência de registros parciais foram verificadas separadamente pelo teste PostgreSQL da S03. |
| R01-003 | Gateway e Payment direto devolveram `401` sem JWT ou com JWT inválido e `403` para tutor autenticado. O parceiro alheio recebeu `404`. Disputa de vaga, repetição de reserva, baixa parcial idempotente e fechamento com saldo diário passaram. |
| Frontend | O build executou TypeScript e Vite. Passaram configuração inicial do estabelecimento, reserva e atendimento, isolamento entre parceiros, administração e recarga direta da galeria com ADMIN. |
| Notification | Booking → outbox → Notification com PostgreSQL registrou duas confirmações distintas no transporte LOCAL. O teste verificou ausência de duplicidade na consulta final. |

Logs locais da execução: `%TEMP%/easypet-r01-f0051313.log` e `%TEMP%/easypet-r01-reteste-frontend.log`.

[HEAD e hashes dos arquivos de referência](r01-snapshot.txt).

## Onda B — 13/11/2026

Aceite integrado aprovado na quarta rodada. S01–S06 publicaram as entregas locais. Os 18 cenários passaram e os seis bancos foram restaurados em volumes novos, com os registros de referência conferidos. Os snapshots antes e depois da rodada final têm o mesmo HEAD e as mesmas 619 entradas.

- Gateway consulta sessão Auth em cada operação protegida da homologação, após o limitador, valida resposta `200` e encaminha o Bearer sem segredo de equipe. Auth valida sua própria rota de sessão. Os clientes de domínio usam o endereço direto do Auth.
- Overlay descartável publica as rotas da onda B, flags de build, SMTP de teste e segredos distintos para outbox, destinatário, reivindicação e projeção de pet. Inclui leitura de vínculos `GET /partners/me/staff/team-members`. SMTP aceita endereços `example.test`, rejeita destinatários configurados com `550` e pode reter a confirmação de DATA para simular interrupção.
- Suite ampliada com navegação real para recuperação, equipe, balcão, atendimento atribuído, caixa e vínculo do cadastro. Inclui revogação e indisponibilidade no Gateway e serviços diretos, perda de resposta e replay de reserva/caixa, Notification por SMTP e recuperação de seis bancos com consultas de referência. Nenhuma dessas jornadas foi declarada aprovada por descoberta.
- Evidências isoladas: três testes Maven do Gateway passaram. O coletor SMTP passou em duas portas efêmeras, com captura, rejeição de destinatário externo e rejeição controlada. `docker compose config --quiet` passou com os três arquivos de Compose e `node --check` passou nos scripts. Playwright descobriu 18 cenários, incluindo as 12 regressões R01.

### Primeira rodada

`E2E_WAVE_B=1 node e2e/run-local.mjs`, projeto `easypet-e2e-309716e13e`. Build completo passou. O Playwright executou 18 cenários, com 11 aprovados e 7 falhas. O Booking direto devolveu `500` com Auth pausado, em vez do `503` esperado. O pedido à S03 está em [integration.md](integration.md#onda-b). Os demais bloqueios observados foram `429` na recarga da galeria, edição antes de a escala terminar de carregar, criação de serviços esperada como `201` onde o controlador responde `200` e expiração sintética escrita em UTC em coluna de horário local. O runner removeu os recursos do projeto.

O Gateway ganhou rota de sessão com a política geral de limite, preservando o limite menor das rotas de login e recuperação. As fixtures usam `200` para criar serviços e ajustam a expiração do reset no fuso usado pelo Auth. A corrida na escala foi encaminhada à S04 como R01-B02. A regressão mantém o fluxo direto da criação do profissional para a edição de sua escala. O cenário de caixa cria a cobrança no painel antes de exercitar baixa e fechamento.

### Segunda rodada

O projeto `easypet-e2e-3d02748b29` aprovou 16 dos 18 cenários em 4,2 minutos. O Booking direto passou a devolver `503` com Auth pausado após a correção da S03. Galeria, edição da escala e Notification via SMTP passaram, incluindo reenvio administrativo, replay do ACK, reinício e entrega ambígua em `UNKNOWN`. Os snapshots anterior e posterior registraram o mesmo HEAD e os mesmos 619 hashes.

O reset chegou ao formulário válido. O seletor exato da fixture incluiu implicitamente o texto do asterisco obrigatório e não encontrou o campo. O aceite de convite pela recepção recebeu `429` na sequência de chamadas feitas pelo endereço compartilhado do Nginx. As fixtures agora localizam o campo de nova senha por seu prefixo e repetem formulários e chamadas de equipe somente após `429`, preservando a validação dos demais códigos. A restauração representativa da segunda rodada parou na consulta de referência da cobrança, pois o cenário de equipe parou antes de criá-la. O runner agora inicia a restauração depois da aprovação da suíte completa.

### Terceira rodada

O projeto `easypet-e2e-a3fcc375b8` aprovou 16 dos 18 cenários em 5,7 minutos. A troca de senha e o aceite do convite da recepção chegaram a `200`. A tentativa de reutilizar o link de recuperação e a leitura da lista de equipe receberam `429`. A espera limitada passou a cobrir as chamadas Auth da recuperação, as leituras de equipe pelo botão de recuperação da tela e a revogação pela interface. A suíte continua exigindo os códigos de token inválido, expirado e usado, e o `401` após revogação. O runner aguardou a aprovação dos cenários para iniciar a restauração.

### Aceite final

Projeto `easypet-e2e-d60c028996`, com `E2E_WAVE_B=1`, `E2E_NOTIFICATION_TRANSPORT=SMTP` e `node e2e/run-local.mjs` sem filtros. O Compose subiu em volumes novos, o Playwright aprovou **18 de 18 cenários em 2,6 minutos** e o runner saiu com código `0`. O Booking direto devolveu `503` com Auth pausado. Passaram recuperação SMTP com revogação da sessão anterior, convite e revogação de equipe, atendimento atribuído, vínculo do cadastro ao tutor, cobrança e baixa idempotente, fechamento do caixa, reenvio administrativo e recuperação da fila de Notification após reinício.

A restauração usou os dados sintéticos gerados nessa rodada. O runner parou os serviços que escrevem nos bancos, gerou seis dumps com manifesto SHA-256 e restaurou em sequência no projeto `easypet-restore-6e7b9b18c7f18509`. As consultas de leitura devolveram os mesmos registros antes e depois.

| Banco | Tabelas restauradas | Registros conferidos |
| --- | ---: | --- |
| Auth | 4 | Contas e acesso da recepção |
| Pet | 8 | Pet do tutor e pet de balcão com seu cadastro |
| Partner | 16 | Estabelecimento e cadastro de balcão vinculado |
| Booking | 8 | Reserva cancelada, reserva de balcão e evento com ACK |
| Payment | 11 | Cobrança, baixa de R$ 40,00 e operador |
| Notification | 7 | Evento e entregas vinculadas à reserva |

O ensaio restaurou 54 tabelas e executou 12 consultas de referência. Os dois projetos descartáveis ficaram com zero containers, volumes e redes. O inventário atual confere com os snapshots antes e depois do aceite, com o mesmo HEAD e 619 entradas, sendo 609 arquivos presentes e 10 exclusões registradas.

[Snapshot inicial](wave-b-run4-before.json), [snapshot final](wave-b-run4-after.json). Log local em `%TEMP%/easypet-wave-b-run4.log`.
