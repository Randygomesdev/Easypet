import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:net'
import { chmodSync, mkdtempSync, rmSync, rmdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { recoverFixtures } from './wave-b-recovery.mjs'
import { snapshotWaveB } from './wave-b-snapshot.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const frontend = fileURLToPath(new URL('../', import.meta.url))
const project = `easypet-e2e-${randomBytes(5).toString('hex')}`
const secret = () => randomBytes(32).toString('hex')
const password = secret()
const waveB = process.env.E2E_WAVE_B === '1'
const h1 = process.env.E2E_H1 === '1'
const oauth = process.env.E2E_GOOGLE_OAUTH === '1'
const measured = process.env.E2E_MEASURE_RESOURCES === '1'
const demo = process.env.E2E_RESOURCE_PROFILE === 'demo'
const compact = demo || process.env.E2E_RESOURCE_PROFILE === 'compact'
const monitorDir = mkdtempSync(join(tmpdir(), 'easypet-master-'))
chmodSync(monitorDir, 0o755)
const apiOnly = process.env.E2E_API_ONLY === '1'
if (waveB && apiOnly) throw new Error('A onda B inclui cenários de navegador. Execute com E2E_API_ONLY desativado.')
const review = waveB || process.env.E2E_R01 === '1'
const composeFiles = ['-f', 'compose.homolog.yml']
if (compact) {
  if (!measured) throw new Error('O perfil compacto deste runner exige medição de recursos.')
  composeFiles.push('-f', 'scripts/production/setoriza-homolog/compose.compact.yml')
  if (demo) composeFiles.push('-f', 'scripts/production/setoriza-homolog/compose.demo.yml')
}
composeFiles.push('-f', 'scripts/production/setoriza-homolog/compose.monitor.yml')
if (apiOnly) composeFiles.push('-f', 'Frontend/e2e/compose.api.yml')
if (review) composeFiles.push('-f', 'Frontend/e2e/compose.r01.yml')
if (waveB) composeFiles.push('-f', 'Frontend/e2e/compose.smtp-fixture.yml')
if (oauth) composeFiles.push('-f', 'Frontend/e2e/compose.oauth-fixture.yml')
if (measured) {
  if (!oauth || !h1 || process.argv.length !== 2) throw new Error('A medição exige H1 e OAuth, sem filtros.')
  composeFiles.push('-f', 'Frontend/e2e/compose.measure.yml')
}
const env = {
  ...process.env,
  COMPOSE_DISABLE_ENV_FILE: '1',
  HOMOLOG_PORT: '0',
  HOMOLOG_ORIGIN: 'http://127.0.0.1',
  JWT_SECRET: secret(),
  AUTH_DB_PASSWORD: secret(),
  PET_DB_PASSWORD: secret(),
  PARTNER_DB_PASSWORD: secret(),
  BOOKING_DB_PASSWORD: secret(),
  PAYMENT_DB_PASSWORD: secret(),
  NOTIFICATION_DB_PASSWORD: secret(),
  AUTH_TEAM_JWT_SECRET: secret(),
  NOTIFICATION_RECIPIENT_TOKEN: secret(),
  RECEPTION_CLAIM_TOKEN: secret(),
  BOOKING_PET_SUMMARY_TOKEN: secret(),
  BOOKING_OUTBOX_TOKEN: secret(),
  HOMOLOG_INGRESS_TOKEN: secret(),
  HOMOLOG_TRUSTED_EDGE: 'unix:',
  HOMOLOG_SUPPORT_URL: '',
  HOMOLOG_MONITOR_DIR: monitorDir.replaceAll('\\', '/'),
  GOOGLE_AUTH_ENABLED: oauth ? 'true' : 'false',
  GOOGLE_CLIENT_ID: oauth ? 'easypet-fixture' : '',
  GOOGLE_CLIENT_SECRET: oauth ? secret() : '',
  GOOGLE_REDIRECT_URI: '',
  GOOGLE_ALLOWED_EMAILS: oauth ? 'tutor@gmail.com,admin@gmail.com,inativo@gmail.com,equipe@gmail.com,desconhecido@gmail.com' : '',
  COMPOSE_PROFILES: '',
}

let tlsDir
async function configureOAuthFixture() {
  do {
    env.E2E_OAUTH_HTTPS_PORT = String(await availableLoopbackPort())
  } while (env.E2E_OAUTH_HTTPS_PORT === env.HOMOLOG_PORT)
  do {
    env.E2E_OAUTH_PROVIDER_PORT = String(await availableLoopbackPort())
  } while ([env.E2E_OAUTH_HTTPS_PORT, env.HOMOLOG_PORT].includes(env.E2E_OAUTH_PROVIDER_PORT))
  env.HOMOLOG_ORIGIN = `https://127.0.0.1:${env.E2E_OAUTH_HTTPS_PORT}`
  env.GOOGLE_REDIRECT_URI = `${env.HOMOLOG_ORIGIN}/api/v1/login/oauth2/code/google`
  tlsDir = mkdtempSync(join(tmpdir(), 'easypet-e2e-oauth-'))
  env.E2E_OAUTH_TLS_DIR = tlsDir.replaceAll('\\', '/')
  const openssl = process.env.E2E_OPENSSL ?? 'openssl'
  check(spawnSync(openssl, ['req', '-x509', '-newkey', 'rsa:2048', '-sha256', '-nodes', '-days', '1',
    '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1',
    '-keyout', join(tlsDir, 'key.pem'), '-out', join(tlsDir, 'cert.pem')],
  { stdio: ['ignore', 'ignore', 'pipe'] }), 'Certificado HTTPS da fixture')
}

function verifyPublicationConfig() {
  const result = spawnSync('docker', ['compose', '-p', project, '-f', 'compose.homolog.yml',
    'config', '--format', 'json'], { cwd: root, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const config = JSON.parse(check(result, 'Validação do Compose de publicação').stdout)
  const published = Object.entries(config.services).flatMap(([name, service]) =>
    (service.ports ?? []).map(port => [name, port]))
  const [[service, port] = []] = published
  if (published.length !== 1 || service !== 'frontend' || port.host_ip !== '127.0.0.1'
      || port.target !== 80 || config.networks.mail.internal !== true
      || Object.keys(config.services['smtp-capture'].networks).join() !== 'mail'
      || config.services['smtp-capture'].environment?.SMTP_CAPTURE_TEST_FAULTS) {
    throw new Error('O Compose de publicação deve expor somente o frontend local e isolar o coletor SMTP.')
  }
  console.log(`Compose de publicação: ${Object.keys(config.services).length} serviços, frontend em loopback e SMTP interno.`)
}

function compose(args, options = {}) {
  return spawnSync('docker', ['compose', '-p', project, ...composeFiles, ...args], {
    cwd: root, env, encoding: 'utf8', stdio: 'inherit', ...options,
  })
}

function check(result, operation) {
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${operation} falhou (código ${result.status}).`)
  return result
}

async function availableLoopbackPort() {
  const socket = createServer()
  await new Promise((resolve, reject) => {
    socket.once('error', reject)
    socket.listen(0, '127.0.0.1', resolve)
  })
  const { port } = socket.address()
  await new Promise((resolve, reject) => socket.close(error => error ? reject(error) : resolve()))
  return port
}

function publishedAddress(service, port) {
  const published = check(compose(['port', service, port], { stdio: ['ignore', 'pipe', 'inherit'] }), 'Consulta da porta')
  const address = published.stdout.trim()
  if (!/^127\.0\.0\.1:[1-9]\d*$/.test(address)) throw new Error(`Porta local inválida: ${address}`)
  return address
}

let snapshot
const phase = name => { if (measured) console.log(`Medição EasyPet: ${name}`) }
try {
  if (h1 && !waveB) throw new Error('Use E2E_WAVE_B=1 com E2E_H1=1.')
  if (oauth && !waveB) throw new Error('Use E2E_WAVE_B=1 com E2E_GOOGLE_OAUTH=1.')
  if (waveB) {
    env.HOMOLOG_PORT = String(await availableLoopbackPort())
    env.HOMOLOG_ORIGIN = `http://127.0.0.1:${env.HOMOLOG_PORT}`
    if (oauth) await configureOAuthFixture()
    if (process.env.E2E_SNAPSHOT_PREFIX) {
      snapshot = await snapshotWaveB(root, process.env.E2E_SNAPSHOT_PREFIX + '-before.json')
    }
  }
  if (h1) verifyPublicationConfig()
  console.log(`Stack descartável: ${project}`)
  phase('startup')
  if (oauth) {
    check(compose(['up', '-d', '--wait', '--wait-timeout', '420',
      'auth-db', 'pet-db', 'partner-db', 'booking-db', 'payment-db', 'notification-db']), 'Inicialização dos bancos OAuth')
  }
  check(compose(['up', '-d', '--build', '--wait', '--wait-timeout', '420']), 'Subida do Compose')
  phase('ready')
  check(spawnSync(process.env.E2E_PYTHON ?? 'python', ['scripts/production/master_status.py',
    '--project', project, '--output', join(monitorDir, 'status.json')],
  { cwd: root, env, stdio: 'inherit' }), 'Coleta master da stack real')
  if (oauth) {
    const envFile = join(tlsDir, 'diagnose.env')
    writeFileSync(envFile, '', { flag: 'wx' })
    check(spawnSync(process.execPath, ['scripts/production/diagnose.mjs', '--project', project,
      '--env-file', envFile, '--fixtures', 'oauth'], { cwd: root, env, stdio: 'inherit' }), 'Diagnóstico OAuth')
  }
  const address = publishedAddress('frontend', '80')
  if (waveB && !oauth && `http://${address}` !== env.HOMOLOG_ORIGIN) {
    throw new Error('A porta do frontend difere da origem usada nos links SMTP.')
  }
  const smtpUrl = waveB ? `http://${publishedAddress('smtp-capture', '8025')}` : ''

  const sql = `
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    INSERT INTO users (id, email, name, password, role)
    SELECT gen_random_uuid(), email, name, crypt('${password}', gen_salt('bf')), role
    FROM (VALUES
      ('tutor@example.test', 'Tutor E2E', 'CUSTOMER'),
      ('parceiro-a@example.test', 'Parceiro A E2E', 'PARTNER'),
      ('parceiro-b@example.test', 'Parceiro B E2E', 'PARTNER'),
      ('parceiro-onboarding@example.test', 'Parceiro Cadastro E2E', 'PARTNER'),
      ('parceiro-admin-fixture@example.test', 'Parceiro Cadastro Admin E2E', 'PARTNER'),
      ('parceiro-equipe@example.test', 'Parceiro Equipe E2E', 'PARTNER'),
      ('parceiro-notificacao@example.test', 'Parceiro Notificação E2E', 'PARTNER'),
      ('parceiro-retry@example.test', 'Parceiro Retry E2E', 'PARTNER'),
      ('recuperacao@example.test', 'Recuperação E2E', 'CUSTOMER'),
      ('inativacao@example.test', 'Inativação E2E', 'CUSTOMER'),
      ('admin-conta-h1@example.test', 'Conta Admin H1', 'CUSTOMER'),
      ('parceiro-escrita-h1@example.test', 'Parceiro Escrita H1', 'PARTNER'),
      ('mobile-h1@example.test', 'Tutor Mobile H1', 'CUSTOMER'),
      ('tutor-escrita-h1@example.test', 'Tutor Escrita H1', 'CUSTOMER'),
      ('parceiro-mobile-h1@example.test', 'Parceiro Mobile H1', 'PARTNER'),
      ('reivindicacao@example.test', 'Reivindicação E2E', 'CUSTOMER'),
      ('notificacao@example.test', 'Notificação E2E', 'CUSTOMER'),
      ('retry@example.test', 'Retry E2E', 'CUSTOMER'),
      ('admin@example.test', 'Administrador E2E', 'ADMIN')
    ) AS account(email, name, role);
    ${oauth ? `
    INSERT INTO users (id, email, name, password, role, active)
    SELECT gen_random_uuid(), email, name, crypt('${password}', gen_salt('bf')), role, active
    FROM (VALUES
      ('tutor@gmail.com', 'Tutor Google', 'CUSTOMER', true),
      ('admin@gmail.com', 'Admin Google', 'ADMIN', true),
      ('inativo@gmail.com', 'Inativo Google', 'CUSTOMER', false),
      ('equipe@gmail.com', 'Equipe Google', 'TEAM_MEMBER', true)
    ) AS account(email, name, role, active);
    ` : ''}
  `
  check(compose(['exec', '-T', 'auth-db', 'psql', '-q', '-v', 'ON_ERROR_STOP=1', '-U', 'auth', '-d', 'auth_db'], {
    input: sql, stdio: ['pipe', 'inherit', 'inherit'],
  }), 'Criação de contas fictícias')
  const tests = apiOnly ? ['--grep', '@api'] : []
  phase('playwright')
  const playwright = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...tests, ...process.argv.slice(2)], {
    cwd: frontend,
    env: {
      ...process.env,
      E2E_BASE_URL: oauth ? env.HOMOLOG_ORIGIN : `http://${address}`,
      E2E_GOOGLE_OAUTH: oauth ? '1' : '',
      E2E_OAUTH_PROVIDER_URL: oauth ? `http://localhost:${env.E2E_OAUTH_PROVIDER_PORT}` : '',
      E2E_TEST_PASSWORD: password,
      E2E_REVIEW_PROJECT: review ? project : '',
      E2E_SMTP_URL: smtpUrl,
      E2E_NOTIFICATION_SMTP: waveB ? '1' : '',
      E2E_H1: h1 ? '1' : '',
      E2E_MASTER_STATUS_DIR: monitorDir,
    },
    stdio: 'inherit',
  })
  phase('playwright-end')
  if (playwright.error || playwright.status !== 0) {
    console.error(playwright.error?.message ?? `Playwright falhou (código ${playwright.status}).`)
    compose(['ps'])
    process.exitCode = 1
  }
  if (!process.exitCode && waveB && process.argv.length === 2) {
    phase('backup')
    await recoverFixtures(root, env, project, args => check(compose(args,
      { stdio: ['ignore', 'pipe', 'inherit'] }), 'Ensaio de recuperação da onda B'))
  }
} catch (error) {
  console.error(error.message)
  compose(['ps'])
  process.exitCode = 1
} finally {
  if (snapshot) {
    try {
      const after = await snapshotWaveB(root, process.env.E2E_SNAPSHOT_PREFIX + '-after.json')
      if (JSON.stringify(snapshot) !== JSON.stringify(after)) {
        throw new Error('O checkout mudou durante o aceite. Os snapshots identificam os arquivos afetados.')
      }
    } catch (error) {
      console.error(error.message)
      process.exitCode = 1
    }
  }
  phase('cleanup')
  const cleanup = compose(['down', '--volumes', '--remove-orphans', '--rmi', 'local'])
  if (cleanup && cleanup.status !== 0) {
    console.error(`Não foi possível remover a stack descartável ${project}.`)
    process.exitCode = 1
  }
  if (tlsDir) {
    rmSync(join(tlsDir, 'key.pem'), { force: true })
    rmSync(join(tlsDir, 'cert.pem'), { force: true })
    rmSync(join(tlsDir, 'diagnose.env'), { force: true })
    rmdirSync(tlsDir)
  }
  rmSync(join(monitorDir, 'status.json'), { force: true })
  rmdirSync(monitorDir)
}
