# Integrações S01

## H1 — 13/11/2026

| Dono | Ponto de integração |
| --- | --- |
| S04 | Confirmar fontes e critérios de checklist para titular. A leitura existente de `/partners/me`, `/partners/{id}/staff` e `/partners/staff/{id}/schedule` já fornece estabelecimento, ofertas e escala. Confirmar como distinguir oferta ativa, vínculo ao serviço e presença de escala efetiva. |
| S02 | Preservar `useAuth()` com verificação independente da API compartilhada. Informar se o contexto expõe status e `Retry-After` em falha de sessão. O guard oferece retry explícito e mantém sessão em `429`, `403` e `503`. As páginas donas tratam falhas de escrita e preservam intenção. |
| S07 | O Dockerfile real já declara as quatro flags e o argumento opcional de suporte. Em `Frontend/e2e/partner-onboarding.spec.ts`, trocar a espera inicial de `/partner/cadastro` por `/partner/dashboard` e seguir **Abrir cadastro**. O dashboard agora orienta o titular recém-provisionado. Verificar as transições do checklist e os demais passos no [roteiro móvel](h1-mobile-acceptance.md). |

## Onda B — 13/11/2026

| Dono | Ponto de entrega ou pedido |
| --- | --- |
| S02 | S01 registra `/painel` como destino pós-login, inclusive para `TEAM_MEMBER`. Login deve guardar o resultado de equipe e navegar para `/painel`. Guard aguarda `useAuth().sessionStatus === 'ready'`; o cliente compartilhado emite `easypet:auth-invalidated`. Entregar `EquipePage` como export padrão. |
| S03 | Ligar as páginas existentes ao contexto de agenda e manter controles de escrita conforme as permissões. S01 usa `BOOKINGS_READ`/`BOOKINGS_ASSIGNED_READ` e leitura mais a permissão de atendimento correspondente nas rotas atuais. |
| S04 | Ligar a aba **Contas da plataforma** da rota `/admin/clientes` a consulta e mutação S02, com `VITE_WAVE_B_ENABLED=true` para exibir a aba no build que tem as APIs. A S01 mantém a rota; a aba e os componentes de domínio ficam com S04. Publicar o export padrão `ClaimCustomerPage` em `features/claims`. |
| S05 | S01 usa `CASH_RECEIVE` para mostrar e permitir a rota `/partner/caixa`. A página usa o contexto da API para separar leitura/recebimento de `CASH_CLOSE`. |
| S06 | S01 conecta `/admin/notificacoes` ao export existente e replica o padrão de tentativas e reenvio na galeria com dados fictícios. |
| S07 | Ativar `VITE_WAVE_B_ENABLED=true` e `VITE_AUTH_RECOVERY_ENABLED=true` no build descartável. Encaminhar `GET /api/v1/auth/session` em qualquer perfil que sirva este build, inclusive galeria ADMIN e caminhos legados. Em `/reset-password` e `/team/invitation`, preservar `Referrer-Policy: no-referrer` e manter query fora dos logs. Guard depende do contrato S02 sem autorizar por papel armazenado no browser. |

Conexões verificadas no código em 13/11/2026: exports S02 de recuperação, reset, convite e gestão de equipe, S04 de vinculação e clientes, S05 de caixa e S06 de notificações. A agenda S03 já consome `GET /bookings/agenda-access`. O perfil descartável S07 define as duas flags e o Nginx encaminha `/api/v1/auth/session`. A página administrativa S04 usa `GET /admin/customers` e `PATCH /admin/customers/{id}/active` via S02. O Auth controla a disponibilidade dessas APIs por ambiente.

## Pedidos externos

| Dono | Arquivo ou ponto de integração | Pedido |
| --- | --- | --- |
| S02 | `Frontend/src/pages/auth/` e `Frontend/src/contexts/AuthContext.tsx` | Publicar caminhos, exports e regras de acesso de cadastro de parceiro, recuperação e onboarding. Informar alterações na forma como o contexto resolve sessão e papel para o guard da galeria. |
| S03 | Agenda e atendimento nas rotas existentes | Registrar exemplos de estados e diálogos para a galeria, com os componentes e as props adotadas. Informar novos caminhos ou parâmetros quando necessários. |
| S04 | `Frontend/src/pages/admin/ClientesPage.tsx` | Na implementação da lista administrativa, adotar `TextField`, `Table`, `Pagination` e os estados que a página usa, preservando o padrão visual. Registrar a migração e seu aceite, além de caminho, export e papel para a tela de balcão. A edição da página fica com S04. |
| S05 | `Frontend/src/pages/partner/CaixaPage.tsx` | Publicar caminho, export, papel, pré-requisitos de habilitação e exemplo real dos estados de caixa para a galeria. |
| S06 | `Frontend/src/features/notifications/NotificationsPage.tsx` | Confirmar a composição real a reproduzir na galeria. A integração desta fatia é a consulta administrativa. Um feed futuro no sino exige contrato de leitura, contagem e permissões. |
| S07 | Proxy e aceite integrado | Validar recarga direta de `/design-system` no build servido e acesso com sessão `ADMIN`. Verificar redirecionamento de visitante e de outros papéis na suíte integrada. |

## Rotas solicitadas

| Sprint | Rota | Situação no frontend |
| --- | --- | --- |
| S02 | `/forgot-password`, `/reset-password`, `/team/invitation` | Aguardando exports e confirmação do ambiente com as APIs liberadas. `/seja-parceiro` segue a configuração atual do piloto. |
| S03 | `/partner/agendamentos`, `/partner/atendimento`, `/app/agendamentos` | Rotas existentes preservadas. A galeria inclui a composição do formulário de motivo de falta da agenda. Os mapas de `NO_SHOW` foram corrigidos na rodada R01. As chaves de criação nas páginas fora do escopo da S01 exigem coordenação com os donos. |
| S04 | `/partner/clientes`, `/admin/clientes` | Rota de parceiro e menu conectados ao export da S04. A rota administrativa preserva o mesmo caminho e monta a consulta de cadastros de balcão da S04. Aceite de API com S07, incluindo `GET /api/v1/admin/reception-customers` e detalhe. A S02 mantém `/api/v1/admin/customers` para contas da plataforma. |
| S05 | `/partner/caixa` | Usar o prefixo vigente `/partner` quando o export estiver disponível. A autorização e o aceite de dados dependem de S05 e S07. |
| S06 | `/admin/notificacoes` | `NotificationsPage` disponível. Aguardando validação de API administrativa por S07 solicitada no contrato S06. |

## Desbloqueios do build no checkout compartilhado

O tipo `BookingStatus` da S03 passou a incluir `NO_SHOW`. A S03 já atualizou `Frontend/src/pages/partner/AgendamentosPage.tsx` dentro da própria missão. Na rodada de correção R01, a coordenação atribuiu à S01 a edição pontual dos três mapas abaixo. O rótulo **Falta** vem de `BOOKING_STATUS_LABEL`, mantido pela S03. O estado é terminal e a edição se limita à apresentação dos registros.

| Caminho | Atribuição pontual R01 |
| --- | --- |
| `Frontend/src/pages/admin/tabs/AgendamentosTab.tsx` | Incluir `NO_SHOW` em `STATUS_STYLE`. |
| `Frontend/src/pages/partner/DashboardPage.tsx` | Incluir `NO_SHOW` em `STATUS_STYLE` e `STATUS_COLORS`. |

A solicitação da S03 para chaves de idempotência nas telas existentes de criação também exige um dono para as páginas de catálogo e carrinho fora do escopo S01. A chave deve permanecer estável em um reenvio da mesma tentativa, segundo o contrato publicado pela S03.
