# H1 — Pendências antes da publicação em homologação

Data: 13/11/2026. Pedido humano: verificar próximas pendências do roadmap e acionar os responsáveis para concluir o que falta antes da publicação em homologação.

**Atualização posterior:** implementações H1 entregues e aceite funcional local de 22/22 revalidado por R01; complementação operacional H1-01 concluída na [retomada S07/R01](h1-ops-review.md). Consulte o [parecer H1](h1-review.md) para evidências e pendências atuais. O despacho e as observações de execução abaixo foram preservados como histórico.

## Base e recorte

Base aceita preservada: [onda B](wave-b-review.md), 18/18 cenários integrados, 140 testes Java, seis bancos restaurados com referências e fontes estáveis. O novo trabalho é preparação para **homologação interna com dados fictícios**, não abertura de produção nem execução do piloto. O aceite anterior não aprova alterações H1.

A revisão desta rodada identificou três diferenças concretas entre o aceite e a publicação:
- `compose.homolog.yml` ainda desativa `AUTH_S02_ENABLED` e `AUTH_MAIL_ENABLED`; parte das variáveis internas e do SMTP está apenas em `Frontend/e2e/compose.wave-b.yml`.
- `Frontend/Dockerfile` não habilita as flags da onda B; `nginx.homolog.conf` bloqueia recuperação/equipe/Notification que o overlay de teste libera.
- `ProvisionPilotUser` aceita apenas PARTNER/CUSTOMER; o ADMIN da suíte é criado diretamente por SQL. O roteiro publicado ainda manda verificar a recusa da recuperação e tem referências anteriores à onda B.

Portanto, repetir somente a suíte com o overlay existente não comprova prontidão do artefato que será publicado.

## Gates e responsáveis

| Gate | Dono principal | Entrega exigida antes do parecer de prontidão |
| --- | --- | --- |
| H1-01 — configuração publicável e operação | S07, contratos S01/S02/S06 | Compose, Dockerfile e Nginx reais compatíveis; SMTP interno; manifesto/preflight; ensaio operacional; novo aceite sem permitir recursos só por overlay de teste. |
| H1-02 — identidade operável | S02 | Provisionamento restrito de ADMIN fictício, flags/URLs/segredos coerentes, recuperação de erros sem perder formulário, conta revogada recusada. |
| H1-03 — orientação inicial e frontend | S01 | Checklist de configuração com dados reais e links úteis, flags/nav coerentes, estados responsivos e suporte interno configurável. |
| H1-04 — configuração/administração e prova pela UI | S04 | Escritas expostas com contexto correto, emissão/resgate de prova e gestão de conta testáveis com serviços reais, dados para onboarding e inventário de anexos. |
| H1-05 — jornada móvel de reserva | S03 | Busca/pet/horário/reserva/acompanhamento/cancelamento/reagendamento; preço, duração e política reais; operações não suportadas explicitamente indisponíveis. |
| H1-06 — caixa e investigação | S05 | Reversão autorizada, extrato/trilha, negativas por perfil/estabelecimento, fechamento e retry preservados no painel móvel. |
| H1-07 — comunicação em homologação | S06 | Configuração sem dependência exclusiva de teste, SMTP interno, falhas/UNKNOWN visíveis e sinais sanitizados para diagnóstico local. |

### Pendências que exigem o ambiente ou definição humana

Antes da publicação efetiva: destino/domínio, capacidade/porta/proxy da VPS compartilhada, restrição de acesso, operador e credenciais próprias instaladas no host. Preparar agora preflight e configuração parametrizada; não inventar valores nem registrar segredos. O checkout contém alterações locais: um release versionado/revisado e o smoke no endereço publicado são gates distintos, que permanecem abertos.

Antes de dados reais/produção: segmento e participantes do piloto, suporte e escalonamento, canal/provedor externo e preferências, privacidade/termos, retenção/RPO/RTO, cópia externa e arquivos/anexos, carga validada na capacidade do ambiente. Templates e ensaios locais não equivalem a essas aprovações.

Interrupção de atendimento e consentimento para adicionais ainda carecem de regra final. Nesta preparação, conferir/explicar o comportamento existente e manter ações não suportadas indisponíveis; não inventar política de cobrança/reembolso. Checkout/créditos, expansão e demais etapas 6–8 ficam fora deste despacho.

## Regras de execução e ownership

