import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rmdir, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { composeClient, readOptions } from './compose.mjs'

const services = { 'auth-service': 'AUTH', 'booking-service': 'BOOKING', 'partner-service': 'PARTNER',
  'pet-service': 'PET', 'payment-service': 'PAYMENT', 'gateway-service': 'GATEWAY',
  'notification-service': 'NOTIFICATION', frontend: 'FRONTEND' }

function fresh(value, now, maxAge) {
  const age = now - Date.parse(value)
  return age >= -5000 && age <= maxAge
}

export function observeOperations({ backup, master, maxBackupAge, now }) {
  const backupRecent = fresh(backup?.lastSuccessAt, now, maxBackupAge)
  const masterRecent = master?.schemaVersion === 1 && fresh(master.collectedAt, now, 120_000)
    && Array.isArray(master.services) && Object.keys(services).every(id => master.services.some(service => service.id === id))
  const signals = [{ source: 'BACKUP', service: 'BACKUP', code: 'BACKUP_FAILED',
    severity: 'ERROR', failed: backup?.schemaVersion !== 1 || backup.code !== 'BACKUP_OK' || !backupRecent },
  { source: 'INFRA', service: 'INFRA', code: 'SERVICE_UNAVAILABLE', severity: 'WARNING', failed: !masterRecent }]
  if (masterRecent) {
    for (const [id, service] of Object.entries(services)) {
      const item = master.services.find(candidate => candidate.id === id)
      signals.push({ source: 'INFRA', service, code: 'SERVICE_UNAVAILABLE', severity: 'ERROR', failed: item.status !== 'HEALTHY' })
    }
  }
  return { signals, backupRecent, masterRecent }
}

export async function deliverOperations(directory, signals, deliver) {
  const lock = join(directory, '.operations-alerts.lock')
  const file = join(directory, 'operations-alerts.json')
  await mkdir(lock)
  const save = async state => {
    const temporary = `${file}.${randomUUID()}.tmp`
    try {
      await writeFile(temporary, JSON.stringify(state) + '\n', { flag: 'wx', mode: 0o600 })
      await rename(temporary, file)
    } finally {
      await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error })
    }
  }
  try {
    const state = await readFile(file, 'utf8').then(JSON.parse).catch(error => {
      if (error.code !== 'ENOENT') throw error
      return { active: {}, pending: [] }
    })
    for (const { failed, ...signal } of signals) {
      const key = `${signal.source}/${signal.service}/${signal.code}`
      const incident = state.active[key]
      if (failed && !incident) {
        const event = { ...signal, incidentId: randomUUID(), sequence: 1, state: 'OPEN', correlationId: null }
        state.active[key] = event
        state.pending.push(event)
      } else if (!failed && incident) {
        delete state.active[key]
        state.pending.push({ ...incident, sequence: 2, state: 'RECOVERED' })
      }
    }
    await save(state)
    let sent = 0
    for (const event of state.pending) {
      if (!await deliver(event)) break
      sent++
    }
    state.pending.splice(0, sent)
    if (sent) await save(state)
    return { sent, pending: state.pending.length }
  } finally {
    await rmdir(lock)
  }
}

export function sendThroughNotification(compose, event) {
  // Read the existing environment variable inside its owner. The host argv and output carry no secret.
  const command = `set -eu
test -n "$NOTIFICATION_OPERATIONS_TOKEN"
payload=$(cat)
printf 'Authorization: Bearer %s\\n' "$NOTIFICATION_OPERATIONS_TOKEN" |
  curl --header @- --silent --max-time 5 --output /dev/null --write-out '%{http_code}' \\
    --header 'Content-Type: application/json' --data-binary "$payload" \\
    http://127.0.0.1:8087/api/v1/internal/operations/alerts`
  try {
    return compose(['exec', '-T', 'notification-service', 'sh', '-c', command], {
      input: JSON.stringify(event), stdio: ['pipe', 'pipe', 'pipe'], timeout: 8000,
      operation: 'Ingresso operacional local',
    }) === '202'
  } catch {
    return false
  }
}

async function main() {
  const options = readOptions(process.argv.slice(2), ['project', 'env-file', 'master-file', 'backup-directory', 'state-directory', 'max-backup-age-seconds'])
  const age = Number(options['max-backup-age-seconds'])
  if (!Number.isSafeInteger(age) || age <= 0 || age > Number.MAX_SAFE_INTEGER / 1000) throw new Error('Prazo de backup inválido.')
  const read = file => readFile(file, 'utf8').then(JSON.parse).catch(() => null)
  const [backup, master] = await Promise.all([read(join(options['backup-directory'], 'backup-status.json')), read(options['master-file'])])
  const observation = observeOperations({ backup, master, maxBackupAge: age * 1000, now: Date.now() })
  const compose = composeClient({ project: options.project, envFile: options['env-file'] })
  const delivery = await deliverOperations(options['state-directory'], observation.signals, event => sendThroughNotification(compose, event))
  console.log(JSON.stringify({ backupRecent: observation.backupRecent, masterRecent: observation.masterRecent,
    activeSignals: observation.signals.filter(signal => signal.failed).length, ...delivery }))
  if (delivery.pending) process.exitCode = 2
}

if (import.meta.main) await main().catch(() => {
  console.error('Falha ao coletar ou persistir os sinais operacionais locais.')
  process.exitCode = 1
})
