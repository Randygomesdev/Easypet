# Contratos S02

## H1-02 — homologação interna, 13/11/2026

### Conta de teste pelo console

O operador usa `ProvisionPilotUser ADMIN admin@example.test "Admin de homologação"` com o perfil `homolog` ativo, inclusive `prod,homolog` no Compose. `PARTNER` e `CUSTOMER` continuam disponíveis. O comando pede senha e confirmação no terminal interativo, exige 12 caracteres no mínimo e até 72 bytes UTF-8, e devolve apenas ID e papel no sucesso. Um e-mail já existente é recusado, inclusive com capitalização diferente. O comando cria uma conta nova e preserva papel, senha e estado de contas existentes. `ADMIN` deve usar endereço fictício `@example.test`. O acesso administrativo exige a sessão Auth real.

### Configuração mínima do Auth

| Variável | Valor ou condição em homologação |
| --- | --- |
| `SPRING_PROFILES_ACTIVE` | `prod,homolog` no artefato de homologação. |
| `AUTH_DB_URL`, `AUTH_DB_USERNAME`, `AUTH_DB_PASSWORD`, `JWT_SECRET` | Banco Auth do próprio ambiente e assinatura legada existente. `JWT_SECRET` tem pelo menos 32 bytes. |
| `AUTH_S02_ENABLED` | `true` libera recuperação, convites, gestão de equipe e administração de contas. Login e consulta de sessão independem da flag. Cadastro público e OAuth ficam fechados no perfil `homolog`. |
| `AUTH_TEAM_JWT_SECRET`, `PARTNER_SERVICE_URL` | Obrigatórios com S02 habilitada em homologação. Chave de pelo menos 32 bytes exclusiva do Auth e distinta de `JWT_SECRET`. URL interna explícita com `/api/v1`, por exemplo `http://partner-service:8083/api/v1`. |
| `AUTH_MAIL_ENABLED`, `FRONTEND_URL` | Com envio habilitado, informar a origem web usada no navegador, HTTPS em homologação publicada ou HTTP em loopback local. A origem não inclui caminho, query, credenciais ou fragmento. |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_FROM` | Com envio habilitado, valores explícitos. Em homologação, usar o coletor interno `smtp-capture`, porta `1025` e remetente fictício como `auth@example.test`. Auth limita o envio em homologação a `@example.test`. |
| `MAIL_SMTP_AUTH`, `MAIL_STARTTLS_ENABLED` | `false` no coletor SMTP interno descartável. Com autenticação habilitada, informar `MAIL_USERNAME` e `MAIL_PASSWORD`. |
| `NOTIFICATION_RECIPIENT_TOKEN`, `RECEPTION_CLAIM_TOKEN` | Segredos distintos entre si e das chaves JWT. Compartilhar respectivamente com Notification e Partner. O endpoint interno correspondente retorna 503 se o segredo estiver ausente. |
| `VITE_AUTH_RECOVERY_ENABLED`, `VITE_WAVE_B_ENABLED` | `true` no build web correspondente. Login Google e registro permanecem ocultos no piloto. |

Configuração estrutural inválida de recurso habilitado impede a inicialização do Auth, com diagnóstico que identifica a variável. SMTP desabilitado retorna 503 ao solicitar recuperação ou emitir convite. Com o SMTP habilitado, a recuperação conserva a resposta genérica e o convite confirma criação após persistir. A entrega assíncrona é verificada no coletor. A UI apresenta 429/503 como recuperáveis e conserva os dados para reenvio explícito.

### Operação de contas e investigação

O operador autorizado do ambiente cria contas base pelo terminal após as migrations. Para ADMIN, substituir o papel no procedimento da Infra por `ADMIN admin@example.test 'Admin de homologação'`. Guardar o UUID e o papel fornecidos pelo comando no registro da operação. Senha e links de recuperação/convite ficam fora desse registro.

- ADMIN consulta contas de tutor em **Clientes → Contas da plataforma** e confirma a alteração do estado. A desativação invalida sessão e links de recuperação pendentes. Reativar exige novo login. A API administrativa de clientes modifica somente contas CUSTOMER.
- O titular consulta perfil, estado e validade dos convites em **Equipe**. O registro do vínculo guarda ID do estabelecimento, criador e revogador, com timestamps de criação e atualização. O convite pendente pode ser revogado e emitido novamente caso o coletor não registre a entrega. Convites e resets persistem o digest e o estado, com entrega assíncrona após commit.
- O operador investiga com horário, ID de requisição do ingresso, UUID da conta/vínculo, papel e status HTTP. A confirmação de entrega vem da caixa do coletor interno. A listagem de clientes fornece estado atual e o Auth mantém versão da sessão e atualização da conta. O estado de CUSTOMER ainda carece de trilha persistida por mudança com o autor administrativo. A operação de ADMIN pelo terminal depende dos registros de acesso ao host e do UUID retornado.
- Privacidade, termos, retenção, procedimento de suporte e decisões comerciais seguem para definição humana antes de uso real.

Todos os caminhos de API abaixo começam com `/api/v1`. As rotas protegidas recebem `Authorization: Bearer <jwt>`. UUIDs são strings. Erros usam `{status, message, code?}`, com `errors` nos erros de campos. 401 significa sessão ausente ou inválida e 403 significa sessão sem permissão.

## Registro e recuperação

| Método e caminho | Autenticação e entrada | Sucesso | Erros e repetição |
| --- | --- | --- | --- |
| POST `/auth/register` | Público. `{name,email,password}` | 201 `{token,id,name,email,role:"CUSTOMER",pictureUrl}` | 400 validação, 409 e-mail já cadastrado. Uma conta por e-mail. |
| POST `/auth/register/partner` | Público. Mesmo corpo | 201 com `role:"PARTNER"` | Mesmas regras. Campos adicionais como `role` não influenciam a atribuição. O estabelecimento é criado depois no Partner Service. |
| POST `/auth/forgot-password` | Público. `{email}` | 200 sem corpo para qualquer e-mail válido quando o transporte está habilitado | 400 validação, 503 quando o transporte está desabilitado. Uma nova solicitação invalida o link anterior. |
| POST `/auth/reset-password/validate` | Público. `{token}` | 200 sem corpo | 400 com `RESET_TOKEN_INVALID`, `RESET_TOKEN_EXPIRED` ou `RESET_TOKEN_USED`. A validação pode ser repetida. |
| POST `/auth/reset-password` | Público. `{token,newPassword}` | 200 sem corpo | Mesmos códigos. O link só pode ser consumido uma vez, inclusive com requisições concorrentes. |

Exemplo de cadastro `{"name":"Ana Souza","email":"ana@example.test","password":"senha-teste"}`. As senhas novas têm no mínimo seis caracteres e devem caber no limite de 72 bytes do BCrypt. A recuperação expira em 24 horas. O link aponta para `FRONTEND_URL/reset-password?token=...`. Apenas o e-mail contém o segredo. O Auth rejeita tokens de sessão anteriores à troca de senha.

## Administração de clientes

| Método e caminho | Entrada | Sucesso |
| --- | --- | --- |
| GET `/admin/customers` | `page=0&size=20&q=ana&active=true`. `q` e `active` opcionais, tamanho entre 1 e 100. Busca por nome ou e-mail. | 200 `{content:[{id,name,email,active}],page,size,totalElements,totalPages}` em ordem de nome e ID. |
| PATCH `/admin/customers/{id}/active` | `{"active":false}` ou `{"active":true}` | 200 `{id,name,email,active}`. Repetir o estado atual preserva o estado e a versão da sessão. |

Ambos exigem `ADMIN`. 404 na alteração quando o ID não é de uma conta `CUSTOMER`. Ao desativar, o Auth rejeita login e JWTs existentes. Reativar a conta exige novo login. Senhas, tokens, papéis e dados de outros serviços ficam fora dos DTOs de listagem.

## Equipe e autorização para S03, S04, S05 e S06

O Auth é dono da conta individual e do vínculo de acesso. `partnerId` é o ID do estabelecimento no Partner Service. `userId` é o autor no Auth, distinto de `staffId`, que representa o profissional na escala. Um vínculo individual está associado a um estabelecimento. Nesta fatia o titular `PARTNER` administra convites e revogações, e contas individuais usam o papel global `TEAM_MEMBER`.

| Método e caminho | Autenticação e entrada | Sucesso | Erros e repetição |
| --- | --- | --- | --- |
| POST `/auth/team/invitations` | Titular `PARTNER`. `{email,accessRole}`. O Auth resolve o estabelecimento usando `GET /partners/me` e confirma que está ativo em `GET /partners/catalog/{id}`, com o bearer original. | 201 `{id,partnerId,email,accessRole,status:"PENDING",expiresAt}` | 404 sem estabelecimento, 409 se já houver convite válido ou vínculo ativo ou se a conta for de outro tipo, 503 se a verificação ou configuração de e-mail estiver indisponível. Após expiração pode emitir outro convite. |
| POST `/auth/team/invitations/accept` | Público. `{token,name,password}`, com token entregue no e-mail e vinculado ao e-mail convidado | 200 `{id,partnerId,email,accessRole,status:"ACTIVE",expiresAt}`. Login separado por `/auth/login`. | 400 `INVITATION_INVALID`, `INVITATION_EXPIRED` ou `INVITATION_USED`. 409 quando o e-mail já tem outro tipo de conta ou vínculo ativo. |
| DELETE `/auth/team/accesses/{id}` | Titular `PARTNER`, mesmo mecanismo de resolução de estabelecimento. `id` é o ID recebido na criação do convite. | 204 para convite ou vínculo do estabelecimento, inclusive se já revogado | 404 quando inexistente ou de outro estabelecimento. |
| GET `/auth/team/accesses` | Titular `PARTNER`, mesmo mecanismo de resolução | 200 com lista de `{id,partnerId,email,accessRole,status,expiresAt}` do próprio estabelecimento | 404 sem estabelecimento, 503 se a verificação estiver indisponível. |
| GET `/auth/session` | Bearer do usuário original | 200 `{userId,role,partnerId,accessRole,permissions}`. Papéis legados retornam `partnerId:null`, `accessRole:null` e `permissions:[]`. | 401 para conta inativa, versão antiga, vínculo revogado ou JWT inválido. 503 se a sessão não puder ser verificada. Resposta sem cache. |

Convite expira em 48 horas e pode ser revogado antes do aceite. Os estados da listagem são `PENDING`, `ACTIVE`, `EXPIRED` e `REVOKED`. O convite usa o caminho web `/team/invitation?token=...` quando a interface for integrada.

Exemplo para recepção: `{"userId":"<uuid>","role":"TEAM_MEMBER","partnerId":"<uuid>","accessRole":"RECEPTION","permissions":["BOOKINGS_READ","BOOKINGS_WRITE","DESK_CUSTOMERS_MANAGE","CASH_RECEIVE"]}`.

| Acesso | Permissões de domínio |
| --- | --- |
| `MANAGER` | `BOOKINGS_READ`, `BOOKINGS_WRITE`, `DESK_CUSTOMERS_MANAGE`, `CASH_RECEIVE`, `CASH_CLOSE` |
| `RECEPTION` | `BOOKINGS_READ`, `BOOKINGS_WRITE`, `DESK_CUSTOMERS_MANAGE`, `CASH_RECEIVE` |
| `PROFESSIONAL` | `BOOKINGS_ASSIGNED_READ`, `BOOKINGS_ASSIGNED_ATTEND` |

Para habilitar equipe, o Gateway/serviço protegido deve consultar o Auth com o bearer original, falhar fechado em erro/indisponibilidade, conferir `partnerId` contra o recurso e exigir a permissão explícita. As permissões `BOOKINGS_ASSIGNED_*` exigem também vínculo verificado com o profissional escalado. Em ações internas de S06, identidade de usuário não substitui autenticação entre serviços. Os JWTs de equipe usam assinatura reservada ao Auth. O aceite da equipe no Auth não libera o papel nos serviços legados. A revogação em Auth vale na próxima autorização, sem esperar o JWT expirar.

Para S05, `CASH_RECEIVE` cobre consulta de cobranças e seus movimentos, criação de cobrança e registro de recebimento. `CASH_CLOSE` cobre extrato diário, ajuste de recebimento e fechamento. A primeira entrega de caixa segue com acesso de titular até essa verificação ser integrada ao Payment e Booking.

### Tutor e cliente de balcão

`CUSTOMER` identifica uma conta do Auth. Use `userId` da sessão verificada como ID do tutor autenticado. O identificador do cadastro de balcão pertence ao S04 e deve ser distinto do ID do Auth; nome, e-mail, telefone e conhecimento de um UUID não comprovam titularidade. Não criar uma conta Auth automaticamente a partir do cadastro de balcão e não usar a consulta legada `/users/{id}` para buscar tutores globalmente. Qualquer reivindicação futura requer prova de controle pelo tutor autenticado e associação explícita e auditável ao cadastro de balcão. O vínculo com conta Auth pode ficar ausente.

## Onda B — contrato de consumo publicado em 13/11/2026

### Sessão entre serviços

`GET http://auth-service:8081/api/v1/auth/session` recebe o bearer original, com assinatura legada ou privativa do Auth. A consulta usa somente o banco do Auth. No perfil homolog, a consulta direta fica disponível independentemente de `AUTH_S02_ENABLED`. Gateway encaminha seu próprio caminho `/api/v1/auth/session` ao Auth sem consultar a sessão antes. Em toda outra rota protegida, o Gateway valida a sessão e o serviço de destino repete a consulta, inclusive em acesso direto. Usar timeout de conexão e leitura e nenhuma cache de sessão ou permissões.

