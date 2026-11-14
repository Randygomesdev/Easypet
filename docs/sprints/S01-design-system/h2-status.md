# H2 — Status S01

14/11/2026. Página de suporte existente `Frontend/src/routes/InternalSupportPage.tsx`, com ownership S01 nesta rodada. Contratos web e dependências publicados em [h2-contracts.md](h2-contracts.md) e [h2-integration.md](h2-integration.md).

## Handoff para S07 — 14/11/2026

**Frontend pronto para iniciar o aceite integrado S07.** `npm run build` passou (TypeScript e Vite). O estado `INTERRUPTED` está coberto nos mapas da aba administrativa e do painel do estabelecimento. O filtro ADMIN permite consultar reservas interrompidas, sem ações de transição. No painel do estabelecimento, elas aparecem na distribuição por situação e saem da lista de próximos atendimentos.

Em `/suporte`, uma sessão verificada `CUSTOMER` pode ler e salvar a preferência em `GET`/`PUT /api/v1/notifications/preferences`. Os demais papéis e visitantes não montam o formulário.

`npm run test:design-system` passou no Chrome com APIs simuladas. Cobriu navegação até a preferência, erro 503 e nova tentativa, alteração e releitura após recarregar a página. Conferiu também que o perfil `PARTNER` não monta o formulário nem consulta a preferência. ESLint passou nos arquivos do handoff. O aceite com os serviços reais segue com S07.
