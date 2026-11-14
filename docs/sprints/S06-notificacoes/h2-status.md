# S06 · Status H2 · 14/11/2026

Implementação do consumidor S06 pronta e validada localmente. [Contratos](h2-contracts.md) e [integrações](h2-integration.md) publicados.

## Implementação

- `Backend/Notification-Service`, V3: chamados privados, lista e contagem ADMIN, leitura, reconhecimento e resolução com autoria. A resposta da resolução é visível ao solicitante do chamado e ao ADMIN. A criação com reserva exige a leitura autorizada do Booking e deduplica por ator e chave.
- Ingresso interno com token dedicado, serviço e código permitidos, incidente estável e sequência crescente. Recuperação SYSTEM mantém a autoria de uma resolução ADMIN preexistente. O coletor de S07 no checkout usa o mesmo envelope de abertura e recuperação.
- V3/V4: preferência de e-mail do tutor antes de cada tentativa; opt-out encerra a entrega como `SUPPRESSED`. Recuperação de senha permanece no Auth. O cliente interno Partner usa origem autenticada, consulta consentimento em cada tentativa e conserva o ID da primeira autorização usada. Bloqueia falta/revogação, autorização posterior ao evento e autorização substituída. Captura LOCAL conserva destinatário fictício sem persistir o endereço resolvido.
- `BOOKING_INTERRUPTED` v1 invalida lembrete e retirada pendentes, inclusive replay. ACK, retentativas e `UNKNOWN` seguem as garantias anteriores. SMTP continua limitado a domínio fictício. Documentação oficial Zoho CPaaS revisada para a configuração candidata STARTTLS, sem configurar provedor ou enviar e-mail externo.
- `Frontend/src/features/notifications/BookingNotificationPreferences.tsx`, `presentation.ts`, `EmptyNotificationResults.tsx` e `Frontend/src/services/notification.service.ts`: preferência reutilizável pelo guard CUSTOMER, supressão na investigação e mensagens para balcão sem entrega. A central/sino e as rotas pertencem a S01.

## Evidências

- Java 21, `mvn -o -B -f Backend/Notification-Service/pom.xml package` com cache local e agente Byte Buddy no sandbox: **40 testes passaram**, JAR empacotado. `Backend/Notification-Service/target/h2-validation.log` e Surefire. 18 testes de fluxo com Flyway/H2, 7 HTTP/autorização, 1 de contrato de destinatário e 14 de transporte. Cobre concorrência/replay, resolução privada, recuperação fora de ordem, preferência após claim, consentimento posterior/revogado/substituído e captura LOCAL. H2 e dublês não equivalem ao aceite PostgreSQL/SMTP integrado.
- TypeScript estrito da entrada de notificações e preferências e ESLint dos arquivos S06 passaram. Chrome em perfil descartável com API simulada, 390 px: opção preservada após 503, gravação por retry explícito e valor reapresentado após reload.

## Validação e slot

O slot PostgreSQL ainda estava em S03 durante a validação local. Nenhum Docker/Compose iniciado pela S06. **S06 cede seu slot isolado à S07**, que já precisa executar V3/V4 no PostgreSQL e testar os serviços reais no mesmo cenário. Para repetição focada, `NotificationFlowTest` aceita `S06_TEST_DB_URL`, `S06_TEST_DB_USERNAME` e `S06_TEST_DB_PASSWORD` de um banco PostgreSQL descartável; usar banco vazio e exclusivo.

## Dependências

- O Booking já publica `BOOKING_INTERRUPTED`, mas o DTO v1 inspecionado ainda não carrega `receptionCustomerId` e geração de eventos de balcão permanece restrita à interrupção. S03 precisa emitir a referência de origem nos eventos de envio para usar o endpoint interno publicado e implementado por S04. Até isso ocorrer, eventos sem identidade ficam sem entrega.
- S01 precisa montar o componente de preferência em área CUSTOMER. Gateway e Compose já contêm o encaminhamento e as variáveis H2 observadas no checkout. S07 valida ingresso, central, SMTP local e restauração com serviços reais.