1. Somente após 200 com corpo válido, usar `userId` como ator. Para `TEAM_MEMBER`, exigir `partnerId` igual ao estabelecimento do recurso e a permissão de operação presente em `permissions`. Para `PARTNER`, resolver propriedade no serviço dono do recurso ou em Partner com o bearer original. `ADMIN` e `CUSTOMER` continuam sujeitos aos controles de papel e recurso. IDs, papéis e permissões em headers enviados pelo cliente não são fonte de autorização.
2. Responder 401 se o bearer estiver ausente ou se o Auth retornar 401. Uma resposta válida com papel, escopo ou permissão insuficiente resulta em 403, ou 404 quando a API já protege a existência de recurso de outro estabelecimento.
3. Responder 503 em timeout, falha de conexão, 5xx, corpo incompleto ou qualquer status inesperado na consulta. A operação protegida só segue após a validação positiva.

Exemplo legado `{"userId":"43bf8767-c38a-4ca8-a09a-bb680a2897be","role":"PARTNER","partnerId":null,"accessRole":null,"permissions":[],"teamAccessId":null,"name":"Titular"}`. `name` é o nome de exibição, usado pelo Partner na autoria das avaliações. O contrato de sessão não retorna e-mail. Em tokens antigos sem versão, o Auth assume versão inicial 0 e continua exigindo que identidade, papel e estado da conta coincidam.

