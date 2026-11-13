# Integrações S03

## H1-05

- S04 preserva o catálogo autenticado `GET /api/v1/partners/catalog/{partnerId}` com `404` para inativos. Booking exige `active: true` na projeção interna `/api/v1/internal/partners/{partnerId}/operations` antes de alocar, usando a mesma leitura que traz expediente, preço e capacidade. S07 precisa reconstruir Booking e Partner juntos para incluir esse campo. A desativação preserva as reservas anteriores e seu histórico.
- S04: a busca atual `GET /partners/catalog?name=…&category=…` usa somente a categoria quando os dois filtros estão presentes e não procura nomes de serviço. Para busca móvel, combinar filtros na consulta paginada e aceitar nome de serviço ativo, além de estabelecimento/cidade. Até o contrato suportar combinação, a UI aplica um filtro de descoberta por vez para preservar paginação correta.
- S07 amplia o mapa de escritas com status e encaixe de ADMIN sob `/bookings/partner/{partnerId}/{bookingId}/…`. Usar `partnerId` de outro estabelecimento com um `bookingId` válido (`404`), repetir com o par correto e papel de tutor (`403`), e tentar `PENDING → COMPLETED` ou `IN_PROGRESS → CANCELLED` como ADMIN (`400`). Repetir uma transição válida e conferir que o histórico e o outbox têm apenas um registro para a transição.
- No cenário móvel real, buscar por nome ou cidade, escolher pet e horário, conferir total/duração/prazo da API e seguir para Meus Agendamentos. Repetir a partir de um parceiro que o admin desativou entre a leitura do catálogo e a confirmação. Esperar `404` em nova alocação, histórico ainda consultável e cancelamento anterior dentro do prazo.
- S01 pode usar a confirmação móvel de serviço como exemplo na galeria. O cenário local de 360 px usa Banho por R$ 80,00, duração de uma hora e antecedência de 90 minutos, e verifica o recarregamento após `409` com `errors.price`.

## Onda B

- **Reteste Auth pausado (13/11).** S07 deve reconstruir Booking com `RestTemplateConfig` atualizado e repetir a chamada direta `GET /api/v1/bookings/my-bookings` com bearer válido. Esperado `503` JSON com Auth indisponível e `401` para sessão rejeitada. A correção usa os mesmos prazos e variáveis da entrega anterior.

