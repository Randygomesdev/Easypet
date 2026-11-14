import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { scheduledBackup } from './backup-scheduled.mjs'
import { verifyBackup } from './database.mjs'
import { deliverOperations, observeOperations, sendThroughNotification } from './operations-alerts.mjs'

async function repository(t) {
  const directory = await mkdtemp(join(tmpdir(), 'easypet-h2-operations-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  return directory
}

function database({ absent = false, failed = false } = {}) {
  return (args, options) => {
    if (args[0] === 'ps') return ['auth-db', 'pet-db', 'partner-db', 'booking-db', 'payment-db',
      ...(absent ? [] : ['notification-db'])].join('\n')
    if (args[3] === 'pg_dump') {
      if (failed && args[2] === 'booking-db') throw new Error('fixture de falha de dump')
      writeFileSync(options.stdio[1], `mock-dump-${args[2]}`)
    } else assert.equal(String(readFileSync(options.stdio[0])), `mock-dump-${args[2]}`)
  }
}

test('retenção preserva conjuntos avulsos e só roda após um novo backup íntegro', async t => {
  const directory = await repository(t)
  const run = compose => scheduledBackup({ directory, retainDays: 1, compose })
  const first = await run(database())
  const firstPath = join(directory, first.backupId)
  assert.equal((await verifyBackup(firstPath)).length, 6)
  const manifestPath = join(firstPath, 'manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath))
  await writeFile(manifestPath, JSON.stringify({ ...manifest, createdAt: '2020-01-01T00:00:00.000Z' }))
  await mkdir(join(directory, 'backup-avulso'))
  await assert.rejects(run(database({ absent: true })), /todos os bancos/)
  await assert.rejects(run(database({ failed: true })), /falha de dump/)
  assert.deepEqual((await readdir(directory)).sort(), ['backup-avulso', 'backup-status.json', first.backupId].sort())
  const next = await run(database())
  assert.equal(next.removed, 1)
  assert.equal(next.recovered, true)
  assert.deepEqual((await readdir(directory)).sort(), ['backup-avulso', 'backup-status.json', next.backupId].sort())
  await writeFile(join(directory, next.backupId, 'auth.dump'), 'adulterado')
  await assert.rejects(verifyBackup(join(directory, next.backupId)), /integridade/)
})

test('trava preserva a execução ativa e o estado anterior', async t => {
  const directory = await repository(t)
  await mkdir(join(directory, '.backup.lock'))
  await assert.rejects(scheduledBackup({ directory, retainDays: 1, compose: database() }), /trava/)
  assert.deepEqual(await readdir(directory), ['.backup.lock'])
})

test('sinal vencido persiste transições e reenvia a mesma sequência até confirmação', async t => {
  const directory = await repository(t)
  const now = Date.parse('2026-11-14T12:00:00Z')
  const backup = { schemaVersion: 1, code: 'BACKUP_OK', lastSuccessAt: '2026-11-14T11:00:00Z' }
  const run = (maxBackupAge, deliver) => deliverOperations(directory,
    observeOperations({ backup, maxBackupAge, now }).signals.filter(signal => signal.service === 'BACKUP'), deliver)
  const seen = []
  assert.deepEqual(await run(60_000, event => { seen.push(event); return false }), { sent: 0, pending: 1 })
  assert.deepEqual(await run(7_200_000, event => { seen.push(event); return true }), { sent: 2, pending: 0 })
  assert.deepEqual(seen[0], seen[1])
  assert.deepEqual(seen[2], { ...seen[0], state: 'RECOVERED', sequence: 2 })
  assert.equal(sendThroughNotification((args, options) => {
    assert.deepEqual(args.slice(0, 3), ['exec', '-T', 'notification-service'])
    assert.deepEqual(options.stdio, ['pipe', 'pipe', 'pipe'])
    assert.deepEqual(JSON.parse(options.input), seen[2])
    return '202'
  }, seen[2]), true)
})
