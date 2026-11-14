import { randomUUID } from 'node:crypto'
import { lstat, mkdir, readFile, readdir, realpath, rename, rmdir, unlink, writeFile } from 'node:fs/promises'
import { join, parse, resolve } from 'node:path'
import { backup, verifyBackup } from './database.mjs'
import { composeClient, databases, notificationDatabase, readOptions } from './compose.mjs'

const producer = 'easypet-scheduled-v1'
const names = [...databases, notificationDatabase]
const files = [...names.map(name => `${name}.dump`), 'manifest.json'].sort()
const setPattern = /^easypet-\d{8}T\d{9}Z-[0-9a-f-]{36}$/

async function writeStatus(root, state) {
  const temporary = join(root, `.backup-${randomUUID()}.tmp`)
  try {
    await writeFile(temporary, JSON.stringify(state) + '\n', { flag: 'wx', mode: 0o600 })
    await rename(temporary, join(root, 'backup-status.json'))
  } finally {
    await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error })
  }
}

async function retain(root, current, cutoff) {
  let removed = 0
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === current || !setPattern.test(entry.name)) continue
    const directory = join(root, entry.name)
    const contents = await readdir(directory, { withFileTypes: true })
    if (contents.some(file => !file.isFile())
        || contents.map(file => file.name).sort().join() !== files.join()) continue
    const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'))
    const createdAt = Date.parse(manifest.createdAt)
    if (manifest.producer !== producer || !Number.isFinite(createdAt) || createdAt >= cutoff) continue
    if ((await verifyBackup(directory)).length !== names.length) continue
    // Detach the verified set before deleting files. Readers see a complete set or no set.
    const expired = join(root, `.expired-${randomUUID()}`)
    await rename(directory, expired)
    for (const file of files) await unlink(join(expired, file))
    await rmdir(expired)
    removed++
  }
  return removed
}

export async function scheduledBackup({ compose, directory, retainDays, now = new Date() }) {
  if (!Number.isInteger(retainDays) || retainDays < 1 || retainDays > 36_500) {
    throw new Error('Informe --retain-days com um inteiro de 1 a 36500.')
  }
  const requested = resolve(directory)
  if (!(await lstat(requested)).isDirectory()) {
    throw new Error('O repositório deve ser um diretório dedicado, existente e sem links.')
  }
  const root = await realpath(requested)
  if (parse(root).root === root) throw new Error('A raiz do volume não pode ser usada como repositório.')
  const lock = join(root, '.backup.lock')
  await mkdir(lock).catch(error => {
    if (error.code === 'EEXIST') throw new Error('Backup agendado já está em execução ou deixou uma trava.')
    throw error
  })
  const previous = await readFile(join(root, 'backup-status.json'), 'utf8').then(JSON.parse).catch(() => ({}))
  const runId = randomUUID()
  const backupId = `easypet-${now.toISOString().replace(/[-:.]/g, '')}-${runId}`
  let code = 'BACKUP_FAILED'
  const priorSuccess = Date.parse(previous?.lastSuccessAt)
  let lastSuccessAt = Number.isFinite(priorSuccess) && priorSuccess <= now.getTime()
    ? new Date(priorSuccess).toISOString() : null
  try {
    await backup((args, options) => compose(args, { ...options, timeout: 300_000 }),
      join(root, backupId), { requiredNames: names, producer })
    lastSuccessAt = new Date().toISOString()
    code = 'RETENTION_FAILED'
    const removed = await retain(root, backupId, now.getTime() - retainDays * 86_400_000)
    code = 'BACKUP_OK'
    return { runId, backupId, removed, recovered: previous?.code === 'BACKUP_FAILED' || previous?.code === 'RETENTION_FAILED' }
  } finally {
    try {
      await writeStatus(root, { schemaVersion: 1, runId, code, startedAt: now.toISOString(),
        finishedAt: new Date().toISOString(), lastSuccessAt })
    } finally {
      await rmdir(lock)
    }
  }
}

async function main() {
  const { project, 'env-file': envFile, directory, 'retain-days': retainDays } = readOptions(process.argv.slice(2),
    ['project', 'env-file', 'directory', 'retain-days'])
  const result = await scheduledBackup({ compose: composeClient({ project, envFile }), directory, retainDays: Number(retainDays) })
  console.log(`Backup periódico íntegro: ${result.backupId}. Conjuntos expirados removidos: ${result.removed}.`)
  if (result.recovered) console.log('Backup periódico recuperado após falha registrada.')
}

if (import.meta.main) await main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