- S04 montou `ReceptionBookingDialog` no detalhe de pet da página de clientes, conforme [contrato S03](contracts.md#onda-b--13112026-implementado-localmente). S03 consome o vínculo profissional publicado por S04 e valida a associação em cada operação atribuída.
- S01 mantém `/partner/agendamentos` disponível a `BOOKINGS_READ` ou `BOOKINGS_ASSIGNED_READ`, e `/partner/atendimento` disponível a `BOOKINGS_WRITE` ou `BOOKINGS_ASSIGNED_ATTEND` com leitura correspondente. A API é a autoridade para escopo e vínculo. As páginas consultarão o contexto de agenda do Booking.
- S07 injeta `AUTH_SERVICE_URL=http://auth-service:8081/api/v1` no Booking, com acesso direto à sessão. O endpoint de outbox segue interno e com token dedicado.
- S04 entregou a projeção `GET /internal/pets/{petId}/booking-summary`. Booking autoriza a reserva/atribuição e consulta a projeção com credencial de serviço. S07 injeta o mesmo `BOOKING_PET_SUMMARY_TOKEN` em Booking e Pet e mantém o endpoint Pet interno. As telas usam `/bookings/{id}/pet-summary` e `/bookings/partner/{partnerId}/summary` no ingresso Booking. O frontend não recebe o token.
- S07 pode exercitar retomada no catálogo solicitando a reserva, descartando a resposta depois do commit, recarregando a página e abrindo novamente o mesmo serviço. **Retomar reserva** deve reenviar chave e corpo e retornar o mesmo ID. No balcão, reabrir o cadastro do mesmo pet e usar **Consultar ou retomar reserva**. Para S06, confirmar uma reserva de banho e tosa com tutor Auth, iniciar atendimento, salvar checklist e usar **Marcar pronto para retirada**. Repetir a operação deve manter o mesmo `readyAt` e produzir somente um evento.

## R01

- O cliente Booking migrou para `GET /api/v1/internal/partners/{partnerId}/operations` conforme o [contrato da S04](../S04-balcao/contracts.md#leituras-de-estabelecimento--r01-001). Usa uma única consulta por verificação de agenda. As consultas de equipe, escala e ausência usam os caminhos internos existentes. A resolução do titular usa `/partners/me` com o bearer original.
- S07 deve reconstruir Booking e Partner juntos, exercitar agenda de tutor, hospedagem e reserva de balcão com os serviços reais e confirmar que o ingresso bloqueia `/api/v1/internal/**`. Os prazos têm padrões no Booking e dispensam novas credenciais ou configuração obrigatória.

| Dono | Solicitação |
| --- | --- |
| S06 | Consumir o outbox em `GET /api/v1/internal/booking-events` e enviar ACK após persistir o evento. Deduplicar por `eventId` e invalidar lembretes por `bookingVersion`. A configuração interna compartilhada é `BOOKING_OUTBOX_TOKEN`. |
| S07 | Manter `/api/v1/internal/booking-events/**` apenas na rede interna. Injetar o token por configuração protegida nos dois serviços. Aplicar V7 do Booking e incluir os fluxos S03 no aceite integrado. |
| S02 | Publicar contrato das permissões operacionais por estabelecimento. A fatia atual usa `ROLE_PARTNER` e vínculo resolvido por `/partners/me`, além do acesso administrativo existente. |
| S04 | Usar `POST /bookings` com `Idempotency-Key` estável por tentativa. O vínculo de balcão deve ser aceito no contrato de acesso ao pet já usado pelo Booking. |
| S01 | Adicionar exemplos da agenda e do atendimento à galeria conforme esta pasta. Preservar as rotas existentes de Agenda, Atendimento e Meus Agendamentos. Coordenar a adoção de `NO_SHOW` em consumidores fora do escopo S03 e de chaves estáveis nas telas existentes de criação. |

## Consumidores de frontend fora da S03

- `Frontend/src/pages/admin/tabs/AgendamentosTab.tsx` e `Frontend/src/pages/partner/DashboardPage.tsx` precisam incluir `NO_SHOW` nos mapas `Record<BookingStatus, string>`. Usar o rótulo **Falta** e tratamento terminal. São três erros de TypeScript que dependem de autoria fora da S03.
- `Frontend/src/pages/app/PartnerDetailPage.tsx`, `CartPage.tsx` e `PaymentSuccessPage.tsx` são chamadores legados de `bookingService.create`. A adoção de `bookingService.create(input, key)` deve gerar uma chave por tentativa intencional e reutilizá-la nos retries. O fluxo legado continua aceito.

## Balcão sem conta e notificações

O Booking aceita `receptionCustomerId` e valida o par cliente/pet no endpoint S04 com o bearer do titular. S04 pode ligar a criação de reserva ao detalhe do pet de balcão com `POST /bookings`, incluindo `receptionCustomerId` e uma chave de tentativa. O envio para cliente de balcão ainda depende de contrato de destinatário com S06. As telas de parceiro de S03 mostram o cadastro da reserva usando a consulta S04 de pet, com o checklist da agenda disponível para banho e tosa.

S07 pode aplicar a mesma configuração de fuso em Booking (`BOOKING_ZONE`) e Notification (`NOTIFICATION_BOOKING_ZONE`). O padrão dos dois serviços é `America/Sao_Paulo`.

## Exemplos para a galeria S01

- **Agenda.** O diálogo de falta usa `Dialog open title="Registrar falta"`, `TextField label="Motivo" required maxLength={500}` e `Button type="submit" variant="danger"`. Uma reserva confirmada habilita essa ação a partir do horário agendado. Reutilizar o exemplo existente da galeria.
- **Atendimento.** O checklist de banho e tosa usa `Card`, `CardHeader title="Entrada para banho e tosa"`, `CardContent` e dois controles de confirmação. Simular checklist pendente e salvo. Mostrar `<Badge tone="success">Pronto para retirada</Badge>` como ação do cabeçalho quando `readyAt` estiver preenchido.
- **Reagendamento.** Compor `Dialog`, `TextField type="date" label="Nova data"`, `SelectField label="Horário"` e `SelectField label="Profissional"`. Mostrar mensagem de conflito em `role="alert"` junto aos valores ainda preenchidos. Para hospedagem usar dois campos `datetime-local` com rótulos de check-in e check-out.
