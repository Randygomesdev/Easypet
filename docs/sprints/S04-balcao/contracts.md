# Contratos S04

## H1 — configuração e administração (13/11/2026)

### Dados de configuração para o checklist S01

Titular autenticado usa `GET /api/v1/partners/me`. `404` indica estabelecimento ainda ausente; `401`, `403`, `429` e `503` são falhas da consulta. O corpo inclui `id`, `active`, `services[]` (campos `id`, `active`, `durationMinutes`, `price`, `billingUnit`, `bookingType`, `categoryId`) e `businessHours[]`. `GET /api/v1/partners/{id}/staff` lista colaboradores com `id`, `partnerId`, `status` e `serviceIds`. `GET /api/v1/partners/staff/{staffId}/schedule?partnerId={id}` lista a escala real (`dayOfWeek` 1=domingo, `startTime`, `endTime`, almoço opcional). Uma escala vazia é `200 []`. A presença de escala válida de profissional ativo vinculado a um serviço ativo comprova configuração cadastrada. Disponibilidade para uma reserva específica é calculada pelo Booking. As leituras são repetíveis, sem corpo, e usam o bearer original.

### Escritas e estados operacionais

- As rotas `/partners/staff/{staffId}`, `/schedule` e `/absences` aceitam `?partnerId={id}` para confirmar o contexto exibido. Retornam `404` se o profissional for de outro estabelecimento, inclusive para ADMIN. Os controles atuais de titularidade e papel também se aplicam. As telas administrativas enviam esse contexto nas leituras e escritas.
- Edição de serviço usa `PUT /partners/{partnerId}/services/{serviceId}` com `ServiceOfferRequest`, preservando o ID e vínculos omitidos. O serviço e os colaboradores escolhidos devem pertencer ao mesmo estabelecimento. Perfil do estabelecimento usa PUT sem `services` ou `active`; o backend retorna `409` para tentativas de substituição integral de serviços ou mudança de situação pelo PUT. A remoção de serviço fica indisponível nesta homologação até política de impacto nas reservas existentes.
- `GET /admin/partners?active=false&name=...&page=0&size=20` lista inativos. Sem `active` continua listando ativos (compatibilidade); `active=true` também é aceito. `GET /admin/partners/{id}` e a lista devolvem `active`.
- `PATCH /admin/partners/{id}/active`, somente ADMIN, recebe `{ "active": false, "reason": "Pausa de operação na homologação" }` (motivo obrigatório, até 500 caracteres). Retorna `200 PartnerResponse`. Mesmo estado é operação sem efeito adicional. Alteração grava evento e estado na mesma transação com ator Auth, estabelecimento, motivo, situação anterior/nova e data. `GET /admin/partners/{id}/status-history?page=0&size=20` devolve os eventos paginados. O antigo `DELETE /partners/{id}` retorna `409` e orienta usar a operação administrativa. Migration Partner V20 adiciona auditoria; a alteração de situação preserva IDs e histórico e acontece no domínio Partner, sem mudar identidade/Auth.
- A criação de perfil `POST /partners` é exclusiva do titular `PARTNER`. A combinação usuário Auth/estabelecimento é única. Duplicidade de conta ou CNPJ retorna `409`. A V20 aplica unicidade a `user_id` preenchido. Em uma base preexistente, duplicidades desse campo impedem a aplicação da migration até identificação do vínculo válido. Nenhuma linha é removida pela migration.

### Cobertura de arquivos

- Pet persiste `pets.picture_url` e `exams.file_url` como texto PostgreSQL. `PetResponse` lê a URL da foto já presente, mas `PetRequest` não recebe/persiste esse campo no cadastro atual. A interface de upload chama `/files/upload`, sem serviço dono ou rota no Gateway de homologação. Exame recebe a URL e devolve a referência. Nenhum dos endpoints Pet grava uma cópia do arquivo.
- Partner persiste `partners.picture_url`, `partner_gallery.picture_url` e `staff.photo_url` como referências PostgreSQL. Os assets empacotados pelo frontend são recuperados pelo código/versionamento do artefato.
- Dumps dos bancos cobrem URLs e metadados. Bytes de fotos/exames servidos por terceiros dependem de backup e restauração no storage que os possui. O Compose de homologação não contém volume de mídia do Pet/Partner. Não há acervo gerenciado de anexos a restaurar nesta entrega.

## Onda B — sessão, escala e reivindicação (13/11/2026, implementado)

Partner e Pet validam o JWT original via `GET /api/v1/auth/session` a cada operação protegida, sem cache. `401` indica sessão ausente, inválida ou revogada. `403` indica sessão válida sem papel/permissão. Timeout, resposta inválida ou indisponibilidade do Auth retornam `503`. Saúde e documentação continuam independentes. Configurar `AUTH_SERVICE_URL` com o prefixo `/api/v1`; sessão do Auth não chama Partner ou Pet.

