# S01 — Integração frontend H2

Leia `spec.md` desta rodada e sua spec histórica. Base/branch/worktree e regras comuns são obrigatórias.

Ownership: escopo histórico S01, mais `Frontend/src/pages/app/HomePage.tsx`, `Frontend/src/services/partner.service.ts`, `Frontend/src/features/support/`, `Frontend/src/services/support.service.ts`, `Frontend/src/pages/admin/MasterDashboardPage.tsx`, `Frontend/src/pages/admin/MasterSystemPage.tsx` e novas páginas ADMIN de auditoria/ocorrências. Localize a página atual de suporte e registre seu caminho no h2-status antes de editá-la; ownership dessa página é seu nesta rodada. Outros domínios continuam com seus donos.

Entregue busca combinada usando contrato S04, central ADMIN/solicitação de suporte usando S06, investigação por reserva com projeções S03/S05/S06 e consulta de auditoria S02. Preserve tokens, temas, acessibilidade, componentes pequenos e menu que empurra a página (`210e8df`). Integre o sino sem notificações fictícias. Não trate mock como integração pronta.

Pode começar agora a revisão de layout/teclado/móvel, estrutura visual e contratos de componentes; use h2-integration para dependências. Testar carregamento, erro/retry, vazio, autorização, filtros/reset de página, teclado e móvel. Não corrigir indiscriminadamente lint de arquivos de domínio alheio: registrar responsáveis. Nenhuma instalação npm concorrente. Relate em `S01-design-system/h2-status.md` e `h2-integration.md`.
