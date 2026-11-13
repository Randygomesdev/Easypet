# Integração S04

## H1 — 13/11/2026

- S01: use as leituras reais de [configuração](contracts.md#dados-de-configuração-para-o-checklist-s01) para o checklist. O titular acessa `/partner/cadastro`, `/partner/servicos` e `/partner/colaboradores`; o editor é `/partner/colaboradores/{staffId}`. Diferencie falha de leitura, cadastro ausente e lista vazia.
- S07 já encaminha `PATCH /api/v1/admin/partners/{id}/active` e `GET /api/v1/admin/partners/{id}/status-history` ao Partner. A tela chama essas rotas e o build local passou. Aplicar V20 e reconstruir Partner e Booking juntos. Em `Frontend/e2e/pilot.spec.ts`, o teste R01 de projeção interna compara a lista exata de campos. Incluir `active` nessa lista e conferir `active: true` no estabelecimento da fixture, mantendo as verificações de dados fiscais e ingresso.
- S03 usa `active: true` na projeção interna `/internal/partners/{id}/operations` para permitir novas alocações. O Partner inclui o estado mesmo para inativos; o catálogo autenticado retorna `404` para eles. O histórico de reservas permanece no Booking. O contexto de balcão e a resolução de atribuição de equipe exigem estabelecimento ativo.
- S02/S05: suspensão de estabelecimento é estado do Partner Service. Não altera usuário/Auth ou registros de caixa. O catálogo de ativos e o contexto de balcão retornam 404 para suspensão; o perfil do titular e a administração continuam consultáveis. Coordenar qualquer política de operação financeira durante suspensão no domínio de caixa.

### Roteiro H1 para S07

1. Com dois estabelecimentos fictícios, abrir `/admin/parceiros/{A}/colaboradores/{staffB}`. Esperar erro de carga e ausência de controles de escrita. Conferir `404` na API de staff com `partnerId=A`. Abrir a rota sob B e verificar que a escala anterior permanece.
2. No detalhe de A, abrir **Situação e histórico**, preencher **Motivo da alteração** e usar **Desativar estabelecimento**. Confirmar histórico com motivo/operador, presença no filtro **Inativos**, catálogo fechado e validade da sessão do titular. Com uma sessão de tutor, confirmar que a nova alocação falha e que uma reserva anterior continua consultável. Reabrir pelo filtro **Inativos**, informar outro motivo, reativar e conferir os dois eventos.
3. Em `/app/reivindicar-cadastro`, copiar **Código da conta** do tutor fictício. Em `/partner/clientes` como titular ou recepção autorizada, abrir o cadastro de balcão, selecionar **Gerar código de vinculação**, informar o código da conta, marcar a confirmação presencial e usar **Gerar código**. Em outra sessão de tutor, a mesma prova deve ser rejeitada. Na sessão correta, colar em **Código de vinculação** e selecionar **Vincular cadastro**. Conferir sucesso, mesmo ID de pet no histórico e rejeição ao reapresentar a prova.
4. Em `/admin/clientes`, abrir **Contas da plataforma**. Usar **Desativar conta** com confirmação e verificar a revogação da sessão do tutor de teste. Filtrar inativas, usar **Reativar conta** e obter uma nova sessão. Os passos usam o Auth real e são independentes da situação do estabelecimento.

### Onda B — pontos publicados em 13/11/2026

- S02: Partner verifica destinatário em `GET /internal/reception-claim-customers/{userId}` e verifica emissão de equipe na listagem `GET /auth/team/accesses`. A prova presencial é gerada no Partner e vinculada à conta Auth apresentada pela pessoa verificada no balcão.
- S03: usa `GET /api/v1/internal/partners/me/staff-assignment` com bearer original para autorização de profissional e `GET /api/v1/internal/partners/customer-claims/me` para resolver titularidade de reservas históricas sem reescrever a origem. S04 monta o diálogo publicado pela S03 para o pet selecionado e usa o ator verificado da sessão.
- S07: configurar `AUTH_SERVICE_URL=http://auth-service:8081/api/v1` em Partner/Pet, além do `PARTNER_SERVICE_URL` do Pet. Encaminhar rotas externas novas do contrato com os métodos respectivos e manter as rotas internas fora do ingresso. Gate direto deve verificar 401/403/503 e prova expirada/usada/conta divergente.
- S01: registrar `/app/reivindicar-cadastro` com `src/features/claims/ClaimCustomerPage.tsx` sob CUSTOMER. A rota `/partner/clientes` aceita titular e TEAM_MEMBER com `DESK_CUSTOMERS_MANAGE`; equipe sem essa permissão não entra.
- S01/S07: a aba **Contas da plataforma** de `/admin/clientes` usa o PATCH real da S02 para reativar/desativar com confirmação. Em caso de falha, o diálogo permite nova tentativa; após sucesso, a paginação e filtros são preservados. Exemplo de galeria: botão **Desativar**, diálogo **Desativar conta**, efeito sobre sessões na descrição e confirmação destrutiva.
- S03: a [projeção de pet para a agenda](contracts.md#identificação-mínima-do-pet-para-a-agenda) permite devolver nome/espécie para profissional em uma reserva autorizada. Usar `BOOKING_PET_SUMMARY_TOKEN` na chamada interna, após verificação de atribuição e origem; no frontend usar a resposta de Booking para equipe e ocultar prontuário sem permissão.
- S07: injetar `RECEPTION_CLAIM_TOKEN` em Auth e Partner e `BOOKING_PET_SUMMARY_TOKEN` em Booking, Pet e Partner. Segredos distintos, apenas rede interna. Cobrir pet de tutor e de balcão na agenda do profissional e nova reserva pelo tutor para pet reivindicado.
- S07: incluir `GET /api/v1/partners/me/staff/team-members` no Gateway com o escopo de titular aplicado pelo Partner. A tela Equipe de S02 usa essa leitura para desligar um vínculo antigo antes de reatribuir.
- S07: exercitar emissão e aceite pela interface. Na página do tutor **Reivindicar cadastro**, copiar **Código da conta**. Na página de clientes do parceiro ou da recepção, abrir **Gerar código de vinculação**, informar o código da conta, confirmar a verificação presencial e usar **Gerar código**. Com a conta errada o resgate recebe 404. Com o tutor correto, confirmar acesso ao mesmo ID de pet e reserva, além de recusa ao repetir o resgate. Verificar consulta administrativa e atualização real de conta.
- Primeira rodada S07: o cenário real de equipe parou na preparação porque `prepareConsultation` espera 201 no POST `/partners/{id}/services`. O contrato existente de `PartnerController.addService` retorna 200 com o serviço criado. Pedir à S07 ajustar a expectativa da fixture, inclusive a criação do segundo serviço em `wave-b-team.spec.ts`, e retomar a jornada sem alterar as verificações de autorização. O cenário de API de balcão legado e a regressão fiscal R01-001 passaram nessa rodada.
- R01-B02: `Frontend/src/pages/partner/ColaboradorPage.tsx` foi corrigida com ownership pontual. O teste de onboarding deve seguir diretamente de `/colaboradores/novo` para `/colaboradores/{staffId}`, sem recarregar. Pode reter o GET da escala e verificar que o editor só aparece após a resposta. Em seguida, editar horários e conferir o corpo e o sucesso do PUT, mantendo a inspeção de persistência após o salvamento.

| Dono | Caminho e pedido |
| --- | --- |
| S07 | No Gateway, encaminhar `GET/POST /api/v1/partners/me/customers` e `GET /api/v1/partners/me/customers/{customerId}` ao Partner Service, respeitando a restrição backend `PARTNER`. **Rota administrativa atualizada em 13/11**. Encaminhar `GET /api/v1/admin/reception-customers` e `GET /api/v1/admin/reception-customers/{customerId}` ao Partner Service somente para `ADMIN`. `/api/v1/admin/customers` vai ao Auth S02. Preservar `/api/v1/pets/**` e manter `/api/v1/internal/**` fora do gateway público. Definir `PARTNER_SERVICE_URL=http://partner-service:8083/api/v1` no Pet Service (inclusive nos perfis usados para aceite). |
| S01 | Integrar `Frontend/src/pages/partner/ClientesPage.tsx` na área autenticada de parceiro, em `/partner/clientes`, com o item Clientes. O componente `Frontend/src/pages/admin/ClientesPage.tsx` mantém a rota atual. |
| S02 | Contrato de conta e permissão `DESK_CUSTOMERS_MANAGE` publicado. A habilitação da equipe exige que o Gateway suporte o token de equipe nas rotas protegidas e que o balcão valide a sessão no Auth, verifique parceiro e permissão. A prova individual de reivindicação segue em definição, com escopo e garantias descritos em `contracts.md`. |
| S03 | Em `BookingRequest`, `BookingService`, `PetServiceClient` e persistência da reserva, definir criação de balcão para tutor sem conta. O fluxo atual usa `PetServiceClient.getAccessiblePetOwner` e exige `userId`. A consulta publicada em `GET /api/v1/pets/reception/customers/{customerId}/{petId}` verifica o vínculo com o JWT original e devolve `partnerId` para confrontar com a reserva. Publicar corpo, estados e erros de criação com `customerId` antes de ligar a UI. |
| S05 | Usar a referência `customerId` a partir da reserva de balcão, se necessário, e verificar seu próprio acesso financeiro por estabelecimento. |

## Estado da conexão

- S01 conectou o export padrão de `Frontend/src/pages/partner/ClientesPage.tsx` em `/partner/clientes` sob o guard `PARTNER` e preservou o export padrão da tela de `/admin/clientes` sob `ADMIN`.
- S07 já incluiu as rotas de cadastro e consultas administrativas no Gateway e `PARTNER_SERVICE_URL` no Pet do Compose. O aceite integrado de balcão verifica dois estabelecimentos e perfis de usuário. Para a consulta de contas da plataforma, usar o perfil descartável com `AUTH_S02_ENABLED=true`; o Auth padrão de homologação bloqueia a consulta.

## Exemplos para a galeria de S01

- Em `CustomerDirectory`, usar `<TextField label="Buscar clientes" type="search" placeholder="Nome, e-mail ou telefone" />` e `<Button type="submit" variant="secondary">Buscar</Button>`. Exemplo vazio `<EmptyState icon={Users} title="Nenhum cliente encontrado." description="Confira o nome, e-mail ou telefone e tente outra busca." />`.
- Em `CustomerDetail`, usar `<CardHeader title="Ana Souza" action={<Badge tone="neutral">Sem conta vinculada</Badge>} />`.
- Em `CustomerCreateForm`, usar `<Dialog title="Novo cliente" description="Informe o nome e ao menos uma forma de contato." ...>` com `TextField` para Nome do tutor (obrigatório), E-mail e Telefone. Exemplo de erro do formulário `Informe e-mail ou telefone do tutor.`. Em `ReceptionPetCreateForm`, usar `<SelectField label="Espécie" name="species" required>` com Cão, Gato, Ave e Outro.

## Aceite com S07

1. Com o titular A, cadastrar um cliente e um pet pela página. Repetir os cadastros com os mesmos dados já normalizados e conferir a rejeição de duplicidade.
2. Com o titular B, conferir lista vazia e `404` ao trocar o ID de cliente, pet ou estabelecimento quando aplicável. Um tutor com o mesmo e-mail não recebe acesso. A operação de prontuário por ID continua indisponível para o pet de balcão.
3. Com ADMIN, consultar e paginar cadastros pelo nome. Confirmar `403` ao repetir a chamada com PARTNER. Com o perfil descartável de S02 habilitado, consultar contas da plataforma e filtrar o estado.

## Dependências fora do recorte

- S01 e S03 registraram três erros `TS2741` de `NO_SHOW` em `Frontend/src/pages/admin/tabs/AgendamentosTab.tsx` e `Frontend/src/pages/partner/DashboardPage.tsx`. Repetir o build completo após a correção pelos donos.

## R01-001 — migração dos consumidores

| Dono | Chamadores e ajuste |
| --- | --- |
| S03 | Trocar `/partners/{id}` por `/internal/partners/{id}/operations` em `Backend/Booking-Service/src/main/java/br/com/easypet/booking/client/PartnerServiceClient.java` (detalhe da agenda e capacidade) e `Backend/Booking-Service/src/main/java/br/com/easypet/booking/service/PartnerIntegrationService.java` (expediente). O JWT original continua no header. `/partners/me` continua resolvendo o titular. |
| S05 | Trocar `/partners/{id}` por `/internal/partners/{id}/operations` em `Backend/Payment-Service/src/main/java/br/com/easypet/payment/client/PartnerServiceClient.java`, usado por criação/alteração de template de pacote para verificar `services[].id`. O caixa já usa `/partners/me` e `/partners/catalog/{id}`. |
| S07 | Validar as chamadas em rede interna com bearer original (inclusive agenda consultada pelo tutor) e confirmar que o Gateway/Nginx mantêm `/internal/**` bloqueado no ingresso. Manter `GET /partners` e `GET /partners/{id}` fora da exposição pública e preservar as rotas de catálogo, administração e titular. Validar os três serviços com as mudanças correspondentes no mesmo aceite. |

O contrato da nova projeção está em [contracts.md](contracts.md#leituras-de-estabelecimento--r01-001). O catálogo atual cobre o expediente e os serviços, mas omite capacidade e exclui estabelecimentos inativos; os consumidores precisam dos campos operacionais legados nesses casos. Nenhum consumidor direto da coleção completa foi encontrado.

Revalidação no checkout após a mudança: o Booking concentra os dois usos em `PartnerServiceClient` e já chama a projeção interna, com o expediente no mesmo DTO. O Payment já chama a projeção interna no `PartnerServiceClient` de pacotes. A validação cruzada na stack continua com S07.