O balcão aceita o titular `PARTNER` e `TEAM_MEMBER` com `DESK_CUSTOMERS_MANAGE` e `partnerId` retornado pelo Auth, sempre em estabelecimento ativo. Conserva o JWT original em Pet → Partner. `GET /partners/me` e as leituras completas de perfis fiscais continuam com o acesso de R01-001. Para identificar um estabelecimento operacional sem dados fiscais, usar `GET /partners/me/desk` (titular ou gestor/recepção com essa permissão; retorna `{ "partnerId": "<uuid>" }`).

### Vínculo entre equipe e escala

| Método e rota (base `/api/v1`) | Autorização e semântica |
| --- | --- |
| `PUT /partners/me/staff/{staffId}/team-member` | Titular `PARTNER` do estabelecimento. Corpo `{ "userId": "<uuid-da-conta-de-equipe>" }`. Valida vínculo Auth ativo do estabelecimento e profissional da escala ativo. `200` com `{ "partnerId": "<uuid>", "userId": "<uuid>", "staffId": "<uuid>" }`. Repetição com o mesmo par é segura. Uma conta pode ocupar somente um profissional da escala, e vice-versa. Vínculo divergente retorna `409`; desvincular explicitamente antes de trocar. |
| `DELETE /partners/me/staff/{staffId}/team-member` | Titular. `204` inclusive em repetição, dentro do seu estabelecimento. |
| `GET /partners/me/staff/team-members` | Titular. Lista de atribuições persistidas no próprio estabelecimento, cada uma com `partnerId`, `userId`, `staffId` e `teamAccessId`. Inclui vínculo revogado para permitir desvinculação explícita e nova atribuição. |
| `GET /internal/partners/me/staff-assignment` | `TEAM_MEMBER` com `BOOKINGS_ASSIGNED_READ` ou `BOOKINGS_ASSIGNED_ATTEND`, com JWT original na rede interna. Sem parâmetros. `200` com `partnerId`, `userId`, `staffId` obtidos do vínculo persistido. `404` para vínculo ausente, profissional inativo ou estabelecimento indisponível. |

O Booking confere o `partnerId` e o `userId` com a sessão Auth e compara o `staffId` verificado com a reserva. O operador nunca escolhe seu próprio vínculo. Partner verifica no Auth o `userId`, o `id` do acesso ativo `PROFESSIONAL` e o estabelecimento. Atribuição e resolução retornam também `teamAccessId`. A resolução compara a sessão com esse vínculo, mesmo após novo convite para a conta.

### Reivindicação do cadastro de balcão

- `POST /partners/me/customers/{customerId}/claims` com `{ "userId": "<uuid-da-conta-do-tutor>" }`. Titular ou equipe de balcão autorizada, após verificar a identidade do tutor no estabelecimento. `201 { "token": "<prova>", "expiresAt": "<instant>" }`. A prova é mostrada uma vez e pode ser entregue presencialmente. Validade de 15 minutos. Emitir novamente revoga a prova anterior ainda aberta. O Partner confirma a conta ativa no Auth com `GET /internal/reception-claim-customers/{userId}` e `RECEPTION_CLAIM_TOKEN`; conta incompatível retorna `404` e falha na verificação retorna `503`. Consumo atômico no banco.
- `POST /partners/customer-claims/redeem` com `{ "token": "<prova>" }`. Apenas tutor `CUSTOMER` autenticado. `200 { "customerId": "<uuid>", "partnerId": "<uuid>", "claimedAt": "<instant>" }`. A sessão deve corresponder ao `userId` destinatário e deve apresentar a prova aleatória. Para prova inválida ou conta divergente, `404`. Expirada, `410`. Usada ou substituída, `409`. A posse de um e-mail ou UUID isolado não satisfaz a verificação.
- Frontend S01 registra `/app/reivindicar-cadastro` sob `CUSTOMER`, com o export padrão de `Frontend/src/features/claims/ClaimCustomerPage.tsx`. O tutor copia o código de conta da página, mostra ao operador que verifica sua identidade e informa a prova nessa mesma página. O token fica no corpo HTTP.
- Partner registra vínculo e auditoria com usuário, operador, estabelecimento e datas. Pet resolve a titularidade junto ao Partner sob o JWT do tutor, preservando IDs de pet e registros históricos. S03 precisa resolver as reservas já criadas para o cadastro através de `GET /internal/partners/customer-claims/me` (JWT `CUSTOMER`; lista de `{ customerId, partnerId }` já reivindicados). A origem e os autores históricos são preservados.

