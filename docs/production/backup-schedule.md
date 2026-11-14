# Backup periódico e alertas internos H2

Os [exemplos systemd](../../scripts/production/setoriza-homolog/) ficam inativos. Defina periodicidade, retenção, idade máxima, destino e responsáveis antes de ativar. O timer de alertas é separado e pode usar a cadência aprovada para o snapshot master e os retries de entrega. A operação exige Node.js 24, Docker acessível pelo operador e diretórios dedicados graváveis pelo usuário da unidade.

```sh
node scripts/production/backup-scheduled.mjs --project easypet-homolog \
  --env-file /etc/easypet/homolog.env --directory "$EASYPET_BACKUP_DIRECTORY" \
  --retain-days "$EASYPET_BACKUP_RETENTION_DAYS"
node scripts/production/operations-alerts.mjs --project easypet-homolog \
  --env-file /etc/easypet/homolog.env --master-file /var/lib/easypet/monitor/status.json \
  --backup-directory "$EASYPET_BACKUP_DIRECTORY" --state-directory /var/lib/easypet/operations \
  --max-backup-age-seconds "$EASYPET_BACKUP_MAX_AGE_SECONDS"
```

- Preencha `OnCalendar` no timer segundo a periodicidade aprovada. Use um repositório exclusivo do agendador com acesso restrito. Ajuste `ReadWritePaths` à raiz escolhida. A trava `.backup.lock` cobre dump, retenção e status. Depois de um encerramento abrupto, confirme que a execução terminou e inspecione o estágio antes de remover somente a trava vazia. Conjuntos antigos íntegros com marca do agendador expiram depois da publicação íntegra de um novo conjunto. Backups avulsos e conjuntos estranhos ficam preservados.
- `pg_restore --list` valida o catálogo de cada dump. SHA-256 protege a integridade ao transferir ou restaurar. O ensaio de restauração usa `database.mjs restore-drill --directory <conjunto>` em recursos descartáveis. Os dumps operacionais são sequenciais, cada banco com seu próprio snapshot. Recuperação consistente entre serviços sob escrita concorrente depende de um procedimento operacional aprovado.
- `backup-status.json` registra falha de dump, falha de retenção ou sucesso, com o último horário de backup íntegro. `operations-alerts.json` guarda sinais pendentes e incidentes ativos, sem dados de negócio. Alertas usam token dedicado, presente apenas no Notification. O coletor retorna `0` sem pendências, `2` com sinais para retry e `1` por falha local. A unidade de alertas é independente do backup e da coleta master. O journal local cobre incidentes quando o ADMIN está indisponível. Canal independente de alerta e retenção da fila local seguem pendentes.

## Arquivos e armazenamento

Backend e frontend têm referências de fotos e um cliente para `/files/upload`. O artefato de homologação não tem serviço/volume de objetos nem rota Gateway correspondente. As referências persistidas no PostgreSQL entram nos dumps. Recuperar os bytes de anexos externos depende da escolha e do inventário de armazenamento, chaves de objetos, versões, serviço de upload, retenção e cópia fora do host. Validação com objetos externos, RPO/RTO e restauração publicada continuam pendentes.
