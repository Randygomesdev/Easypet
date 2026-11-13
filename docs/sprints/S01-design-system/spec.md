# S01 — Design system e integração frontend

## Objetivo

Implementar esta fatia do roadmap obedecendo às regras de [execução paralela](../README.md).

## Ownership exclusivo

Frontend/src/components/, Frontend/src/index.css, Frontend/src/App.tsx, Frontend/src/routes/, Frontend/src/pages/design-system/, Frontend/docs/, Frontend/package.json e lockfile. Também pode editar esta pasta de sprint. Outros caminhos exigem pedido de integração ao dono; não editar diretamente.

## Entregas

- [ ] Inventariar tokens e componentes existentes e extrair primitivas reutilizáveis sem redesenhar as páginas.
- [ ] Criar galeria navegável /design-system com tokens, tipografia, botões, campos, selects, badges, cards, diálogos, tabelas, paginação e estados de loading/erro/vazio; exemplos interativos e snippets reais.
- [ ] Documentar contratos de componentes e composição; componentes de apresentação não importam API, autenticação ou páginas de domínio.
- [ ] Integrar rotas e navegação solicitadas nos contracts das outras sprints quando arquivos estiverem prontos; manter a galeria restrita ao ambiente de desenvolvimento ou papel ADMIN.
- [ ] Migrar uma página representativa sob coordenação registrada, sem refatorar páginas de outro dono simultaneamente; validar responsividade, temas, teclado e foco.

## Dependências e início imediato

Pode começar imediatamente com componentes existentes. Rotas de outras sprints dependem de contracts e arquivos prontos.

## Critérios de aceite

Galeria funcional no navegador, componentes demonstram variantes reais, build aprovado e padrão visual existente preservado. Não marcar integrações de outras sprints como concluídas antes de testá-las.

## Validação

Build e lint do frontend; testes de interação relevantes para diálogo/campos; inspeção visual desktop/mobile e claro/escuro quando disponíveis.

## Entrega obrigatória

contracts.md antes de integrar; integration.md para pedidos externos; status.md com evidências. Não alegar envio real, publicação, execução de teste ou conclusão integrada sem evidência. Qualquer frontend segue padrão visual, baixo acoplamento, atomização e galeria conforme README.
