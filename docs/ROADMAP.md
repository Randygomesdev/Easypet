# Roadmap do Easypet

A primeira versão é para testes internos. As mudanças recuperadas das branches `develop` estão integradas ao monorepo. A H1 passou em 22 cenários integrados com serviços reais, Chromium e SMTP local, incluindo as 18 regressões da onda B, administração e jornada móvel. A restauração dos seis bancos após migration incompatível também passou. Os achados R01 anteriores permanecem corrigidos e revalidados. A publicação manual na VPS HOMOLOG do Setoriza segue pendente.

**Atualizado em 13/11/2026, após o aceite integrado H1 pela S07 e revalidação R01: 22/22 cenários, 162 testes Java e restauração dos seis bancos.** O objetivo da próxima versão é permitir que um parceiro cadastre, agende, atenda, receba e feche o dia sem intervenção técnica, com suporte capaz de investigar e resolver falhas. `[x]` indica a entrega validada no escopo e ambiente descritos; uma etapa parcial continua aberta até seu aceite completo. Testes com APIs simuladas, testes entre serviços reais e publicação são registrados separadamente.

**Recorte proposto:** iniciar com banho e tosa e poucos parceiros convidados. Confirmar esse segmento na etapa 0. A primeira operação real pode registrar pagamentos realizados no estabelecimento; checkout online e créditos continuam desabilitados até o aceite financeiro da etapa 7. App nativo, IA e gestão completa de clínica ou hospedagem não são requisitos desse primeiro lançamento.

**Versionamento:** entregas organizadas em commits na branch `codex/unificar-develop`, preservando os aceites históricos. [Organização e verificações](sprints/R01-review/versionamento.md). A publicação da aplicação na VPS continua pendente.

**Login social para homologação:** domínio definido como `https://easypet.innker.com.br`. Callback HTTPS cadastrado no cliente Google existente e nova chave preparada pelo usuário em arquivo local ignorado. Novo aceite S07/R01 aprovado: 28 cenários com provedor local, um cenário separado com Google desligado, 32 testes Java de Auth/Gateway e restauração dos seis bancos com 14 consultas. A flag Google permanece desligada por padrão. Instalação no ambiente, contas provisionadas, DNS/TLS e smoke Google real continuam pendentes. [Revisão e evidências](sprints/R01-review/google-oauth-review.md).

## 1. Entregas e pendências

A implementação está organizada em [specs e missions de sete sprints paralelas](sprints/README.md), com ownership de arquivos, contratos de integração e critérios de aceite. A primeira onda cobre fatias das etapas 0 a 5; pagamentos online, piloto e expansão preservam as dependências abaixo.

- [x] **P0 — Base da primeira versão interna.** Preparar o Compose, provisionar contas de teste, isolar dados entre parceiros e validar a stack em localhost.
- [x] **Unificação — Auditoria.** Comparar os oito repositórios com os commits importados e identificar mudanças que ficaram de fora.
- [x] **Unificação — Integração.** Recuperar as versões de Partner, Pet, Booking, Payment e Frontend no monorepo, preservando o P0.
- [x] **P0 — Aceite em localhost.** Percorrer cadastro, agenda e atendimento pelo navegador e corrigir os bloqueadores encontrados.
- [x] **P0 — Playwright.** Validar a jornada de reserva e atendimento e o isolamento entre parceiros em uma stack descartável.
- [x] **Graphify.** Gerar o índice local e validar o caminho da mudança de status da reserva.
- [x] **Administração — Rotas de consulta.** Reservar a lista e o detalhe de parceiros ao papel `ADMIN` e validar os três perfis na stack local.
- [ ] **Etapa 0 — Recorte e homologação — parcial.** Stack descartável validada; faltam decisões do piloto e publicação na VPS.
- [x] **Google — Diagnóstico no console.** Conferir cliente, status da chave, URLs, público e branding; cliente existente, sem revogação evidenciada. Consulta somente de leitura em 13/11/2026; login não testado.
- [x] **Google — Auth e interface.** S02/S01 implementaram flag própria, OIDC, conta prévia e lista de convidados, vínculo de identidade, troca descartável vinculada ao navegador e erros recuperáveis. 26 testes Auth, typecheck/lint e Chrome com APIs simuladas aprovados; preservadas restrições do piloto.
- [x] **Google — Callback e credencial local.** Callback HTTPS salvo e conferido no console; usuário gerou nova chave, ativa e presente em arquivo ignorado pelo Git com a lista de convidados. Sem login real validado; chave antiga permanece ativa até comprovar o uso da nova.
- [x] **Google — Novo aceite integrado S07.** 28 cenários aprovados com Google ligado e provedor local; cenário da flag desligada aprovado separadamente. Restauração de seis bancos, 55 tabelas e 14 consultas, incluindo vínculos Google. R01 conferiu 641 entradas do snapshot sem divergências e zero containers, volumes e redes dos projetos de teste após a limpeza. [Despacho e critérios](sprints/R01-review/google-oauth-dispatch.md).
- [x] **Homologação — Inspeção da VPS e configuração candidata.** VPS Setoriza-Homolog conferida por SSH: Nginx no host, porta 18080 livre e disco disponível. Candidatos Nginx e Compose validados sem ativação. Usuário definiu site público com login restrito a convidados. Capacidade ainda não aprovada: 4.895 MiB disponíveis, abaixo dos 6.144 MiB planejados. Faltam Node.js, DNS e TLS. [Preparação e roteiro](production/setoriza-homolog.md).
- [ ] **Google — Homologação publicada.** Configurar DNS/TLS, instalar segredos e lista de convidados no ambiente, provisionar contas com os papéis definidos, publicar release e concluir smoke Google real em `easypet.innker.com.br`; então desativar a chave antiga. DNS retornou NXDOMAIN nesta rodada. Não equivale à abertura pública do piloto.
- [ ] **Etapa 1 — Entrada e operação de balcão — parcial.** Recuperação, recepção, reserva, emissão/resgate de reivindicação e checklist de configuração validados; falta publicação.
- [ ] **Etapa 2 — Agenda e atendimento confiáveis — parcial.** Concorrência, retomada, chaves na UI, atribuição profissional e aviso de retirada validados; faltam regras de interrupção e autorização de adicionais.
- [ ] **Etapa 3 — Comunicação e autonomia do tutor — parcial.** Jornada móvel, preço/duração/política, SMTP local e administração validados. Faltam busca por nome de serviço/filtros combinados, preferências/canal externo, avisos de balcão e contato operacional de suporte.
- [ ] **Etapa 4 — Caixa, equipe e suporte — parcial.** Reversão no painel, três papéis de equipe, gestão de contas/estabelecimentos e negativas de contexto validados; faltam trilha administrativa completa e investigação de ocorrências.
- [ ] **Etapa 5 — Preparação para dados reais — parcial.** Artefato real de homologação, 22 jornadas e restauração após migration incompatível validados localmente; faltam arquivos/anexos externos, operação de alertas, privacidade e aceite na VPS.
- [ ] **Etapa 6 — Piloto e abertura da produção.** Operar com convidados, corrigir problemas e liberar acesso gradualmente.
- [ ] **Etapa 7 — Pagamentos online e créditos.** Habilitar checkout, pacotes, conciliação e estornos após validação completa.
- [ ] **Etapa 8 — Retenção e expansão.** Evoluir recorrência, importação, gestão comercial e novos segmentos.

