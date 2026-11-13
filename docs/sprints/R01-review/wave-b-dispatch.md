# Onda B — Integrações do roadmap

Autorizada pelo usuário em 13/11/2026: concluir integrações pendentes com os responsáveis e depois executar novo aceite integrado com S07.

Base: checkout compartilhado no HEAD `ceba61cc4ae325ddd8ff5012020508c6e55e5966`, com as alterações locais já aceitas em R01. Não trocar branch, resetar, limpar, fazer commit ou sobrescrever trabalho alheio. Os hashes e o aceite anterior estão em [review.md](review.md); a nova rodada precisa de novo snapshot e evidência própria. A rodada anterior continua historicamente aprovada, sem aprovar automaticamente novas mudanças.

## Escopo e ownership

Concluir as integrações técnicas das etapas 1–5 já implementadas em fatias: sessão e permissões transversais, rotas e navegação, equipe, reserva de balcão, reivindicação segura, idempotência nos consumidores, caixa pelo painel, Notification/Auth/SMTP local e recuperação representativa. Decisões comerciais, contratação/provedor externo, publicação em VPS, piloto com pessoas e funcionalidades futuras das etapas 6–8 não são disparadas nesta rodada. Checkout/créditos continuam bloqueados. Mensagens reais externas e deploy não autorizados.

Regras de README/spec/mission permanecem, com as atribuições complementares explícitas abaixo. Todos editam somente seu escopo e sua pasta de sprint; R01 mantém a coordenação, revisão e roadmap. Não criar chats/subagentes. Somente S07 usa Compose e suíte integrada. Somente S01 altera dependências frontend/lockfile. Testes locais devem usar recursos exclusivos. Comunicação de dependências por contracts.md/integration.md/status.md; R01 acompanha e encaminha, sem exigir mensagens entre workers.

### S02

Prioridade de produtor: estabilize e publique cedo /auth/session para autenticação de todos os serviços (JWT legado e equipe, revogação/reset/inativação, userId, partnerId, permissões, sem cache e sem ciclo Auth->Partner->Auth durante consulta de sessão). Publique guia concreto de consumo fail-closed e classificação 401/403/503; não compartilhe segredo de assinatura de equipe. Entregue a resolução interna autenticada de destinatários solicitada por S06, sem dados em logs/outbox, usando token dedicado e rota fora do ingresso público. Conclua recuperação e convite/equipe por SMTP local e UI de gestão de acessos (listar/convidar/revogar), com states e contratos consumíveis por S01. Além do escopo original, pode criar Frontend/src/features/team/ e Frontend/src/pages/partner/EquipePage.tsx; é o único dono desses novos caminhos. AuthContext/auth.types são seus; combine com S01 via contrato os guards de TEAM_MEMBER/permissões e /auth/session. Alinhe com S04 o vínculo verificado userId->staffId (não aceitar escolha pelo usuário) e a prova de reivindicação de balcão; implemente a parte Auth necessária sem autoassociar e-mail. Teste uso único, revogação, isolamento de equipes, destinatário e falha fechada. Informe cedo os contratos disponíveis para não bloquear os demais.

### S04

Conclua integrações Partner/Pet: validar sessão Auth em operações protegidas, negar reset/inativação/revogação e falhar fechado, inclusive acesso direto; habilitar recepção/gestor por partnerId e DESK_CUSTOMERS_MANAGE. Publique cedo contrato verificável de associação entre userId de equipe e staffId da escala, com autorização de titular, isolamento e sem aceitar staffId autoatribuído; S03 precisa disso para profissional somente em reservas atribuídas. Preserve leituras fiscais restritas e projeção mínima R01-001. Integre cadastro tutor/pet e criação de reserva de balcão na UI consumindo contrato real S03, com recepção individual e erros recuperáveis. Conclua reivindicação segura e auditável junto a S02: prova explícita de controle pelo tutor autenticado, expiração/uso único, nunca vínculo só por igualdade de e-mail ou UUID, preservação de histórico/isolamento. Publique contrato antes de consumidores; implemente nos seus módulos e frontend de clientes. Além do escopo original pode criar Frontend/src/features/claims/ para tela de reivindicação, S01 integra rota. Teste IDs trocados, token repetido/expirado/titular incorreto, permissão de recepção e revogação. Se alguma parte depender de S02/S03, complete o restante e acompanhe os contratos nesta rodada.

### S03

