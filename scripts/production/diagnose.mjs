import { composeClient, databases, notificationDatabase, readOptions } from './compose.mjs'

try {
  const { project, 'env-file': envFile, fixtures } = readOptions(process.argv.slice(2), ['project', 'env-file'], ['fixtures'])
  if (fixtures && (fixtures !== 'oauth' || !/^easypet-e2e-[a-f0-9]{10}$/.test(project))) {
    throw new Error('A opção --fixtures oauth requer um projeto descartável de aceite.')
  }
  const allowedPorts = fixtures === 'oauth'
    ? { frontend: 80, 'smtp-capture': 8025, 'oauth-edge': 443, 'oauth-provider': 8090 }
    : { frontend: 80 }
  const compose = composeClient({ project, envFile })
  const running = compose(['ps', '--all', '--format', 'json'])
  const containers = running.startsWith('[')
    ? JSON.parse(running)
    : running.split('\n').filter(Boolean).map(line => JSON.parse(line))
  const required = [
    'frontend', 'gateway-service', 'redis', 'smtp-capture',
    ...[...databases, notificationDatabase].flatMap(name => [`${name}-db`, `${name}-service`]),
  ]
  const invalid = containers.filter(container =>
    container.State !== 'running'
    || ((required.includes(container.Service) || container.Health) && container.Health !== 'healthy'),
  )
  for (const { Service, State, Health } of containers) console.log(`${Service}: ${State} ${Health}`.trim())
  const absent = required.filter(service => !containers.some(container => container.Service === service))
  if (absent.length) console.error(`Serviços ausentes: ${absent.join(', ')}.`)
  if (invalid.length || absent.length) process.exitCode = 1
  let address
  for (const container of containers) {
    const published = (container.Publishers ?? []).filter(port => port.PublishedPort > 0)
    if (published.some(port => port.URL !== '127.0.0.1'
      || port.TargetPort !== allowedPorts[container.Service] || port.Protocol !== 'tcp')) {
      console.error(`Publicação inesperada de porta em ${container.Service}.`)
      process.exitCode = 1
    }
    if (container.Service === 'frontend') {
      const http = published.find(port => port.URL === '127.0.0.1' && port.TargetPort === 80 && port.Protocol === 'tcp')
      if (http) address = `127.0.0.1:${http.PublishedPort}`
    }
  }

  if (!address) throw new Error('O frontend deve estar publicado em loopback.')
  const probes = [
    ['/healthz', 204],
    ['/api/v1/admin/partners', 401],
    ['/api/v1/admin/notifications', 401],
    ['/api/v1/internal/booking-events', 404],
    ['/api/v1/payments/checkout', 404],
  ]
  for (const [path, expected] of probes) {
    const response = await fetch(`http://${address}${path}`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    })
    await response.body?.cancel()
    console.log(`GET ${path}: ${response.status} (esperado ${expected}).`)
    if (response.status !== expected) process.exitCode = 1
    if (!/^[a-f0-9]{32}$/.test(response.headers.get('x-request-id') ?? '')) {
      console.error(`ID de requisição ausente ou inválido em ${path}.`)
      process.exitCode = 1
    }
  }
  if (!process.exitCode) {
    const queue = JSON.parse(compose(['exec', '-T', 'notification-service', 'curl', '--fail', '--silent',
      '--max-time', '5', 'http://127.0.0.1:8089/actuator/notificationqueue']))
    for (const key of ['due', 'oldestDueAgeSeconds', 'retryScheduled', 'sending',
      'failedLastHour', 'unknownLastHour', 'unroutableLastHour']) {
      if (Number.isFinite(queue[key])) console.log(`Notification ${key}=${queue[key]}`)
    }
    console.log(`Notification transporte SMTP: ${queue.transport === 'SMTP'}; polling ativo: ${queue.outboxPollingEnabled === true}.`)
    if (queue.transport !== 'SMTP' || queue.outboxPollingEnabled !== true) process.exitCode = 1
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