Nova rodada H1 — preparação para publicação em homologação, autorizada pelo usuário neste chat coordenador. Leia docs/sprints/R01-review/pre-homolog-dispatch.md, docs/ROADMAP.md e sua mission/status. Base aceita: onda B com 18/18, 140 testes Java e restauração de seis bancos; preserve essas regressões e evidências. Execute a tarefa concreta abaixo, teste no seu módulo e publique contratos cedo, com status H1 em sua pasta. Preserve checkout compartilhado, alterações existentes e ownership; não trocar branch, reset/clean/stash, fazer commit geral, criar chats/subagentes ou mudar modelo/esforço. Só S07 executa Compose/suíte integrada. Não publicar na VPS, alterar proxy/credenciais reais, enviar e-mail/WhatsApp externo, ativar checkout/créditos ou usar dados reais. Escopo é homologação interna com dados fictícios. Não confundir prontidão local, release versionado e aceite no endereço publicado. Conclua trabalho independente, registre bloqueios concretos; não encerrar apenas com plano.

Os acréscimos de ownership abaixo são exclusivos desta atribuição e preservam os anteriores da onda B. S01 mantém componentes/rotas/api.ts; S02 mantém AuthContext e equipe; S04 mantém Partner/Pet e páginas enumeradas; S03 mantém agenda e páginas enumeradas; S05 mantém caixa; S06 mantém Notification; S07 mantém infraestrutura/testes integrados e recebe Dockerfile/env de homologação. Nenhum worker edita roadmap ou relatórios R01. Uma necessidade fora desses caminhos deve ser publicada em integration.md.

## Missões encaminhadas

### S07

Chat: `01a1d554-14e1-7e72-a58c-64ebaf73795a` (host local).

Prioridade H1-01: tornar o artefato REAL de homologação compatível com a onda B. Hoje compose.homolog.yml deixa AUTH_S02_ENABLED/AUTH_MAIL_ENABLED=false, Frontend/Dockerfile não habilita as flags e nginx.homolog.conf bloqueia rotas que o overlay e2e abre. Entregue configuração de homologação interna explícita e documentada, com build frontend, rotas estritamente necessárias, sessão, segredos dedicados, Notification e SMTP coletor interno; nenhum coletor/dado sensível publicamente exposto e nenhum envio externo. O aceite final deve construir Frontend/Dockerfile e usar os arquivos de publicação, permitindo override APENAS de isolamento/porta/segredos/fixtures; não pode depender de Dockerfile.wave-b ou allowlist exclusiva do teste. Atribuição adicional exclusiva: Frontend/Dockerfile, Frontend/.dockerignore, .env.homolog.example e docs/ACEITE-ADMIN.md (atualizar após contratos dos donos); mantenha demais arquivos originais de Infra/Gateway/e2e/scripts/docs production. Publique nomes de variáveis/contrato para S01/S02/S06. Confira limitação por IP atrás do proxy e comportamento 429 sem confiar em X-Forwarded-For arbitrário nem desligar limitador. Prepare preflight somente leitura para capacidade/porta/rede/HTTPS/acesso da VPS compartilhada, com entradas configuráveis e sem conexão ou alteração remota nesta rodada. Prepare manifesto de release/hashes e aviso verificável se checkout sujo; não alegue que git pull publicará os arquivos locais ainda não commitados. Entregue templates de backup/agendamento/alerta local e ensaie incidente/migration incompatível em recursos descartáveis, sem instalar tarefas no host. Inventarie anexos/URLs e declare cobertura real. Após S01–S06 estáveis, rode regressões18 + mobile/reserva/cancelamento/reagendamento + administração ativar/desativar UI e negativas de escrita + emissão/resgate claim UI + onboarding + caixa/reversão + smoke de carga limitado com parâmetros explícitos, sem chamar isso capacidade da VPS. S07 corrige fixtures, donos corrigem produto; registre snapshots estáveis, restore e cleanup, relatório pronto/bloqueado e roteiro de smoke no endereço futuro. R01 receberá evidência pelo filesystem; não precisa mandar mensagem sem autorização no seu chat.

### S02

Chat: `01a1d553-bd0b-7ba1-a53f-4c2fd6677821` (host local).

