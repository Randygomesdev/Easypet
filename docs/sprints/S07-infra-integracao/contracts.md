# Contratos S07

## Entrada da homologação

| Operação | Requisição | Resultado | Autenticação |
| --- | --- | --- | --- |
| Sonda HTTP do frontend | `GET /healthz`, sem corpo | `204`, sem corpo | Nenhuma |
| Login já publicado | `POST /api/v1/auth/login`, JSON com `email` e `password` | `200` com `token` para uma conta válida. Erros do Auth e `429` do limitador são preservados | Credenciais da conta |
| Catálogo | `GET /api/v1/partners/catalog`, sem corpo | `200`, página JSON com a projeção de catálogo. Erros do serviço e `429` são preservados | Bearer JWT |
| Administração de parceiros | `GET /api/v1/admin/partners[/{id}]`, sem corpo | `200`, JSON do Partner. JWT ausente ou inválido recebe `401`; papel sem acesso recebe `403`; cadastro inexistente recebe `404` | Bearer JWT de `ADMIN` |

As leituras são repetíveis. O login está sujeito ao limitador e usa a semântica do Auth. O proxy preserva corpo, códigos e credenciais do contrato de cada serviço. Exemplo de sonda `curl -i http://127.0.0.1:18080/healthz`.

A porta do frontend é publicada em loopback. As sondas Actuator Java ficam no loopback de cada container, na porta `8089`. Os bancos e o Redis usam a rede do projeto Compose. O Nginx continua bloqueando pagamentos, rotas internas, leituras completas de parceiros pelo marketplace e rotas Auth fora da lista explicitamente liberada. Expansões dependem de contrato e controles do serviço dono.

O Nginx gera `X-Request-Id`, encaminha o valor ao Gateway e o retorna ao cliente. O log de acesso registra esse ID, método, status e tempos. Chamadas entre microsserviços ainda dependem de propagação no serviço de origem.

## Operação local

- `node scripts/production/diagnose.mjs --project <projeto> --env-file <arquivo>` usa o estado Compose e sondas HTTP no frontend publicado. Retorna `0` quando as sondas passam e `1` em caso de falha. Emite estado por serviço, sem despejar variáveis, respostas HTTP ou logs.
- `node scripts/production/database.mjs backup --project <projeto> --env-file <arquivo> --directory <destino-novo>` usa o acesso Docker autorizado do operador e cria uma pasta com dumps PostgreSQL em formato custom e manifesto SHA-256. O destino é exclusivo por execução. Uma falha de dump ou escrita deixa o destino final sem um backup publicado.
- `node scripts/production/database.mjs restore-drill --directory <backup>` valida formato e integridade e restaura o conjunto em bancos com nomes de projeto, volumes e credenciais descartáveis. Retorna `0` após restauração e verificação, ou `1` por falha de integridade, Docker, SQL ou limpeza. Repetições usam um projeto novo.

S07 não adiciona migrations de domínio. Cada serviço é dono de suas migrations. Novos bancos entram no backup e na restauração junto da integração do serviço correspondente.

## Rotas e perfil opcionais

- S04 encaminha `GET/POST /api/v1/partners/me/customers`, `GET /api/v1/partners/me/customers/{id}`, as rotas de pets de recepção e `GET /api/v1/admin/reception-customers[/{id}]`. A operação de balcão exige JWT de parceiro e a consulta administrativa exige JWT de ADMIN. Dados e erros seguem o [contrato S04](../S04-balcao/contracts.md).
- O proxy libera os caminhos de caixa publicados pela S05. O Payment exige JWT de parceiro e usa `Idempotency-Key` nas mutações. Payloads, resultados e erros seguem o [contrato S05](../S05-caixa/contracts.md). Checkout e créditos continuam desabilitados.
- O perfil Compose `notifications` habilita o processo interno e seu banco. Use `NOTIFICATION_DB_PASSWORD` exclusivo e `BOOKING_OUTBOX_TOKEN` dedicado, compartilhado por Booking e Notification. Sem token, Notification sobe com a captura local e o consumo fica desativado. A API administrativa de Notification depende da validação de sessão no Auth e segue sem rota no ingresso público.

## Aceite R01

O runner com `E2E_R01=1` inclui o proxy de falha do Pet apenas no projeto descartável. O proxy suspende a leitura de um UUID sintético e repassa as outras chamadas ao Pet Service. O teste espera a requisição chegar ao proxy, inicia outra reserva no mesmo estabelecimento e verifica que o Booking devolve erro em tempo limitado e permite a reserva seguinte com a mesma chave.