As etapas 1 a 4 organizam a implementação funcional. A preparação técnica da etapa 5 deve começar junto da homologação, mas seu aceite é obrigatório antes de dados reais. O piloto depende dos aceites de 0 a 5; a abertura pública depende do piloto. A etapa 7 não bloqueia a produção com pagamento no estabelecimento, mas bloqueia qualquer uso real de checkout ou créditos.

Correspondência com o planejamento anterior: P1 passa à etapa 1; P2 divide-se entre 2, 5 e 7; P3 entre 3, 4 e 6; P4 entre 4 e 7. As referências antigas em documentos auxiliares permanecem como contexto histórico.

## 2. Histórico de entregas

### Unificação — recuperar o trabalho dos repositórios separados

**Estado:** código integrado na branch `codex/unificar-develop` e fluxo combinado validado pela API em `localhost:18082`. O roteiro completo de aceite está no P0. Auth, Gateway e Infra não têm mudanças funcionais adicionais nas branches remotas atuais.

- [x] Identificar as revisões de origem: Partner `bcaaa44` e `cf16577`, Pet `37b63f5`, Booking `8373d26`, Payment `c58c482` e Frontend `7e51ce9`.
- [x] Preservar a base local do P0 em um commit e trabalhar em uma branch de integração.
- [x] Integrar categorias, edição de serviços e vínculo com equipe no Partner. Integrar a origem dos registros no Pet com as regras de acesso do P0.
- [x] Integrar os estados e as regras de agenda do Booking. A migration V6 cria o índice sem apagar registros. Se houver duplicidades ativas, será preciso resolvê-las antes de aplicar a migration.
- [x] Recuperar checkout e carteira no Payment. O checkout fica desligado por padrão, e as rotas de concessão e estorno de crédito ficam bloqueadas até receberem autenticação entre serviços e proteção contra repetição.
- [x] Integrar as telas do Frontend. No piloto, o tutor pode consultar a vitrine, criar um pet e solicitar uma reserva sem passar pelo checkout.
- [x] Validar a jornada do tutor e do parceiro no navegador.
- [x] Mapear as permissões e rotas necessárias para testar a área administrativa. [Mapa de aceite administrativo](ACEITE-ADMIN.md).
- [x] Compilar os serviços e o frontend, aplicar migrations em banco de teste e validar pela API catálogo, serviço com equipe, pet, reserva, estados do atendimento e isolamento entre parceiros.

### P0 — Aceite da primeira versão em localhost