H1-02: fechar identidade operável na homologação. ProvisionPilotUser hoje só aceita PARTNER/CUSTOMER; o ADMIN da suíte existe por SQL, impedindo operação administrativa pelo procedimento publicado. Entregue provisionamento CLI explícito e restrito ao perfil homolog para ADMIN de teste, senha interativa sem argumento/log, recusa fora do perfil e sem endpoint de promoção pública; não criar conta real agora. Teste duplicidade/elevação e preserve revogação/sessão. Publique matriz mínima de flags/segredos/URLs/SMTP para S07 e faça validação fail-closed quando recursos habilitados carecem de configuração. Alinhe Auth/reset/convites ao coletor de homologação, URLs corretas e acesso administrativo real, sem habilitar rotas OAuth/cadastro incompatíveis por blanket allow. Melhore estados 429/503 dos formulários e gestão de equipe: mensagem útil, retry por ação explícita, sem apagar dados/intenção nem repetir escrita automaticamente. Preserve ownership de auth, AuthContext e features/team/EquipePage concedidos na onda B; S01 mantém api.ts e guards. Publique critérios para S07 testar ativação/desativação pela tela e convite/aceite de todos os perfis pela UI. Documente operação mínima de contas e rastreabilidade já disponível; privacidade/termos e decisões comerciais continuam pendências humanas, não invente aprovação.

### S01

Chat: `01a1d553-ad17-7591-91d6-80a851b22ece` (host local).

H1-03: fechar preparação do frontend real de homologação e orientação inicial. S07 será dono exclusivo de Frontend/Dockerfile e flags de build; forneça contrato e confira que rotas/menus da onda B não desaparecem no artefato de publicação. Atribuição adicional exclusiva: Frontend/src/features/onboarding/ e Frontend/src/pages/partner/DashboardPage.tsx para checklist de configuração baseado em dados reais (estabelecimento, serviço, colaborador/vínculo e escala); cada pendência leva à tela existente, sem simular que configuração está pronta. Consuma contratos de S04; não editar páginas de domínio de outros donos. Complete estados acessíveis/carregamento/erro/vazio e navegação responsiva das primitivas, mantenha padrão visual. Integre orientação de suporte interno configurável, sem inventar contato; ausência de configuração deve ser explícita e não link falso. Revise recuperação compartilhada de sessão e 429/503 com S02, preservando 401 logout, 403 sessão e intenção de escrita. Faça build/typecheck/lint e testes focados, publique roteiro visual móvel para S07. Sem redesenho e sem teste integrado concorrente.

### S04

Chat: `01a1d553-db87-7643-b899-9d0f893810fe` (host local).

H1-04: fechar configuração e administração de Partner/Pet expostas à homologação. Publique para S01 dados/contrato reais que permitem checar estabelecimento, serviço, colaborador e escala; não criar indicador positivo baseado só em mocks. Atribuição adicional exclusiva nesta rodada: Frontend/src/pages/partner/CadastroPage.tsx, ServicosPage.tsx, ColaboradoresPage.tsx, tabs/EnderecoTab.tsx, tabs/HorarioTab.tsx; preservar ColaboradorPage.tsx já seu. Também páginas administrativas ParceirosPage.tsx, ParceiroDetailPage.tsx, tabs/ServicosTab.tsx, tabs/ColaboradoresTab.tsx e partner.service.ts/staff.service.ts no estritamente necessário. Corrija estados de carga/erro/vazio e contexto de escrita; ADMIN abrindo staff de B sob rota de A não pode editar sob contexto falso. Confira e teste isolamento/backend das escritas expostas de cadastro/serviço/equipe/escala e claims; coordene S03 para reservas. Entregue emissão e resgate da prova pela UI testáveis pela S07, além de ativação/desativação de contas pela tela Auth existente. Se houver desativação exposta de estabelecimento, feche consulta de inativos e reativação administrativa auditável com motivo/ator no seu domínio, preservando dados e evitando suspensão silenciosa de identidade Auth; publique impacto para S02/S03/S05. Se não houver política segura para alguma escrita, bloqueie-a explicitamente no fluxo de homologação e documente a pendência, sem inventar regra comercial. Inventarie fotos/anexos/URLs Pet e diga o que realmente exige backup; não criar sistema de anexos novo.

### S03

Chat: `01a1d553-cc44-7d52-aac6-852ee076249d` (host local).

