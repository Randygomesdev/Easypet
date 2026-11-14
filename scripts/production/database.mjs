import { createHash } from 'node:crypto'
import { closeSync, createReadStream, openSync } from 'node:fs'
import { lstat, mkdtemp, readFile, rename, rmdir, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { composeClient, databases, disposableConfig, notificationDatabase, readOptions } from './compose.mjs'
import { cgroupCommand, parseCgroup } from './setoriza-homolog/resource-probe.mjs'

const manifestName = 'manifest.json'

async function digest(path) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

function withFile(path, flags, action) {
  const fd = openSync(path, flags, 0o600)
  try {
    return action(fd)
  } finally {
    closeSync(fd)
  }
}

function databaseCommand(name, command, ...args) {
  return ['exec', '-T', `${name}-db`, command, '-U', name, '-d', `${name}_db`, ...args]
}

async function backup(compose, directory) {
  const destination = resolve(directory)
  await lstat(destination).then(
    () => { throw new Error('O destino do backup já existe.') },
    error => { if (error.code !== 'ENOENT') throw error },
  )
  const services = compose(['ps', '--all', '--services']).split(/\r?\n/)
  const names = services.includes('notification-db') ? [...databases, notificationDatabase] : databases
  const stage = await mkdtemp(join(dirname(destination), `.${basename(destination)}-`))
  const dumps = []
  try {
    for (const name of names) {
      const file = `${name}.dump`
      const path = join(stage, file)
      withFile(path, 'wx', fd => compose(databaseCommand(name, 'pg_dump', '-Fc', '--no-password'), {
        stdio: ['ignore', fd, 'pipe'], operation: `Backup de ${name}`,
      }))
      dumps.push({ file, sha256: await digest(path) })
    }
    const manifest = { version: 1, createdAt: new Date().toISOString(), dumps }
    await writeFile(join(stage, manifestName), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
    await rename(stage, destination)
    console.log(`Backup publicado em ${destination} (${dumps.length} bancos).`)
  } catch (error) {
    for (const file of [...names.map(name => `${name}.dump`), manifestName]) {
      await unlink(join(stage, file)).catch(cause => { if (cause.code !== 'ENOENT') throw cause })
    }
    await rmdir(stage)
    throw error
  }
}

async function restoreDrill(directory, evidencePath) {
  const evidence = evidencePath ? JSON.parse(await readFile(evidencePath, 'utf8')) : {}
  const manifest = JSON.parse(await readFile(join(directory, manifestName), 'utf8'))
  if (manifest.version !== 1 || !Array.isArray(manifest.dumps)) {
    throw new Error('Manifesto incompatível com o conjunto de bancos.')
  }
  const names = manifest.dumps.some(entry => entry?.file === `${notificationDatabase}.dump`)
    ? [...databases, notificationDatabase]
    : databases
  if (manifest.dumps.length !== names.length) throw new Error('Manifesto incompatível com o conjunto de bancos.')
  for (const name of names) {
    const file = `${name}.dump`
    const entries = manifest.dumps.filter(entry => entry?.file === file)
    if (entries.length !== 1 || entries[0].sha256 !== await digest(join(directory, file))) {
      throw new Error(`Falha de integridade em ${file}.`)
    }
  }

  const config = disposableConfig('restore')
  const measured = process.env.E2E_MEASURE_RESOURCES === '1'
  if (measured) {
    config.overlays = ['Frontend/e2e/compose.measure.yml']
    if (['compact', 'demo'].includes(process.env.E2E_RESOURCE_PROFILE)) {
      config.overlays.push('scripts/production/setoriza-homolog/compose.compact.yml')
      if (process.env.E2E_RESOURCE_PROFILE === 'demo') config.overlays.push('scripts/production/setoriza-homolog/compose.demo.yml')
    }
  }
  const compose = composeClient(config)
  console.log(`Restauração descartável em ${config.project}.`)
  try {
    for (const name of names) {
      if (measured) console.log(`Medição EasyPet: restore-${name}`)
      compose(['up', '-d', '--wait', '--wait-timeout', '300', `${name}-db`], {
        operation: `Subida de ${name} para restauração`,
      })
      withFile(join(directory, `${name}.dump`), 'r', fd => compose(
        databaseCommand(name, 'pg_restore', '--exit-on-error', '--single-transaction', '--no-owner', '--no-privileges', '--no-password'), {
          stdio: [fd, 'ignore', 'pipe'], operation: `Restauração de ${name}`,
        },
      ))
      const tables = Number(compose(databaseCommand(name, 'psql', '-XAtq', '-v', 'ON_ERROR_STOP=1', '-c',
        "SELECT count(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema')",
      ), { operation: `Verificação de ${name}` }))
      if (!(tables > 0)) throw new Error(`O banco ${name} restaurado está sem tabelas de aplicação.`)
      console.log(`${name}: ${tables} tabelas restauradas.`)
      for (const { query, expected } of evidence[name] ?? []) {
        const restored = compose(databaseCommand(name, 'psql', '-XAtq', '-v', 'ON_ERROR_STOP=1', '-c',
          `BEGIN READ ONLY; ${query}; ROLLBACK;`), { operation: `Consulta de evidência em ${name}` })
        if (restored !== expected) throw new Error(`Os registros verificados em ${name} divergiram após a restauração.`)
      }
      if (evidence[name]?.length) console.log(`${name}: registros de referência conferidos.`)
      if (measured) {
        const cgroup = parseCgroup(compose(['exec', '-T', `${name}-db`, 'sh', '-c', cgroupCommand]))
        console.log(`Medição final de restauração: ${JSON.stringify({ service: `${name}-db`, cgroup })}`)
        console.log(`Medição EasyPet: restored-${name}`)
      }
      compose(['stop', `${name}-db`], { operation: `Parada de ${name} após verificação` })
    }
  } finally {
    try {
      compose(['down', '--volumes'], { operation: `Limpeza de ${config.project}` })
    } catch (error) {
      console.error(error.message)
      process.exitCode = 1
    }
  }
}

try {
  const [command, ...args] = process.argv.slice(2)
  if (command === 'backup') {
    const { project, 'env-file': envFile, directory } = readOptions(args, ['project', 'env-file', 'directory'])
    await backup(composeClient({ project, envFile }), directory)
  } else if (command === 'restore-drill') {
    const { directory, evidence } = readOptions(args, ['directory'], ['evidence'])
    await restoreDrill(directory, evidence)
  } else {
    throw new Error('Use backup --project <projeto> --env-file <arquivo> --directory <destino> ou restore-drill --directory <backup>.')
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
