# H2 — Integrações S01

| Dono | Dependência para o frontend |
| --- | --- |
| S02 | Contrato da listagem administrativa de auditoria, com filtros e paginação. |
| S03 | Projeção de reserva e histórico mínimo com acesso ADMIN. |
| S04 | Contrato de busca combinada no catálogo público. |
| S05 | Projeção de caixa por ID de reserva com acesso ADMIN. |
| S06 | Contratos de alertas/chamados, lista própria, reconhecimento, resolução e consulta de tentativas por reserva. |
| S07 | Integrar caminhos HTTP dos produtores no ingresso e aceitar as rotas web H2 com sessões reais. |

Contratos consumidos em 14/11/2026: catálogo S04 mantém `name` e `category`; auditoria S02 oferece `/admin/identity-audit`; investigação S03 oferece `/admin/bookings/investigations` e detalhe; a projeção S05 exige `partnerId` originado no detalhe; tentativas e central seguem S06. A resolução de chamado usa `resolutionMessage` obrigatório e conserva a autoria.

Os bloqueios de build observados nos mapas de `BookingStatus` e no contrato de `customerApiError` foram sanados no checkout compartilhado. R01 atribuiu à S01 os ajustes finais em `AgendamentosTab.tsx` e `DashboardPage.tsx`. Validação e prontidão para S07 registradas em [h2-status.md](h2-status.md).
