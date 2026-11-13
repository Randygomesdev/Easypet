# Homologação interna do EasyPet

A stack `easypet-homolog` compila o frontend e os seis serviços Java a partir do checkout na VPS. O frontend atende as páginas e encaminha a API ao gateway. O Docker publica apenas a porta do frontend em `127.0.0.1`. A rede e os volumes do EasyPet pertencem ao projeto Compose e ficam separados dos recursos do Setoriza.

## Primeira instalação

1. Na VPS, confirme o espaço em disco, a memória disponível e a porta local escolhida. Os limites padrão somam cerca de 4,5 GiB para os containers em execução. O build usa memória adicional. O limite de um build por vez com `--parallel 1` depende do Buildx 0.38 ou posterior. [Referência do Docker Compose](https://docs.docker.com/reference/cli/docker/compose/#configuring-parallelism)
2. Na raiz do checkout, prepare a configuração.

   ```bash
   umask 077
   cp .env.homolog.example .env.homolog
   chmod 600 .env.homolog
   ```

   Preencha `HOMOLOG_ORIGIN` com o endereço HTTPS do EasyPet, sem barra no final. Ajuste `HOMOLOG_PORT` se `18080` estiver ocupada. Para cada campo de segredo, gere um valor próprio com `openssl rand -hex 32`. Mantenha o arquivo na VPS. Os segredos dos bancos são usados na criação inicial dos volumes.

3. Valide a configuração e suba os serviços.

   ```bash
   docker compose --env-file .env.homolog -f compose.homolog.yml config --quiet
   docker compose --parallel 1 --env-file .env.homolog -f compose.homolog.yml up -d --build --wait
   docker compose --env-file .env.homolog -f compose.homolog.yml ps
   curl --fail --silent http://127.0.0.1:18080/healthz
   ```

   Use a porta configurada se ela for diferente de `18080`. As migrations Flyway rodam no início dos serviços. O `--wait` aguarda os healthchecks.

   Se o Buildx da VPS for anterior à versão 0.38, execute `docker compose --env-file .env.homolog -f compose.homolog.yml build <serviço>` para cada serviço separadamente. Compile `auth-service`, `pet-service`, `partner-service`, `booking-service`, `payment-service`, `gateway-service` e `frontend`. Em seguida, rode `up -d --no-build --wait` com o mesmo arquivo e ambiente. Aplique esse procedimento também nas atualizações.

4. No proxy existente, encaminhe o subdomínio dedicado inteiro para `http://127.0.0.1:18080`. Aplique HTTPS e restrinja todo o subdomínio, incluindo a API, por VPN ou rede privada. O cabeçalho `Authorization` precisa chegar à aplicação com o JWT. Se o proxy estiver em container, o loopback do proxy é diferente do loopback do host. Nesse caso, conecte apenas o frontend à rede de ingresso do proxy com um override local e use o endereço do frontend nessa rede.

## Contas e dados de teste

Crie duas contas de parceiro com endereços fictícios. O comando solicita a senha no terminal. Execute o mesmo comando com o papel `CUSTOMER` para criar uma conta de tutor de teste.

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
    -H 'Content-Type: application/json' --data-binary @- "$API/bookings"
unset TOKEN
```

Abra a agenda do parceiro A, filtre pela data da reserva e confirme o agendamento. Para testar o atendimento, use uma reserva confirmada no dia corrente. Confirme que o parceiro B recebe `403` ou `404` ao consultar a agenda do parceiro A, o agendamento, o prontuário ou a escala de um colaborador desse estabelecimento. Verifique também a atualização direta de uma página do painel, a persistência dos dados após reiniciar os containers e a recusa de cadastro público, recuperação de senha, login Google e pagamentos. Use apenas dados fictícios nesta etapa.

## Atualização manual

Antes de atualizar uma versão que altera o banco, faça backup dos cinco bancos. O exemplo grava os dumps no diretório escolhido pelo operador.

```bash
umask 077
BACKUP_DIR="$HOME/easypet-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -m 700 -p "$BACKUP_DIR"
for service in auth pet partner booking payment; do
  docker compose --env-file .env.homolog -f compose.homolog.yml exec -T "$service-db" \
    pg_dump -Fc -U "$service" "${service}_db" > "$BACKUP_DIR/$service.dump" || break
done
```

Verifique os arquivos e teste a restauração em bancos separados. Na raiz do checkout da VPS, registre a revisão atual e atualize o código.

```bash
git rev-parse HEAD
git pull --ff-only &&
  docker compose --parallel 1 --env-file .env.homolog -f compose.homolog.yml up -d --build --wait
```

Se a versão nova falhar, consulte `docker compose --env-file .env.homolog -f compose.homolog.yml logs --tail 100`. Para voltar à revisão anterior com schema compatível, faça checkout do commit anotado e repita o comando Compose. Se o schema for incompatível, use os backups da versão anterior e avalie o impacto sobre registros criados após a atualização. Os volumes guardam os dados entre recriações dos containers.
