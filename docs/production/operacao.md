# Operação do EasyPet

Use estes procedimentos no host Docker do ambiente, com Node.js 24 e Docker Compose. A configuração de homologação publica apenas o Nginx em loopback. A entrada compartilhada da VPS termina HTTPS. Para `easypet.innker.com.br`, o usuário autorizou site acessível pela internet com autenticação restrita a convidados (`public-invited`); outros ambientes podem manter VPN/rede privada. [Configuração da homologação](../../Backend/Infra/docs/homologacao.md) e [preparação da VPS Setoriza](setoriza-homolog.md).

## Preflight e manifesto do release

Em Linux, rode no próprio host depois que o operador fornecer os valores. O preflight lê o socket Docker local, `ss`, o certificado local, RAM disponível e o sistema de arquivos do caminho informado. Os números abaixo são exemplos de parâmetros, a serem acordados com o operador da VPS. Use `--edge-network` quando o proxy estiver em container.

```bash
node scripts/production/preflight.mjs --port 18080 \
  --origin https://homolog.example.test --data-path /srv/easypet \
  --min-free-ram-mib 6144 --min-free-disk-mib 20480 \
  --edge-ip 192.0.2.10 --access-policy vpn --tls-certificate /srv/proxy/homolog-cert.pem

node scripts/production/release.mjs > /srv/easypet-release/manifest.json
node scripts/production/release.mjs --verify /srv/easypet-release/manifest.json
```

O manifesto local registra o HEAD, hashes do conteúdo do artefato e se o checkout ou as fontes do release estão sujos. Geração com checkout sujo emite manifesto de diagnóstico e retorna `2`. A verificação exige checkout e manifesto limpos, mesmo HEAD e mesmos hashes. `git pull` só traz alterações já versionadas. Registre também os IDs ou digests das imagens efetivamente construídas para reproduzir a reversão. O preflight não mede desempenho nem testa o endereço publicado.

## Backup e ensaio de recuperação

Use um diretório pai protegido e fora do checkout. Reserve um destino novo por execução. Para obter um ponto de recuperação coerente entre serviços, interrompa as escritas e drene operações em curso antes de iniciar o backup. Cada dump representa uma transação consistente do seu banco. O conjunto de dumps é feito em sequência.

```bash
umask 077
node scripts/production/database.mjs backup \
  --project easypet-homolog --env-file .env.homolog \
  --directory /srv/easypet-backups/2026-11-13-antes-da-versao

node scripts/production/database.mjs restore-drill \
  --directory /srv/easypet-backups/2026-11-13-antes-da-versao
```

O backup contém arquivos PostgreSQL em formato custom e um manifesto SHA-256. Proteja cópias em trânsito e repouso com o armazenamento restrito do ambiente. O manifesto verifica a integridade do conjunto. O ensaio verifica os hashes antes de usar Docker, restaura cada banco em uma transação e verifica a presença de tabelas de aplicação. O projeto descartável inicia um banco por vez, com volumes e credenciais novos e sem portas publicadas. O comando limpa os volumes desse projeto ao sair.

O artefato H1 usa seis bancos, incluindo Notification. Antes do backup de H1, confirme os seis bancos no diagnóstico e mantenha todos em execução. Backups de versões antigas com cinco bancos continuam legíveis pelo ensaio.

O [guia H2 de agendamento e alertas](backup-schedule.md) descreve a configuração candidata de retenção, o ingresso interno da central ADMIN e o inventário de recuperação.

O ensaio também aceita `--evidence <arquivo.json>` com consultas de leitura e resultados esperados, separados por banco. A suíte da onda B produz esse arquivo a partir dos dados fictícios do aceite e compara o conteúdo após restaurar em volumes novos. Exemplo de estrutura:

```json
{
  "booking": [
    { "query": "SELECT count(*) FROM bookings", "expected": "2" }
  ]
}
```

Registre revisão da aplicação, horário de início e término, resultado e localização da cópia protegida. Para aceitar uma recuperação de produção, confira também registros representativos de cadastros, reservas e caixa com o operador no ambiente de recuperação. O Redis da homologação é usado como cache e limitador. O Compose de homologação ainda não inclui armazenamento de anexos. Retenção, cópia externa, periodicidade e objetivos de perda de dados e tempo de recuperação dependem dos responsáveis pelo piloto.

## Publicação e reversão

