# Publicação H2 em homologação — 14/11/2026

A revisão `c5fc018` está publicada em https://easypet.innker.com.br. O [aceite local](../sprints/H2-fechamento/aceite.md) cobre 35 cenários integrados, o controle separado de Google desligado e a restauração de 61 tabelas com 20 consultas de referência.

## Publicação e recuperação

- Sete imagens foram construídas na estação. Após falha de transferência do tar completo, a VPS recebeu um pacote diferencial. Os seis JARs reconstruídos e cada arquivo do frontend foram conferidos contra os SHA-256 dos arquivos locais. As imagens de execução foram montadas sobre as bases anteriores com `FROM` e `COPY`. Não houve compilação Java ou Vite na VPS. O manifesto do código foi conferido no checkout publicado.
- A primeira subida do Auth falhou porque o JAR copiado estava com permissão `0600` de root. A reversão retomou a revisão `210e8df` e os volumes originais. A tentativa seguinte gerou outro backup com as escritas suspensas, restaurou em seis volumes novos e aplicou Auth V6, Partner V21, Booking V8, Payment V5 e Notification V4. O teste de acesso público identificou ainda um `403` na página inicial por permissões dos assets. A correção substituiu apenas o frontend e o teste completo foi repetido com sucesso.
- O ponto de recuperação do corte bem-sucedido está em `/srv/easypet-backups/pre-h2-retry-c5fc018`, com seis dumps, catálogos legíveis e manifesto SHA-256. Os volumes anteriores e as tags `pre-h2-c5fc018` foram preservados. Qualquer reversão após reabertura precisa reconciliar escritas posteriores.
- Para futuras partidas, use o mesmo projeto `easypet-homolog`, os cinco arquivos Compose do [roteiro da VPS](setoriza-homolog.md) e, por último, `-f /srv/easypet-release/h2-c5fc018/volumes-retry.yml`. Esse arquivo aponta aos seis volumes ativos da H2. Os scripts de backup e diagnóstico consultam os containers em execução pelo projeto.

## Backups e alertas

- `easypet-backup.timer` habilitado para 05h30 em America/Sao_Paulo, com retenção inicial de sete dias no diretório dedicado `/srv/easypet-backups/h2-periodic`. A primeira execução manual da mesma unidade terminou com sucesso e os seis dumps foram verificados. A retenção periódica se aplica aos conjuntos gerados nesse diretório.
- `easypet-operations-alerts.timer` habilitado para execução a cada minuto, no segundo 45. O limiar de idade do backup é de 30 horas. Um ensaio com diretório vazio gerou o alerta de backup. A unidade apontou para o backup verificado e registrou a recuperação do mesmo incidente, com sequência 2 e autoria SYSTEM, visível pela API do ADMIN.
- Habilitação e estado ativo dos timers de backup, alertas e coleta master foram conferidos. O envio externo, a cópia fora do host, o armazenamento de anexos e os objetivos de recuperação de produção permanecem abertos.

## Validação pública

- 33 verificações passaram no domínio HTTPS. Incluíram página inicial e seus assets, login por senha das cinco contas convidadas, redirecionamento Google com callback HTTPS, healthcheck e diagnóstico dos 16 serviços, acesso ADMIN, negativas por papel, bloqueio de cadastro e checkout, preferências e abertura, repetição e resolução privada de chamado sintético. O Google foi verificado até o redirecionamento nesta rodada.
- As 32 sondas feitas na VPS ao Setoriza durante as janelas retornaram HTTP 200, com máximo de 0,501 s. A comparação do corte bem-sucedido encontrou os 19 containers fora do EasyPet com os mesmos IDs, horários de início, contagens de reinício e indicadores de OOM. A amostragem do novo corte registrou mínimo de 2.651 MiB de RAM disponível no host e máximo de 2.240 MiB somados no EasyPet. Os 16 serviços EasyPet estavam saudáveis no final, sem OOM ou reinícios automáticos.
- Evidência operacional privada na VPS em `/srv/easypet-release/h2-c5fc018/summary.json`. Evidência sanitizada das sondas HTTP no [resultado público](../sprints/H2-fechamento/publicacao-smoke.json).
