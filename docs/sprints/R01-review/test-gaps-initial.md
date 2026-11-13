# R01 — Cobertura e lacunas

Cobertura da primeira entrega S01–S07. Resultados históricos no roadmap não cobrem automaticamente os arquivos desta rodada. A coluna de execução distingue os testes do R01 dos testes executados pelos donos.

## Execução isolada R01

- `isolated/BookingHttpTimeoutProbe.java`: cópia exata do bean HTTP do Booking, compilada sem alterar o módulo; introspecção confirmou ausência de timeout de conexão e leitura (R01-002). Não simula transação ou banco.
- `isolated/run-partner-security.ps1`: seis verificações MockMvc concluídas com os arquivos reais de segurança do Partner copiados e compilados em R01. Confirmou o bypass das leituras legadas (R01-001) e os controles negativos administrativos. Controller inerte; não usa banco, servidor HTTP nem Compose. Não equivale ao teste integrado de resposta/DTO ou de Gateway. Os hashes e a saída estão na subpasta `isolated/`.
- `node docs/sprints/R01-review/isolated/frontend-typecheck.mjs`: última execução sem emissão de build em 13/11/2026 às 12:17:25 BRT, após a entrega S03. Mantidos três diagnósticos TS2741: mapas sem `NO_SHOW` em `Frontend/src/pages/admin/tabs/AgendamentosTab.tsx:54` e `Frontend/src/pages/partner/DashboardPage.tsx:28,36`. Já registrados como integração/ownership pendente por S01/S07; não os atribuir às primitivas S01. O primeiro ensaio do script tinha diretório de resolução de tipos incorreto; foi corrigido e substituído pelas execuções válidas. Resultado/hash atual em `isolated/frontend-typecheck-*`.

## Integrações pendentes identificadas (não confundir com defeito confirmado)

- Criação de reserva nas telas de catálogo/carrinho ainda não passa a chave opcional do contrato S03. Falha de resposta seguida de repetição pode duplicar intenção em outra vaga/profissional. S01/S03 já solicitaram dono para esses consumidores; testar chave estável na UI quando integrado.
- Rotas de recuperação, convite, caixa e notificações ainda dependem de S01/S07; telas/componentes presentes não equivalem a jornada navegável.
- Cadastro de balcão continua `UNCLAIMED` sem transferência automática por e-mail. Isso preserva isolamento. A atualização final S03 adicionou a API de reserva com `receptionCustomerId`: exige titular, confere os três IDs via Pet, mantém `userId` nulo e impede prontuário. Reivindicação e jornada de criação dessa reserva pela UI permanecem pendentes.
- As permissões de equipe publicadas pelo Auth não são permissões operacionais já implementadas em Booking/Partner/Pet/Payment. Serviços legados recusam a chave separada de equipe; não há evidência de liberação indevida só por existir `TEAM_MEMBER`.

## Evidências de testes dos donos já inspecionadas

R01 leu fontes e relatórios Java abaixo; não os executou. Todos os números correspondem à execução posterior aprovada, sem falhas, erros ou skips. A captura final dos relatórios fica em `test-report-summary.json`.

| Dono | Relatório | Execução e alcance |
| --- | --- | --- |
| S02 | AuthApiIntegrationTest 6 + JwtServiceTest 2 | PostgreSQL 15/MockMvc, SMTP em memória e Partner simulado. Papel atribuído no servidor, reset concorrente, sessão revogada, administração, convites e assinatura separada. |
| S03 | BookingAgendaPostgresTest 10 + BookingServiceTest 26 | PostgreSQL 16 para intervalos, capacidade, idempotência concorrente, rollback, encaixe, bloqueio, estados/checklist/outbox e balcão. Pet/Partner simulados; demais testes de serviço isolados. |
| S04 | Partner: 14; Pet: 9 selecionados | H2/MockMvc e doubles para escopo, IDs trocados, duplicidade, papéis e vínculo indisponível. Teste completo de contexto Pet não está incluído. Migrations PG15 relatadas pelo dono, sem execução independente R01. |
| S05 | CashierLedgerPostgresTest 4 + PackageServiceTest 5 | PostgreSQL 15 e HTTP simulado para Partner/Booking. Centavos, parciais, replay concorrente, reversão entre dias, isolamento e corrida com fechamento. Não capturou a divergência 401/403 do servidor real. |
| S06 | NotificationAuthorizationTest 5 + NotificationFlowTest 8 + SmtpEmailTransportTest 3 | H2 PostgreSQL mode, LOCAL, Auth/Booking/JavaMail simulados. Deduplicação, revisão antiga, cancelamento, backoff, autoria, UNKNOWN, ACK após persistência e falha fechada. SMTP 451 é transitório; desconexão ambígua é UNKNOWN. |

