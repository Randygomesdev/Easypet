# Revisão e aceite H2

14/11/2026. A R01 conferiu os handoffs dos sete workers. A base de código da rodada foi `daabe0a`. A S07 opera a stack descartável e registra os snapshots e os resultados do teste integrado no [status de integração](../S07-infra-integracao/h2-status.md).

| Worker | Entrega revisada | Validação do domínio |
| --- | --- | --- |
| S01 | Busca no catálogo, auditoria, investigação de reservas, central ADMIN, chamados e preferência de e-mail do tutor. Mapas de status atualizados para interrupção. | Build TypeScript/Vite e suíte de interface em Chrome com APIs simuladas. |
| S02 | Auditoria transacional de contas e acessos com autoria e consulta ADMIN. | 34 testes com PostgreSQL descartável. |
| S03 | Interrupção, histórico e autorização digital ou presencial de adicionais. Projeção de investigação e origem de balcão nos eventos. | 49 testes, dos quais 23 usam PostgreSQL. Jornadas de interface com APIs simuladas. |
| S04 | Busca combinada por serviço ativo, autorização de contato de balcão e histórico de tutores na UI. | 36 testes Partner, cinco cenários focados repetidos em PostgreSQL e 17 regressões Pet. Jornadas de interface com APIs simuladas. |
| S05 | Aplicação explícita de adicional autorizado e consulta de caixa por reserva. | 16 testes, dos quais nove usam PostgreSQL. Jornadas de interface com APIs simuladas. |
| S06 | Preferências, resolução privada de chamados, recuperação de incidentes e entrega de balcão condicionada à autorização. | 40 testes de serviço com H2 e dublês de dependências. Preferências exercitadas em Chrome com API simulada. |
| S07 | Roteamento, backup dos seis bancos, retenção, alerta local e suíte H2. | Seis testes Gateway. A R01 repetiu os três testes de backup e alerta com arquivos temporários e PostgreSQL simulado. |

O processo integrado usa dados sintéticos, Chrome, provedor OAuth local e SMTP de captura. O aceite da operação publicada, o envio externo, a programação dos backups na VPS, anexos e objetivos de recuperação têm cards próprios.

## Resultado no navegador e nos serviços

A primeira execução aprovou 34 cenários. A checagem de bloqueio do Nginx recebeu o `404` esperado, mas falhou ao ler o corpo HTML como JSON. A S07 corrigiu a checagem para validar o código HTTP. A R01 comparou os snapshots da tentativa e identificou uma alteração concorrente no teste isolado `design-system.browser.mjs` da S01.

O reteste integral aprovou **35 cenários em 5,5 minutos**, incluindo os cinco novos da H2. O cenário exclusivo de Google desligado foi ignorado pela configuração com OAuth de fixture ligado. Passaram menu desktop e móvel, busca combinada, autorização digital e presencial, aplicação única no caixa, interrupção com histórico, auditoria ADMIN, isolamento de chamados, preferência pela UI, entrega e revogação de balcão com SMTP local e recuperação de alerta no mesmo incidente.

A S07 gerou os seis dumps pelo wrapper agendável, simulou uma migration incompatível no Booking e restaurou **61 tabelas em seis bancos** descartáveis. As **20 consultas de referência** coincidiram com a origem. A R01 comparou as 722 entradas dos snapshots inicial e final e com os arquivos atuais. Nenhuma divergência foi encontrada. [Evidência S07](../S07-infra-integracao/h2-status.md)

O controle separado com Google desligado também passou. Ele confirmou que a interface oculta a entrada social e que as três rotas OAuth ficam fechadas.
