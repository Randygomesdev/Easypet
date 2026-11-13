# Execução paralela — EasyPet

Atualizado em 13/11/2026. Workers S01–S07: gpt-6.1-sol; esforço high (alto). Revisão independente R01: gpt-6-astra; esforço high (alto).

## Objetivo e ondas

Onda A: S01 a S07 iniciam simultaneamente em seus escopos exclusivos. Entregam a primeira fatia das etapas 0 a 5 do roadmap, sem afirmar que cada etapa inteira ficou concluída.
Onda B: integrar contratos/rotas e executar o aceite conjunto. Em seguida completar lacunas de equipe, suporte, privacidade e recuperação apontadas pelos resultados.
Onda C: piloto com convidados e abertura gradual (etapa 6), após gates do roadmap; implementação de checkout, créditos e conciliação (etapa 7) somente após base financeira confiável.
Onda D: retenção e expansão (etapa 8), priorizadas por evidência do piloto.

## Regras comuns obrigatórias

- Leia docs/ROADMAP.md, esta especificação e spec.md/mission.md da sua sprint. Código atual prevalece sobre documentação desatualizada.
- O checkout contém alterações pré-existentes e é compartilhado por chats locais. Não usar git checkout/reset/clean/stash, trocar branch, fazer commit geral ou sobrescrever trabalho de outro chat. Preserve mudanças existentes.
- Edite apenas seu escopo e sua pasta docs/sprints/Sxx-*. Não editar roadmap, este índice nem arquivos de outro dono. Necessidades externas vão em integration.md, com caminho, contrato e comportamento solicitado. Não criar chats/subagentes adicionais.
- Antes de implementar integrações publique contracts.md com endpoint, método, request/response, erros, autenticação, idempotência, exemplos e migrations. Consumidores leem o contrato do dono e registram dependências; não inventam endpoints nem tratam mocks como entrega integrada.
- Mudanças em contrato devem ser retrocompatíveis quando possível e registradas com impacto. APIs não devem compartilhar entidades/bancos entre serviços. Migrações aditivas, sem destruir dados ou editar migration já aplicada.
- Atualize status.md com estado (em execução, implementação pronta, integração pendente, bloqueada ou validada), entregas, arquivos, testes executados/resultados e pendências. Cada worker escreve só seus próprios relatórios.
- Não fazer deploy, cobrar pagamentos, enviar e-mail/WhatsApp reais, publicar externamente nem alterar credenciais reais. Use ambientes e dados descartáveis. Não ativar checkout/créditos.
- Testes locais de cada módulo podem rodar em paralelo. Só S07 executa a suíte integrada/Compose; qualquer teste com recursos compartilhados deve usar nome, porta e volume exclusivos. Só S01 altera dependências npm/lockfile; evitar reinstalações concorrentes.
- Não encerrar apenas com plano: implemente a fatia independente autorizada, teste e registre o que depende de terceiros. Não marcar etapa inteira do roadmap concluída por uma entrega parcial.

## Frontend — exigência do usuário

Preservar rigorosamente o padrão visual das páginas atuais: tokens de Frontend/src/index.css, paleta, tipografia, espaçamento, cards, estados e responsividade. Ler Frontend/docs/design-system.md e inspecionar páginas existentes antes de criar UI. Não redesenhar o produto.

Baixo acoplamento: primitivas visuais em components/ui sem chamadas HTTP/regras de domínio; componentes de domínio em features/<domínio>; services e hooks separados da apresentação. Atomizar por responsabilidade, com props tipadas e composição; evitar mega-componentes e abstrações sem reutilização real. Usar lucide-react, textos em português, acessibilidade e tokens semânticos compatíveis com temas existentes.

S01 é dono de components, tokens, App.tsx, routes e navegação. Outros workers usam componentes existentes e contratos publicados por S01; não duplicam uma biblioteca de UI. Solicitações de componentes e rotas ficam no integration.md da própria sprint. Cada sprint frontend fornece exemplos dos novos padrões para a galeria, integrados por S01. S01 registra qualquer transferência pontual de ownership antes de editar uma página de domínio.

## Contratos e integração

1. S02 publica identidade/permissões; S04 publica clientes/pets e vínculo ao estabelecimento.
2. S03 publica reserva, concorrência e envelope de eventos; S05 publica ledger de recebimentos; S06 publica consumo de eventos e transporte local.
3. S01 integra telas prontas e rotas; S07 integra proxy/Compose e executa aceite.
4. Se uma dependência ainda não existe, entregar núcleo testado com adaptador e registrar integração pendente; nunca habilitar fluxo incompleto como pronto para produção.

## Sprints em execução

| Sprint | Escopo | Especificação | Missão |
| --- | --- | --- | --- |
| S01 | Design system e integração frontend | [spec](S01-design-system/spec.md) | [mission](S01-design-system/mission.md) |
| S02 | Identidade, onboarding e acessos | [spec](S02-identidade/spec.md) | [mission](S02-identidade/mission.md) |
| S03 | Agenda confiável e atendimento | [spec](S03-agenda/spec.md) | [mission](S03-agenda/mission.md) |
| S04 | Clientes, pets e operação de balcão | [spec](S04-balcao/spec.md) | [mission](S04-balcao/mission.md) |
| S05 | Caixa e recebimentos no estabelecimento | [spec](S05-caixa/spec.md) | [mission](S05-caixa/mission.md) |
| S06 | Notificações transacionais | [spec](S06-notificacoes/spec.md) | [mission](S06-notificacoes/mission.md) |
| S07 | Infraestrutura, integração e aceite | [spec](S07-infra-integracao/spec.md) | [mission](S07-infra-integracao/mission.md) |

O registro dos chats está em threads.json. Cada chat tem autoria exclusiva da pasta da sua sprint e dos caminhos listados em sua spec. Prazos não são prometidos antes da inspeção de cada worker.

## Revisão independente

[R01 — Revisão Astra](R01-review/mission.md) acompanha as entregas e revisa permissões, concorrência, caixa e integração. O revisor pode ler todo o código, mas escreve apenas em docs/sprints/R01-review/. Seus achados não substituem o aceite integrado da S07. Os workers consultam findings.md antes do aceite final e registram correções em seus próprios relatórios. Revisão pendente não equivale a aprovação.
