# Vitrine EasyPet

A landing de portfólio usa HTML, CSS, imagens e três vídeos WebM. O build fica em `Frontend/dist-portfolio` e pode ser servido por um servidor estático.

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
$env:E2E_PORTFOLIO_OUTPUT = Join-Path (Get-Location) 'portfolio/public/portfolio'
npm run test:e2e -- portfolio.spec.ts
npm run build:portfolio
```

O runner cria um projeto Compose descartável com credenciais próprias, PostgreSQL e SMTP de captura. O roteiro usa `example.test`, dois estabelecimentos com serviços e escalas e três tutores com pets e reservas. A gravação começa após autenticar cada perfil. Confira os vídeos e as capas antes de publicar.

## Trocar a publicação

Antes da troca, suspenda as escritas do EasyPet e execute o [roteiro de backup e verificação](operacao.md#backup-e-ensaio-de-recuperação). Guarde a configuração atual do proxy e a referência da [versão em execução](publicacao-h2-2026-11-14.md).

Sirva o build estático no domínio do EasyPet e valide a página, os vídeos e os links por HTTPS. Depois de confirmar a troca, pare o projeto Compose EasyPet e seus timers de coleta, alertas e backup. Confira o domínio do Setoriza antes e depois da mudança. Preserve os volumes e o backup para recuperar a aplicação demonstrável futuramente.
