# Aceite local com Playwright

Com o Docker Desktop em execução, rode a partir da pasta `Frontend`:

```powershell
npm ci
npx playwright install chromium
npm run test:e2e
```

O comando monta a versão atual em um projeto Compose com nome aleatório, porta efêmera alocada pelo Docker em loopback, bancos novos e contas fictícias. Ao terminar, remove os containers, a rede, os volumes e as imagens construídas para esse projeto. Os dados da stack de desenvolvimento ficam separados.

- **Reserva e atendimento.** A interface cadastra o pet, agenda, confirma, registra o atendimento e mostra o estabelecimento e o serviço na área do tutor. Pela API, a suíte verifica a recusa de transições inválidas e a aceitação de uma conclusão repetida. O relógio do navegador do parceiro avança para a data da consulta.
- **Isolamento.** A agenda do parceiro B vem vazia e a API recusa a leitura ou alteração da reserva do parceiro A e o acesso ao prontuário.
- **Configuração do estabelecimento.** Uma conta parceira dedicada cadastra o estabelecimento, cria um serviço, vincula um colaborador e salva a escala. A consulta externa de CEP é simulada. O cadastro, o vínculo e a escala usam a API e o banco da stack.
- **Consulta administrativa.** Uma conta `ADMIN` fictícia lista, busca e abre o cadastro de parceiros. A suíte confirma as recusas para `PARTNER`, `CUSTOMER`, anônimos, JWT adulterado e cabeçalhos forjados. O tutor continua usando o catálogo sem acesso aos dados fiscais. A conta administrativa é criada no banco descartável do teste.

- **Proxy.** Verifica a sonda HTTP, o ID de requisição gerado pelo Nginx, as recusas de acesso anônimo e as rotas internas, de cadastro público e de checkout bloqueadas.
- **Balcão e caixa.** A API cadastra tutor e pet no estabelecimento correto, disputa a última vaga e registra uma baixa parcial. Verifica repetição sem duplicidade e recusa de acesso entre parceiros.

O Compose real inclui Notification e SMTP interno. O runner usa credenciais descartáveis, inclusive para consulta do outbox e destinatários.

Com `E2E_API_ONLY=1`, o runner usa apenas o Nginx e a API. Esse modo compila os serviços backend e executa as verificações de ingresso, autorização administrativa, balcão, agenda e caixa.

Para o aceite R01, defina `E2E_R01=1`. O Compose de teste adiciona um proxy interno do Pet que deixa pendente somente uma requisição por ID sintético. Os testes também chamam Partner e Payment diretamente pela rede do projeto descartável, conferem a projeção operacional e exercitam o consumidor do Payment com um modelo fictício de pacote. A compra e o consumo de créditos continuam bloqueados.

Para o aceite completo da onda B, execute em PowerShell:

```powershell
$env:E2E_WAVE_B = '1'
$env:E2E_H1 = '1'
npm run test:e2e
```

O runner constrói `Frontend/Dockerfile` e usa as rotas e o SMTP do Compose de publicação. Os arquivos descartáveis acrescentam isolamento, um proxy de falha de Pet e uma porta de loopback para as fixtures do coletor. Com `E2E_H1=1` a suíte acrescenta jornadas móveis e administrativas, emissão do código de vínculo pela interface, reversão e smoke de 24 chamadas locais com concorrência 8. Após a suíte completa, o runner suspende escritas, salva os seis bancos, simula uma migration incompatível na origem descartável em H1 e confere os registros pré-migration em volumes novos. Filtros Playwright pulam a restauração representativa. Use `E2E_SNAPSHOT_PREFIX` com caminho absoluto para gravar os manifestos antes e depois do aceite.

O relatório fica em `Frontend/playwright-report`. Em caso de falha, o trace e a captura de tela ficam em `Frontend/test-results`. Para executar só um cenário, passe um filtro, por exemplo `npm run test:e2e -- --grep "parceiro B"`.

Para H2, ligue `E2E_WAVE_B`, `E2E_H1`, `E2E_GOOGLE_OAUTH` e `E2E_H2` com `1` e informe `E2E_SNAPSHOT_PREFIX` absoluto. Execute sem filtros. `E2E_CHROMIUM_CHANNEL=chrome` seleciona Chrome local quando o Chromium empacotado estiver indisponível. A H2 exercita o wrapper agendável em uma raiz descartável e compara as referências H2 depois da restauração dos seis bancos. Coordene o [slot local](../../docs/sprints/S07-infra-integracao/h2-resource-gate.md) antes de executar.

Para o aceite Google OAuth, execute a suíte H1 com `E2E_GOOGLE_OAUTH=1`. Use OpenSSL no PATH ou informe seu caminho por `E2E_OPENSSL`. O runner cria um certificado descartável, um proxy HTTPS em loopback e um provedor local que assina o ID token e verifica PKCE. A configuração Google do Compose real é exercitada com credenciais fictícias. Os testes OAuth desabilitam trace e screenshot para evitar persistir cookies ou códigos. Rode também o cenário de flag desligada, com `E2E_GOOGLE_OAUTH=0` e o filtro `--grep 'Google desligado'`.
