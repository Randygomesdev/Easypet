# Contratos S01

## H1 — frontend de homologação, 13/11/2026

O artefato de publicação da S07 deve compilar com `VITE_API_URL=/api/v1`, `VITE_INTERNAL_PILOT=true`, `VITE_WAVE_B_ENABLED=true` e `VITE_AUTH_RECOVERY_ENABLED=true`. As duas últimas flags ligam as rotas documentadas na onda B. O piloto interno mantém os bloqueios existentes de checkout e créditos. O build pode receber `VITE_INTERNAL_SUPPORT_URL`, uma URL HTTPS de suporte interno aprovada pelo operador, sem credenciais ou segredo. Quando ausente ou inválida, a tela exibe **Canal de suporte interno ainda não configurado**. Exemplo fictício `https://suporte.example.test/`.

`GET /partner/dashboard` usa o guard de titular e mostra o checklist com a situação do cadastro, serviço ativo, colaborador ativo associado a serviço e escala persistida para colaborador vinculado. Lê `GET /api/v1/partners/me`, `GET /api/v1/partners/{id}/staff` e `GET /api/v1/partners/staff/{staffId}/schedule?partnerId={id}` com o bearer original, conforme S04. As leituras são idempotentes e a S01 não cria endpoint nem migration. Resposta vazia confirmada é pendência. Falha, resposta inválida ou verificação incompleta é indisponibilidade recuperável. `404` na consulta do próprio estabelecimento significa ausência. `401` invalida a sessão correspondente, `403` conserva a sessão e `429`/`503` permitem repetir explicitamente, sem reenvio automático de escrita.

`GET /suporte` mostra a orientação configurada, inclusive enquanto a verificação da sessão estiver indisponível. A página não carrega dados de conta e o link externo só aparece para URL HTTPS válida, sem credenciais, query ou fragmento. Links de configuração e suporte usam as telas web existentes ou o endereço explícito do operador. [Roteiro móvel de aceite](h1-mobile-acceptance.md).

## Onda B — frontend, publicado em 13/11/2026

