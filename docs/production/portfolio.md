# Vitrine EasyPet

A landing de portfólio usa HTML, CSS, imagens e seis vídeos WebM com narração em português, trilha e legendas WebVTT. Cada vídeo abre com o logo e o título da jornada e termina com a assinatura narrada “Innker Tecnologia. Desenvolvemos o digital que impulsiona o seu negócio.” O build fica em `Frontend/dist-portfolio` e pode ser servido por um servidor estático.

Para revisar a vitrine localmente, execute em `Frontend`:

```powershell
npm run build:portfolio
npx vite preview portfolio --outDir ../dist-portfolio
```

## Gravar novamente

Execute no PowerShell, a partir de `Frontend`, com Docker Desktop, Node e as dependências do frontend disponíveis.

```powershell
node node_modules/@playwright/test/cli.js install ffmpeg
$env:E2E_CHROMIUM_CHANNEL = 'chrome'
$env:E2E_WAVE_B = '1'
$env:E2E_PORTFOLIO_VIDEO = '1'
$env:E2E_PORTFOLIO_OUTPUT = Join-Path (Get-Location) '../.env.portfolio-capturas'
npm run test:e2e -- portfolio.spec.ts
```

O runner cria um projeto Compose descartável com credenciais próprias, PostgreSQL e SMTP de captura. O roteiro usa `example.test`, dois estabelecimentos com serviços e escalas e três tutores com pets e reservas. A gravação começa após autenticar cada perfil. Confira os vídeos e as capas antes de publicar.

Para gravar a busca de parceiros e o acompanhamento do pet, defina `$env:E2E_PORTFOLIO_TUTOR_EXTRAS = '1'` antes de executar o mesmo comando de teste. Esse modo inclui uma consulta concluída, um registro de prontuário e vacinas com próximas doses.

Para gravar a autorização de adicionais, defina `$env:E2E_PORTFOLIO_AUTHORIZATION = '1'`. O roteiro captura a proposta pela clínica, a autorização digital no app do tutor e a aplicação de R$ 25,00 pelo caixa. As três cenas usam a mesma reserva fictícia e o roteiro confere o total de R$ 85,00 e a origem digital do aceite na cobrança.

O roteiro narrado de cada vídeo está nas legendas em `Frontend/portfolio/public/portfolio`. A edição usa a voz `pt-BR-ThalitaMultilingualNeural` a `+3%` e `+2Hz`, com a trilha do Setoriza a partir do segundo 16. Ao substituir capturas, sincronize novamente a narração e as legendas, revise a reprodução e copie os WebMs editados e as respectivas capas para a pasta pública antes de gerar o build.

## Trocar a publicação

Antes da troca, suspenda as escritas do EasyPet e execute o [roteiro de backup e verificação](operacao.md#backup-e-ensaio-de-recuperação). Guarde a configuração atual do proxy e a referência da [versão em execução](publicacao-h2-2026-11-14.md).

Sirva o build estático no domínio do EasyPet e valide a página, os vídeos e os links por HTTPS. Depois de confirmar a troca, pare o projeto Compose EasyPet e seus timers de coleta, alertas e backup. Confira o domínio do Setoriza antes e depois da mudança. Preserve os volumes e o backup para recuperar a aplicação demonstrável futuramente.

## Publicação em 14/11/2026

- A revisão `548886c` da vitrine está publicada em [easypet.innker.com.br](https://easypet.innker.com.br/), servida pelo Nginx em `/var/www/easypet-portfolio-548886c`. O bloco HTTPS e a renovação do certificado continuam no proxy da VPS. As rotas da antiga API retornam HTTP 404.
- Com o acesso público do EasyPet suspenso para o corte, foram feitos seis dumps PostgreSQL da H2 em `/srv/easypet-backups/pre-portfolio-548886c`. A verificação conferiu a leitura dos catálogos dos dumps e os SHA-256 do manifesto.
- A reprodução dos seis vídeos com áudio e legendas foi verificada no domínio público em desktop e celular. Após esse aceite, os 16 containers do projeto `easypet-homolog` foram parados e os três timers do EasyPet foram desabilitados. Os volumes e a configuração anterior do Nginx foram preservados. O Setoriza respondeu HTTP 200 antes, durante e depois da troca. A comparação dos 30 containers fora do EasyPet encontrou os mesmos IDs, horários de início, contagens de reinício e indicadores de OOM. A memória disponível nas sondas imediatamente antes e depois da parada subiu de 2.378 para 4.377 MiB.
- Para reativar a H2, use os containers e volumes preservados conforme o [registro da publicação H2](publicacao-h2-2026-11-14.md). A configuração do proxy anterior está em `/srv/easypet-release/portfolio-548886c/previous-nginx.conf`. Valide a aplicação antes de restaurar o acesso pelo domínio e religar as rotinas operacionais.
