import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
export const databases = ['auth', 'pet', 'partner', 'booking', 'payment']
export const notificationDatabase = 'notification'

export function readOptions(args, required, optional = []) {
  const { values } = parseArgs({
    args,
    options: Object.fromEntries([...required, ...optional].map(name => [name, { type: 'string' }])),
  })
  for (const name of required) {
    if (!values[name]) throw new Error(`Informe --${name}.`)
  }
  return values
}

export function disposableConfig(prefix) {
  const secret = () => randomBytes(32).toString('hex')
  return {
    project: `easypet-${prefix}-${randomBytes(8).toString('hex')}`,
    env: {
      COMPOSE_DISABLE_ENV_FILE: '1',
      HOMOLOG_ORIGIN: 'http://127.0.0.1',
      HOMOLOG_PORT: '0',
      JWT_SECRET: secret(),
      HOMOLOG_INGRESS_TOKEN: secret(),
      AUTH_TEAM_JWT_SECRET: secret(),
      BOOKING_OUTBOX_TOKEN: secret(),
      NOTIFICATION_RECIPIENT_TOKEN: secret(),
      RECEPTION_CLAIM_TOKEN: secret(),
      BOOKING_PET_SUMMARY_TOKEN: secret(),
      ...Object.fromEntries([...databases, notificationDatabase].map(name => [
        `${name.toUpperCase()}_DB_PASSWORD`, secret(),
      ])),
    },
  }
}

export function composeClient({ project, envFile, env }) {
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(project)) throw new Error('Nome de projeto Compose inválido.')
  const baseArgs = ['compose', '-p', project, '-f', 'compose.homolog.yml']
  if (envFile) baseArgs.push('--env-file', resolve(envFile))
  return (args, options = {}) => {
    const { operation = args[0], ...spawnOptions } = options
    const result = spawnSync('docker', [...baseArgs, ...args], {
      cwd: root,
      env: { ...process.env, ...env },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...spawnOptions,
    })
    if (result.error) throw new Error(`${operation}: ${result.error.message}`)
    if (result.status !== 0) throw new Error(`${operation} falhou (${result.signal ?? result.status}).`)
    return result.stdout?.trim()
  }
}
