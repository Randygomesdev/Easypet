# R01 — Aceite integrado H1

Revisão de 13/11/2026. **Aceite funcional local H1 aprovado no recorte dos 22 cenários; complemento operacional H1-01 concluído na retomada.** [Fechamento operacional atual](h1-ops-review.md): diagnóstico, alerta local e ADMIN aprovados, quatro projetos limpos e fontes sem mudanças. As tentativas anteriores estão preservadas abaixo como histórico. Publicação na VPS e uso de dados reais continuam pendentes. HEAD `ceba61cc4ae325ddd8ff5012020508c6e55e5966`, com alterações locais identificadas por hash; esse HEAD sozinho não representa o artefato aceito.

## Evidência integrada

A S07 executou `E2E_WAVE_B=1 E2E_H1=1 node e2e/run-local.mjs`, sem filtros, no projeto `easypet-e2e-7b39dda479`: **22/22 cenários em 2,8 minutos**, saída 0. O build usa `Frontend/Dockerfile`, `Frontend/nginx.homolog.conf` e `compose.homolog.yml` reais. As fixtures acrescentam isolamento, falha de Pet e simulação SMTP; não habilitam rotas ou funcionalidades ausentes da publicação. A primeira rodada H1 (18/22) teve ajustes de seletores/expectativas e alterações concorrentes; foi substituída pelo aceite estável, preservado nos registros S07.

R01 leu o log, os cenários, os scripts de configuração/recuperação e os snapshots. Os 18 cenários da onda B permanecem incluídos. A H1 acrescenta administração de contas, administração de estabelecimentos/contextos, limite de ingresso e jornada móvel; amplia também emissão de reivindicação, reversão de caixa e convite/aceite dos três papéis pela UI.

- CUSTOMER: desativação/reativação pela UI contra Auth real, negativas de autenticação/papel, JWT antigo recusado mesmo após reativação e novo login aprovado.
- Estabelecimento: inativação/reativação com motivo e autor, histórico preservado, novas operações recusadas quando inativo. Serviço de outro parceiro, colaborador sob estabelecimento incorreto e reserva sob contexto incorreto recusados, inclusive para ADMIN conforme o contrato.
- Tutor em Chromium móvel de 390 px: busca por estabelecimento, preço/duração/política, pet/horário, reserva, acompanhamento, reagendamento e cancelamento; sem transbordamento horizontal no percurso testado.
- Caixa: reversão pelo gestor na UI antes do fechamento, recebimento original preservado, motivo/autor e negativas por perfil. Concorrência e imutabilidade do dia fechado têm cobertura adicional nos testes Payment.
- Ingresso: rajada funcional de 24 tentativas, com oito concorrentes e headers de IP forjados, produz 22 respostas 429; o fluxo recupera após reposição. Não é medição de capacidade da VPS.
- Recuperação: escritores parados, dumps íntegros, alteração incompatível simulada em `bookings.reception_customer_id`, restauração em volumes novos e **12 consultas de referência iguais nos seis bancos/55 tabelas**. Projeto `easypet-restore-503394f857220b96`. Referências de foto/exame não equivalem a backup dos objetos externos.

## Conferência independente R01

- **640 entradas idênticas** antes/depois da execução e no inventário atual: 630 arquivos presentes e dez exclusões rastreadas, sem arquivos novos no escopo. Snapshots abrangem fontes, configuração, build, e2e e operação; relatórios de testes são inventariados separadamente. [Snapshot atual](h1/source-snapshot.json) · [Comparação](h1/snapshot-verification.json).
- **162 testes Java em 26 relatórios**, sem falhas, erros ou skips: Auth 20, Booking 47, Gateway 5, Notification 29, Partner 31, Payment 13 e Pet 17. R01 conferiu XMLs e hashes; não reexecutou essas suítes dos workers. [Inventário dos relatórios](h1/test-report-summary.json).
- TypeScript da aplicação executado independentemente com `--noEmit --incremental false`, saída 0 e nenhum diagnóstico. [Resultado](h1/typecheck.json).
- Consulta Docker somente por leitura confirmou ausência de containers, volumes e redes dos projetos integrado e de restauração. [Evidência consolidada](h1/evidence.json).
- [Manifesto do log integrado](h1/integrated-log-manifest.json) · [Estados dos workers](h1-worker-observations.json) · [Relato e snapshots S07](../S07-infra-integracao/status.md).

## Entregas por responsável

