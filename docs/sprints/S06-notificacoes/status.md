# Status S06

## H1 — 13/11/2026

Implementação S06 pronta para o aceite H1 de S07. [Contrato de SMTP interno e diagnóstico](contracts.md#h1--homologação-interna-13112026) e [roteiro de smoke e alerta local](integration.md#h1--perfil-publicável-e-alerta-local) publicados.

- `SmtpEmailTransport` valida remetente e destinatário pelo domínio fictício exato configurado, padrão `example.test`. Domínio fora da política bloqueia o envio antes do SMTP e o reenvio administrativo. O Compose publicável da S07 usa o coletor interno, origem web e URLs de serviço alinhadas com Auth. O collector é restrito à rede de e-mail e não publica porta.
- `NotificationQueueEndpoint`, `NotificationStore` e `NotificationJobs` expõem a fila, atraso, sincronização, falhas e resultados incertos na porta de gerenciamento. O diagnóstico agrega contagens e remove IDs dos avisos operacionais de execução/recuperação. Nenhuma migration nova.
- `Frontend/src/features/notifications/` e `notification.service.ts` exibem lista móvel, prazo de retry, histórico, destinatário ausente ou bloqueado e orientação para `UNKNOWN`. Sem entregas, o detalhe autorizado de Booking distingue reserva de balcão de uma reserva comum. Nenhum contato de balcão é consultado. Auditoria de reenvio, chaves estáveis e recuperação de tentativa ambígua preservadas.
- Maven offline com Java 21 e cache local, usando agente Byte Buddy explícito no sandbox: **29 testes passaram**, JAR empacotado. Ver `Backend/Notification-Service/target/h1-validation.log`. Inclui restrição de domínio, diagnóstico agregado, ACK/replay, obsolescência, READY, reenvio e recuperação. Banco H2 em modo PostgreSQL e Auth/JavaMail simulados.
- TypeScript estrito e ESLint da S06 passaram. Chrome isolado com APIs simuladas, 390 px, passou em estado sem destinatário, domínio bloqueado, próxima tentativa, histórico, ausência de reenvio em `UNKNOWN` e explicação de balcão, sem overflow da página.

O smoke do Compose publicável, PostgreSQL, SMTP de rede, gerenciamento isolado e alerta com falhas reais pertencem a S07. Release versionado e smoke no endereço publicado seguem separados. Preferências e provedor externo continuam pendentes antes de usar contatos reais.

## Onda B — 13/11/2026

Estado: implementação S06 pronta para o aceite integrado S07. Variáveis, contrato administrativo e cenários de injeção publicados em [contracts.md](contracts.md) e [integration.md](integration.md).

- O consumidor usa as implementações publicadas de sessão e resolução de destinatário de S02 e o envelope Booking v1 de S03. Conferidos no checkout o endpoint Auth, as rotas Gateway/Nginx da S07, o coletor SMTP descartável e a rota de S01 sob a flag da onda B.
- A recuperação encerra tentativas persistidas em `SENDING` como `UNKNOWN` após dois minutos, inclusive quando Booking está indisponível. Uma tentativa antiga não assume o envio de outra. O replay após commit e falha do ACK conserva o ID da entrega e uma única captura. A migration V2 adiciona índice de recuperação.
- O adaptador SMTP agora interpreta a recusa RCPT encapsulada por Angus Mail: 451 permite backoff, 550 permite reenvio autorizado e desconexão ambígua permanece `UNKNOWN`. O endereço é consultado a cada tentativa. Eventos sem tutor Auth preservam a revisão sem enfileirar e-mail. Preferências e opt-out de canal ficam fora do contrato transacional desta onda.
- `NotificationHistoryDialog.tsx` preserva a chave de reenvio em `sessionStorage`, por administrador e entrega, inclusive após reload. `NotificationsPage.tsx` usa a sessão ADMIN verificada do AuthProvider.
- Maven offline com Java 21, cache do módulo e agente Byte Buddy explícito: **24 testes aprovados**, JAR empacotado. Relatório em `Backend/Notification-Service/target/wave-b-validation.log` e Surefire. Cobertura: 10 fluxos H2/Flyway, 5 cenários de autorização MockMvc/Auth simulado e 9 testes de destinatário/transporte JavaMail simulado. O teste de reinício instancia uma nova tarefa sobre o estado persistido. O cenário de desligamento real do container permanece no aceite S07.
- TypeScript e ESLint da S06 passaram. Chrome isolado com API simulada verificou 503 no reenvio, reload, repetição da mesma chave e atualização após 202.

Aceite de PostgreSQL, sessão real e SMTP coletado, injeção de falhas e restauração pertence a S07. Nenhum envio externo foi realizado.

## Onda A — registro histórico

Estado: implementação pronta e validada isoladamente em 13/11/2026. Integração pendente.

## Entregas

- `Backend/Notification-Service/`: aplicação Spring Boot, Dockerfile, sonda Actuator, configuração de exemplo e migration própria. Consome o outbox v1 por HTTP autenticado e confirma após persistência. A fila registra confirmação, reagendamento, cancelamento, lembrete e pronto para retirada, com revisão por reserva, tentativas, retentativa automática e reenvio auditado.
- A API administrativa valida a sessão no Auth e expõe estado e histórico sem dados de contato. O transporte local grava mensagens destinadas a `notifications@example.test`. O adaptador SMTP classifica rejeições e mantém resultado ambíguo visível para investigação. WhatsApp tem contrato Java de provedor.
- `Frontend/src/features/notifications/` e `Frontend/src/services/notification.service.ts`: consulta por reserva, estados de entrega, histórico e reenvio com chave de idempotência. A página compõe componentes de S01. O exemplo para a galeria está em [integration.md](integration.md#s01--frontend).

## Validação

- `mvn -o -B -f Backend/Notification-Service/pom.xml package` com Java 21, cache Maven local do módulo e agente Byte Buddy explícito para o sandbox Windows. **16 testes passaram**, com JAR gerado. Evidência em `target/validation.log` e `target/surefire-reports/`. A suite aplica Flyway em H2 em modo PostgreSQL e exercita replay concorrente, revisão fora de ordem, cancelamento antes do envio, lembrete vencido, prontidão, backoff, reenvio e resultado incerto. O teste HTTP do outbox verifica o bearer dedicado, o ACK após commit e a captura local. MockMvc e Auth simulado verificam autorização, revogação e indisponibilidade. Os testes SMTP usam JavaMail simulado.
- TypeScript estrito da entrada `NotificationsPage.tsx` e ESLint nos dois caminhos frontend de S06 passaram. O teste isolado em Chrome a 390 px, com bundle Vite e respostas HTTP simuladas, verificou validação de UUID, largura da página, histórico, chave de reenvio e atualização do estado.
- A checagem global `tsc -b --pretty false` encontrou `TS2741` em páginas de agenda/admin que ainda precisavam tratar `NO_SHOW`. S01/S03/S07 registraram a correção em seus pontos de integração.

## Pendências

- S07: executar com PostgreSQL e Docker no ambiente descartável, validar Booking → Notification → captura local e consultar/reencaminhar com uma sessão real de ADMIN no ambiente de teste. Incluir o banco no backup e na restauração. O Docker Engine recusou acesso neste sandbox.
- S01: habilitar a rota administrativa após aceite de S07. S02: publicar a rota interna de resolução de destinatário antes de habilitar SMTP. Contatos de balcão dependem de contrato próprio. O fuso segue a configuração do ambiente enquanto Booking emitir horário local.
- O consumidor verifica a revisão no momento do disparo. Uma alteração ainda não recebida do outbox pode chegar após a aceitação da mensagem pelo transporte. SMTP externo, WhatsApp e aceite ponta a ponta seguem pendentes.