O contrato de [projeção de estabelecimento da S04](../S04-balcao/contracts.md#leituras-de-estabelecimento--r01-001) continua interno. O teste usa os JWTs emitidos pelo Auth descartável e acessa diretamente o Partner a partir da rede do projeto, sem publicar a porta dos serviços. Booking usa a projeção na alocação e Payment no cadastro de modelo de pacote fictício. Checkout e créditos seguem bloqueados.

## Onda B — 13/11/2026

- No Compose de homologação e de aceite, o Gateway consulta `GET /api/v1/auth/session` diretamente no Auth, com o Bearer original, em cada requisição protegida. O próprio `GET /api/v1/auth/session` é encaminhado para validação no Auth. Nenhum segredo de equipe é distribuído. O Gateway descarta cabeçalhos de identidade do cliente. Os serviços validam sessão, vínculo e permissões em acessos diretos.
- Sessão ausente, inválida, expirada ou revogada recebe `401`. Auth indisponível, fora do prazo ou com resposta de sessão inválida recebe `503`. Papel ou permissão recusada pelo serviço conserva `403`. O Gateway preserva o rate limiter e não guarda sessão em cache. Exemplo de operação protegida: `GET /api/v1/bookings/my-bookings` com `Authorization: Bearer <token>`.
- `E2E_WAVE_B=1` ativa a configuração de aceite, incluindo captura SMTP por endereço fictício, com API do coletor em porta efêmera de loopback. Credenciais, dados e SMTP pertencem ao projeto descartável. A configuração padrão de homologação conserva o transporte LOCAL de Notification e publica apenas login e consulta de sessão no prefixo Auth.
- Rotas de sessão, convite, recuperação e administração de Notification seguem as tabelas S02 e S06. Caminhos `/api/v1/internal/**`, checkout e créditos ficam fora do ingresso. A onda B de infraestrutura não introduz migrations.

## H1 — Perfil de publicação interna

### Google OAuth

`GOOGLE_AUTH_ENABLED=true` habilita o Auth, as três rotas de ingresso e o argumento de build `VITE_GOOGLE_AUTH_ENABLED`. O padrão é `false`. O Compose passa `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_ALLOWED_EMAILS` e `GOOGLE_REDIRECT_URI` exclusivamente ao Auth. A origem `HOMOLOG_ORIGIN` alimenta `FRONTEND_URL`. Para homologação publicada, use `https://easypet.innker.com.br` e o callback exato `https://easypet.innker.com.br/api/v1/login/oauth2/code/google`.

As únicas rotas Google no ingresso são `GET /api/v1/oauth2/authorization/google`, `GET /api/v1/login/oauth2/code/google` e `POST /api/v1/auth/oauth2/exchange`. Métodos distintos, outros provedores e caminhos alternativos ficam fechados. O Nginx descarta cabeçalhos externos de encaminhamento e o Auth usa origem e callback explícitos. Cookies e redirecionamentos do Auth passam pelo proxy. Callback, troca e retorno da aplicação têm `Cache-Control: no-store` e `Referrer-Policy: no-referrer`. O proxy HTTPS externo deve omitir queries e cookies dos logs.

- **S01.** `compose.homolog.yml` constrói `Frontend/Dockerfile` com `VITE_INTERNAL_PILOT=true`, `VITE_WAVE_B_ENABLED=true`, `VITE_AUTH_RECOVERY_ENABLED=true` e `VITE_API_URL=/api/v1`. O build aceita `VITE_INTERNAL_SUPPORT_URL` opcional via `HOMOLOG_SUPPORT_URL` (vazio por padrão). Publicamos `GET /api/v1/auth/session`; páginas com token recebem `Referrer-Policy: no-referrer`.
- **S02.** Auth roda em `prod,homolog` com `AUTH_S02_ENABLED=true`, `AUTH_MAIL_ENABLED=true`, `FRONTEND_URL=${HOMOLOG_ORIGIN}` e `PARTNER_SERVICE_URL=http://partner-service:8083/api/v1`. SMTP interno em `smtp-capture:1025`, remetente `auth@example.test`, sem autenticação SMTP ou STARTTLS. `AUTH_TEAM_JWT_SECRET` exclusivo do Auth. Cadastro público e OAuth ficam fora do ingresso. Recuperação e aceite de convite usam os caminhos e métodos explícitos da S02.
- **S06.** Notification roda no Compose real com `NOTIFICATION_TRANSPORT=SMTP`, `NOTIFICATION_MAIL_HOST=smtp-capture`, porta `1025`, remetente `notifications@example.test`, `NOTIFICATION_MAIL_SMTP_AUTH=false` e `NOTIFICATION_MAIL_STARTTLS_REQUIRED=false`. Coletor sem relay e sem porta publicada, em rede interna de e-mail com Auth e Notification. Capturas acessíveis ao operador autorizado via `docker compose exec`. A API de simulação SMTP só é ativada no projeto descartável.
- `BOOKING_OUTBOX_TOKEN` é compartilhado por Booking e Notification; `NOTIFICATION_RECIPIENT_TOKEN` por Auth e Notification; `RECEPTION_CLAIM_TOKEN` por Auth e Partner; `BOOKING_PET_SUMMARY_TOKEN` por Booking, Partner e Pet. São valores distintos entre si e das credenciais dos seis bancos. `JWT_SECRET` conserva o contrato das sessões legadas. A porta HTTP publicada continua restrita ao loopback.