### Destinatário de notificação

`GET /api/v1/internal/notification-recipients/{userId}` usa `Authorization: Bearer <NOTIFICATION_RECIPIENT_TOKEN>`. A chave é dedicada, independente das assinaturas JWT e do token de outbox. Retorna 200 com `{"email":"tutor@example.test"}` para conta `CUSTOMER` ativa com endereço elegível, 404 quando não houver destinatário, 401 para credencial ausente/incorreta e 503 quando o segredo ou o banco estiver indisponível. Respostas usam `Cache-Control: no-store`. A operação é somente leitura e pode ser repetida. Usar o endereço apenas na entrega, fora dos logs, outbox e tabelas de Notification. A rota é interna e não deve aparecer no ingresso.

### Gestão e vínculo de equipe

A listagem do titular em `GET /auth/team/accesses` acrescenta `userId` à resposta de cada item ativo. Os demais retornam `userId:null`. A sessão acrescenta `teamAccessId`, igual ao `id` desse item para equipe e `null` para os demais papéis. O Partner valida que o acesso está ativo, é `PROFESSIONAL` e pertence ao estabelecimento antes de gravar `staffId`, `userId` e o ID do acesso corrente. A resolução compara o ID persistido com `teamAccessId` da sessão. Assim, um novo convite para a mesma conta não reativa uma atribuição antiga. O Auth não aceita `staffId` no cadastro ou aceite. Antes de aplicar `BOOKINGS_ASSIGNED_*`, Booking consulta a associação no Partner, com o bearer original.