1. Registre revisão atual, imagens usadas, migrations esperadas e resultado do ensaio de recuperação. Mantenha uma cópia das imagens anteriores com tag de revisão em armazenamento controlado. Avalie se a versão anterior pode usar o schema atualizado.
2. Restrinja a entrada do ambiente durante a janela. Preserve o acesso local do operador. Execute o backup com as escritas suspensas.
3. Prepare o release aprovado em checkout próprio de operação. Valide o Compose e suba a revisão com o mesmo projeto e arquivo de configuração. O Flyway executa migrations na subida dos serviços.

   ```bash
   docker compose -p easypet-homolog --env-file .env.homolog -f compose.homolog.yml config --quiet
   docker compose -p easypet-homolog --env-file .env.homolog -f compose.homolog.yml up -d --build --wait
   node scripts/production/diagnose.mjs --project easypet-homolog --env-file .env.homolog
   ```

4. Confirme o acesso HTTPS, autenticação, isolamento entre estabelecimentos e jornadas aplicáveis usando as contas fictícias. Reabra a entrada quando as verificações passarem. Registre a revisão e os resultados.
5. Se o schema for compatível com a versão anterior, volte à revisão anterior no checkout de operação ou use as imagens registradas. Reaplique o Compose com o mesmo projeto e configuração, mantendo os volumes e repetindo as sondas.
6. Se o schema for incompatível, mantenha a entrada restrita e preserve os volumes e uma cópia do estado da falha. Restaure o conjunto pré-migration em bancos novos e valide com as imagens anteriores antes de apontar a entrada para o ambiente recuperado. O responsável pela operação deve reconciliar as escritas posteriores ao ponto restaurado antes da reabertura. O ensaio automatizado restaura e apaga apenas seus próprios bancos descartáveis.

Para recuperar uma versão com schema incompatível, execute primeiro o ensaio do backup. No checkout do release anterior, use um nome Compose novo, configuração exclusiva e outra porta de loopback. Suba somente os bancos para restaurar o schema e os dados antes de iniciar aplicações que executam Flyway.

```bash
set -e
cd /srv/easypet-release-anterior
BACKUP_DIR=/srv/easypet-backups/2026-11-13-antes-da-versao
RECOVERY=(docker compose -p easypet-homolog-recuperacao --env-file /srv/easypet-config/recuperacao.env -f compose.homolog.yml)
BANCOS=(auth pet partner booking payment notification)
"${RECOVERY[@]}" up -d --wait "${BANCOS[@]/%/-db}"
for banco in "${BANCOS[@]}"; do
  "${RECOVERY[@]}" exec -T "$banco-db" pg_restore \
    --single-transaction --exit-on-error --no-owner --no-privileges --no-password \
    -U "$banco" -d "${banco}_db" < "$BACKUP_DIR/$banco.dump"
done
"${RECOVERY[@]}" up -d --build --wait
```

Use volumes novos nessa operação e valide registros e permissões no ambiente recuperado antes da troca da entrada. Se qualquer restauração falhar, mantenha o ambiente recuperado fora da entrada até concluir a investigação e repetir a operação em bancos novos.

## Diagnóstico

O comando `diagnose.mjs` verifica a saúde dos containers e sonda a entrada HTTP, incluindo as recusas de acesso administrativo anônimo, rotas internas e checkout. Retorna código diferente de zero quando detecta falha. O healthcheck do banco executa uma consulta autenticada pelo TCP local e as sondas Java usam Actuator no loopback do próprio container.

Em caso de falha, anote horário, revisão, serviço, código HTTP e `X-Request-Id` da resposta. O log do Nginx contém esse ID, método, código e tempos, sem URL, query string ou corpo. Consulte logs de um serviço de cada vez, em terminal com acesso restrito. Correlacione primeiro pelo horário enquanto a propagação entre microsserviços estiver pendente.

## Notificações em homologação

