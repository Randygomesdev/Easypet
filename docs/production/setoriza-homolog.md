# EasyPet na VPS de homologação do Setoriza

Preparação em 13/11/2026, após inspeção SSH autorizada. Destino confirmado pelo usuário: `Setoriza-Homolog`, IP público `13.140.225.50`. Release funcional de referência: `e682f10`. Esta preparação não publicou o EasyPet nem alterou o Setoriza.

## Resultado da inspeção

| Item | Observação |
| --- | --- |
| CPU | 4 vCPU AMD EPYC; carga de 1/5/15 minutos de 3,83/5,06/4,78 na primeira captura |
| RAM | 7.941 MiB totais, 4.895 MiB disponíveis; sem swap |
| Disco raiz | 193 GiB utilizáveis, 141 GiB livres, 27% ocupado |
| Docker | Engine 29.1.3; Compose 2.40.3 |
| Entrada | Nginx 1.24.0 no host, portas 80/443; configuração atual passou em `nginx -t` |
| Setoriza | HTTPS respondeu 200; frontend em loopback 8090 e API em loopback 8080 |
| EasyPet | Porta 18080 livre; nenhum serviço EasyPet instalado |
| TLS | Certificado existente cobre somente `setoriza.innker.com.br`, válido até 21/01/2027; timer Certbot habilitado |
| DNS EasyPet | Consultas A, AAAA e CNAME retornaram nome inexistente |
| Operação | Node.js não encontrado no PATH nem em `/root/.nvm/versions/node`; Certbot 2.9.0 disponível |
| Acesso | UFW ativo, 22/80/443 liberadas; não foi identificada interface VPN |

As quatro amostras curtas posteriores do `vmstat` mostraram 11–32% de CPU steal. Isso indica tempo de vCPU indisponível ao guest durante a amostra, não uma medição de capacidade sustentada. Reavaliar com carga representativa antes de aprovar a convivência.

**Escopo confirmado pelo usuário:** apenas testes internos e demonstrações controladas, sem operação real. A recomendação passa a ser tentar a VPS atual antes de ampliar RAM, com uma sessão de demonstração por vez e, como hipótese inicial, até três usuários simultâneos. Isso é um limite operacional proposto, não capacidade medida nem limitação implementada na aplicação. A avaliação encontrou 4.818–4.906 MiB disponíveis no host e máximo amostrado local de 2.526,59 MiB para o EasyPet compacto, com 28 cenários e restauração aprovados. [Medição e revisão do parecer](../sprints/R01-review/memory-review.md).

O novo overlay `compose.demo.yml` aumenta apenas os tetos de Auth/Partner para 480 MiB e Booking para 400 MiB, mantendo heaps e demais ajustes do perfil testado. O total fica em **3.632 MiB**. Para a demonstração, o preflight exige **4.656 MiB disponíveis antes da subida**: soma dos tetos mais 1.024 MiB de margem operacional. Esse orçamento é uma decisão para uso supervisionado, não garantia contra crescimento do Setoriza. Pela menor disponibilidade anterior sobrariam 1.186 MiB após descontar todos os tetos. Revalidar a disponibilidade no momento da instalação. O perfil padrão continua exigindo 6.144 MiB; não usar o orçamento de demonstração com o Compose padrão.

O gate deste escopo é a subida saudável e uma demonstração acompanhada de 15–30 minutos com login, reserva e atendimento, verificando Setoriza antes/durante/depois. Interromper somente o EasyPet se houver OOM/reinício inesperado, menos de 1 GiB disponível por 30 segundos, ou piora repetida de erros/tempo de resposta do Setoriza em relação à medição anterior. Esses critérios são operacionais; não há desligamento automático configurado. Teste de capacidade sustentada fica para antes de operação real. A coleta encontrou 27,09% de CPU steal: observar responsividade mesmo com RAM disponível. Builds e ensaios de restauração ficam fora da VPS durante a demonstração.

## Configuração preparada

Arquivos em [`scripts/production/setoriza-homolog`](../../scripts/production/setoriza-homolog/):

