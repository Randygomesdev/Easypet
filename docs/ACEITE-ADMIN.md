# Mapa de aceite da área administrativa

O aceite de homologação interna cobre consulta de parceiros, situação auditável do estabelecimento, gestão de contas e as recusas de escrita por papel e escopo. Em homologação, o operador cria `ADMIN` fictício pelo provisionador interativo. A suíte isolada provisiona suas fixtures no banco descartável. [Provisionamento](../Backend/Infra/docs/homologacao.md#contas-e-dados-de-teste)

## Navegação e dependências

Depois do login, o papel `ADMIN` leva a `/admin/visao-geral`. O roteador protege toda a árvore `/admin`. Sem sessão, a navegação leva a `/login`. Com outro papel, passa por `/unauthorized` e retorna à área daquele perfil. O Nginx entrega o HTML da SPA ao abrir uma rota diretamente. A autorização dos dados precisa ser aplicada também pelos serviços. [Rotas](../Frontend/src/App.tsx), [controle de acesso da SPA](../Frontend/src/routes/ProtectedRoute.tsx), [redirecionamento por papel](../Frontend/src/routes/RoleRouter.tsx).

As rotas de API da tabela são relativas a `/api/v1`.

| Tela ou ação | API usada pela interface | Situação para o aceite |
| --- | --- | --- |
| Login | `POST /auth/login` | O Auth autentica a conta `ADMIN` provisionada pela suíte descartável. |
| Lista e busca em `/admin/parceiros` | `GET /admin/partners` com `name`, `page` e `size` | O Partner exige `ADMIN` e lista os estabelecimentos ativos. |
| Detalhe em `/admin/parceiros/:id` | `GET /admin/partners/{id}` | O Partner exige `ADMIN` para devolver os dados completos. O catálogo possui DTO próprio. |
| Dados, endereço e horários do estabelecimento | `PUT /partners/{id}` | Nginx encaminha. O Partner permite ao administrador ou ao titular do estabelecimento. A interface depende primeiro da leitura do detalhe. |
| Situação do estabelecimento | `PATCH /admin/partners/{id}/active`, `GET /admin/partners/{id}/status-history` | Exige ADMIN, motivo e contexto do estabelecimento. A alteração e o histórico registram o ator. A lista permite filtrar inativos. |
| Serviços | `GET /admin/partners/{id}`, `POST /partners/{id}/services` e `PUT /partners/{id}/services/{serviceId}` | A edição usa o ID do serviço no estabelecimento correto. A remoção fica indisponível enquanto o efeito sobre reservas não estiver definido. |
| Colaboradores, escalas e ausências | `GET/POST /partners/{partnerId}/staff`, `GET/PUT/DELETE /partners/staff/{staffId}`, `GET/PUT .../{staffId}/schedule` e `GET/POST .../{staffId}/absences` | As rotas passam pelo proxy. O Partner verifica o estabelecimento real do colaborador. A tela administrativa lê os serviços por `GET /admin/partners/{id}`, e a tela do parceiro lê os próprios serviços por `GET /partners/me`. |
| Agendamentos | `GET /bookings/partner/{partnerId}`, `PATCH /bookings/partner/{partnerId}/{bookingId}/status` e `POST /bookings/partner/{partnerId}/{bookingId}/fitting-decision` | Escritas administrativas exigem ADMIN e contexto consistente entre estabelecimento e reserva. |
| Pacotes | `GET /admin/partners/{id}` e `GET/POST/PUT/DELETE /payments/packages/...` | O detalhe administrativo é permitido. As rotas de `/payments` ficam bloqueadas no Nginx. |
| Clientes em `/admin/clientes` | `GET /admin/reception-customers`, `GET /admin/customers`, `PATCH /admin/customers/{id}/active` | ADMIN consulta cadastros de balcão e contas separadamente. Desativação encerra sessões; reativação exige novo login. |
| Notification em `/admin/notificacoes` | `GET /admin/notifications`, `GET /admin/notifications/{id}/attempts`, `POST /admin/notifications/{id}/retry` | A sessão ADMIN é verificada. Reenvio tem chave idempotente; entrega ambígua permanece em investigação. |

Evidências da interface e dos serviços. [Lista de parceiros](../Frontend/src/pages/admin/ParceirosPage.tsx), [detalhe e abas](../Frontend/src/pages/admin/ParceiroDetailPage.tsx), [serviços](../Frontend/src/pages/admin/tabs/ServicosTab.tsx), [agendamentos](../Frontend/src/pages/admin/tabs/AgendamentosTab.tsx), [clientes](../Frontend/src/pages/admin/ClientesPage.tsx), [provisionador](../Backend/Auth-Service/src/main/java/br/com/innkercode/auth/ProvisionPilotUser.java), [API de usuários](../Backend/Auth-Service/src/main/java/br/com/innkercode/auth/controller/UserController.java).

## Painel master — primeira versão

Prioridade confirmada: entregar antes do deploy para testes internos e demonstrações controladas. O painel evolui o papel `ADMIN`; não cria outro tipo de conta nem altera o painel dos estabelecimentos.

| Área | Entrega da primeira versão |
| --- | --- |
| `/admin/visao-geral` | Destino inicial do ADMIN, totais reais de estabelecimentos e tutores ativos/inativos, acessos às gestões e falha parcial explícita nos indicadores. |
| `/admin/sistema` | Saúde dos 16 serviços EasyPet, memória por serviço e teto, reinícios automáticos, último início e indicação de OOM. Memória disponível do host quando coletada no Linux da VPS. |
| `/admin/parceiros` | Reaproveita busca, detalhe, serviços/equipe e situação do estabelecimento com motivo/autor/histórico. |
| `/admin/clientes` | Reaproveita contas de tutores, ativação/desativação e consulta separada de cadastros de balcão. |
| `/admin/notificacoes` | Reaproveita investigação e reenvio controlado existentes. |

`GET /api/v1/admin/platform/status` passa pelo Nginx, Gateway e Auth, exige sessão válida e ADMIN e retorna `Cache-Control: no-store`. O Auth lê um JSON local limitado a 64 KiB e devolve apenas campos e serviços conhecidos. Não executa comandos nem recebe o socket Docker. O coletor no host seleciona apenas o projeto EasyPet e publica um arquivo por substituição atômica em diretório montado somente para leitura. Não coleta ambientes, segredos, conteúdo de logs nem dados de contas.

Amostras de mais de 120 segundos aparecem como desatualizadas, sem confirmar saúde atual. Arquivo ausente, inválido ou grande demais gera estado indisponível. Ausência de medição nunca vira consumo zero. A interface consulta a cada minuto enquanto visível e aceita atualização manual. A coleta não mede SLA, capacidade de carga ou sucesso das jornadas; a RAM total do host também inclui Setoriza. CPU, logs centralizados, ações de reinício pelo painel e auditoria administrativa consolidada ficam fora desta primeira versão. A trilha completa de alterações CUSTOMER continua pendente no roadmap.

Aceite local concluído em 13/11/2026 neste chat, sem atribuição de nova revisão à S07: **30 cenários aprovados em 5 minutos**, incluindo ingresso e Auth direto com ADMIN, parceiro, tutor, JWT inválido e cabeçalho forjado; coleta Docker real; indicadores e navegação; dados antigos/inválidos e recuperação; tela móvel e regressões H1/OAuth. Um cenário condicional de Google desabilitado foi ignorado porque a rodada usa OAuth habilitado com provedor de teste. Os seis bancos foram restaurados, com 55 tabelas e 14 consultas de referência verificadas. Seis testes do leitor Java e seis do coletor Python, TypeScript e lint dos arquivos da interface também passaram. Capturas de desktop e celular foram inspecionadas visualmente.

No perfil de demonstração, o maior somatório amostrado foi **2.532,68 MiB**, com tetos de 3.632 MiB, sem OOM, reinício inesperado ou swap observado. As 661 entradas do código monitorado permaneceram iguais durante a execução. A limpeza dos projetos Docker de teste e restauração foi confirmada. Houve um erro de inventário da medição durante a limpeza, registrado separadamente no [resumo verificável](sprints/R01-review/master-acceptance.json), que inclui hashes, resultados e limites da medição. Essa execução local não substitui o smoke na VPS nem valida o provedor Google real.

A primeira rodada parou antes do navegador porque o template de `docker inspect` acessava `State.Health` ausente nas fixtures. A leitura foi corrigida com acesso opcional, e uma reprodução Docker sem healthcheck aprovou coleta e publicação antes da rodada final. O Compose de cinco arquivos mantém 16 serviços e a montagem do snapshot somente para leitura. A sintaxe das unidades systemd foi validada na VPS, sem instalação ou ativação. Publicação e ativação do timer na VPS continuam pendentes.

## Autorização das consultas

**Atualização de publicação em 13/11/2026:** ADMIN por senha aprovado no domínio HTTPS; API do master retornou os 16 serviços saudáveis e a RAM real do host. Parceiro/tutor receberam 403, e tutor autenticado pelo Google foi redirecionado ao próprio painel ao tentar abrir `/admin/sistema`. Pausa controlada da coleta produziu `STALE` em 136 segundos; reativação retornou `AVAILABLE` com amostra de cinco segundos. Timer reativado e habilitado. O smoke publicado incluiu 33 verificações e reserva/atendimento concluídos; não substitui toda a matriz administrativa abaixo. [Aceite da publicação](production/publicacao-homolog-2026-11-13.md).

1. O Gateway exige JWT válido para a lista e o detalhe administrativos. O Partner valida a assinatura e exige o papel `ADMIN` do token. Cabeçalhos `X-User-Role` enviados pelo cliente não concedem acesso.
2. O Nginx e o Gateway mantêm fechadas as leituras legadas de lista e detalhe de parceiros. Booking e Payment usam o endpoint de detalhe completo diretamente na rede dos serviços. O catálogo tem seu próprio DTO e `/partners/me` atende à conta parceira.
3. O aceite deste card cobre leitura. O aceite de escrita deve conferir a persistência das alterações de cadastro, equipe e reservas com dados fictícios. O fluxo de desativação também precisa considerar que a lista atual só mostra estabelecimentos ativos.

Evidências do roteamento e das regras. [Nginx](../Frontend/nginx.homolog.conf), [rotas do Gateway](../Backend/Gateway-Service/src/main/resources/application.yml), [filtro JWT do Gateway](../Backend/Gateway-Service/src/main/java/br/com/innkercode/gateway/security/JwtGlobalFilter.java), [segurança do Partner](../Backend/Partner-Service/src/main/java/br/com/easypet/partner/config/SecurityConfig.java), [controles de estabelecimento](../Backend/Partner-Service/src/main/java/br/com/easypet/partner/security/PartnerAccess.java), [regras de Booking](../Backend/Booking-Service/src/main/java/br/com/easypet/booking/service/BookingService.java), [acesso ao Pet](../Backend/Pet-Service/src/main/java/br/com/easypet/pet/service/PetAccessService.java).

## Roteiro de validação

A suíte local passou com `ADMIN`, `PARTNER`, `CUSTOMER` e sessão anônima. Ela cobre acesso à lista e ao detalhe, busca, paginação na API, redirecionamentos, JWT adulterado, cabeçalhos forjados e catálogo sem dados fiscais. [Cenários Playwright](../Frontend/e2e/admin-partners.spec.ts).

| Cenário | Resultado esperado |
| --- | --- |
| Abrir uma URL administrativa sem sessão ou como `PARTNER` ou `CUSTOMER` | A SPA redireciona e as APIs administrativas recusam a chamada. Testar também JWT expirado e cabeçalhos `X-User-Role: ADMIN` forjados. |
| Entrar com a conta `ADMIN`, atualizar a página e abrir um detalhe diretamente | Login leva ao painel master em `/admin/visao-geral`; o menu Estabelecimentos abre a lista. Busca, paginação e detalhe continuam funcionando nos endereços existentes. |
| Conferir catálogo e dados privados com uma conta tutora | A vitrine mantém o DTO do catálogo. Dados completos e operações administrativas ficam inacessíveis ao tutor. |
| Alterar cadastro, serviço ou equipe de A, quando a escrita fizer parte do teste | Após recarregar, a mudança persiste em A e não altera B. A conta de B não pode editar A, inclusive se trocar os IDs na URL ou no corpo. |
| Abrir o colaborador de B sob a URL do estabelecimento A como administrador | Conferir o vínculo com o estabelecimento mostrado. O componente reutilizado carrega a equipe por `staffId`, de modo que a UI precisa evitar edição sob contexto divergente. |
| Consultar agendamentos de A e B e, se autorizado, executar uma transição ou decisão de encaixe | A lista e os nomes correspondem ao estabelecimento selecionado. O administrador consegue a operação permitida, o parceiro B não altera reserva de A e uma transição inválida mantém o estado anterior. |
| Abrir Clientes e Pacotes | Clientes lista cadastros e contas. Testar desativação, reativação e rejeição do JWT anterior. Pacotes fica fora do aceite e a API permanece bloqueada. |

## Entregas para P3

- Definir quem pode provisionar, desativar e revisar contas administrativas, com escopo explícito de leitura e de escrita. Registrar ator, estabelecimento e ação nas mudanças administrativas, especialmente desativação, mudanças de equipe e ações sobre reservas.
- Entregar a gestão mínima de parceiros e contas com dados autorizados, incluindo busca de clientes paginada e estados de conta. Decidir como listar estabelecimentos inativos e quem pode reativá-los.
- Definir os dados de tutor e pet necessários para operação administrativa. A aba de agenda usa o nome do pet, enquanto o papel `ADMIN` também dá acesso amplo em outras rotas do Pet. Validar o menor acesso necessário antes de usar dados reais.
- Completar o aceite de escrita com os três papéis. Pacotes, pagamento e prontuário completo ficam fora do escopo deste aceite.