O Compose real inicia Notification com transporte SMTP e usa o coletor de memória `smtp-capture` em rede interna. O coletor aceita somente `example.test` e não publica portas. A consulta operacional da fila devolve contadores e estado do polling no loopback do próprio serviço. `diagnose.mjs` verifica o transporte e imprime apenas sinais operacionais. [Coletor e leitura autorizada](../../Backend/Infra/docs/homologacao.md#contas-e-dados-de-teste) · [Suíte de aceite](../../Frontend/e2e/README.md)

## Templates de agenda e alerta local

Instale qualquer agendamento somente depois de definir operador, horários, limites e diretórios protegidos. O exemplo usa cron local com `MAILTO=""`; os arquivos de log e seus limites de retenção devem ser provisionados pelo operador.

```cron
MAILTO=""
*/5 * * * * cd /srv/easypet-release && /usr/bin/node scripts/production/alert-local.mjs --project easypet-homolog --env-file /srv/easypet-config/homolog.env --max-due-age-seconds 120 --max-failed-hour 0 --max-unknown-hour 0 --max-unroutable-hour 0 >> /srv/easypet-logs/notification.log 2>&1
```

O comando retorna `0` dentro dos limites, `2` para estado fora dos limites e `1` por falha de diagnóstico. Uma captura `UNKNOWN` exige investigação da tentativa e da entrega. Para backup agendado, use uma janela que permita suspender escritas e executar o procedimento de backup acima, com destino exclusivo. Exemplo para o script da janela, depois de confirmar suspensão das escritas:

```bash
umask 077
backup_root=/srv/easypet-backups
destination="$backup_root/$(date -u +%Y%m%dT%H%M%SZ)"
/usr/bin/node scripts/production/database.mjs backup \
  --project easypet-homolog --env-file /srv/easypet-config/homolog.env --directory "$destination"
```

## Inventário de arquivos

O Compose guarda o estado persistente nos seis volumes PostgreSQL. A captura SMTP usa memória e o Redis é descartável. O front inclui um cliente legado para `/api/v1/files/upload`, sem rota publicada correspondente. Os dumps preservam os campos `users.picture_url` (Auth), `pets.picture_url` e `exams.file_url` (Pet), `partners.picture_url`, `partner_gallery.picture_url` e `staff.photo_url` (Partner). A seed de galeria do Partner referencia imagens do Unsplash. Imagens empacotadas no frontend vêm do release. Os dumps não contêm objetos apontados por URLs nem anexos externos. Antes de habilitar upload ou URLs de dados reais, identifique o armazenamento, seu dono e o procedimento de cópia e recuperação. [Inventário de domínio](../sprints/S04-balcao/contracts.md#cobertura-de-arquivos)

## Smoke no endereço publicado

1. No endereço HTTPS aprovado, confirme certificado, restrição de acesso de fora da VPN ou rede privada e disponibilidade pela rede autorizada. Confirme somente a porta de frontend no host e o cabeçalho `X-Request-Id` nas sondas.
2. Com contas fictícias provisionadas pelo console, valide login, sessão, recarga direta, catálogo móvel, reserva, reagendamento e cancelamento. Confira recusa de cadastro público, checkout, créditos e caminhos internos. Com Google desligado, confira que os três endpoints OAuth devolvem `404`. Com Google ligado, teste entrada, cancelamento e recusa de conta fora da lista conforme o [guia de login Google](../../Backend/Infra/docs/homologacao.md#login-google). O callback HTTPS de `easypet.innker.com.br` foi cadastrado no console Google. DNS, TLS, credencial ativa no ambiente e o teste no endereço publicado ainda precisam de confirmação.
3. Confira recebimento do link no coletor local, reset de uso único, equipe e revogação. Em admin, verifique gestão de conta e Notification com o próprio papel, mais recusas a tutor e parceiro. Em balcão, emita/resgate vínculo e confirme que o parceiro alheio não escreve. No caixa, confira baixa, reversão e fechamento.
4. Em duas origens de rede autorizadas, confirme baldes separados e `429` durante uma rajada pequena no mesmo IP. Teste cabeçalho forjado pelo caminho publicado e confirme que o proxy o sobrescreve. Registre revisão, horário, códigos e IDs de requisição, sem tokens, cookies ou dados de mensagens.

## Investigação de incidentes

```bash
docker compose -p easypet-homolog --env-file .env.homolog -f compose.homolog.yml ps
docker compose -p easypet-homolog --env-file .env.homolog -f compose.homolog.yml logs --since 10m frontend
docker compose -p easypet-homolog --env-file .env.homolog -f compose.homolog.yml logs --tail 100 gateway-service
```

Para indisponibilidade com perda de dados ou acesso indevido, restrinja a entrada, preserve evidências e acione o responsável pela operação. Canal de incidente, alerta externo e escalonamento aguardam definição operacional.