| Responsável | Entrega H1 e nível de validação |
| --- | --- |
| S01 | Checklist de configuração com APIs S04, página de suporte configurável e navegação móvel/acessível. Onboarding real no integrado; estados e interações móveis com APIs simuladas. |
| S02 | Provisionador interativo ADMIN fictício, configuração restrita de homologação, domínio SMTP fictício, recuperação/429/503 sem perda de campos. JAR real em terminal/PostgreSQL ensaiado pela S02; o ADMIN dos 22 cenários foi semeado por SQL. |
| S03 | Jornada móvel e políticas exibidas, escrita administrativa vinculada ao contexto e restrição de novas reservas em estabelecimento inativo. 47 testes Booking e integrado H1. |
| S04 | Estados de configuração, edição contextual, inativação/reativação com histórico, gestão de CUSTOMER e emissão de reivindicação. 31 testes Partner, 17 Pet e integrado H1. Upload e remoção de serviço indisponíveis na homologação. |
| S05 | Reversão com motivo/autor, referência do fechamento, recuperação de falhas e caixa móvel. 13 testes Payment; reversão real pela UI no integrado. |
| S06 | SMTP limitado ao domínio fictício, diagnóstico agregado de fila sem dados pessoais e estados móveis de notificação. 29 testes e regressões integradas de SMTP, administração, replay e reinício. |
| S07 | Artefato real, manifesto/preflight e procedimentos operacionais, 22 cenários, recuperação após migration incompatível, snapshots estáveis e limpeza. Complemento operacional aprovado na retomada: diagnóstico/alerta, ADMIN no console e limpeza dos quatro projetos; histórico abaixo. |

## Complementação operacional — histórico anterior à retomada

A S07 retomou a H1 a pedido de R01 para comprovar `diagnose.mjs`, alerta local saudável/com falha e ADMIN pelo console no Compose real sem overlays. Duas tentativas ainda não chegaram às sondas: a primeira atingiu o limite de inicialização dos bancos; a segunda, sequencial, terminou com `auth-db` unhealthy. Isso não constitui aprovação dos comandos operacionais. A S07 encerrou a revalidação: PostgreSQL parou na fase pós-bootstrap e não abriu a porta TCP antes do limite. A causa permanece indeterminada; fontes, imagem e configuração de saúde coincidem com o aceite funcional. Os 22 cenários e a restauração anteriores permanecem como evidência separada. O provisionador continua validado no ensaio independente S02.

O projeto `easypet-h1-ops-d23b9fe1` foi limpo. O daemon reteve `easypet-h1-ops-f03c6b1a-auth-db-1` em estado `Dead`, o volume `easypet-h1-ops-f03c6b1a_auth-data` e a rede `easypet-h1-ops-f03c6b1a_default`; a remoção direta respondeu que já estava em andamento. R01 confirmou esses resíduos por leitura. Uma tentativa diagnóstica com volumes em memória foi interrompida na exportação das imagens, antes de criar containers; não constitui aceite. Nenhuma reinicialização global de Docker/host foi realizada nesta revisão.

**Orientação registrada naquela rodada, posteriormente cumprida pela S07:** após normalizar o Docker local, concluir apenas a limpeza desses recursos e executar os caminhos saudável/com falha de diagnóstico e alerta, além do provisionamento ADMIN no console da stack H1. Se os hashes mudarem, reavaliar as regressões afetadas. Naquele momento H1-01 permanecia aberto; o [parecer da retomada](h1-ops-review.md) registra seu fechamento local. A publicação continua pendente. [Manifestos dos logs adicionais](h1/operational-log-manifest.json) · [Estado final S07](../S07-infra-integracao/status.md#revalidação-h1).


## Pendências preservadas no roadmap

Não foi identificado novo defeito no recorte funcional exercitado. O gate operacional H1-01 foi concluído na retomada; as etapas 0–5 e os seguintes itens permanecem abertos:

1. **Publicação:** release versionado e checkout limpo; capacidade/porta/proxy da VPS compartilhada; domínio/HTTPS, confiança no ingresso, acesso restrito, credenciais próprias e operador; preflight na VPS e smoke com dados fictícios no endereço publicado. O validador recusa o checkout sujo atual. Nenhum deploy foi feito nesta revisão.
2. **Operação:** contato efetivo de suporte, destinatário/canal de alertas e resposta a incidentes; instalar agendamentos de backup, definir retenção/RPO/RTO, armazenamento e recuperação de anexos; medir carga compatível com o piloto. Scripts/templates não comprovam operação no servidor.
3. **Administração:** a mudança de estado CUSTOMER ainda não persiste cada autor administrativo. Trilha consultável de permissões/administração e investigação de reservas problemáticas continuam abertas.
4. **Produto:** busca por nome de serviço ativo e combinação texto/categoria; interrupção de atendimento iniciado; autorização de adicionais. Cobrança manual de extras não registra consentimento do tutor.
5. **Comunicação:** preferências, canal/provedor externo e contrato de destinatário/consentimento dos cadastros de balcão. SMTP local não autoriza envio real.
6. **Dados reais/piloto:** decisões do recorte, suporte, privacidade, retenção e critérios do piloto. Checkout e créditos permanecem bloqueados.

R01 alterou apenas documentação/evidências da revisão e o roadmap autorizado. A execução de Compose e dos testes integrados pertenceu à S07; não houve mudança de código, commit, deploy ou envio real por R01. Os aceites anteriores foram preservados em seus arquivos históricos.