Partner `V18__add_staff_team_assignment.sql` inclui os IDs do vínculo corrente da equipe na escala. `V19__add_reception_customer_claims.sql` adiciona a associação do tutor e grava em tabela de auditoria o digest, o destinatário, o emissor, o estabelecimento, a expiração e o estado de consumo ou revogação. Os campos e caminhos da onda anterior seguem descritos nas seções abaixo.

### Identificação mínima do pet para a agenda

`GET /api/v1/internal/pets/{petId}/booking-summary` é exclusivo do Booking, autenticado por `Authorization: Bearer <BOOKING_PET_SUMMARY_TOKEN>`. O Booking verifica a sessão do operador e acesso à reserva, inclusive vínculo de escala do profissional, antes de consultar a projeção com o `petId` da própria reserva. Enviar `ownerId` quando a reserva tem tutor Auth. Para a reserva de balcão, enviar `receptionCustomerId` e `partnerId` do atendimento. Exigir exatamente uma dessas duas origens. Exemplo de resposta `200 {"id":"<uuid>","name":"Pipoca","species":"DOG"}`. Retorna `400` para parâmetros incoerentes, `401` para credencial de serviço incorreta/ausente, `404` para pet ausente ou com origem divergente e `503` sem segredo configurado. Inclui pets inativos para exibição do histórico. A leitura não concede acesso ao prontuário. Gateway e Nginx mantêm a rota fora do ingresso.

Quando uma nova reserva via conta Auth usa um pet originalmente de balcão, Pet confirma a titularidade no Partner com `GET /api/v1/internal/partners/customer-claims/{customerId}/owner?partnerId=...&userId=...`. A chamada Pet → Partner usa o mesmo segredo da consulta de agenda, configurado também no Partner. A resposta `204` confirma os três IDs, `404` indica divergência e `503` indica verificação indisponível. O endpoint não retorna dados pessoais nem aceita JWT de usuário como credencial de serviço.

### Cadastro e consulta de recepção

Base HTTP `/api/v1`. IDs são UUIDs. `customerId` identifica o cadastro local e `partnerId` identifica o estabelecimento. IDs de contas Auth e de animais são referências independentes. As operações de balcão usam o escopo de sessão descrito na onda B.

## Clientes e vínculo ao estabelecimento

| Método e caminho | Acesso | Contrato |
| --- | --- | --- |
| `GET /partners/me/customers?q=&page=0&size=20` | Titular ou equipe de balcão autorizada | Lista paginada do estabelecimento, com busca parcial por nome, e-mail ou telefone. |
| `POST /partners/me/customers` | Titular ou equipe de balcão autorizada | Recebe `{ "name": "Marina Silva", "email": "marina@example.test", "phone": "(48) 99999-1234" }`. Requer nome e ao menos um contato. Retorna `201` e cadastro. |
| `GET /partners/me/customers/{customerId}` | Titular ou equipe de balcão autorizada | Retorna o cadastro do estabelecimento. Recurso ausente ou de outro estabelecimento retorna `404`. |
| `GET /admin/reception-customers?q=&page=0&size=20` | `ADMIN` | Lista paginada dos cadastros de balcão. |
| `GET /admin/reception-customers/{customerId}` | `ADMIN` | Detalhe administrativo do cadastro de balcão. |
| `GET /internal/partners/me/customers/{customerId}/membership` | Titular ou equipe de balcão autorizada, com o JWT do operador | Prova de vínculo ativo para Pet. Retorna `{ "customerId": "<uuid>", "partnerId": "<uuid>" }` ou `404`. Sem dados de contato. |

As listas usam `{ "content": [], "number": 0, "size": 20, "totalElements": 0, "totalPages": 0 }`. Tamanho de 1 a 100. Um cadastro retorna `id`, `partnerId`, `partnerName`, `name`, `email`, `phone`, `accountStatus` (`UNCLAIMED` ou `CLAIMED`) e `createdAt`. Contatos ausentes são `null`. O índice de duplicidade usa nome normalizado junto com e-mail normalizado ou telefone apenas com dígitos, por estabelecimento. Contatos compartilhados por pessoas com nomes diferentes são aceitos. A repetição de cadastros equivalentes retorna `409` inclusive em concorrência. Repetições de leituras são seguras.