Conclua Booking e consumidores: aplicar sessão Auth fail-closed em operações protegidas, incluindo chamada direta e JWT anterior a reset/revogação/inativação; equipe exige partnerId/permissão e profissional exige vínculo verificado userId->staffId publicado por S04, acessando/atendendo somente suas reservas. Não ampliar TEAM_MEMBER por role apenas. Preserve timeout/rollback/idempotência R01-002. Complete fluxo de reserva de balcão, forneça componente reutilizável em features/booking e contrato para S04 integrar em ClientesPage (não edite essa página). Agora você também é dono exclusivo de Frontend/src/pages/app/PartnerDetailPage.tsx e Frontend/src/pages/app/CartPage.tsx para enviar chave estável por intenção e conservar retry após perda de resposta/reload, evitando reservar duas vezes. Se precisar de arquivo compartilhado, publique pedido para S01 em vez de editá-lo. Integre estados/atendimento/autorizações já entregues com dados reais e os eventos de pronto para retirada para S06. Teste concorrência, retry, troca de IDs/estabelecimento, recepção, profissional próprio/alheio, revogação e falha Auth. Registre autores individuais, não substitua userId por partnerId.

### S05

Conclua caixa integrado: usar /auth/session real para todas operações protegidas do Payment, incluindo chamadas diretas e revogação/reset/inativação; equipe vinculada ao estabelecimento com CASH_RECEIVE para consulta/recebimento e CASH_CLOSE para fechamento/ajustes. Negar recepção sem CASH_CLOSE e profissional sem autorização; preservar 401/403/404 e R01-003. Consuma Booking/Partner reais com bearer original e novo contexto de equipe sem contornar isolamento. Entregue a jornada de CaixaPage pronta para S01 conectar rota/menu, incluindo reserva de balcão, recebimento parcial, fechamento e trilha do autor individual. Torne a idempotência da intenção resiliente a reload/perda de resposta, sem duplicar cobrança/recebimento nem gerar nova chave automaticamente numa resposta ambígua. Teste permissões, revogação, replay após reload, ledger/centavos/concorrrência/fechamento. Não ativar checkout nem créditos.

### S06

Conclua Notification ponta a ponta: consuma resolução autenticada de destinatário S02, SMTP local descartável S07 e sessão ADMIN real na consulta/histórico/reenvio. Publique cedo as variáveis e contrato definitivos e os cenários de injeção de falha para S07. Preserve ACK só após persistência, deduplicação, revisão/cancelamento de lembretes e UNKNOWN de tentativa ambígua; complete proteção para reinício após SENDING e replay após commit antes de ACK e teste esses comportamentos. Integre aviso de retirada e destinatário conforme contratos Booking/Auth; dados de balcão só com autorização/contrato S04 explícitos. Entregue tela administrativa pronta para S01 conectar. Implemente preferências/opt-out aplicáveis apenas se necessários ao contrato transacional desta integração, explicitando escopo; não invente provedor WhatsApp nem envio externo. Testes locais e apoio documental ao aceite real S07 com coletor SMTP, reinício, obsolescência, revogação de ADMIN, indisponibilidade Auth e mensagens não duplicadas.

### S01

Integre navegação e rotas reais das entregas S02/S04/S05/S06: recuperação/reset, aceite de convite, gestão de equipe, caixa, notificações administrativas e reivindicação conforme contrato S04. App/routes/layouts/menus/guards pertencem a você, preservando design system e acessibilidade. Além do escopo original, atribuição explícita para Frontend/src/lib/api.ts e arquivos de layout/navegação compartilhados necessários; não altere AuthContext/auth.types (S02), páginas de domínio nem PartnerDetailPage/CartPage (S03). Guards devem usar sessão/permissões reais e permitir somente operações do vínculo de equipe, com destinos úteis para cada perfil, sem tratar TEAM_MEMBER como PARTNER irrestrito. Ajuste cliente compartilhado para 401 encerrar sessão e 403 preservar sessão, fail-closed/503 recuperável e sem ciclos de consulta. Integre exports e contratos publicados cedo, acompanhe mudanças dos donos até a entrega conjunta; inclua galeria com novos padrões. Conecte gestão administrativa de contas real ao ponto fornecido S04/S02. Build/typecheck completos depois dos consumidores prontos. Não marcar como validada integração que só usa mock; S07 faz jornadas reais.

### S07

