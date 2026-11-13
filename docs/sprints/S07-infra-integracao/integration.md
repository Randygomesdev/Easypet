# Integrações S07

| Dono | Caminho / contrato aguardado | Uso no aceite |
| --- | --- | --- |
| S01 | `Frontend/src/` — rotas e telas que compõem as novas jornadas | Exercitar pelo navegador os fluxos publicados. S07 não cria componentes ou exemplos de galeria nesta entrega de infraestrutura. |
| S02 | `Backend/Auth-Service/` — endpoints e papéis de cadastro e recuperação, limitação de abuso, URL de reset e transporte de teste | Liberar apenas métodos e caminhos autorizados, cobrir recuperação em ambiente fictício e recusar elevação de papel. |
| S03 | `Backend/Booking-Service/` — mudanças de reserva e contrato de eventos | Testar disputa de vaga, repetição e regressões de isolamento. Ligar Booking e Notification pelo contrato publicado. |
| S04 | `Backend/Pet-Service/` e `Backend/Partner-Service/` — endpoints de balcão e isolamento | Encaminhar operações publicadas e testar troca de IDs entre estabelecimentos. |
| S05 | Serviço dono do caixa — caminhos, métodos, escopo e idempotência | Cobrir recebimentos e fechamento sem publicar checkout ou rotas de concessão de crédito. |
| S06 | `Backend/Notification-Service/` — Dockerfile, porta, Actuator, variáveis, banco/migrations e transporte local | Subir serviço e banco na rede interna e verificar evento e deduplicação sem transporte real. |

### Conflito de rota administrativa

S04 resolveu a colisão ao publicar `GET /api/v1/admin/reception-customers[/{id}]` no Partner. O Gateway encaminha o novo caminho ao Partner. `GET /api/v1/admin/customers` e `PATCH /api/v1/admin/customers/{id}/active` são encaminhados ao Auth, que bloqueia o acesso a essas operações no perfil de homologação padrão.

### Configuração dos serviços

- S04 publicou `PARTNER_SERVICE_URL` para a consulta de vínculo do Pet. O Compose agora usa o endereço interno do Partner. As consultas internas de vínculo seguem fora do ingresso HTTP.
- Para a recepção agendar pets de balcão sem conta Auth, S03 e S04 precisam publicar a origem e a autorização da reserva. S06 precisa do contrato de destinatário desses cadastros. O aceite de balcão cobre vínculo de cliente e pet e o aceite de agenda usa um tutor com conta.
- S05 publicou validação de reserva em Booking. O Compose define `BOOKING_SERVICE_URL=http://booking-service:8084/api/v1` no Payment. O proxy encaminha os caminhos publicados de caixa. O controlador exige `PARTNER` e valida o vínculo por JWT no serviço.
- S02 deve disponibilizar o fluxo de registro e recuperação no perfil homolog, com limitação e coleta de e-mail local. O aceite integrado também precisa confirmar onde sessões antigas e contas revogadas são validadas em cada serviço que recebe o JWT.
- A primeira build da stack falhou em `Backend/Auth-Service/src/main/java/br/com/innkercode/auth/service/AuthService.java:123`. A chamada `PasswordResetTokenRepository.findByToken(String)` estava sem implementação no snapshot usado. Reexecutar quando a S02 concluir a migração do repositório.

### Falhas do segundo build integrado

- S02 corrigiu a compilação do Auth no segundo snapshot. Para validar recuperação e equipe, ainda é preciso rodar o perfil descartável da S02 com coletor SMTP e decidir a validação de sessão em cada serviço de domínio. A exposição padrão continua com login provisionado.
- S03 acrescentou os imports de `LocalTime` e `DateTimeFormatter` em `BookingService.java`. O build do Booking passou na execução isolada da API.
- S01 e S03 devem alinhar o novo estado `NO_SHOW` com os mapas obrigatórios de `BookingStatus` em `Frontend/src/pages/admin/tabs/AgendamentosTab.tsx`, `Frontend/src/pages/partner/AgendamentosPage.tsx` e `Frontend/src/pages/partner/DashboardPage.tsx`. O build do frontend falhou com `TS2741` nesses arquivos.
- O ajuste de `AgendamentosPage.tsx` entrou em S03. `AgendamentosTab.tsx` e `DashboardPage.tsx` ainda aguardam o ajuste coordenado de ownership indicado pela S01.