A consulta de contas da plataforma no painel administrativo usa `GET /admin/customers` do Auth conforme o [contrato S02](../S02-identidade/contracts.md#administração-de-clientes). A tela usa o filtro `active` e os estados de conta retornados pela API. A disponibilidade depende da configuração do Auth no ambiente.

## Pets de recepção

| Método e caminho | Acesso | Contrato |
| --- | --- | --- |
| `GET /pets/reception/customers/{customerId}?q=&page=0&size=20` | Titular ou equipe de balcão autorizada | Lista paginada dos pets vinculados ao cadastro, filtro parcial por nome. |
| `POST /pets/reception/customers/{customerId}` | Titular ou equipe de balcão autorizada | Recebe `{ "name": "Pipoca", "species": "DOG", "breed": "SRD", "gender": "FEMALE", "weight": 8.2, "birthDate": "2022-04-10" }` com `microchipNumber` opcional. Retorna `201`. |
| `GET /pets/reception/customers/{customerId}/{petId}` | Titular ou equipe de balcão autorizada | Consulta cadastral para confirmar o pet e o vínculo antes de reservar. |

Pet repete a verificação de vínculo no Partner Service a cada requisição. O cadastro retorna `id`, `customerId`, `partnerId`, `name`, `species`, `breed`, `gender`, `weight`, `birthDate`, `microchipNumber`. Repetir nome normalizado, espécie e nascimento para o mesmo cadastro retorna `409`. Microchip é único no Pet Service e um conflito também retorna `409`, sem detalhes do registro existente. Acessos de outro estabelecimento, cliente ou pet ausente retornam `404`. O cadastro de balcão não constitui autorização para consultar ou escrever prontuário. Pets de tutores com conta continuam acessíveis pelas APIs vigentes e pelas regras de reserva vigentes.

## Erros, autenticação e persistência

`400` entrada inválida, `401` JWT ausente/inválido, `403` papel incompatível, `404` recurso indisponível no escopo do ator, `409` conflitos de cadastro e `503` quando Pet não puder validar o vínculo. Corpo de erro com `message` e, quando houver, `errors` por campo. As requisições de cadastro não criam conta Auth, agendamento ou pagamento. Nenhuma API confia em ID de estabelecimento ou de conta enviado no corpo.

- Partner `V17__create_reception_customers.sql`: cadastro, FK para `partners` e índices de unicidade por estabelecimento e contato normalizado.
- Pet `V10__add_reception_pet_membership.sql`: vínculo explícito `reception_customer_id` e `reception_partner_id`; suporte a `owner_id` ausente para pets de balcão. Mantém os dados e IDs dos pets existentes.

## Leituras de estabelecimento — R01-001

Todas as operações abaixo são leituras repetíveis, sem corpo. Encaminhar `Authorization: Bearer <JWT original>`. Ausência ou invalidez de JWT retorna `401`, papel ou titularidade incompatível retorna `403` e estabelecimento inexistente retorna `404`.

| Método e caminho | Autorização | Resposta |
| --- | --- | --- |
| `GET /partners` | `ADMIN` | Página existente de `PartnerResponse`, com filtros `category`, `name`, `page` e `size`. |
| `GET /partners/{partnerId}` | `ADMIN` ou `PARTNER` titular daquele estabelecimento | `PartnerResponse` completo. Titular de outro estabelecimento recebe `403`. |
| `GET /partners/me` | `PARTNER` | `PartnerResponse` do titular, resolvido pelo ID autenticado. |
| `GET /admin/partners`, `GET /admin/partners/{partnerId}` | `ADMIN` | Consultas administrativas existentes. |
| `GET /partners/catalog`, `GET /partners/catalog/{partnerId}` | JWT válido no Partner Service | Projeção existente `CatalogPartnerResponse` dos estabelecimentos ativos. |
| `GET /internal/partners/{partnerId}/operations` | JWT de usuário válido, encaminhado pelo consumidor na rede interna | `200` com `id`, `name`, `boardingCapacity`, `businessHours`, `services` e `active` (H1). Inclui estabelecimento inativo para consulta histórica. A nova alocação no Booking exige `active: true`. |

A projeção interna reutiliza `PartnerBusinessHourResponse`, com `dayOfWeek`, `businessStartHour`, `businessEndHour`, `lunchStartHour`, `lunchEndHour` e `closed`. Cada serviço contém `id`, `name`, `price`, `durationMinutes` e `billingUnit`. Exemplo com agenda e um serviço:

```json
{
  "id": "d48940ff-fd89-46c4-a468-b80361718888",
  "name": "Pet da Praça",
  "boardingCapacity": 4,
  "businessHours": [{"dayOfWeek":"MONDAY","businessStartHour":"08:00","businessEndHour":"18:00","lunchStartHour":null,"lunchEndHour":null,"closed":false}],
  "services": [{"id":"1ada5e47-3611-487d-9f14-d13d60794f2e","name":"Banho","price":60.00,"durationMinutes":45,"billingUnit":"HOURLY"}]
}
```

Booking usa capacidade, expediente e dados de preço/duração/unidade. Payment usa o ID do serviço para confirmar associação em operações de pacote. A projeção exclui dados fiscais, contatos, endereço, equipe e informações de administração. O Gateway e o Nginx mantêm `/api/v1/internal/**` fora do ingresso público. A mudança dispensa migration e configuração de credenciais.
