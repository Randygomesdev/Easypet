# H2-01 — Auditoria de identidade

Contrato publicado em 14/11/2026. Base HTTP `/api/v1`. Auth é dono da trilha de contas e vínculos de acesso.

## Escritas existentes

| Método e rota | Acesso | Entrada |
| --- | --- | --- |
| PATCH `/admin/customers/{id}/active` | `ADMIN` | `{"active":false,"reason":"Conta de teste encerrada"}` |
| POST `/auth/team/invitations` | Titular `PARTNER` do estabelecimento | `{"email":"equipe@example.test","accessRole":"RECEPTION","reason":"Cobertura de recepção"}` |
| POST `/auth/team/invitations/accept` | Prova de convite de uso único | Corpo atual. Motivo do sistema `Convite aceito pelo destinatário.` e ator da conta ativada pela prova. |
| DELETE `/auth/team/accesses/{id}` | Titular `PARTNER` do estabelecimento | Corpo JSON opcional `{"reason":"Acesso encerrado"}`. Sem corpo é compatível. |

`reason` é um texto operacional opcional de até 300 caracteres com espaços externos removidos. Envie motivo sem senhas, links, tokens ou dados pessoais. Ausência, valor nulo ou texto em branco usa `Motivo não informado.` para compatibilidade. Respostas e códigos das escritas permanecem os mesmos. Motivos acima do limite retornam 400. O ator e estabelecimento vêm da autenticação e da titularidade verificadas pelo servidor. Campos extras no corpo não atribuem autoria ou escopo.

Cada transição efetiva e o respectivo evento são confirmados na mesma transação. Repetir o estado atual de uma conta ou uma revogação concluída preserva a trilha e a versão da sessão. Repetir o aceite ou um convite ativo mantém o erro do contrato atual e não cria evento. Passagem do prazo de convite é derivada do relógio. Revogar um convite expirado registra transição de `EXPIRED` a `REVOKED`. Reativar a conta exige novo login. A trilha começa com a migração e não preenche autoria histórica.

## Consulta administrativa

`GET /admin/identity-audit` exige `ADMIN` e retorna 200 com `Cache-Control: no-store`. Campos opcionais de filtro exato `targetType`, `targetId`, `actorId`, `partnerId`, `action`. Combine filtros com AND. `page` começa em 0, `size` aceita 1–100 e o padrão é 20. Ordenação fixa por `occurredAt` e `id` descendentes. Entrada inválida recebe 400, sessão ausente/inválida recebe 401, papel recusado recebe 403, indisponibilidade recebe 503. Sem correspondência retorna página vazia.

`targetType` é `CUSTOMER` ou `TEAM_ACCESS`. `targetId` é ID da conta ou do vínculo respectivamente. `targetUserId` identifica a conta, quando já existe no vínculo. `partnerId` existe apenas em equipe. `actorRole` corresponde ao papel no momento da ação.

| Ação | Antes/depois |
| --- | --- |
| `CUSTOMER_ACTIVATED`, `CUSTOMER_DEACTIVATED` | `{active:boolean}` |
| `TEAM_INVITED` | `null` → `{status:"PENDING",accessRole}` |
| `TEAM_INVITATION_ACCEPTED` | `PENDING` → `ACTIVE`, com `accessRole` |
| `TEAM_ACCESS_REVOKED` | Estado anterior → `REVOKED`, com `accessRole` |

Exemplo de consulta para o histórico S04.

```http
GET /api/v1/admin/identity-audit?targetType=CUSTOMER&targetId=0a72f0b9-1579-4ec7-92c1-ccde5adc755a&page=0&size=20
```

```json
{
  "content":[{"id":"cb85f02f-c9fa-477b-9851-231b264fa999","occurredAt":"2026-11-14T15:00:00Z","actorId":"7e47e380-3ae5-42c9-8eae-c7cafc797fb5","actorRole":"ADMIN","targetType":"CUSTOMER","targetId":"0a72f0b9-1579-4ec7-92c1-ccde5adc755a","targetUserId":"0a72f0b9-1579-4ec7-92c1-ccde5adc755a","partnerId":null,"action":"CUSTOMER_DEACTIVATED","before":{"active":true},"after":{"active":false},"reason":"Conta de teste encerrada"}],
  "page":0,"size":20,"totalElements":1,"totalPages":1
}
```

Migration aditiva `V6__create_identity_audit.sql` no Auth. Trilha somente de acréscimo pelo serviço, sem API de edição/revogação de evento. DTOs não incluem e-mail, nomes, senhas, tokens ou digests.