### Código de acesso do caixa

Na execução com 15 containers saudáveis, `GET /api/v1/payments/cashier/charges/{id}` com JWT válido de tutor retornou `401`. O contrato S05 exige `403` para papel incompatível. S05 deve verificar o tratamento de acesso negado e o despacho de erro em `Backend/Payment-Service/src/main/java/br/com/easypet/payment/config/SecurityConfig.java`, mantendo `401` para JWT ausente ou inválido. A suíte preserva a expectativa do contrato.

### Limites do aceite de Notification

O perfil descartável confirmou o caminho Booking → outbox → PostgreSQL de Notification → captura LOCAL. Para disponibilizar consulta e reenvio administrativos, S02 precisa validar `GET /api/v1/auth/session` com a sessão real no perfil isolado. Em seguida, S07 pode encaminhar somente os métodos e caminhos publicados em S06. S01 conecta a rota web após o aceite dessas permissões.

### Reteste R01

S01 corrigiu os dois arquivos com mapas de `NO_SHOW`. S04 protegeu as leituras completas no Partner e publicou a projeção operacional consumida por S03 e S05. S03 limitou as chamadas HTTP e a espera pela trava. S05 corrigiu a resposta `403` para sessão autenticada sem permissão. O reteste da S07 confirmou esses contratos na stack descartável. [Resultados integrados](status.md#resultado-integrado).

### Onda B

- **S03 — indisponibilidade do Auth no Booking direto.** No projeto `easypet-e2e-309716e13e`, um JWT válido de CUSTOMER em `GET http://booking-service:8084/api/v1/bookings/my-bookings` recebeu `500` enquanto o Auth estava pausado. O contrato S03 exige `503` recuperável. A S03 ajustou o cliente HTTP do Booking para tratar o cancelamento da requisição como timeout. O reteste no projeto `easypet-e2e-3d02748b29` confirmou `503` no Booking direto com o Auth pausado, bem como no Gateway, Pet, Partner e Payment.

- S01/S02: build de aceite injeta `VITE_WAVE_B_ENABLED=true` e `VITE_AUTH_RECOVERY_ENABLED=true`. O Nginx encaminha a sessão também na homologação padrão. O overlay local libera recuperação e convites e usa coletor SMTP restrito a `example.test`.
- S03/S04: para aceitar o atendimento de profissional pela UI, a lista e o detalhe precisam mostrar nome real do pet e do serviço pelo contrato mínimo, sem acesso a prontuário fiscal/clínico indevido. Atribuição deve conferir o ID do acesso vigente ao consultar o vínculo após revogação e reconvite.
- S05: `GET /payments/cashier/context` já está na lista de rotas do Nginx. O aceite preserva a exigência de `403` para recepção sem `CASH_CLOSE`, `401` após revogação e uma baixa após repetição.
- S06: perfil de teste configura SMTP local e token de destinatário compartilhado exclusivamente com Auth. O coletor suporta rejeição `550` por destinatário. O replay do ACK será exercitado na base descartável. Registros representativos serão verificados antes e depois da restauração.

### H1 — bloqueios da primeira build integrada

- **S04.** O build real de `Frontend/Dockerfile` capturou `TS2353` em `Frontend/src/pages/admin/ParceiroDetailPage.tsx:120`: `active` não pertence a `PartnerPayload`. Concluir a migração da tela para a operação auditável `PATCH /admin/partners/{id}/active`. A S07 já encaminha esse método/caminho e `GET /admin/partners/{id}/status-history` no Gateway. Evidência local em `%TEMP%/easypet-h1-profile-smoke.log`.