### Reivindicação de balcão

O Auth fornece a identidade da sessão `CUSTOMER` e rejeita tokens revogados ou inativos. Partner é dono da prova e do cadastro e segue a [prova presencial S04](../S04-balcao/contracts.md#reivindicação-do-cadastro-de-balcão). A prova vincula o cadastro e o estabelecimento ao `userId` específico do tutor. O aceite usa o `userId` da sessão Auth, expiração e consumo atômico no Partner. Reservas e pets continuam referenciados pelos IDs históricos.

Antes de emitir a prova, o Partner pode consultar `GET /api/v1/internal/reception-claim-customers/{userId}` com `Authorization: Bearer <RECEPTION_CLAIM_TOKEN>` dedicado e diferente do token de Notification. Responde 204 para `CUSTOMER` ativo, 404 para conta ausente/inativa/de outro papel, 401 para credencial de serviço ausente/incorreta e 503 se o segredo ou o banco estiver indisponível. Nenhum dado cadastral é retornado. Usar na rede interna, sem cache e fora do ingresso.

## Persistência e configuração

- Migration V4 aditiva, com versão de sessão, digest e estados dos tokens de recuperação, além dos vínculos/convites de equipe. Tokens de recuperação existentes conservam a validade original.
- `AUTH_MAIL_ENABLED=false` por padrão. Configuração via `FRONTEND_URL`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_FROM`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_SMTP_AUTH` e `MAIL_STARTTLS_ENABLED`. Usar coletor SMTP local para o aceite.
- `PARTNER_SERVICE_URL` tem como padrão `http://localhost:8083/api/v1`. O endereço interno deve incluir `/api/v1`.
- `AUTH_TEAM_JWT_SECRET` é exclusivo do Auth e deve ser diferente de `JWT_SECRET` para persistir sessões da equipe entre reinícios ou réplicas. Sem configuração, a chave de equipe é efêmera por processo.
- No perfil `homolog`, `AUTH_S02_ENABLED=true` habilita as rotas S02 no Auth. O padrão preserva a exposição atual do ambiente.
