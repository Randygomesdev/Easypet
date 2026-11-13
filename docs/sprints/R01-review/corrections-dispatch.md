# Rodada de correções R01

Disparada em 13/11/2026 por autorização explícita do usuário: “dispare para os workers responsaveis realizarem as correções”. Cinco mensagens aceitas nos chats existentes, sem alterar modelo/esforço e sem criar novos chats.

| Worker | Correção atribuída |
| --- | --- |
| S04 | R01-001: autorizar leituras completas de Partner e publicar contrato mínimo para consumidores. |
| S03 | R01-002: limitar chamadas HTTP/espera transacional, testar rollback e retomada da agenda; adaptar consumidor ao contrato Partner. |
| S05 | R01-003: distinguir 401/403 em servidor real, mantendo autorização e ledger; adaptar consumidor Partner se necessário. |
| S01 | Corrigir NO_SHOW nos mapas de AgendamentosTab e DashboardPage; validar typecheck/build. Atribuição pontual desses dois arquivos registrada no pedido. |
| S07 | Acompanhar as quatro correções e repetir build/aceite integrado com regressões, sem relaxar expectativas. |

IDs dos chats em `../threads.json`. S03/S05 devem consumir o contrato S04 e preservar os respectivos escopos. S07 mantém exclusividade sobre Compose e suíte integrada. Testes locais usam recursos isolados. Nenhum deploy, mensagem real, ativação de checkout/créditos ou ampliação para todas as funcionalidades futuras foi solicitado.

Os achados permanecem abertos até revalidação. O parecer anterior descreve o snapshot revisado; o disparo não equivale a correção nem a aprovação. Os workers registram evidências em suas próprias pastas; não alteram os relatórios R01.
