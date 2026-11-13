import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const scope = [
  'compose.homolog.yml', '.env.homolog.example', 'Backend/Infra/smtp/**',
  'Backend/*/Dockerfile', 'Backend/*/.dockerignore', 'Backend/*/src/main/**', 'Backend/*/pom.xml',
  'Backend/*/build.gradle', 'Backend/*/settings.gradle', 'Backend/*/gradlew', 'Backend/*/gradle/**',
  'Frontend/Dockerfile', 'Frontend/.dockerignore', 'Frontend/nginx.homolog.conf', 'Frontend/src/**',
  'Frontend/public/**', 'Frontend/index.html', 'Frontend/package*.json', 'Frontend/tsconfig*.json',
  'Frontend/vite.config.ts', 'scripts/production/**',
]
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })

async function manifest() {
  const changes = git('status', '--porcelain=v1', '-z', '--untracked-files=all')
  const releaseChanges = git('status', '--porcelain=v1', '-z', '--untracked-files=all', '--', ...scope)
  const paths = [...new Set(git('ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...scope)
    .split('\0').filter(Boolean))].sort()
  const files = {}
  for (const path of paths) {
    try {
      files[path] = createHash('sha256').update(await readFile(join(root, path))).digest('hex')
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      files[path] = null
    }
  }
  return {
    version: 1,
    head: git('rev-parse', 'HEAD').trim(),
    checkoutDirty: Boolean(changes),
    releaseSourcesDirty: Boolean(releaseChanges),
    digest: createHash('sha256').update(JSON.stringify(files)).digest('hex'),
    files,
  }
}

try {
  const [command, path, ...extra] = process.argv.slice(2)
  if (extra.length || (command && (command !== '--verify' || !path))) {
    throw new Error('Use release.mjs ou release.mjs --verify <manifesto.json>.')
  }
  const current = await manifest()
  if (current.checkoutDirty) console.error('Checkout sujo. O HEAD e git pull não reproduzem o conteúdo local.')
  if (path) {
    const approved = JSON.parse(await readFile(path, 'utf8'))
    if (current.checkoutDirty || approved.checkoutDirty || approved.version !== current.version
        || current.head !== approved.head || current.digest !== approved.digest
        || JSON.stringify(current.files) !== JSON.stringify(approved.files)) {
      throw new Error('A verificação requer o mesmo manifesto, HEAD e checkout limpo em ambas as capturas.')
    }
    console.log('Manifesto, HEAD e arquivos conferidos.')
  } else {
    console.log(JSON.stringify(current, null, 2))
  }
  if (current.checkoutDirty) process.exitCode = 2
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