O guard e a navegação usam `useAuth()` da S02. `sessionStatus: 'ready'` com sessão válida é obrigatório para áreas protegidas. A sessão vem de `GET /api/v1/auth/session` com o bearer original e sem cache, conforme [contrato S02](../S02-identidade/contracts.md#sessão-entre-serviços). Enquanto verifica, exibe carregamento. Sessão inválida redireciona ao login. Falha da verificação bloqueia a área e oferece **Tentar novamente** no mesmo endereço. Permissão insuficiente volta ao destino permitido do perfil. Para equipe, o menu aplica as mesmas permissões das rotas e exige estabelecimento vinculado. O backend continua verificando vínculo, escopo e ação em cada operação.

| Rota web (GET) | Acesso e destino |
| --- | --- |
| `/painel` | Entrada autenticada depois do login. ADMIN → `/admin/parceiros`, PARTNER → `/partner/dashboard`, CUSTOMER → `/app/home`. Equipe → agenda geral se `BOOKINGS_READ`, atendimento atribuído se tem leitura e atendimento atribuídos, agenda atribuída se tem só leitura, clientes se `DESK_CUSTOMERS_MANAGE`, ou caixa se `CASH_RECEIVE`. Sem destino permitido, mostra tela de acesso indisponível com saída da sessão. |
| `/forgot-password`, `/reset-password?token=…` | Públicos. No piloto requerem `VITE_AUTH_RECOVERY_ENABLED=true`, conforme S02. |
| `/team/invitation?token=…` | Público no ambiente que habilita a onda B. Após aceitar, login separado pelo formulário S02. |
| `/partner/equipe` | Titular `PARTNER`, no ambiente da onda B. |
| `/partner/clientes` | Titular ou equipe com `DESK_CUSTOMERS_MANAGE` no ambiente da onda B. |
| `/partner/agendamentos` | Titular ou equipe com `BOOKINGS_READ` ou `BOOKINGS_ASSIGNED_READ` no ambiente da onda B. |
| `/partner/atendimento` | Titular ou equipe com leitura e escrita de agenda geral, ou leitura e atendimento atribuídos, no ambiente da onda B. |
| `/partner/caixa` | Titular ou equipe com `CASH_RECEIVE`, no ambiente da onda B. A própria tela e a API usam `CASH_CLOSE` nas operações de extrato, ajuste e fechamento. |
| `/admin/clientes` | ADMIN. A página S04 reúne cadastros de balcão e, no ambiente da onda B, contas da plataforma via S02. |
| `/admin/notificacoes` | ADMIN, no ambiente da onda B. |
| `/app/reivindicar-cadastro` | CUSTOMER, no ambiente da onda B. A prova S04 é digitada no formulário e enviada no corpo da requisição. |

S07 habilita `VITE_WAVE_B_ENABLED=true` e `VITE_AUTH_RECOVERY_ENABLED=true` no build web de aceite. A sessão verificada é exigida também nas áreas preexistentes, então o ingresso precisa encaminhar `GET /api/v1/auth/session` em todo perfil que servir este build. Navegação web é idempotente, sem corpo, API ou migration próprias. Operações das telas conservam os endpoints, validação e idempotência dos serviços donos.

O `api` compartilhado injeta o bearer da sessão. `401` para a credencial ainda ativa remove `token` e `user` e dispara `easypet:auth-invalidated` no `window`, para o contexto limpar a sessão em memória. Resposta atrasada de um token anterior preserva a sessão atual. `403` e `503` são propagados ao consumidor, que apresenta recusa ou recuperação. A consulta de sessão usa o cliente da S02, independente do interceptor compartilhado.

## Navegação

`GET /design-system` é uma rota do React Router. Em desenvolvimento (`import.meta.env.DEV`), aceita acesso direto sem sessão. Em build, usa a proteção `ADMIN` do painel. Visitante sem sessão vai para `/login` e sessão com outro papel passa pelo redirecionamento existente de `/unauthorized`. A rota carrega a galeria sob demanda e o painel administrativo oferece o link **Design system**.

A galeria usa dados de demonstração locais. A navegação é uma leitura idempotente sem corpo, API própria, efeitos sobre dados do negócio ou migrations.

## Componentes

Importe pelo arquivo em `Frontend/src/components/ui/`. Os componentes recebem dados, conteúdo e callbacks. O consumidor controla autenticação, chamadas de serviço, estados de negócio e permissões.

| Exportação | Contrato |
| --- | --- |
| `Button` | Props nativas de `button`, `variant="primary" \| "accent" \| "secondary" \| "danger"` e `size="default" \| "sm"`. Usa `type="button"` por padrão. |
| `TextField`, `SelectField` | Props nativas de `input` ou `select`, `label`, `hint?` e `error?`. `error` liga a mensagem ao controle e sinaliza estado inválido. `SelectField` recebe `<option>` como filhos. |
| `Badge` | Props nativas de `span` e `tone="neutral" \| "success" \| "info" \| "warning" \| "danger"`. O domínio fornece o rótulo e escolhe o tom. |
| `Card`, `CardHeader`, `CardContent` | `Card` compõe as outras partes e recebe props de `div`. `CardHeader` recebe `title`, `description?` e `action?`. `CardContent` aplica o espaçamento interno. |
| `Dialog` | `open`, `onOpenChange`, `title`, `description?`, `children` e `actions?`. Mantenha montado e controle a abertura pela prop. Escape e o botão **Fechar** chamam `onOpenChange(false)`. O modal nativo contém e devolve o foco ao fechar. |
| `Table`, `TableHeaderCell`, `TableCell` | `Table` recebe `caption` e filhos semânticos `<thead>` e `<tbody>`, com rolagem horizontal própria. As células aceitam props nativas. |
| `Pagination` | `page` inteiro a partir de `1`, `totalPages`, `onPageChange` e `label?`. Oculta com zero ou uma página e desabilita os limites. Converta índices de API na página consumidora. |
| `LoadingState`, `ErrorState`, `EmptyState` | Exibem carregamento, erro e vazio. O consumidor fornece mensagens e ações de recuperação. `EmptyState` recebe ícone de `lucide-react` e `size="default" \| "sm"`. |

```tsx
<TextField label="Nome do tutor" name="name" required />
<SelectField label="Espécie" name="species" defaultValue="DOG">
  <option value="DOG">Cão</option>
  <option value="CAT">Gato</option>
</SelectField>
<Button type="submit">Salvar</Button>
```

## Integração das sprints

Rotas de negócio usam os guards e o layout atuais. Para integrar uma rota ou menu, a sprint dona fornece em `integration.md` o caminho URL, arquivo de entrada e exportação, papel, condições de habilitação e contrato de API disponível. Exemplos para a galeria devem incluir as props e o estado que a página realmente usa. Os pedidos e pendências estão em [integration.md](integration.md).
