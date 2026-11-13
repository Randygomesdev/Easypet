import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
const frontend = new URL('../../../../Frontend/', import.meta.url)
process.chdir(fileURLToPath(frontend))
const require = createRequire(new URL('package.json', frontend))
const ts = require('typescript')
const configPath = fileURLToPath(new URL('tsconfig.app.json', frontend))
const config = ts.readConfigFile(configPath, ts.sys.readFile)
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'))
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, fileURLToPath(frontend), undefined, configPath)
const program = ts.createProgram(parsed.fileNames, {...parsed.options, incremental: false, noEmit: true})
const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)]
const formatHost = { getCurrentDirectory: () => fileURLToPath(frontend), getCanonicalFileName: p => p, getNewLine: () => '\n' }
const result = `UTC ${new Date().toISOString()}\nTypeScript ${ts.version}; no emit, no build outputs.\n` +
  ts.formatDiagnostics(diagnostics, formatHost) + `\nDiagnostics: ${diagnostics.length}\n`
writeFileSync(new URL('frontend-typecheck-result.txt', import.meta.url), result)
const snapshots = parsed.fileNames.map(path => ({path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex')}))
writeFileSync(new URL('frontend-typecheck-snapshot.json', import.meta.url), JSON.stringify(snapshots, null, 2))
console.log(result)
process.exitCode = diagnostics.length ? 1 : 0