Você coordena o NOVO aceite integrado da onda B após os seis responsáveis concluírem integrações (não basta repetir os 12 testes anteriores). Prepare agora ingressos/Gateway/Compose/env e coletor SMTP exclusivamente local com nomes/portas/volumes descartáveis. Aplicar sessão Auth e suporte ao token separado TEAM_MEMBER no Gateway sem compartilhar segredo nem criar ciclo com /auth/session; os serviços também devem validar acesso direto. Integre endpoints/rotas publicados, preserve rotas internas fora do ingresso e o rate limiter. Acompanhe status/contracts/integration dos S01-S06 pelo filesystem; registre bloqueios concretos para o coordenador. Antes do aceite final, exija entregas locais prontas e registre hashes do conjunto; evite build final com arquivos ainda mudando. Amplie cenários reais de navegador/API: recuperação por SMTP e uso único; convite/login/revogação de equipe; recepção cadastra tutor/pet/reserva; profissional só atende atribuições; recepção não fecha caixa e gestor fecha; retry após resposta perdida/reload sem duplicação; reset/inativação/revogação recusados no Gateway e serviços diretos; Auth indisponível falha fechado; reivindicação segura; caixa pelo painel; ADMIN consulta/reenvia Notification; SMTP local destinatário correto; cancelamento/reagendamento/reinício/ACK sem duplicação. Preserve regressões R01 e navegação antiga. Complete recuperação representativa dos seis bancos com vínculos de cadastros/reservas/recebimentos/outbox e anexos se há armazenamento; documente limitações materiais. Execute a suíte somente quando o conjunto estiver pronto, corrija testes apenas quando fixture estiver errada sem relaxar contratos. Registre resultados reais, hashes, relatórios e cleanup; reportar bloqueio não equivale a aceite. Sem deploy/VPS, contatos externos, checkout/créditos. Continue acompanhando dependências da rodada até aceite ou impedimento concreto, não encerre somente com plano.

## Sequência e aceite

1. S02/S04 publicam cedo contratos de sessão, destinatário, equipe/staff e reivindicação. S03/S05/S06 publicam consumidores e pontos de UI. Evitar ciclo Auth → Partner → Auth na consulta de sessão.
2. Os donos implementam, testam e acompanham contratos dependentes; S01 conecta frontend e S07 prepara ingressos/ambiente.
3. Cada dono registra entrega pronta, arquivos, comandos/resultados e bloqueios concretos; S07 só fecha o aceite após estabilizar e identificar o conjunto por hashes.
4. S07 executa jornadas novas e regressões R01, restauração representativa e cleanup. R01 revisa fontes/evidências e atualiza somente cards comprovados.

Estado inicial: preparado para disparo aos sete chats existentes em ../threads.json. Confirmações de envio e progresso ficam nesta pasta. Fim de processo ou status local isolado não constitui aceite integrado.


## Disparo confirmado

Sete mensagens aceitas nos chats existentes S01–S07 em 13/11/2026, preservando modelo/esforço. Snapshot imediato confirmou os sete workers em execução. Novo aceite integrado ainda pendente.


## Alinhamento de UI entre responsáveis

S02 integra na EquipePage a seleção de profissional existente e associação da conta PROFESSIONAL pelas rotas S04, sem exigir IDs digitados ou API manual. S04 mantém a prova presencial de reivindicação ligada à conta autenticada e orienta a interface em termos de código da conta/vinculação. S01 conecta rotas e navegação. Mensagens de alinhamento encaminhadas aos dois responsáveis após publicação dos contratos.

## Revisão incremental encaminhada

- Clientes de sessão S03/S04/S05: exigir exatamente HTTP 200/corpo válido; testar 202 com corpo e 204 vazio como indisponibilidade. S04 inclui Partner/Pet.
- Vínculo S04: persistir o ID do acesso de equipe e compará-lo à sessão, impedindo que reconvite da mesma conta restaure atribuição revogada. Contrato S02 atualizado.
- UI de equipe S03/S04: resolver projeção mínima do pet sob escopo/atribuição para agenda e atendimento; remover spinner de prontuário não carregado e erro silencioso. O checkout em andamento ainda chama endpoints que recusam o profissional. Contrato/implementação do produtor e consumidor precisam convergir antes do aceite.

Esses pontos foram encaminhados aos donos durante a implementação; ainda não são achados finais nem prova de correção.

## Correções decorrentes da primeira execução integrada

- R01-B01, S03: Booking direto respondeu 500 com Auth pausado. Encaminhada correção e teste pelo filtro real, mantendo 503 no aceite S07. S03 concluiu tratamento de cancelamento do transporte e 44 testes; reteste integrado pendente.
- R01-B02, S04: leitura de escala após criar colaborador sobrescrevia interação na transição de rota. Atribuído adicionalmente e com exclusividade à S04 `Frontend/src/pages/partner/ColaboradorPage.tsx`; S07 conserva criação → edição sem reload como critério. Correção e regressão Chromium com resposta atrasada concluídas localmente; reteste integrado pendente.
- S07 corrige fixtures de status de criação de serviço e fuso de expiração, preserva o rate limiter e verifica recuperação após 429. Nova criação de cobrança passa pela tela, além de recebimento e fechamento. Reconstruir somente após estabilizar as correções acima e os três ajustes finais do Partner.

## Fechamento da coordenação

Os sete chats concluíram as entregas em 13/11/2026. S07 encerrou a quarta rodada com código 0, 18/18 cenários, seis bancos restaurados com 12 consultas representativas, snapshot estável e limpeza. R01 conferiu os resultados, encerrou B01/B02 e atualizou os cards no escopo comprovado. [Parecer final](wave-b-review.md) e [conclusão dos workers](wave-b-worker-observations.json).
