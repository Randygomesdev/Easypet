# Status S03

## H1-05 — 13/11/2026

Implementação pronta e validada localmente. Aceite móvel com serviços reais atribuído à S07. [Contratos](contracts.md#h1-05--13112026-validado-localmente) e [roteiro de integração](integration.md#h1-05).

- O tutor pode buscar estabelecimentos, escolher pet e horário, revisar preço, duração e antecedência do Booking, solicitar a reserva e acompanhar o status. A UI permite repetir consultas, recarregar o catálogo após alteração de preço e retomar a mesma reserva após perda de resposta. Meus Agendamentos filtra por status antes de paginar.
- A administração usa escritas de status e encaixe vinculadas ao estabelecimento. Novas alocações em estabelecimento inativo retornam `404`, preservando histórico e replay de reservas anteriores. Interrupção após início e novas autorizações de adicionais estão indisponíveis na UI e na API.
- A busca do catálogo suporta nome do estabelecimento ou cidade e usa categoria como filtro alternativo. Combinar texto e categoria e buscar pelo nome do serviço ativo depende da consulta paginada do Partner (S04).

| Validação local | Resultado |
| --- | --- |
| Booking com JDK 21, Gradle 8.14.4, `clean test --offline --no-daemon`, PostgreSQL 16 isolado na porta 56223 | 47 testes, 21 com PostgreSQL, sem falhas nem pulos. Inclui parceiro inativo, replay, política e filtro do tutor, preço divergente sem escrita, contexto e papel incorretos, transições inválidas e bloqueio de autorização de adicionais. |
| `node src/features/booking/booking.browser.mjs` | Chrome com API simulada e viewports móveis de 360 e 390 px. Passaram busca, recuperação da consulta de horários, revisão da política, troca de preço, retomada após reload, filtro, reagendamento e cancelamento. Agenda, retirada, balcão e carrinho simulado também passaram. |
| `tsc -b --pretty false`, ESLint `--max-warnings 0` no escopo S03, `git diff --check` | Passaram. |

## Onda B — 13/11/2026

Estado: implementação local pronta e validada. Aceite com os serviços reais atribuído à S07.

- **Sessão.** `BookingAuthenticationFilter` e `AuthSessionClient` consultam Auth em toda requisição protegida, inclusive direta e em replay. Somente `200` com o corpo esperado autentica a chamada. Respostas `202`, `204`, indisponibilidade e corpos inválidos retornam `503`. A rejeição `401` permanece distinta. O outbox usa a credencial dedicada já existente.
- **Equipe e origem.** `BookingAuthorization` exige permissões de sessão, escopo do estabelecimento e atribuição verificada para profissional. `BookingService` preserva `userId` Auth na auditoria, incluindo a criação de balcão, e consulta os pares reivindicados no Partner para acesso às reservas históricas. A origem da reserva e os autores anteriores são preservados. As projeções de pet e serviço aplicam escopo no Booking. A tela de equipe não solicita prontuário.
- **Frontend.** `ReceptionBookingDialog` foi montado pela S04 no detalhe de pet. `PartnerDetailPage.tsx`, `CartPage.tsx` e o diálogo de balcão usam `bookingIntent.ts` para persistir corpo e chave antes do POST e retomar após falha/reload. `AgendamentosPage.tsx` e `AtendimentoPage.tsx` consomem as permissões e projeções da agenda. O fluxo de checkout externo e seu retorno permanecem fora da rodada.
- **Retirada.** Um profissional atribuído pode registrar checklist e marcar pronto. Para reserva de tutor Auth, `BOOKING_READY` é persistido uma vez e usa o destinatário Auth. A reserva de balcão continua disponível na agenda, com status de retirada e autoria, enquanto avisos a essa origem dependem de contrato de destinatário.

| Validação local | Resultado |
| --- | --- |
| Booking JDK 21, Gradle 8.14.4, `clean test --offline --no-daemon`, PostgreSQL 16 isolado em `127.0.0.1:56193` | 42 testes, 16 com PostgreSQL, sem falhas. Inclui concorrência, idempotência e rollback R01, sessão revogada, Auth indisponível e 202/204, recepção, troca de estabelecimento/escala, acesso por reivindicação, projeções autorizadas de pet de tutor e de balcão e evento único de retirada. Auth/Partner/Pet simulados por HTTP local nos cenários de integração do módulo. |
| Chrome local `node src/features/booking/booking.browser.mjs` | Passou com respostas HTTP simuladas, perda de resposta e reload em catálogo, carrinho e balcão. Conferiu chave e corpo iguais, fluxo de profissional e nome real retornado pela projeção. A etapa legada do carrinho foi exercitada somente com API de créditos simulada. |
| `tsc -b --pretty false`, ESLint com `--max-warnings 0` no frontend da S03 e `git diff --check` | Passaram. |

S07 tem a configuração de `AUTH_SERVICE_URL` e do token descartável da projeção no checkout. O aceite integrado deve repetir a jornada de equipe e o aviso de retirada no SMTP local. [Contratos e exemplos](contracts.md#onda-b--13112026-implementado-localmente) · [Integrações](integration.md#onda-b)

### Reteste do Booking direto com Auth indisponível — 13/11/2026

- A primeira rodada integrada registrou `500` em `GET /api/v1/bookings/my-bookings` direto no Booking com Auth pausado. O log registrou o código, sem stack trace do Booking. A inspeção do Spring 6.2.1 identificou que um cancelamento lançado diretamente pelo future antes dos headers escapava de `RestClientException` no filtro. Esse é um caminho compatível com o sintoma do aceite.
- `RestTemplateConfig` converte o cancelamento direto do transporte em timeout de I/O. O cliente de sessão usa o tratamento existente de indisponibilidade e o filtro responde `503` JSON. A rejeição explícita de sessão pelo Auth continua em `401`.
- `BookingDependencyPostgresTest` agora sobe Tomcat em porta aleatória. A chamada HTTP recebeu `503` com Auth conectado e sem headers, `401` após rejeição explícita e `200` após recuperação. O teste que força cancelamento direto no transporte recebeu `503` pelo mesmo filtro real. `clean test --offline --no-daemon` com PostgreSQL 16 descartável na porta 56213 passou com 44 testes, incluindo 18 de integração do módulo. `git diff --check` passou no escopo. S07 pode reconstruir e repetir o cenário de Auth pausado.
- SHA-256 das fontes validadas, em `Backend/Booking-Service/src/`: `RestTemplateConfig.java` `11985611F07946EF9CBD9D13B9349513E2F48EA5F619B30A4718EDAE034F0BDA`; `BookingDependencyPostgresTest.java` `66850893D94BDF0822DA79EF11E6CC0941F6DF699F220FC91BBA81AC722D219F`.

## Revisão R01

- **R01-002 corrigido e validado localmente.** `RestTemplateConfig` limita a conexão a 750 ms e a resposta, inclusive o corpo, a 2 s por padrão. Usa o prazo restante quando a transação tem menos tempo. `BookingAgendaStore` configura `lock_timeout` local à transação (4 s), inclusive na inserção inicial da linha de trava. O prazo padrão da transação é 12 s e a espera pelo pool é de 4 s. Os clientes Pet/Partner e o handler retornam `503` para falhas recuperáveis. A verificação de intervalos e capacidade continua na transação protegida pela trava.
- **Evidência R01-002.** `BookingDependencyPostgresTest` usa MockMvc, os clientes HTTP reais, um servidor HTTP de loopback e PostgreSQL 16 descartável. Um Pet enviou parte do corpo e ficou aguardando. `pg_stat_activity` confirmou a segunda operação esperando pela trava da mesma agenda. A primeira recebeu `503` e a segunda reservou a mesma vaga. A execução levou cerca de 2,56 s com limite de leitura de 2,5 s. Houve uma reserva, um evento e uma chave de idempotência, todos da segunda operação, e nenhum histórico parcial. Outro teste reteve a trava do banco e verificou `503` recuperável após o limite de 4 s. Um terceiro fixou o prazo transacional em 1 s e confirmou que ele prevaleceu sobre o prazo HTTP de 2,5 s.
- **R01-001, consumidor Booking migrado e validado contra o contrato S04.** `PartnerServiceClient` usa uma chamada a `/internal/partners/{partnerId}/operations` para expediente, duração, preço, unidade e capacidade, com o JWT original. A resolução do titular continua em `/partners/me`. O teste HTTP aceita somente a rota nova para dados operacionais e verifica horários, duração, preço e limite de hospedagem, além da criação de balcão. A S04 validou o provedor em testes HTTP próprios. A execução conjunta de Booking e Partner reais segue para S07.
- **Suíte da revisão.** Booking com JDK 21, Gradle 8.14.4, `clean test --offline --no-daemon` e `S03_POSTGRES_URL` em banco isolado na porta 56183. Foram 40 testes, incluindo 14 com PostgreSQL, sem falhas nem pulos. `git diff --check` passou no escopo. Nenhuma execução Compose ou suíte integrada nesta rodada.

## Entregas e arquivos

- `Backend/Booking-Service/src/main/` contém a migration `V7__reliable_booking_agenda.sql`, a serialização de alocações por estabelecimento no PostgreSQL, as regras compartilhadas entre disponibilidade e escrita, e as APIs de reagendamento, histórico, falta, cancelamento, bloqueio, checklist e retirada. A duração do catálogo é persistida nas novas reservas. A hospedagem considera ocupação simultânea e permite intervalos adjacentes.
- `BookingAgendaStore`, `BookingOutboxController` e a configuração de segurança persistem eventos na transação da reserva e expõem leitura e ACK autenticados. Requisições repetidas com a mesma chave reutilizam a reserva. Mudanças rejeitadas conservam o estado e o histórico originais. Um bloqueio excepcional sobre reserva ocupante retorna conflito.
- `PetServiceClient` valida o pet de balcão pelo contrato S04. A origem da reserva é vinculada ao cadastro S04 ou ao tutor Auth. O titular do estabelecimento pode operar o atendimento de balcão e seu checklist.
- `Frontend/src/pages/partner/AgendamentosPage.tsx`, `AtendimentoPage.tsx`, `Frontend/src/pages/app/MeusAgendamentosPage.tsx`, `Frontend/src/services/booking.service.ts` e `Frontend/src/features/booking/` exibem horários, motivos, falta, histórico e pronto para retirada. Os formulários usam as primitivas da S01. O fluxo de cancelamento exibe o estado retornado pela API e deixa de prometer devolução automática de crédito.
- [Contrato v1](contracts.md), [pedidos de integração e exemplos de galeria](integration.md) publicados na pasta da sprint.

## Evidências

| Verificação | Resultado |
| --- | --- |
| Booking com JDK 21 e Gradle 8.14.4, `clean test --offline --no-daemon`, `S03_POSTGRES_URL` apontando para banco PostgreSQL 16 descartável em loopback | 36 testes passaram, incluindo 10 cenários de integração e a aplicação Flyway V1–V7 em banco novo. Cobertura de corrida por última vaga, sobreposição entre inícios diferentes, hospedagem, chave idempotente concorrente, recuperação de reagendamento, encaixe, bloqueio, isolamento, vínculo de balcão, checklist, falta e autenticação/ACK do outbox. |
| Frontend `node src/features/booking/booking.browser.mjs` | Passou no Chrome desktop e mobile com Vite em porta exclusiva e API simulada. Exercitou falta e motivo, inclusão/remoção de bloqueio, conflito e retry no reagendamento, cancelamento, checklist de balcão, pronto para retirada e conclusão. |
| ESLint com `--max-warnings 0` nos caminhos frontend da S03 | Passou. |
| Frontend `tsc -b --pretty false` na entrega inicial | Três erros de mapas incompletos em `pages/admin/tabs/AgendamentosTab.tsx` e `pages/partner/DashboardPage.tsx`. A correção foi atribuída à S01 na R01. |
| `git diff --check` no escopo | Passou. |

## Pendências e decisões

- S07 executa aceite com os serviços reais, ingressos e captura local do Notification. O teste do Booking usa PostgreSQL real e simula os serviços externos Partner e Pet. O acesso de equipe depende da consulta de sessão S02 e da associação de profissionais a escalas.
- A operação de balcão está disponível na API. A ação de criação na página de clientes e o destinatário para avisos de balcão dependem de S04 e S06. O outbox atual usa a identidade Auth do tutor.
- As telas legadas de criação precisam manter uma chave estável por tentativa para usufruir da idempotência. A S01 acompanha o build global e os mapas `NO_SHOW`.
- O bloqueio da transação usa uma linha por estabelecimento. Ela serializa alocações, inclusive hospedagem e bloqueios. Reservas legadas sem duração registrada são avaliadas com o catálogo atual, ou 30 minutos quando o cadastro carece de duração. A antecipação de cancelamento/reagendamento usa 120 minutos por padrão. A transição legada `IN_PROGRESS → COMPLETED` continua disponível. A opção de pronto para retirada exige checklist salvo e atendimento iniciado.
