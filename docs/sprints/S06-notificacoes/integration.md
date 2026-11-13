# Integração S06

## H1 — perfil publicável e alerta local

Contrato publicado em 13/11/2026. Usar o Compose e o Nginx de publicação com os valores de [H1](contracts.md#h1--homologação-interna-13112026). S07 deve manter o coletor de teste em rede interna sem saída, sem porta publicada nem rota no Nginx, com remetente e destinatário restritos a `@example.test`. A API do coletor fica disponível aos operadores somente por acesso local autorizado ao container. S02 deve restringir também recuperação e convites no Auth ao domínio de teste. O host SMTP é interno. A origem pública configurável só entra nos links do Auth e em CORS; Notification conversa com Booking/Auth pelas URLs internas.

Monitorar localmente `GET /actuator/health` e `GET /actuator/notificationqueue` no loopback de Notification, por exemplo `docker compose exec -T notification-service curl -fsS --max-time 3 http://127.0.0.1:8089/actuator/notificationqueue`. Registrar somente códigos, contagens e idade. Como ponto de partida de ensaio, amostrar a cada minuto e registrar alerta local se a consulta falhar, se `oldestDueAgeSeconds > 120`, se `outboxPollingEnabled=false` no perfil SMTP ou se a última consulta ao outbox estiver ausente, antiga ou `UNAVAILABLE` por três amostras. Investigar assim que aparecer `unknownLastHour > 0`; conferir a captura antes de qualquer ação. Usar os mesmos sinais para observar rejeição SMTP, ausência de destinatário e recuperação depois de restabelecer Auth/Booking. Ajustar limiares com dados da homologação. O alerta não encaminha e-mails nem grava destinatário, payload ou ID.

No smoke H1, repetir o fluxo SMTP da onda B com os arquivos publicáveis. Incluir destinatário de domínio diverso, conta sem destinatário elegível e reserva de balcão sem emissão, além de uma recusa transitória e um caso `UNKNOWN`. Em viewport de 390 px verificar lista, horário da próxima tentativa, histórico, motivo do bloqueio e ausência de reenvio em `UNKNOWN`. Validar que o endpoint de diagnóstico e a captura ficam inacessíveis pelo ingresso.

Para reproduzir o bloqueio de domínio sem usar endereços reais, provisionar tutor da fixture em `tutor@other.test` e confirmar uma reserva. Esperar `FAILED/RECIPIENT_DOMAIN_BLOCKED`, `canRetry:false`, 409 no POST de reenvio, aumento de `unroutableLastHour` e nenhuma conexão SMTP para o destinatário. Para ausência de destinatário, desativar o tutor de teste após a reserva e antes de confirmar. Esperar `FAILED/RECIPIENT_UNAVAILABLE`, com consulta ao Auth a cada reenvio autorizado.

Galeria S01: reutilizar o exemplo de `NotificationDeliveryTable` abaixo em 390 px e desktop. Acrescentar duas entregas fictícias com `status:'UNKNOWN', lastError:'SMTP_UNCERTAIN', canRetry:false` e `status:'FAILED', lastError:'RECIPIENT_UNAVAILABLE', canRetry:true`. Em `UNKNOWN`, o diálogo orienta conferir a captura e conserva apenas ações de leitura.

## Onda B — aceite S07

Publicado em 13/11/2026. Configurar o coletor SMTP da rede descartável usando as [variáveis de S06](contracts.md#transporte-e-banco). Manter a regressão `LOCAL` da R01 e executar os novos casos em `SMTP` com endereços `.test`. Para injeção determinística, usar relays HTTP/SMTP descartáveis na rede de teste ou alterar apenas a fixture do banco descartável quando o cenário pede reproduzir uma interrupção.

| Cenário | Injeção e resultado esperado |
| --- | --- |
| Destinatário e retirada | Criar dois tutores fictícios. Confirmar uma reserva do primeiro tutor, iniciar atendimento de banho e tosa com checklist e marcar pronto. Verificar os assuntos `Agendamento confirmado` e `Serviço pronto para retirada`, cada um uma vez no coletor para o tutor da reserva, e `SENT` na consulta do ADMIN. |
| Replay antes do ACK | Um relay Booking encaminha GET normalmente e recusa o primeiro ACK de um evento alvo com 503, sem entregar o ACK ao Booking. Verificar commit de `notification_event` e da entrega. Reiniciar Notification preservando seu banco, liberar ACK e verificar uma entrega lógica e um único e-mail, com o mesmo ID de entrega após o replay. |
| Reinício após SENDING | Produzir `SENDING` durável e interromper Notification enquanto o relay SMTP retém a resposta final depois de receber DATA. Preservar banco e mensagens capturadas. Após reiniciar e expirar o prazo de recuperação de dois minutos, verificar `UNKNOWN`, tentativa encerrada e ausência de novo e-mail. A API deve recusar reenvio com 409. Para teste determinístico do processo de recuperação, uma fixture pode envelhecer `notification_delivery.updated_at` para mais de dois minutos e preservar o registro STARTED correspondente. |
| Obsolescência | Criar confirmação com lembrete para horário futuro e reagendar ou cancelar antes do disparo. Verificar `SUPERSEDED` no lembrete antigo, a nova entrega de mudança e ausência do lembrete anterior no coletor. Repetir o evento anterior e verificar que o lembrete fica invalidado. |
| Falha transitória e reenvio | Relay SMTP responde explicitamente `451` antes do aceite. Verificar `RETRY_SCHEDULED` e, após esgotar três tentativas, `FAILED`. Liberar o relay, reenviar com sessão ADMIN real e repetir o mesmo `Idempotency-Key`. Verificar dois `202`, um único novo ciclo, tentativa 4 e um e-mail capturado. |
| Reenvio com o coletor já disponível | O coletor de S07 expõe `PUT /reject?recipient=<email>` e `DELETE /reject?recipient=<email>`. A recusa `550` em RCPT deve gerar `FAILED` na primeira tentativa. Após liberar o destinatário, repetir o POST administrativo com a mesma chave, inclusive após reload, e verificar tentativa 2 e captura única. Este cenário complementa o backoff de `451`. |
| Sessão revogada e Auth indisponível | Usar sessão ADMIN real, revogá-la pela alteração suportada da fixture Auth e repetir listagem, histórico e reenvio para obter 401. Tutor/equipe recebem 403. Parar ou devolver 503 no Auth e repetir as três operações com bearer, inclusive direto ao serviço, para obter 503. Verificar que nenhuma tentativa de reenvio foi criada. |

Em 13/11, `Frontend/e2e/wave-b-notification.spec.ts` da S07 já exercita recusa RCPT 550, consulta e reenvio ADMIN, SMTP para o destinatário real da fixture, reagendamento, cancelamento e replay com reinício. A extensão do aceite deve verificar também `BOOKING_READY` de banho e tosa, interrupção durante `SENDING`, 451 e a revogação/indisponibilidade nas três operações administrativas. Para a tela, preencher **ID da reserva**, acionar **Consultar**, abrir **Ver tentativas** da confirmação e conferir o botão **Solicitar reenvio** em `FAILED`.

## S03 — Booking

- Configurar o mesmo `BOOKING_OUTBOX_TOKEN` nas duas pontas e manter as rotas de consulta/ACK internas. O Notification aceita o [envelope v1 publicado](../S03-agenda/contracts.md#outbox-para-s06). Manter `userId` como ID do tutor no Auth. Para clientes de balcão, publicar contrato de destinatário antes de habilitar o envio a esses cadastros.
- O código S03 ordena o outbox por `sequence_id`. Alinhar `NOTIFICATION_BOOKING_ZONE` com o horário local enquanto o envelope tiver data sem offset. A proteção por revisão no consumidor cobre reordenação e ACK repetido.

## S02 — Auth

- Disponibilizar `GET /api/v1/auth/session` na rede de serviços conforme contrato S02. Notification encaminha o bearer original e habilita a operação para `ADMIN`.
- O endpoint interno de destinatário e o token dedicado já constam do contrato e do código S02. A S06 consome ambos, com consulta no momento do envio e sem persistir o endereço. A S07 configura o mesmo `NOTIFICATION_RECIPIENT_TOKEN` nos dois serviços do projeto descartável.

## S07 — Infraestrutura e aceite

- Integrar `Backend/Notification-Service/Dockerfile`, banco PostgreSQL dedicado com Flyway e sonda `http://127.0.0.1:8089/actuator/health` dentro do container. API interna na porta `8087`. Incluir banco de Notification no backup e restauração. Variáveis em `Backend/Notification-Service/.env.example`.
- Para aceite local, usar `NOTIFICATION_TRANSPORT=LOCAL`, configurar URLs internas de Booking/Auth e ativar o polling com o token de outbox. Encaminhar pelo Gateway somente `/api/v1/admin/notifications` e seus subcaminhos, preservando o bearer e exigindo ADMIN. Manter os endpoints internos fora do proxy. Validar que o fluxo reserva → outbox → captura local e a consulta/reenvio autenticados funcionam antes de habilitar a tela.

## S01 — Frontend

- Conectar `/admin/notificacoes` no conjunto de aceite da onda B pelo guard e layout ADMIN. O ponto de entrada é o export padrão de `Frontend/src/features/notifications/NotificationsPage.tsx`, sob o `AuthProvider` vigente. A consulta exige o UUID da reserva. A chave do reenvio fica estável por administrador e entrega na aba até a confirmação ou um conflito definitivo.
- A galeria pode reproduzir a composição de `NotificationDeliveryTable` com o exemplo abaixo. Ao acionar **Ver tentativas**, abrir o `Dialog` compartilhado com título **Confirmação**, uma tentativa **Falha temporária**, e o botão **Solicitar reenvio** apenas com `canRetry: true`. Para a variante de leitura, exibir a mesma tabela com `status: 'SENT'`, `lastError: null` e `canRetry: false`. A galeria usa callbacks locais e dados fictícios.

```tsx
<NotificationDeliveryTable
  deliveries={[{
    id: '11d594e8-9f66-4813-b9ab-cc99664f3070',
    bookingId: '56535e34-8cf1-45cf-a94c-826fc3b539ab',
    type: 'CONFIRMATION',
    status: 'FAILED',
    attemptCount: 3,
    dueAt: '2026-11-13T15:02:00Z',
    updatedAt: '2026-11-13T15:02:01Z',
    lastError: 'SMTP_TEMPORARY',
    canRetry: true,
  }]}
  onSelect={setSelectedDelivery}
/>
```

- A checagem global do frontend encontrou `TS2741` em `AgendamentosTab.tsx`, `AgendamentosPage.tsx` e `DashboardPage.tsx` pelos mapas que ainda precisam incluir `NO_SHOW`. S01/S03 já registraram o alinhamento em suas integrações.