S01–S06 relataram verificações de navegador usando sessões/respostas simuladas. S07 executa o aceite real; seus resultados finais ficam em `review.md`. Descobrir dez cenários com `--list` não equivale a executá-los.

## Cenários a conferir nas entregas

- S02/S04/S07: JWT adulterado/expirado, revogação/reset/inativação com token existente, troca de IDs entre estabelecimentos, papéis sem permissão, acesso direto aos serviços e falha fechada quando Auth está indisponível.
- S03: duas transações na última vaga, intervalos sobrepostos com inícios diferentes, capacidade de hospedagem, repetição de chave, rollback de reagendamento, transições concorrentes e outbox atômica.
- S05: centavos/limites, parciais simultâneas, chave repetida/divergente, vínculo reserva/estabelecimento, corrida recebimento/fechamento, reversão auditável e bloqueio de checkout/créditos.
- S06: persistência antes de ACK, repetição e ordem invertida de eventos, cancelamento de lembretes antigos, falha do transporte, reinício e autorização administrativa.
- S01/S07: galeria com dados fictícios, proteção de rotas em build, integração das páginas, proxy e preservação do bearer; teste com serviços reais separado de mocks.

## Lacunas que impedem extrapolar o aceite local

| Dono | Cenário ainda necessário | Resultado esperado |
| --- | --- | --- |
| S02/S07 e serviços de domínio | Reset/inativação com JWT emitido antes da mudança, enviado ao Gateway e diretamente a Booking/Partner/Pet/Payment; indisponibilidade de Auth. | Próxima operação recusada sem efeito persistido; falha de consulta de sessão não autoriza. A implementação atual invalida no Auth, mas os serviços legados verificam assinatura sem consultar sessão. |
| S02/S03/S04/S05 | Operador de equipe de outro estabelecimento; profissional tentando reserva alheia; recepção tentando fechar caixa. | Conferir estabelecimento e permissão específica, com autoria individual; não basta aceitar `TEAM_MEMBER`. Hoje a chave separada mantém a equipe fora dos serviços legados. |
| S03 | Pet/Partner aceita conexão e deixa resposta pendente durante uma reserva; outra operação aguarda a mesma agenda. | Timeout finito, rollback completo, ausência de evento/histórico parcial e liberação da segunda transação. R01-002 reproduziu a configuração, não este ensaio de falha parcial. |
| S03/S01 | Resposta da criação perdida após commit, seguida de nova tentativa pelo catálogo/carrinho. | UI reaproveita chave estável e recebe o mesmo ID; não aloca outra vaga. A API tem idempotência optativa, os consumidores anteriores ainda não a enviam. |
| S04/S02/S03 | Pet de balcão sem conta: agendar/consultar com serviços reais e pela UI; reivindicar com prova expirada/repetida/de outro titular. | Vínculo entre estabelecimento, cliente e pet validado; nenhum vínculo automático por e-mail. S03 adicionou a API e um teste PostgreSQL com Pet simulado; reivindicação segue ausente e `UNCLAIMED` preservado. |
| S05/S07 | Jornada no painel com Partner e Booking reais; repetição após reload; autorização por conta revogada. | Mesmo vínculo e saldo do contrato, nenhuma baixa por concluir atendimento; sem duplicação após resposta perdida. A tela isolada só preserva a chave enquanto o formulário permanece aberto. |
| S06/S07 | Na cadeia real, cair após commit antes do ACK; reiniciar após tentativa SENDING; revisar/cancelar antes do lembrete; consultar/reencaminhar por ADMIN. | Replay sem duplicar entrega, obsoletos invalidados, tentativas ambíguas UNKNOWN e autorização via Auth real. S07 comprovou o percurso básico até uma confirmação LOCAL em PostgreSQL; esses cenários adicionais ainda dependem de doubles nos testes. |
| S02/S06 | Recuperação/convite por coletor SMTP local e resolução autenticada de destinatário. | Link funcional sem token em logs, destinatário autorizado, política de abuso aplicada. Adaptador SMTP de S06 ainda depende de endpoint S02 não entregue. |
| S01/S07 | Build completo e navegação real de recuperação, equipe, caixa e notificações; galeria em build com sessão real. | TypeScript sem erros, rotas conectadas somente quando APIs prontas e guard correto. Testes de UI com API simulada não cobrem publicação. |
| S07 | Restaurar jornadas representativas nos seis bancos, com reservas/cobranças/outbox/ACKs e anexos quando existir armazenamento. | Retomar leituras, movimentos e fila preservando vínculos e sem reenvios incorretos. Contagem de tabelas e dumps íntegros só comprovam restauração estrutural. |

Somente S07 pode executar o aceite integrado/Compose. R01 não o iniciou. Cenário sem evidência de execução permanece não validado; os cenários acima não são alegações de que todas as falhas hipotéticas já ocorreram.
