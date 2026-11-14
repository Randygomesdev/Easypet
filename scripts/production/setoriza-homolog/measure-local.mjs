import { execFile, spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { cgroupCommand, parseCgroup } from './resource-probe.mjs'

const docker = promisify(execFile)
const root = fileURLToPath(new URL('../../../', import.meta.url))
const [directory, profile = 'baseline', ...extra] = process.argv.slice(2)
if (!directory || extra.length || !['baseline', 'compact', 'demo'].includes(profile)) {
  throw new Error('Informe um diretório novo e, opcionalmente, o perfil baseline, compact ou demo.')
}
const output = resolve(directory)
mkdirSync(output)

const intervalMs = 10_000
const projects = new Set()
const startedAt = new Date().toISOString()
const result = { profile, startedAt, intervalMs, phases: [], samples: [], restoreFinal: [], dockerEvents: [], errors: [] }
const fixtures = new Set(['pet-fault', 'oauth-provider', 'oauth-edge'])
let phase = 'initial'

async function runDocker(args) {
  return (await docker('docker', args, { cwd: root, timeout: 15_000, windowsHide: true })).stdout.trim()
}

async function sample() {
  if (!projects.size) return
  const capturedAt = new Date().toISOString()
  const currentPhase = phase
  const ids = (await Promise.all([...projects].map(project => runDocker([
    'ps', '-aq', '--filter', `label=com.docker.compose.project=${project}`,
  ])))).join(' ').split(/\s+/).filter(Boolean)
  if (!ids.length) return
  const format = '{{.Id}}|{{index .Config.Labels "com.docker.compose.project"}}|{{index .Config.Labels "com.docker.compose.service"}}|{{.State.Status}}|{{.State.StartedAt}}|{{.RestartCount}}|{{.State.OOMKilled}}|{{.HostConfig.Memory}}|{{.HostConfig.MemorySwap}}|{{.HostConfig.CpusetCpus}}'
  const inspected = (await runDocker(['inspect', '--format', format, ...ids])).split(/\r?\n/)
  const containers = []
  for (let i = 0; i < inspected.length; i += 6) {
    containers.push(...await Promise.all(inspected.slice(i, i + 6).map(async line => {
      const [id, project, service, status, startedAt, restarts, oom, memory, swap, cpuset] = line.split('|')
      const scope = project.startsWith('easypet-restore-') ? 'restore' : fixtures.has(service) ? 'fixture' : 'publication'
      const container = { id: id.slice(0, 12), project, service, scope, status, startedAt,
        restarts: Number(restarts), oomKilled: oom === 'true', memoryLimitBytes: Number(memory),
        memoryAndSwapLimitBytes: Number(swap), cpuset }
      if (status === 'running') {
        try {
          container.cgroup = parseCgroup(await runDocker(['exec', id, 'sh', '-c', cgroupCommand]))
        } catch (error) {
          container.cgroupError = error.killed ? 'timeout' : 'indisponível'
        }
      }
      return container
    })))
  }
  result.samples.push({ capturedAt, finishedAt: new Date().toISOString(), phase: currentPhase, containers })
}

let pending
function queueSample() {
  if (pending) return
  const samplePhase = phase
  pending = sample().catch(error => result.errors.push({ at: new Date().toISOString(), phase: samplePhase,
    operation: 'inventário Docker', code: error.code,
  })).finally(() => { pending = undefined })
}

const info = (await runDocker(['info', '--format', '{{.NCPU}}|{{.MemTotal}}|{{.CgroupVersion}}'])).split('|')
result.daemon = { cpus: Number(info[0]), memoryBytes: Number(info[1]), cgroupVersion: info[2] }
const env = { ...process.env, E2E_MEASURE_RESOURCES: '1', E2E_WAVE_B: '1', E2E_H1: '1',
  E2E_GOOGLE_OAUTH: '1', E2E_API_ONLY: '0', COMPOSE_PROGRESS: 'plain',
  E2E_RESOURCE_PROFILE: profile,
  E2E_SNAPSHOT_PREFIX: join(output, 'source'),
}
for (const name of ['HOMOLOG_JAVA_MEMORY', 'HOMOLOG_DB_MEMORY']) delete env[name]
const runner = spawn(process.execPath, ['e2e/run-local.mjs'], {
  cwd: join(root, 'Frontend'), env, windowsHide: true, stdio: ['ignore', 'pipe', 'inherit'],
})

const watchers = []
function watchProject(project) {
  projects.add(project)
  const actions = ['start', 'health_status', 'oom', 'die', 'restart', 'kill', 'pause', 'unpause']
  const events = spawn('docker', ['events', '--since', startedAt, '--filter', 'type=container',
    '--filter', `label=com.docker.compose.project=${project}`, '--format', '{{json .}}',
    ...actions.flatMap(action => ['--filter', `event=${action}`]),
  ], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] })
  const done = new Promise(resolve => events.on('close', code => {
    if (code !== null && code !== 0) result.errors.push({ project, operation: 'docker events', code })
    resolve()
  }))
  events.on('error', error => result.errors.push({ project, operation: 'docker events', code: error.code }))
  watchers.push({ events, done })
  createInterface({ input: events.stdout }).on('line', line => {
    const event = JSON.parse(line)
    const a = event.Actor.Attributes
    result.dockerEvents.push({ project, service: a['com.docker.compose.service'], action: event.Action,
      at: new Date(event.timeNano / 1e6).toISOString(), exitCode: a.exitCode, signal: a.signal })
  })
}

