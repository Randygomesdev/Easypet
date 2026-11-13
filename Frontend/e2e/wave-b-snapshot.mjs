import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const scope = [
  'compose.homolog.yml', 'Backend/*/Dockerfile', 'Backend/*/.dockerignore',
  'Backend/*/src/main/**', 'Backend/*/pom.xml', 'Backend/*/build.gradle',
  'Backend/*/settings.gradle', 'Backend/*/gradlew', 'Backend/*/gradle/**',
  'Frontend/src/**', 'Frontend/public/**', 'Frontend/e2e/**', 'Frontend/index.html',
  'Frontend/Dockerfile', 'Frontend/.dockerignore', 'Frontend/package*.json',
  'Frontend/tsconfig*.json', 'Frontend/vite.config.ts', 'Frontend/nginx.homolog.conf',
  'Frontend/playwright.config.ts', 'scripts/production/**', 'Backend/Infra/smtp/**', '.env.homolog.example',
]

export async function snapshotWaveB(root, output) {
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
  const files = [...new Set(git(['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...scope])
    .split('\0').filter(Boolean))].sort()
  const entries = {}
  for (const file of files) {
    try {
      entries[file] = createHash('sha256').update(await readFile(join(root, file))).digest('hex')
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      entries[file] = null
    }
  }
  const snapshot = { head: git(['rev-parse', 'HEAD']).trim(), capturedAt: new Date().toISOString(), files: entries }
  await writeFile(output, JSON.stringify(snapshot, null, 2) + '\n')
  console.log(`Snapshot da onda B: ${Object.keys(entries).length} arquivos (${output}).`)
  return entries
}