H1-05: concluir jornada do tutor em celular e clareza das regras antes da reserva. Além do escopo anterior, atribuição exclusiva de Frontend/src/pages/app/HomePage.tsx e Frontend/src/pages/admin/tabs/AgendamentosTab.tsx. Complete busca/listagem, escolha do pet/horário, reserva, acompanhamento, cancelamento e reagendamento com estados recuperáveis e layout móvel, consumindo serviços reais. Mostre preço/duração e política vigente de cancelamento antes da confirmação; se a política não estiver exposta publique DTO mínimo do Booking, não invente texto divergente do backend. Preserve chaves estáveis, concorrência, projeções de pet, autoria e escopo profissional. Confira administração de reservas pelo estabelecimento correto, IDs trocados e transições inválidas para S07 ampliar o mapa de escritas. Publique explicitamente o comportamento atual após IN_PROGRESS e de adicionais ainda sem autorização: mantenha indisponíveis as ações não suportadas e mensagens claras; não criar nova regra de interrupção/reembolso ou consentimento comercial nesta rodada. Alinhe estado de parceiro inativo com S04 e não permita nova reserva indevida. Valide localmente o módulo e navegador com viewport móvel; S07 faz o aceite real móvel e regressões.

### S05

Chat: `01a1d553-ec59-7420-bd98-7ccdfbf91644` (host local).

H1-06: fechar operação de caixa e investigação mínima para homologação. A onda B cobriu criação/baixa/fechamento pela UI; complete os estados e a jornada móvel de extrato, recebimento/reversão com motivo e ator, falha recuperável e dia fechado, sem reabrir dia nem duplicar intenção após reload. Dê à S07 roteiro/fixtures reais para reversão autorizada antes do fechamento, negativa para recepção/profissional/outro parceiro, fechamento concorrente e trilha consultável; corrija lacunas concretas encontradas, não escreva testes redundantes. Se houver adicionais sem autorização do tutor, apresente-os somente conforme contrato existente e bloqueie promessa de consentimento/fluxo não implementado; coordene S03. Alinhe parceiro inativo/escopo ao contrato S04 sem liberar leitura fiscal irrestrita. Publique sinais operacionais e dados mínimos necessários para investigar divergência sem alterar banco, para S07 ligar ao diagnóstico. Checkout/créditos/pacotes continuam bloqueados. Não mudar contrato aprovado sem declarar impacto aos consumidores.

### S06

Chat: `01a1d553-ff06-7ea1-bfa7-590afb3968c4` (host local).

H1-07: tornar comunicação e investigação operáveis no perfil real de homologação. Publique com S02/S07 configuração de Auth+Notification para SMTP interno com domínio de teste restrito, URLs/origens corretas, transporte/destinatário explícitos e sem rede externa; não escolher provedor comercial. Corrija quaisquer dependências exclusivas do overlay e documente flags/segredos exigidos. Complete UI administrativa móvel e estados claros para sem destinatário, falha, retry e UNKNOWN, mantendo autoria/auditoria e nenhum retry automático de entrega ambígua. Para origem de balcão ainda sem contrato/consentimento, mantenha envio bloqueado e indique situação ao operador, sem usar contato livre ou endereço por coincidência. Publique observabilidade sanitizada da fila/atrasos/falhas e roteiro de alerta local para S07, sem mensagem externa e sem dados pessoais em logs. Preferências/provedor externo ficam como gate antes de contatos reais; não alegar completos. Apoie S07 em testes reais do perfil publicável, preservando ACK, dedup, obsolescência, READY e reinícios.

## Sequência de aceite

1. S07 publica cedo contrato do perfil publicável; S02/S04/S06 publicam as dependências dos consumidores.
2. Cada dono implementa, valida e registra estado H1/arquivos/limites, preservando os resultados históricos.
3. S07 congela fontes e executa regressões e jornadas novas contra o artefato real de homologação; ajustes de fixture não podem relaxar contratos.
4. Conferir hashes, resultado por jornada, restauração/cleanup e limitações. Cards só recebem conclusão com evidência compatível.
5. Separar pronto localmente, pronto para publicar e aprovado no endereço publicado. Este despacho não executa publicação.

Estado do despacho: sete mensagens aceitas nos chats existentes; espera de 50 segundos confirmou os sete workers em execução, cada um já inspecionando seu escopo. [Confirmações e observações iniciais](pre-homolog-worker-observations.json). O despacho foi concluído; as implementações H1 e seu aceite ainda estão em andamento. Nenhum resultado novo foi declarado aprovado.