const stdout = createInterface({ input: runner.stdout })
stdout.on('line', line => {
  console.log(line)
  const match = /^(?:Stack descartável: |Restauração descartável em )(easypet-(?:e2e|restore)-[a-f0-9]+)\.?$/.exec(line)
  if (match) watchProject(match[1])
  if (line.startsWith('Medição final de restauração: ')) {
    result.restoreFinal.push(JSON.parse(line.slice('Medição final de restauração: '.length)))
  }
  if (line.startsWith('Medição EasyPet: ')) {
    phase = line.slice('Medição EasyPet: '.length)
    result.phases.push({ phase, at: new Date().toISOString() })
    queueSample()
  }
})

const timer = setInterval(queueSample, intervalMs)
const [exitCode, signal] = await new Promise((resolve, reject) => {
  runner.on('error', reject)
  runner.on('close', (...args) => resolve(args))
}).finally(() => clearInterval(timer))
await pending
const endedAt = new Date().toISOString()
for (const watcher of watchers) watcher.events.kill()
await Promise.all(watchers.map(watcher => watcher.done))
result.projects = [...projects]
result.endedAt = endedAt
result.runnerExitCode = exitCode
result.runnerSignal = signal
const required = ['memory.current', 'memory.peak', 'memory.max', 'memory.swap.current', 'memory.swap.max',
  'memory.events.oom', 'memory.events.oom_kill', 'memory.events.max', 'memory.stat.anon', 'memory.stat.file', 'cpu.stat.usage_usec']
const complete = cgroup => cgroup && required.every(key => Number.isFinite(cgroup[key]))
const publication = result.samples.filter(sample => ['ready', 'playwright'].includes(sample.phase)
  && sample.containers.filter(container => container.scope === 'publication' && complete(container.cgroup)).length === 16)
const restored = result.restoreFinal.filter(record => complete(record.cgroup))
result.coverage = { completePublicationSamples: publication.length, finalRestoreServices: restored.map(record => record.service) }
const covered = publication.length > 0 && new Set(result.coverage.finalRestoreServices).size === 6
const measuredContainers = result.samples.flatMap(sample => sample.containers).filter(container => container.scope !== 'fixture')
const oom = result.dockerEvents.filter(event => event.action === 'oom')
const unexpectedRestarts = measuredContainers.some(container => container.restarts > 0 && container.service !== 'notification-service')
const hasOom = oom.length > 0 || measuredContainers.some(container => container.oomKilled
  || container.cgroup?.['memory.events.oom'] > 0 || container.cgroup?.['memory.events.oom_kill'] > 0)
  || restored.some(record => record.cgroup['memory.events.oom'] > 0 || record.cgroup['memory.events.oom_kill'] > 0)
const swapDisabled = publication.length > 0 && publication.every(sample => sample.containers
  .filter(container => container.scope === 'publication').every(container => container.cgroup['memory.swap.max'] === 0))
  && restored.every(record => record.cgroup['memory.swap.max'] === 0)
const usedSwap = [...measuredContainers, ...restored].some(record => record.cgroup?.['memory.swap.current'] > 0)
result.resourceChecks = { hasOom, unexpectedRestarts, swapDisabled, usedSwap }
const valid = covered && !hasOom && !unexpectedRestarts && (profile === 'baseline' || (swapDisabled && !usedSwap))
if (exitCode === 0 && !valid) console.error('A cobertura ou as verificações de recursos da publicação/restauração falharam.')
writeFileSync(join(output, 'resources.json'), JSON.stringify(result) + '\n', { flag: 'wx' })
process.exitCode = exitCode || (exitCode === 0 && valid ? 0 : 1)