**Estado:** roteiro de tutor e parceiro aprovado em localhost. [Roteiro de testes e dados fictícios](../Backend/Infra/docs/homologacao.md#contas-e-dados-de-teste).

- [x] Subir a stack local, aplicar as 31 migrations em PostgreSQL 15 e verificar a saúde dos 13 containers.
- [x] Criar uma conta `PARTNER` pelo comando interativo e validar seu login pela API.
- [x] Criar e confirmar uma reserva pela API e verificar que outro parceiro não acessa a reserva, o prontuário ou a escala.
- [x] No navegador, cadastrar um estabelecimento, criar um serviço e vincular um colaborador com escala. Conferir a escala após recarregar.
- [x] Criar um pet e solicitar uma reserva pela área do tutor. Confirmar a reserva na agenda do parceiro, registrar o atendimento e conferir o prontuário e o status final.
- [x] Exibir o nome do estabelecimento e do serviço em Meus Agendamentos usando os dados públicos do catálogo, com validação no Chromium.
- [x] Corrigir a consulta de serviços no cadastro de colaboradores e reexecutar os três cenários do aceite local.

### P0 — Playwright na stack descartável

**Estado:** três cenários aprovados no Chromium em 13/11/2026. A suíte usa contas fictícias e testa a configuração inicial do estabelecimento pelo painel com uma conta dedicada. [Como executar localmente](../Frontend/e2e/README.md).

- [x] Subir um projeto Compose com porta, credenciais e volumes exclusivos e remover os recursos do teste ao terminar.
- [x] Validar no navegador o cadastro de pet, a reserva, a confirmação e o registro do atendimento.
- [x] Validar que o parceiro B não vê a reserva na agenda e que a API recusa leitura ou alteração da reserva e acesso ao prontuário.
- [x] Validar o cadastro de estabelecimento, serviço, colaborador e escala pelo painel, com o CEP externo simulado.

### Graphify — índice local e fluxo de status da reserva

**Estado:** índice local atualizado após as mudanças de cadastro e agenda. [Comandos e rastreamento do fluxo](GRAPHIFY.md).

- [x] Indexar Java, TypeScript, migrations SQL e as dependências de 13 serviços do Compose, excluindo arquivos de credenciais, bancos e saídas de build.
- [x] Rastrear a confirmação, o início e a conclusão do atendimento do frontend até a persistência e conferir o caminho HTTP no Nginx e no gateway.
- [x] Reexecutar os dois cenários do Playwright em Chromium para confirmar o fluxo e o isolamento entre parceiros.

### Administração — consulta de parceiros

**Estado:** consulta aprovada em localhost. Passaram nove testes do Partner Service e seis cenários Playwright, três deles sobre as permissões administrativas. [Mapa de aceite administrativo](ACEITE-ADMIN.md).

- [x] Exigir `ADMIN` em `GET /api/v1/admin/partners` e `GET /api/v1/admin/partners/{id}` no Partner Service.
- [x] Integrar a lista, a busca e o detalhe administrativo ao frontend. Restringir as leituras completas pelo Gateway e manter o catálogo separado.
- [x] Validar `ADMIN`, `PARTNER` e `CUSTOMER` no navegador e na API. Confirmar `401` sem JWT válido, `403` sem o papel exigido e ausência de dados fiscais no catálogo.

### P2 — Regras de transição já entregues

- [x] Aplicar a sequência `PENDING → CONFIRMED → IN_PROGRESS → COMPLETED` no Booking Service, recusar saltos e reaberturas e preservar o cancelamento de reservas pendentes ou confirmadas. [Regras e fluxo HTTP](GRAPHIFY.md#mudança-de-status-da-reserva).
- [x] Validar as transições com 26 testes do Booking Service e dois cenários Playwright na stack local, incluindo `400` para `PENDING → COMPLETED` com a reserva ainda pendente.

### S01–S07 — primeira entrega e revisão R01

**Histórico da primeira entrega em 13/11/2026:** a revisão conferiu 92 testes Java aprovados nas primeiras entregas, além das verificações de frontend dos workers. A S07 executou duas rodadas com 15 containers saudáveis: três dos quatro cenários de API passaram; o quarto validou reserva concorrente, repetição, baixa parcial e fechamento, mas falhou no retorno `401` onde o contrato exige `403`. Booking → Notification gerou uma confirmação na captura local. A restauração sintética dos seis bancos passou. Esses resultados não aprovam a jornada completa nem a publicação.

Situação histórica no aceite R01 anterior; evolução das integrações registrada na onda B abaixo.

| Sprint | Entregue e validado naquele aceite | Pendências naquele aceite |
| --- | --- | --- |
| [S01 — Design system](sprints/S01-design-system/status.md) | Primitivas, galeria, temas e acessibilidade; correção dos três mapas `NO_SHOW`, typecheck independente e build completo aprovados. Galeria e navegação existente aprovadas com serviços reais na S07. | Integrar e validar as novas rotas. |
| [S02 — Identidade](sprints/S02-identidade/status.md) | Registro por papel, reset de uso único, contas administrativas, convite/revogação e sessão no Auth; oito testes, incluindo PostgreSQL. | SMTP descartável, rotas web e aplicação da sessão/permissões nos demais serviços. |
| [S03 — Agenda](sprints/S03-agenda/status.md) | 40 testes, 14 com PostgreSQL; agenda, concorrência, replay, rollback, estados, outbox e balcão. R01-002 corrigido: resposta HTTP parcial, espera pela trava e ausência de registros parciais testadas; S07 confirmou 503 em 2.252 ms e retomada. | Chaves nos consumidores antigos, criação de balcão pela UI e aceite completo. |
| [S04 — Balcão](sprints/S04-balcao/status.md) | 29 testes locais (20 Partner e nove Pet); cadastro, vínculo e isolamento aprovados na API integrada. R01-001 corrigido e revalidado: leitura completa autorizada e projeção mínima consumida por Booking/Payment. | Reivindicação e operação com identidade de recepção. |
| [S05 — Caixa](sprints/S05-caixa/status.md) | 11 testes locais; baixa parcial, repetição, isolamento e fechamento aprovados na stack real. R01-003 revalidado: 401/403 corretos no Gateway e no Payment; consumidor da projeção Partner aprovado. | Rota do caixa, equipe e jornada pelo painel. |
| [S06 — Notificações](sprints/S06-notificacoes/status.md) | 16 testes H2/doubles; fila, revisão, deduplicação, retry e UNKNOWN. Duas confirmações LOCAL distintas validadas com Booking e PostgreSQL reais. | Administração com sessão real, falhas/reinício integrados, destinatário SMTP, preferências e canal externo. |
| [S07 — Infraestrutura](sprints/S07-infra-integracao/status.md) | Build completo, 16 containers saudáveis, 12/12 cenários Playwright em 28,2 s, regressões R01, duas confirmações LOCAL e diagnóstico em stack estável aprovados. Restauração sintética dos seis bancos validada anteriormente. | Novas jornadas integradas, recuperação representativa e aceite operacional. |

**Rodada de correções concluída em 13/11/2026:** S01, S03, S04, S05 e S07 encerraram as entregas. R01-001, R01-002 e R01-003 corrigidos e revalidados com o aceite integrado S07; `NO_SHOW` resolvido. R01 conferiu 18/18 hashes do snapshot S07, 104 testes Java aprovados em 18 relatórios e typecheck independente sem diagnósticos. O aceite de 12/12 cenários cobre esta rodada e a navegação existente; as novas jornadas e critérios de produção permanecem abertos. [Achados e fechamento](sprints/R01-review/findings.md) · [Parecer atual](sprints/R01-review/review.md) · [Parecer inicial preservado](sprints/R01-review/review-initial.md) · [Rodada de correções](sprints/R01-review/corrections-dispatch.md).

### Onda B — integrações do roadmap

**Aceite integrado em 13/11/2026:** S01–S06 concluíram as implementações e correções locais; a quarta rodada S07 aprovou **18/18 cenários em 2,6 minutos**, com Chromium, serviços reais, bancos novos e coletor SMTP restrito ao ambiente local. A restauração dos seis bancos conferiu os registros de referência das jornadas em 54 tabelas restauradas. Os 619 registros do snapshot permaneceram iguais e a limpeza dos dois projetos foi conferida. As rodadas anteriores tiveram 11/18, 16/18 e 16/18; seus erros e ajustes foram preservados.

| Integração | Evidência desta rodada | Limite do aceite |
| --- | --- | --- |
| S01/S02 — rotas e identidade | Recuperação pela UI/SMTP, tokens inválido/expirado/usado, JWT antigo recusado, login com nova senha, galeria e navegação. | Publicação e provedor externo pendentes. |
| S02/S04 — equipe e escala | Convite/aceite, gestão e vínculo pela UI; profissional só opera atribuições; reconvite não restaura atribuição revogada. | Aceite UI do convite exercitado com recepção; demais perfis aceitos também pela API. |
| S03/S04 — balcão e reivindicação | Recepção cadastra tutor/pet/reserva pela UI; atendimento com nomes reais; prova expirada/repetida/tutor incorreto recusados; tutor resgata pela UI e conserva pet/reserva históricos. | Emissão da prova testada pela API integrada e pela UI simulada; avisos a cadastros de balcão ainda pendentes. |
| S03/S05 — reserva e caixa | Perda de resposta/reload conserva a intenção; criação de cobrança, baixa parcial e fechamento pela UI; uma baixa, centavos e autor individual conferidos; recepção não fecha. | Carrinho legado validado com créditos simulados; checkout e créditos permanecem bloqueados. |
| S02/S06/S07 — comunicação | Destinatário correto por Auth/SMTP local, reenvio ADMIN, lembretes obsoletos, pronto para retirada, replay do ACK e reinício sem duplicação; tentativa ambígua fica UNKNOWN. | Envelhecimento controlado da fixture acelera a recuperação de SENDING; canal externo e preferências não aprovados. |
| S03/S04 — correções do aceite | R01-B01: Auth pausado devolve 503 no Booking. R01-B02: criação → edição de escala sem reload nem perda de interação. | Regressões locais e integradas aprovadas. |

R01 conferiu **140 testes Java em 22 relatórios, sem falhas ou skips**, e typecheck independente. Os 18 cenários incluem as 12 regressões anteriores. [Revisão e evidências](sprints/R01-review/wave-b-review.md) · [Achados e correções](sprints/R01-review/wave-b-findings.md) · [Escopo e responsáveis](sprints/R01-review/wave-b-dispatch.md).

## 3. Etapas de implementação

**H1 — aceite funcional e operacional local em 13/11/2026:** S01–S07 entregaram as implementações e a S07 concluiu a complementação H1-01, revalidada por R01. A S07 aprovou **22/22 cenários em 2,8 minutos**, usando o Compose, Dockerfile e Nginx reais de homologação; as fixtures acrescentam apenas isolamento e simulação de falhas/SMTP. R01 conferiu **162 testes Java em 26 relatórios**, typecheck independente e **640 entradas estáveis** entre os snapshots antes/depois e o checkout atual (630 arquivos presentes e dez exclusões). A recuperação restaurou **seis bancos, 55 tabelas e 12 consultas de referência**, após alteração incompatível simulada; os projetos foram removidos. As 18 regressões da onda B permanecem cobertas. [Parecer H1 e limites](sprints/R01-review/h1-review.md) · [Gates e missões](sprints/R01-review/pre-homolog-dispatch.md). Destino/domínio, acesso/credenciais da VPS e smoke no endereço publicado continuam gates da publicação efetiva. O código foi organizado em commits na branch de trabalho. Os resultados anteriores acima são históricos.

### Etapa 0 — Recorte do produto e homologação

**Gate H1-01 operacional concluído localmente:** Compose real sem overlays com 16 serviços saudáveis; diagnóstico `0 → 1 → 0`, alerta `0 → 2 → 0 → 1 → 0`, ADMIN provisionado pelo console com login/acesso administrativo e duplicidade/restrições recusadas. R01 conferiu hashes, logs e ausência de contêineres, volumes e redes dos quatro projetos descartáveis. As 640 entradas continuam iguais às do aceite funcional de 22/22 e da restauração. O timeout anterior não se repetiu; causa raiz indeterminada, sem alteração de código ou reinício global. [Fechamento operacional e evidências](sprints/R01-review/h1-ops-review.md). Código versionado na branch de trabalho; preflight da VPS e smoke HTTPS continuam pendentes.

**Estado:** parcial; artefato real validado localmente na H1, recorte e publicação pendentes. **Evidência:** [S07](sprints/S07-infra-integracao/status.md) e [R01 H1](sprints/R01-review/h1-review.md), 13/11/2026, 22/22 cenários em ambiente descartável. **Dependência:** decisões do piloto e aceite na VPS.

- [x] Preparar Dockerfiles, Compose, proxy, healthchecks e guia operacional e validar a stack em ambiente local descartável.
- [x] Aprovar o artefato real de homologação na H1, sem overlay que habilite funcionalidades ou rotas ausentes da publicação; preservar SMTP fictício, cadastro público/OAuth e checkout bloqueados.
- [x] Entregar provisionamento interativo de ADMIN fictício e validar o JAR na S02 e no Compose real H1 pela S07: login/sessão/acesso administrativo aprovados; duplicidade preserva a conta original; ambiente indevido, ausência de terminal e domínio não fictício recusados.
- [x] Preparar manifesto de release, preflight e roteiro de publicação; comprovar recusa de checkout sujo. A execução do preflight na VPS continua pendente.
- [x] Organizar e versionar código, testes, contratos e evidências S01–S07/H1 em commits por domínio na branch `codex/unificar-develop`, preservando o conteúdo validado. [Registro do versionamento](sprints/R01-review/versionamento.md).
- [ ] Confirmar segmento, parceiros convidados e serviços incluídos no primeiro lançamento; proposta inicial: banho e tosa.
- [ ] Definir responsáveis pelo suporte e pela operação técnica, modelo inicial de cobrança do EasyPet e critérios de sucesso do piloto.
- [ ] Conferir capacidade, porta e proxy da VPS HOMOLOG compartilhada com o Setoriza.
- [ ] Configurar domínio, acesso interno e credenciais próprias do ambiente.
- [ ] Atualizar o checkout com `git pull --ff-only` e subir a stack com Docker Compose conforme o [guia de homologação](../Backend/Infra/docs/homologacao.md).
- [ ] Conferir saúde dos serviços e repetir o roteiro com dados fictícios no endereço de homologação.

**Aceite:** ambiente acessível aos participantes internos, jornada de reserva e atendimento aprovada no endereço publicado e escopo do piloto documentado. Homologação com dados fictícios não equivale a autorização para iniciar operação com dados reais.

### Etapa 1 — Entrada e operação de balcão

**Estado:** parcial; recuperação, balcão, reivindicação e orientação de configuração validados até a H1. **Evidências:** [S02](sprints/S02-identidade/status.md), [S04](sprints/S04-balcao/status.md) e [S03](sprints/S03-agenda/status.md), 13/11/2026; testes locais e onda B com recuperação, equipe, cadastro/reserva de balcão e resgate de vínculo nos serviços reais. **Dependência:** escopo da etapa 0 e publicação na homologação.

- [x] Corrigir o cadastro de parceiro com endpoint dedicado e atribuição de papel pelo servidor; validar API e formulário isolado.
- [x] Guiar o parceiro até estabelecimento, serviços, colaboradores, vínculos e escalas pelo checklist; onboarding aprovado na H1 com serviços reais, e estados de falha/incompletude em navegador com APIs simuladas.
- [x] Implementar recuperação de senha e telas para link inválido, usado ou expirado, com digest, uso único e consumo concorrente validados no Auth; e-mail capturado em memória.
- [x] Conectar as rotas de recuperação e validar links no ambiente descartável com SMTP local e serviços reais; token inválido, expirado/usado, revogação e novo login aprovados na onda B.
- [x] Cadastrar e consultar clientes/pets de balcão com o titular `PARTNER`, conferindo vínculo e recusando acesso de outro estabelecimento na API real.
- [x] Criar a API de reserva de balcão com `receptionCustomerId` separado de `userId`; validar em PostgreSQL com Pet simulado.
- [x] Conectar a reserva à página de balcão e autorizar a identidade individual de recepção; cadastro de tutor/pet/reserva aprovado pela UI real na onda B.
- [x] Prevenir duplicidade normalizada por estabelecimento e manter cadastros sem conta como `UNCLAIMED`, sem vínculo automático por e-mail.
- [x] Implementar reivindicação com verificação presencial vinculada à conta Auth, expiração, uso único e preservação de pet/reserva históricos; emissão e resgate pela UI real aprovados na H1, com negativas preservadas.
- [x] Entregar estados de carregamento, vazio, erro, conflito e confirmação nas novas telas de clientes e atendimento, validados com APIs simuladas.
- [x] Completar estados de falha/retry, vazio e confirmação em estabelecimento, serviços e equipe; validar com APIs simuladas na S04 e preservar onboarding/edição de escala no integrado H1.

**Aceite:** um parceiro novo configura o negócio pela interface, recupera o acesso e cadastra tutor, pet e reserva sem usar API ou solicitar intervenção técnica. Reivindicar um cadastro não concede acesso a dados de outro tutor.

### Etapa 2 — Agenda e atendimento confiáveis

**Estado:** núcleo, equipe, retomada web e jornada móvel validados até a H1; regras de interrupção/adicionais ainda parciais. **Evidência:** [S03](sprints/S03-agenda/status.md), 47 testes, 21 com PostgreSQL; negativa de contexto/inatividade e jornada móvel na H1, além de disputa de vaga, replay, perda de resposta/reload, atribuição profissional e retomada após falhas de Pet/Auth aprovadas na onda B em 13/11/2026. **Dependência:** regras operacionais restantes e homologação publicada.

- [x] Implementar disponibilidade por duração, profissional, escala, ausências e capacidade, compartilhando as regras com a alocação.
- [x] Serializar alocações no banco e implementar idempotência da API; validar última vaga, sobreposição, hospedagem e chave repetida com concorrência real em PostgreSQL.
- [x] Enviar chave estável por intenção no catálogo e balcão; catálogo real conserva chave/corpo após resposta perdida e reload, com uma reserva/evento. Carrinho e retry do balcão também passaram em navegador com APIs simuladas; créditos continuam bloqueados.
- [x] Implementar reagendamento por tutor e parceiro com histórico e rollback que preserva a reserva original; validar backend e interface isolada.
- [x] Implementar falta, motivo de cancelamento e antecedência configurável; tratar `NO_SHOW` como terminal e corrigir os mapas de apresentação.
- [ ] Definir o tratamento de interrupção após início do atendimento.
- [x] Implementar bloqueios excepcionais que recusam conflito com reservas ocupantes, sem alterá-las silenciosamente.
- [x] Entregar checklist de entrada, observações e estado de pronto para retirada para banho e tosa, com histórico e evento; validar interface com API simulada.
- [x] Integrar aviso de retirada ao destinatário Auth e comprovar a mensagem correta no SMTP local, sem duplicação.
- [ ] Integrar autorização de adicionais ao atendimento e definir destinatário/autorização para avisos de balcão.
- [x] Corrigir R01-002: limitar chamadas HTTP e espera transacional; validar rollback sem registros parciais no PostgreSQL e retomada da agenda no aceite integrado S07.
- [x] Validar reserva, reagendamento, cancelamento, atendimento e isolamento no recorte implementado: H1 real inclui troca de contexto/IDs por ADMIN, parceiro e tutor; concorrência e rollback também cobertos nos 47 testes Booking (21 com PostgreSQL). Interrupção após início e autorização de adicionais continuam fora do aceite.

**Aceite:** duas tentativas simultâneas para a última vaga respeitam a capacidade; repetição de uma solicitação não cria outra reserva; reagendamento, cancelamento e falta deixam histórico consistente. O parceiro acompanha a entrada, execução e entrega do pet pela interface.

### Etapa 3 — Comunicação e autonomia do tutor

**Estado:** fila, destinatário, administração e jornada móvel validados até a H1; busca ampliada e envio externo pendentes. **Evidências:** [S06](sprints/S06-notificacoes/status.md), 29 testes H2/doubles, e [S07](sprints/S07-infra-integracao/status.md), SMTP local e PostgreSQL reais com falhas, reinícios e administração em 13/11/2026. **Dependência:** canal/provedor externo, preferências e contrato de destinatário de balcão.

- [x] Validar no Chromium móvel de 390 px, com serviços reais, busca de estabelecimento, escolha do serviço/pet/horário, acompanhamento, cancelamento e reagendamento.
- [ ] Completar busca por nome de serviço ativo e combinação de texto/categoria; a busca atual aceita nome do estabelecimento ou cidade, com categoria como alternativa.
- [x] Implementar outbox e fila persistente para confirmação, reagendamento, cancelamento, lembrete e serviço pronto; validar os eventos e a invalidação de mensagens obsoletas em testes isolados.
- [x] Validar o percurso Booking → Notification → captura LOCAL com PostgreSQL real, registrando uma confirmação sem duplicidade na consulta final.
- [x] Resolver destinatário Auth por contrato interno autenticado e validar confirmação, reagendamento, cancelamento e retirada no SMTP local; lembretes antigos ficam obsoletos.
- [ ] Integrar preferências e canal externo; cadastros de balcão dependem de contrato próprio de destinatário.
- [ ] Definir canal inicial e provedor: e-mail transacional e/ou WhatsApp; configurar credenciais e modelos necessários por ambiente.
- [x] Registrar tentativas, falhas e resultado incerto `UNKNOWN`, deduplicar eventos e permitir retry/reenvio auditado; validar em H2 com Auth, Booking e transporte simulados.
- [x] Conectar a tela administrativa e validar consulta/reenvio com ADMIN real, falha SMTP, replay do ACK e reinícios. SENDING ambíguo vira UNKNOWN e não permite reenvio automático; sessão revogada e Auth indisponível recusados.
- [x] Exibir preço, duração e política vigente de cancelamento antes da reserva e aprovar a jornada móvel na H1.
- [x] Entregar página de suporte com URL HTTPS configurável e mensagens de falha/ausência de vagas; validar interface e retry nas verificações locais dos responsáveis.
- [ ] Definir e configurar contato real e responsável pelo suporte; a interface não inventa contato quando a configuração está ausente.
- [x] Restringir destinatários SMTP ao domínio fictício e expor diagnóstico agregado da fila sem dados pessoais; 29 testes Notification e regressões integradas de SMTP/replay/reinício aprovados.

**Aceite:** o tutor conclui a jornada em tela de celular; os eventos geram mensagens para o destinatário correto; falha de envio é visível e recuperável, sem desfazer uma reserva válida. Reagendamento cancela lembretes do horário anterior.

### Etapa 4 — Caixa, acessos da equipe e suporte administrativo

**Estado:** caixa/reversão, equipe, administração de contas/estabelecimentos e autorização transversal aprovados até a H1; auditoria administrativa completa e suporte pendentes. **Evidências:** [S05](sprints/S05-caixa/status.md), 13 testes com PostgreSQL e HTTP real; [S02](sprints/S02-identidade/status.md), 20 testes; [S04](sprints/S04-balcao/status.md) e [S07](sprints/S07-infra-integracao/status.md), 48 testes locais Partner/Pet e jornada de caixa/equipe/administração pela UI real em 13/11/2026. Sessão, permissões, autoria individual e 401/403 foram conferidos no Gateway e diretamente nos serviços. **Dependência:** administração ampliada e processo de suporte.

- [x] Implementar cobrança vinculada à reserva, adicionais, descontos, recebimentos parciais e saldo em centavos; validar replay, concorrência e isolamento no ledger.
- [x] Implementar fechamento diário e reversão com motivo/autor, mantendo dia fechado imutável e serviço concluído separado de recebimento; validar backend e baixa/fechamento na stack real.
- [x] Entregar tela de caixa e extrato com estados e repetição da mesma tentativa, validada no navegador móvel com API simulada.
- [x] Corrigir R01-003: devolver 403 JSON para papel autenticado recusado e preservar 401 para JWT ausente/inválido; validar em Tomcat real com cobrança persistida e no aceite integrado S07 pelo Gateway e diretamente no Payment.
- [x] Conectar `/partner/caixa` e aprovar criação de cobrança, recebimento parcial, retomada após perda de resposta/reload e fechamento no painel; autoria, saldo e ausência de duplicação conferidos.
- [x] Aprovar reversão pela UI de gestor antes do fechamento na H1, preservando recebimento original, motivo e autoria e recusando perfis não autorizados; imutabilidade do dia fechado e concorrência cobertas nos testes Payment.
- [x] Criar identidade de equipe no Auth com papéis de gestor, recepção e profissional, vínculo por estabelecimento e matriz de permissões; validar assinatura separada e isolamento.
- [x] Implementar convite, aceite, revogação e versão de sessão no Auth, rejeitando o JWT anterior na consulta de sessão; validar com PostgreSQL.
- [x] Aplicar sessão e permissões no Gateway e serviços operacionais; testar reset, inativação e revogação nas rotas protegidas, inclusive chamadas diretas, e 503 recuperável com Auth pausado. Profissional só acessa reservas atribuídas; recepção não fecha caixa.
- [x] Integrar gestão de equipe e vínculo com profissional da escala pela UI; reconvite da mesma conta exige nova atribuição explícita.
- [x] Aprovar convite e aceite pela UI dos três papéis de equipe na H1, com sessão e permissões reais.
- [x] Entregar busca, paginação e detalhe administrativo de clientes de balcão; validar isolamento na API integrada. Entregar API de contas CUSTOMER e ativação/desativação restrita a ADMIN, validada no Auth.
- [x] Integrar confirmação de ativação/desativação de contas na interface e validar com APIs simuladas; API Auth real e revogação transversal aprovadas na onda B.
- [ ] Executar ativação/desativação pela própria tela administrativa contra Auth real no ambiente publicado.
- [x] Executar ativação/desativação CUSTOMER pela tela administrativa contra Auth real na H1 local; JWT antigo continua recusado após reativação e novo login funciona.
- [x] Consultar parceiros inativos e suspender/reativar estabelecimento pela UI real, com motivo/autor/histórico; inatividade bloqueia novas operações e preserva histórico e cancelamento permitido.
- [ ] Completar acompanhamento e investigação de reservas problemáticas pelo suporte.
- [x] Registrar histórico de mudanças da agenda e movimentos/correções de caixa com autoria e vínculo ao estabelecimento, validados nos testes dos respectivos serviços.
- [ ] Completar a trilha consultável de permissões e administração e a investigação de ocorrências pela interface; ativação/desativação CUSTOMER ainda não persiste o autor administrativo de cada mudança.
- [x] Corrigir R01-001: restringir leituras completas de Partner no próprio serviço e preservar consumidores com projeção mínima autenticada; validar autorização e Booking/Payment no aceite S07.
- [x] Validar na H1 as escritas administrativas de conta/estabelecimento e negativas em edição de serviço, consulta de escala sob contexto alheio e mudança de status de reserva, com tutor, parceiro, ADMIN e ausência de JWT nos cenários aplicáveis. A cobertura restante do [mapa administrativo](ACEITE-ADMIN.md) e o smoke publicado permanecem sujeitos aos respectivos cards abertos.

**Aceite:** o parceiro atende e fecha o caixa sem planilha auxiliar para os recebimentos do dia. Um profissional não acessa funções financeiras restritas. O suporte localiza e investiga uma ocorrência pela interface e pelo histórico, sem editar diretamente o banco.

### Etapa 5 — Preparação para dados reais

**Estado:** artefato real de homologação, 22 jornadas e recuperação após migration incompatível validados localmente na H1; aceite operacional na VPS pendente. **Evidência:** [S07](sprints/S07-infra-integracao/status.md), 13/11/2026, stack descartável e restauração de seis bancos PostgreSQL 15. **Dependência:** iniciar junto da etapa 0; concluir com as jornadas de 1 a 4 e o aceite operacional; correções R01 já revalidadas.

- [ ] Preparar ambiente de produção com domínio, HTTPS, credenciais próprias, serviços internos restritos e separação dos dados de homologação.
- [x] Entregar scripts de backup com manifesto e integridade, incluindo os seis bancos; recusar destino existente e dump adulterado em ensaio descartável.
- [x] Restaurar dados sintéticos nos seis bancos em ambiente isolado, verificar uma tabela por banco e remover os recursos do ensaio.
- [ ] Agendar backups, incluir arquivos/anexos e definir retenção, perda de dados tolerável e prazo de recuperação.
- [x] Demonstrar recuperação nos seis bancos com dados das jornadas aprovadas: tutor/pet, estabelecimento, cadastro de balcão reivindicado, reservas, cobrança/recebimento/reversão/autoria, outbox com ACK e Notification; H1 restaurou 55 tabelas e conferiu 12 consultas de referência.
- [ ] Incluir arquivos/anexos externos e exercitar a recuperação completa na configuração publicada, com responsáveis e objetivos de recuperação definidos.
- [x] Validar healthchecks, identificação de requisições e restrições do ingresso Nginx/Gateway, mantendo a publicação de testes em loopback.
- [x] Validar `diagnose.mjs` em stack estável no aceite S07 anterior à H1.
- [x] Concluir a limpeza dos quatro ensaios operacionais H1, inclusive o contêiner Dead anterior: zero contêineres, volumes e redes, conferidos por S07 e leitura independente R01; credenciais temporárias removidas.
- [x] Revalidar diagnóstico no Compose H1 real sem overlays, com 16 serviços: saudável, Notification parada e recuperada, códigos `0 → 1 → 0`.
- [x] Revalidar alerta local: saudável, limiar excedido por fixture sintética, recuperação, endpoint indisponível e recuperação; códigos `0 → 2 → 0 → 1 → 0`. Recebimento pelo operador permanece no card seguinte.
- [x] Revalidar provisionamento ADMIN no console da stack H1 e acesso pelo ingresso HTTP; duplicidade, senha recusada, ausência de terminal, perfil e domínio indevidos tratados conforme contrato. [Parecer operacional R01](sprints/R01-review/h1-ops-review.md).
- [ ] Completar alertas recebidos pelo responsável e correlação entre serviços.
- [x] Documentar publicação, migrations, reversão de versão e operação dos scripts em [Operação](production/operacao.md).
- [x] Exercitar recuperação após migration incompatível simulada no banco Booking: parar escritores, conferir dumps e restaurar os seis bancos em volumes novos, preservando as 12 consultas de referência. Ensaio local H1; operação na VPS ainda pendente.
- [ ] Definir acesso e compartilhamento de dados de tutor e pet, termos e privacidade, retenção e processo de solicitações de exportação e exclusão, com revisão apropriada antes da abertura pública.
- [x] Conferir 104 testes Java locais e aprovar os 12 cenários integrados da rodada R01, incluindo navegador existente, administração, ingresso, balcão, agenda/caixa, três regressões e duas confirmações LOCAL.
- [x] Aprovar as novas jornadas em stack descartável: recuperação/equipe com SMTP local, caixa no painel, reivindicação e administração de Notification; 18/18 cenários na onda B.
- [x] Aprovar o recorte H1 no artefato real de homologação: 22/22 cenários, 162 testes Java conferidos e typecheck independente; administração, jornada móvel e reversão de caixa incluídas.
- [x] Validar limite de requisições no ingresso real com rajada funcional e headers de IP forjados: 22 de 24 tentativas recusadas com 429 e recuperação após reposição. Esse teste não mede capacidade da VPS.
- [ ] Validar carga compatível com o piloto e repetir o aceite na configuração publicada.
- [ ] Definir responsável e canal de suporte, classificação de incidentes e condição para interromper novas reservas em caso de falha grave.

**Aceite:** restauração demonstrada, alertas recebidos pelo responsável, procedimento de incidente exercitado e jornadas críticas aprovadas na configuração de publicação. Nenhum bloqueador conhecido de acesso indevido, perda de dados ou inconsistência de reservas/recebimentos permanece aberto.

### Etapa 6 — Piloto com convidados e abertura da produção

**Estado:** pendente. **Dependência:** aceites de 0 a 5.

- [ ] Selecionar poucos parceiros e tutores convidados; documentar quantidade, duração e metas do piloto antes de iniciar.
- [ ] Acompanhar dias completos de operação: cadastrar, reservar, reagendar, atender, receber e fechar caixa.
- [ ] Medir reservas concluídas, faltas, falhas de notificação, divergências de caixa e chamados que exigem intervenção técnica.
- [ ] Registrar feedback e problemas com responsável, prioridade e evidência de correção; repetir o aceite dos fluxos afetados.
- [ ] Confirmar que os parceiros conseguem operar autonomamente e que o suporte resolve ocorrências pelo processo definido.
- [ ] Revisar critérios de saída, capacidade e suporte e liberar novos parceiros gradualmente.

**Aceite do piloto:** metas definidas no início atingidas, dias completos acompanhados e nenhum bloqueador crítico aberto. Problemas menores têm tratamento acordado e não comprometem dados, agenda ou recebimentos.

**Aceite da abertura pública:** evidências do piloto registradas, checklist da etapa 5 aprovado para produção e responsáveis definidos para acompanhar a expansão. Checkout e créditos permanecem desabilitados até a etapa 7.

### Etapa 7 — Pagamentos online, pacotes e créditos

**Estado:** código recuperado, mas checkout desligado por padrão e concessão/estorno de crédito bloqueados no ambiente interno. **Dependência:** etapas 2, 4 e 5; ativação real após o aceite do piloto e desta etapa.

- [ ] Definir quem recebe o pagamento, taxas, comissões e necessidade de repasse ao parceiro; implementar repasse e sua conciliação se fizerem parte do modelo escolhido.
- [ ] Calcular preços, descontos e total no servidor a partir do catálogo; rejeitar valores manipulados pelo cliente.
- [ ] Validar checkout Mercado Pago em sandbox, incluindo aprovação, pendência, rejeição e expiração.
- [ ] Autenticar notificações do provedor e comunicações internas; conferir transação, valor e destinatário antes de liberar o que foi comprado.
- [ ] Processar notificações e solicitações repetidas sem duplicar cobrança, pacote ou crédito; tratar eventos fora de ordem e falhas temporárias.
- [ ] Entregar pacotes com validade, saldo e extrato de consumo; garantir que reserva malsucedida não deixe crédito debitado e cancelamento aplique a regra de devolução definida.
- [ ] Implementar conciliação, cancelamentos, estornos totais/parciais e tratamento de contestações; impedir que o retorno do navegador seja usado como prova de pagamento.
- [ ] Entregar relatórios que separem valor agendado, serviço concluído, recebimento, taxas, estornos e créditos consumidos.
- [ ] Cobrir pagamento e créditos com testes de integração, incluindo repetição, concorrência, indisponibilidade e recuperação.
- [ ] Habilitar gradualmente em produção, com monitoramento e procedimento de suspensão de novas compras em caso de falha.

**Aceite:** cada recebimento fica conciliado com a compra; pagamento confirmado libera exatamente o direito adquirido; repetição não duplica créditos; falhas de reserva e estornos mantêm saldo e extrato consistentes. Os cenários são aprovados antes de remover os bloqueios existentes.

### Etapa 8 — Retenção, gestão comercial e expansão

**Estado:** backlog após estabilização. **Dependência:** evidências do piloto; pacotes dependem da etapa 7.

- [ ] Adicionar agendamento recorrente, lista de espera e lembretes de retorno, vacinação e pacote próximo do fim.
- [ ] Importar clientes e pets de planilha com prévia, validação, identificação de duplicidades e relatório de erros.
- [ ] Adicionar fotos de entrada/saída e histórico do serviço com acesso controlado, se confirmada a demanda do segmento.
- [ ] Evoluir comissões, despesas, contas a pagar/receber e indicadores de ocupação, retorno e rentabilidade.
- [ ] Priorizar estoque, PDV e emissão fiscal ou integrações se o objetivo passar a ser substituir o sistema de gestão do estabelecimento.
- [ ] Expandir clínica com documentos, autorizações e fluxos clínicos específicos; expandir hospedagem com acomodações, check-in/check-out e cuidados diários. Definir aceite próprio antes de oferecer cada segmento.
- [ ] Avaliar app nativo, fidelidade avançada e IA conforme demanda e métricas, sem bloquear a versão web inicial.

**Aceite:** cada evolução tem problema validado com parceiros, indicador de resultado e escopo próprio; funcionalidades de novos segmentos passam por piloto específico.

## 4. Regra de acompanhamento

Uma tarefa só recebe `[x]` com implementação e validação registradas. Para cada etapa, registrar data, ambiente, evidência de aceite e pendências remanescentes. A existência de tela ou código não equivale a recurso habilitado em produção. Este planejamento não altera o status dos testes históricos nem afirma que a publicação já ocorreu.

## 5. Referências de mercado

Referências consultadas em 13/11/2026 para orientar prioridades; não são requisitos de paridade integral:

- [SimplesVet](https://simples.vet/): agenda recorrente, checklist, pacotes, comunicação e operação financeira.
- [Petlove — agendamento pelo aplicativo](https://atendimento.petlove.com.br/hc/pt-br/articles/35615843630235-Agendamento-pelo-aplicativo-da-Petlove): autonomia do tutor para agendar, reagendar e cancelar.
- [VetSoft — funcionalidades](https://www.vetsoft.com.br/funcionalidades): migração de dados como facilitador de adoção.