- `nginx-bootstrap.conf`: atende somente o desafio ACME; demais caminhos retornam 503 enquanto o site é preparado.
- `nginx-https.conf`: domínio dedicado, TLS próprio e encaminhamento integral para `127.0.0.1:18080`. Preserva cookies, autorização, origem e redirecionamentos. Sobrescreve o cabeçalho de IP confiável e remove os cabeçalhos internos enviados pelo cliente.
- `nginx-access.conf`: permite entrada pública, conforme decisão explícita do usuário nesta preparação. A aplicação exige contas provisionadas e allowlist Google, mantendo cadastro público e APIs internas bloqueados.
- `compose.host.yml`: rede padrão exclusiva `172.30.80.0/24`, gateway `172.30.80.1`. Não sobrepõe as rotas observadas `172.17.0.0/16`, `172.18.0.0/16` e `172.19.0.0/16`. Revalidar na instalação; não conectar serviços Setoriza à rede EasyPet.
- `compose.compact.yml`: perfil opcional com teto somado de 3.504 MiB e swap desabilitado nos 16 serviços. Aplique como terceiro arquivo Compose, após o base e o de rede, quando o perfil for aprovado para o ambiente. Mantenha os mesmos arquivos nas operações que recriam a stack. Para voltar ao perfil padrão, recrie os serviços com os arquivos base e de rede, preservando os volumes. [Aceite e medição local](../sprints/S07-infra-integracao/status.md#memória-da-stack-de-homologação-compartilhada).
- `compose.demo.yml`: quarto arquivo, após o compacto; eleva três tetos e soma 3.632 MiB. Configuração validada por renderização, ainda sem execução na VPS. Os 28 testes se referem ao compacto anterior, não a uma nova rodada com este overlay. Na VPS atual, a reversão operacional é parar somente o EasyPet, preservando seus volumes; não trocar automaticamente para o perfil padrão maior.
- `renewal-hook.sh`: testa e recarrega Nginx somente após renovação do certificado EasyPet.

Foi preparado `.env.easypet-vps.local` na estação do operador, ignorado pelo Git. Contém segredos independentes, credencial Google e lista privada de convidados; não foi transferido para a VPS. `GOOGLE_AUTH_ENABLED=false` até configurar contas e realizar a ativação controlada. O IP de proxy previsto é `172.30.80.1`, correspondente ao gateway da rede Docker dedicada; confirmar o caminho real até o frontend antes de aceitar a identificação do cliente.

O log HTTP externo registra apenas horário, IDs, método, status e duração. Não registra URL, query, cabeçalhos, cookies nem corpo. O error log desse vhost é desabilitado porque pode incluir códigos de retorno e recuperação; diagnóstico usa o access log e os serviços internos. O Nginx do frontend continua responsável por `no-store`/`no-referrer`.

## Sequência de publicação, ainda não executada

1. Usar o orçamento e o aceite supervisionado de demonstração acima. O usuário definiu acesso público ao site, com login apenas para convidados; o preflight aceita `public-invited`. Provisione apenas contas aprovadas, inclusive para login por senha, e valide as recusas de acesso. Esta decisão não abre cadastro público, checkout ou créditos.
2. Instalar Node.js 24 no host para os scripts operacionais, por um canal oficial. Preparar checkout próprio em `/srv/easypet`, diretório de configuração protegido `/etc/easypet` e backups em `/srv/easypet-backups`. Transferir a configuração privada para `/etc/easypet/homolog.env`, proprietário root e modo 600. Nunca usar `.env` do Setoriza nem imprimir `docker compose config` completo com segredos.
3. No DNS de `innker.com.br`, criar **A `easypet` → `13.140.225.50`**. Inicialmente usar DNS direto, sem proxy CDN, para preservar o contrato de IP de origem. Não criar AAAA nesta etapa: o candidato não habilita entrada IPv6. Confirmar a resolução antes de solicitar certificado.
4. Criar `/var/www/easypet-acme/.well-known/acme-challenge`. Instalar somente o candidato bootstrap em `/etc/nginx/sites-available/easypet.innker.com.br` e criar seu link em `sites-enabled`. Guardar configuração anterior se esse destino passar a existir; nunca sobrescrever o vhost Setoriza. Executar `nginx -t` e só então `systemctl reload nginx`. Conferir que o Setoriza continua respondendo.
5. Emitir certificado próprio com webroot, sem parar o Nginx:

   ```bash
   certbot certonly --webroot -w /var/www/easypet-acme \
     --cert-name easypet.innker.com.br -d easypet.innker.com.br
   ```

   Usar a conta ACME existente e revisar as perguntas do Certbot se houver. Instalar o hook em `/etc/letsencrypt/renewal-hooks/deploy/easypet-nginx.sh`, modo 755. Conferir SAN, validade, cadeia e renovação do novo certificado. O ensaio de sintaxe desta preparação usou o certificado Setoriza apenas em arquivo temporário; ele não serve para o domínio EasyPet.
6. Rodar o preflight real, com a política efetivamente implantada e capacidade novamente medida:

   ```bash
   cd /srv/easypet
   node scripts/production/preflight.mjs --port 18080 \
     --origin https://easypet.innker.com.br --data-path /srv/easypet \
     --min-free-ram-mib 4656 --min-free-disk-mib 20480 \
     --edge-ip 172.30.80.1 --access-policy public-invited \
     --tls-certificate /etc/letsencrypt/live/easypet.innker.com.br/fullchain.pem
   ```

   `public-invited` registra a decisão de exposição; não é uma verificação automática da autorização. Os limites de RAM/disco, verificação de TLS e smoke de contas convidadas continuam obrigatórios. VPN/rede privada continuam disponíveis para outros ambientes.
7. Gerar e verificar manifesto de checkout limpo. Construir as oito imagens EasyPet fora da VPS, com os argumentos da configuração aprovada e tags do projeto `easypet-homolog`, e transferi-las ao host. Confirmar que estão disponíveis antes da subida. Manter `GOOGLE_AUTH_ENABLED=false` para a primeira subida. Definir o comando com todos os overlays nesta sessão Bash:

   ```bash
   easypet_compose() {
     docker compose --parallel 1 -p easypet-homolog --env-file /etc/easypet/homolog.env \
       -f compose.homolog.yml -f scripts/production/setoriza-homolog/compose.host.yml \
       -f scripts/production/setoriza-homolog/compose.compact.yml \
       -f scripts/production/setoriza-homolog/compose.demo.yml "$@"
   }
   easypet_compose config --quiet
   easypet_compose up -d --no-build --wait
   curl --fail --silent http://127.0.0.1:18080/healthz
   node scripts/production/diagnose.mjs --project easypet-homolog --env-file /etc/easypet/homolog.env
   ```

   Manter os quatro arquivos nas operações que criem/recriem a stack. Os scripts de diagnóstico/backup consultam containers existentes pelo mesmo projeto. Confirmar a rede e o IP do proxy observado pelo frontend antes do aceite do limitador. Para interromper a demonstração por pressão de recursos, executar `easypet_compose stop`; isso preserva os volumes. Não executar builds Maven/Gradle/Vite no host compartilhado.
8. Instalar `/etc/nginx/snippets/easypet-access.conf` com a política aprovada. Substituir o bootstrap pelo candidato HTTPS no mesmo vhost EasyPet; nunca habilitar ambos simultaneamente. Testar `nginx -t`, recarregar e conferir Setoriza/EasyPet, página pública, APIs protegidas, cabeçalhos, cookies e logs.
9. Provisionar convidados com papéis definidos, preservando as restrições do provisionador ADMIN. Confirmar Google Workspace para o endereço corporativo. Habilitar Google no arquivo protegido, reconstruir o frontend fora da VPS e recriar os serviços com os mesmos quatro arquivos Compose. Realizar login Google real, cancelamento, recusa de conta não convidada, papéis e jornadas da demonstração. Só desativar a chave antiga depois de confirmar uso da nova.

Em caso de problema na primeira instalação, retirar somente o link do vhost EasyPet, testar Nginx e recarregar. Não parar o Nginx compartilhado, não alterar o Setoriza e não apagar volumes EasyPet para reverter uma falha. O rollback de dados segue o [roteiro operacional](operacao.md).

## Validação desta preparação

- Compose base mais overlay: configuração válida, 16 serviços, somente frontend publicado em loopback 18080, 5.408 MiB de limites totais; Google desligado e gateway previsto aplicado.
- Candidatos bootstrap/HTTPS: `nginx -t` aprovado com o binário 1.24.0 da VPS em diretório temporário. Include de acesso/logs redirecionados ao temporário e certificado existente substituído apenas para verificar sintaxe. Nenhum candidato ativado e nenhum reload executado.
- Após a decisão de site público, o candidato HTTPS foi incluído em uma cópia temporária do `nginx.conf` real, junto aos vhosts existentes. `nginx -t` passou, e Setoriza continuou respondendo 200. A nova política `public-invited` do preflight passou na checagem de sintaxe Node; o preflight completo permanece pendente no host sem Node.js.
- Hook: `sh -n` aprovado. Configurações ativas do Nginx mantiveram os mesmos hashes antes/depois.
- Sem criação de registro DNS, emissão de certificado, instalação de Node, subida de containers EasyPet ou execução de login Google real nesta preparação.

Referências: [proxy Nginx](https://nginx.org/en/docs/http/ngx_http_proxy_module.html) e [webroot/renovação Certbot](https://eff-certbot.readthedocs.io/en/stable/using.html).
