import { composeClient, readOptions } from './compose.mjs'

try {
  const options = readOptions(process.argv.slice(2), [
    'project', 'env-file', 'max-due-age-seconds', 'max-failed-hour', 'max-unknown-hour', 'max-unroutable-hour',
  ])
  const compose = composeClient({ project: options.project, envFile: options['env-file'] })
  const limits = {
    oldestDueAgeSeconds: options['max-due-age-seconds'],
    failedLastHour: options['max-failed-hour'],
    unknownLastHour: options['max-unknown-hour'],
    unroutableLastHour: options['max-unroutable-hour'],
  }
  for (const [name, limit] of Object.entries(limits)) {
    if (!/^\d+$/.test(limit) || !Number.isSafeInteger(Number(limit))) throw new Error(`Limite inválido de ${name}.`)
  }
  const queue = JSON.parse(compose(['exec', '-T', 'notification-service', 'curl', '--fail', '--silent',
    '--max-time', '5', 'http://127.0.0.1:8089/actuator/notificationqueue']))
  const conditions = []
  if (queue.transport !== 'SMTP' || queue.outboxPollingEnabled !== true || queue.outboxSyncState !== 'UP_TO_DATE') {
    conditions.push('Transporte ou polling fora do estado esperado.')
  }
  for (const [name, limit] of Object.entries(limits)) {
    if (!Number.isFinite(queue[name])) conditions.push(`Sinal ausente: ${name}.`)
    else if (queue[name] > Number(limit)) conditions.push(`${name}=${queue[name]} acima de ${limit}.`)
  }
  if (conditions.length) {
    for (const condition of conditions) console.error(condition)
    process.exitCode = 2
  } else console.log('Fila dentro dos limites locais.')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
