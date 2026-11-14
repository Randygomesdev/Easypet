# S07 — Contratos H2

## Ingresso

As rotas H2 entrarão por método e caminho explícitos após publicação do contrato do serviço dono. O Gateway encaminhará o Bearer original, descartará cabeçalhos de identidade vindos do cliente e continuará verificando sessão sem cache. O upstream mantém papel, escopo e idempotência. O ingresso preserva `Idempotency-Key`, códigos de domínio, `429` e `X-Request-Id`. Sessão rejeitada segue `401`, Auth indisponível segue `503` e papel recusado pelo dono segue `403`. Rotas internas, checkout, créditos e cadastro público ficam bloqueados no Nginx e sem rota pública no Gateway.

## Backup periódico candidato

- Um comando do operador cria um diretório próprio por execução sob um repositório dedicado. Usa o formato custom PostgreSQL e manifesto v1 SHA-256 do `database.mjs`. O conjunto publicado tem exatamente os seis bancos. Cada dump é validado e publicado somente após a verificação do conjunto.
- Agenda, retenção e raiz são entradas explícitas. A retenção age apenas em conjuntos concluídos e reconhecidos pelo wrapper, dentro da raiz dedicada, depois de um backup novo íntegro. Uma trava cobre backup, estado e retenção. Execuções concorrentes falham sem tocar arquivos da execução ativa. Backups avulsos, diretórios desconhecidos e links ficam preservados.
- O estado do último ciclo é local, com resultado, horário e códigos operacionais permitidos. Age máximo, falha e recuperação alimentam o diagnóstico. A perda do serviço de alertas preserva a coleta e o código de saída do backup. O restore continua descartável e valida hashes antes do PostgreSQL.
- Exemplo de unidades systemd fica inativo no repositório. Retenção, periodicidade, RPO/RTO e destino externo dependem do operador. A execução H2 é local, com fixtures.

## Alertas internos

`POST /api/v1/internal/operations/alerts` no Notification usa Bearer `NOTIFICATION_OPERATIONS_TOKEN` dedicado. Corpo `{incidentId, sequence, state, source, service, code, severity, correlationId}`. `202` confirma envio, inclusive replay. Os demais códigos deixam o item local pendente. `OPEN` usa sequência 1. `RECOVERED` usa sequência 2 e preserva ID e metadados do incidente. O script salva a transição antes de tentar a entrega e repete o mesmo payload se a resposta se perder. Porta do Notification privada e caminho excluído de Gateway/Nginx. O operador usa `compose exec` para chamar o loopback do próprio Notification, que já tem o token. O aplicativo roda sem socket Docker. [Contrato S06](../S06-notificacoes/h2-contracts.md).

`BACKUP_FAILED` representa falha registrada, ausência ou vencimento do backup, com frescor explícito no log local. Um snapshot master vencido preserva incidentes já abertos por serviço e abre sinal de INFRA. O próximo snapshot válido permite informar a recuperação observada.

Esta fatia não cria migration de domínio nem altera o transporte local SMTP. O estado vencido e a recuperação serão exercitados com relógio ou dados de teste.
