# Homologação interna do EasyPet

A stack `easypet-homolog` compila o frontend e os sete serviços Java do release aprovado, incluindo Notification. O Docker publica apenas a porta HTTP do frontend em `127.0.0.1`. O coletor SMTP, os bancos e o Redis ficam em redes próprias do projeto. Use exclusivamente contas e dados fictícios.

## Primeira instalação

1. Na VPS, use o preflight local para conferir disco, memória, porta, certificado e rede. Os limites padrão somam cerca de 5,3 GiB para os containers em execução. Reserve margem para builds, backups e os outros projetos do host. Consulte o [roteiro de operação](../../../docs/production/operacao.md#preflight-e-manifesto-do-release).
2. Na raiz do checkout, prepare a configuração.

   ```bash
   umask 077
   cp .env.homolog.example .env.homolog
   chmod 600 .env.homolog
   ```

   Preencha `HOMOLOG_ORIGIN` com a origem HTTPS do EasyPet, sem barra final. Ajuste `HOMOLOG_PORT` à porta verificada. Para cada segredo em branco, gere um valor próprio com `openssl rand -hex 32`. Use somente hexadecimal em `HOMOLOG_INGRESS_TOKEN`, que é interpolado na configuração do Nginx. Guarde os valores no host. Os segredos dos bancos são aplicados ao criar volumes novos. Se o operador tiver um canal interno HTTPS aprovado, informe sua URL pública para os usuários da homologação em `HOMOLOG_SUPPORT_URL`; o Vite incorpora esse valor no bundle.

3. Valide a configuração e suba os serviços.

   ```bash
   docker compose --env-file .env.homolog -f compose.homolog.yml config --quiet
   docker compose --parallel 1 --env-file .env.homolog -f compose.homolog.yml up -d --build --wait
   docker compose --env-file .env.homolog -f compose.homolog.yml ps
   curl --fail --silent http://127.0.0.1:18080/healthz
   ```

   Use a porta configurada se ela for diferente de `18080`. As migrations Flyway rodam no início dos serviços. O `--wait` aguarda os healthchecks.

   Se o ambiente não suportar o build serial com `--parallel 1`, execute `docker compose --env-file .env.homolog -f compose.homolog.yml build <serviço>` para cada serviço separadamente. Compile `auth-service`, `pet-service`, `partner-service`, `booking-service`, `payment-service`, `notification-service`, `gateway-service` e `frontend`. Em seguida, rode `up -d --no-build --wait` com o mesmo arquivo e ambiente.

4. No proxy existente, encaminhe o subdomínio dedicado inteiro para a porta verificada em loopback. Aplique HTTPS e restrinja todo o subdomínio, incluindo a API, por VPN ou rede privada. Preserve `Authorization`. Se o proxy estiver em container, conecte somente o frontend à rede de ingresso e use o endereço do frontend nessa rede.
5. Configure `HOMOLOG_TRUSTED_EDGE` com o IP exato do proxy visto pelo frontend na topologia escolhida. O padrão `unix:` desabilita confiança em cabeçalhos para conexões TCP diretas. No proxy confiável, sobrescreva `X-Easypet-Edge-IP` com o IP observado do cliente. Em Nginx, use `proxy_set_header X-Easypet-Edge-IP $remote_addr;`. Restrinja o caminho de rede ao proxy, especialmente se houver NAT compartilhado. O frontend remove `Forwarded` e `X-Forwarded-For`, sobrescreve os cabeçalhos internos e o Gateway verifica o segredo de ingresso antes de usar o IP. Revise também os logs do proxy externo para omitir a query das páginas de reset e convite.

## Login Google

O padrão `GOOGLE_AUTH_ENABLED=false` mantém login por senha. Para habilitar Google, preencha no ambiente protegido do host `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_ALLOWED_EMAILS` (e-mails autorizados separados por vírgula). Use `HOMOLOG_ORIGIN=https://easypet.innker.com.br` e `GOOGLE_REDIRECT_URI=https://easypet.innker.com.br/api/v1/login/oauth2/code/google`. Cadastre essa origem HTTPS e o callback exato no cliente Web do Google. Confirme DNS, certificado e restrição de acesso antes de testar.

Com a configuração pronta, aplique `GOOGLE_AUTH_ENABLED=true` e faça o build e a subida do Compose. A flag é incorporada ao frontend no build e lida pelo Nginx, Gateway e Auth na inicialização. O Auth valida a configuração e exige uma conta EasyPet previamente provisionada, ativa e autorizada. O proxy externo deve preservar cookies e redirecionamentos e omitir queries e cookies dos logs de OAuth. O retorno `/login-success` usa o fragmento da URL e troca o código por uma sessão do EasyPet na mesma origem.

Para verificar, entre com uma conta autorizada e confira o destino e o papel após o retorno. Cancele outra tentativa no Google e confira a mensagem de cancelamento. Confirme a recusa com uma conta fora da lista e com a flag desligada. A verificação publicada usa o Google real e fica registrada separadamente do ensaio com provedor simulado. Para voltar ao login por senha, desabilite a flag e reconstrua o frontend com o Compose.

## Contas e dados de teste

Crie duas contas de parceiro com endereços fictícios. O comando solicita a senha e confirmação no terminal. Execute com `CUSTOMER` para criar o tutor e com `ADMIN admin@example.test 'Admin de homologação'` para criar o administrador fictício. O provisionador usa o perfil `homolog` e recusa conta existente.

```bash
docker compose --env-file .env.homolog -f compose.homolog.yml exec auth-service \
  java -Dloader.main=br.com.innkercode.auth.ProvisionPilotUser -cp /app/app.jar \
  org.springframework.boot.loader.launch.PropertiesLauncher \
  PARTNER parceiro-a@example.test 'Parceiro A'
```

Entre no painel com cada parceiro. Preencha o cadastro do estabelecimento, crie um serviço e habilite um colaborador com uma escala para o horário que será testado. Use os IDs de parceiro e serviço retornados por `GET /api/v1/partners/me` com o token de cada parceiro.

Entre com a conta `CUSTOMER`, cadastre um pet em **Meus Pets** e solicite um horário pela vitrine do estabelecimento. A reserva entra como pendente para o parceiro confirmar. O piloto não exige pagamento. Para testar o mesmo caminho pela API, o exemplo abaixo usa `jq` para extrair o JWT e mantém a senha fora do histórico do shell.

```bash
API=http://127.0.0.1:18080/api/v1
read -rsp 'Senha do tutor de teste: ' TEST_PASSWORD
printf '\n'
TOKEN=$(printf '%s' "$TEST_PASSWORD" |
  jq -Rs --arg email 'tutor@example.test' '{email: $email, password: .}' |
  curl --fail-with-body --silent --show-error -H 'Content-Type: application/json' \
    --data-binary @- "$API/auth/login" | jq -er '.token')
unset TEST_PASSWORD

curl --fail-with-body --silent --show-error -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"name":"Bidu","species":"DOG","breed":"SRD","gender":"MALE","weight":8,"birthDate":"2022-01-01"}' \
  "$API/pets"
```

Copie o `id` do pet retornado e use o horário disponível no estabelecimento. O serviço precisa estar associado ao profissional cuja escala atende o horário.

```bash
PET_ID='id-do-pet'
PARTNER_ID='id-do-parceiro-a'
SERVICE_ID='id-do-servico'
BOOKING_DATE='AAAA-MM-DDTHH:MM:SS'

jq -n --arg petId "$PET_ID" --arg partnerId "$PARTNER_ID" --arg serviceId "$SERVICE_ID" \
  --arg bookingDate "$BOOKING_DATE" \
  '{$petId, $partnerId, $serviceId, $bookingDate, type: "CONSULTATION", price: 50}' |
  curl --fail-with-body --silent --show-error -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -H "Idempotency-Key: $(cat /proc/sys/kernel/random/uuid)" \
    --data-binary @- "$API/bookings"
unset TOKEN
```

Use o preço vigente do serviço da fixture na reserva. Abra a agenda do parceiro A e confirme o agendamento. Para testar o atendimento, use uma reserva confirmada no dia corrente. Confirme que B recebe `403` ou `404` ao tentar acessar dados de A. Verifique também recarga direta, persistência após reinício, recuperação de senha, convite de equipe e as recusas de cadastro público e checkout. Verifique OAuth conforme o [estado da flag Google](#login-google).

Para ler uma captura fictícia no console autorizado do host, execute:

```bash
docker compose --env-file .env.homolog -f compose.homolog.yml exec -T smtp-capture \
  node -e 'fetch("http://127.0.0.1:8025/messages?recipient=admin%40example.test").then(r=>r.json()).then(console.log)'
```

O conteúdo pode incluir códigos e URLs de uso único. Leia somente o destinatário necessário no terminal autorizado. O coletor guarda até 200 mensagens em memória, reinicia vazio e não encaminha e-mails. O acesso à captura e ao console Docker faz parte da operação restrita.

## Atualização manual

Siga o [procedimento de operação](../../../docs/production/operacao.md) para preparar a revisão, criar o backup com manifesto, ensaiar a recuperação, verificar a publicação e escolher o procedimento de reversão conforme o schema.
