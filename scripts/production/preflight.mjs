import { spawnSync } from 'node:child_process'
import { isIP } from 'node:net'
import { readFileSync, statSync, statfsSync } from 'node:fs'
import { readOptions } from './compose.mjs'

function local(program, args) {
  const result = spawnSync(program, args, { encoding: 'utf8', timeout: 12_000 })
  if (result.error || result.status !== 0) throw new Error(`Falha na leitura local com ${program}.`)
  return result.stdout.trim()
}

function check(label, ok) {
  console.log(`${ok ? 'OK' : 'PENDENTE'} ${label}`)
  if (!ok) process.exitCode = 1
}

try {
  if (process.platform !== 'linux') throw new Error('Execute o preflight no próprio host Linux de homologação.')
  const args = readOptions(process.argv.slice(2), [
    'port', 'origin', 'data-path', 'min-free-ram-mib', 'min-free-disk-mib', 'access-policy',
  ], ['edge-ip', 'edge-network', 'tls-certificate'])
  const origin = new URL(args.origin)
  if (origin.protocol !== 'https:' || origin.origin !== args.origin || origin.username || origin.password) {
    throw new Error('Informe a origem HTTPS sem credenciais, caminho ou barra final.')
  }
  const number = key => {
    const value = Number(args[key])
    if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Valor inválido para --${key}.`)
    return value
  }
  const port = number('port')
  if (port > 65535) throw new Error('Porta fora do intervalo TCP.')
  if (args['edge-ip'] && !isIP(args['edge-ip'])) throw new Error('--edge-ip precisa ser um endereço IP exato.')
  if (!['vpn', 'private-network', 'public-invited'].includes(args['access-policy'])) {
    throw new Error('Informe --access-policy vpn, private-network ou public-invited.')
  }
  const context = local('docker', ['context', 'show'])
  const endpoint = local('docker', ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}', context])
  if (!endpoint.startsWith('unix://') || (process.env.DOCKER_HOST && !process.env.DOCKER_HOST.startsWith('unix://'))) {
    throw new Error('O preflight só consulta um daemon Docker local por socket Unix.')
  }
  const availableRam = /^MemAvailable:\s+(\d+) kB$/m.exec(readFileSync('/proc/meminfo', 'utf8'))
  if (!availableRam) throw new Error('MemAvailable ausente em /proc/meminfo.')
  const freeRam = Math.floor(Number(availableRam[1]) / 1024)
  const filesystem = statfsSync(args['data-path'])
  const freeDisk = Math.floor(filesystem.bavail * filesystem.bsize / 1048576)
  check(`RAM livre ${freeRam} MiB`, freeRam >= number('min-free-ram-mib'))
  check(`disco livre ${freeDisk} MiB no volume informado`, freeDisk >= number('min-free-disk-mib'))
  check('porta TCP disponível para primeira publicação',
    local('ss', ['-H', '-ltn', 'sport', '=', `:${port}`]) === '')
  check('Docker e Compose respondem pelo socket local',
    Boolean(local('docker', ['info', '--format', '{{.ServerVersion}}']) && local('docker', ['compose', 'version', '--short'])))
  check('endereço exato do proxy de entrada informado', Boolean(args['edge-ip']))
  if (args['edge-network']) {
    const network = local('docker', ['network', 'inspect', '--format', '{{json .IPAM.Config}}', args['edge-network']])
    check('rede de entrada existe e tem IPAM', JSON.parse(network).some(item => item.Subnet))
  } else {
    console.log('INFO modo de proxy no host informado pela ausência de rede Docker externa.')
  }
  if (args['tls-certificate']) {
    const cert = args['tls-certificate']
    if (!statSync(cert).isFile()) throw new Error('O caminho TLS informado não é um arquivo.')
    const host = origin.hostname.replace(/^\[|\]$/g, '')
    const matched = local('openssl', ['x509', '-in', cert, '-noout', isIP(host) ? '-checkip' : '-checkhost', host])
    local('openssl', ['x509', '-in', cert, '-noout', '-checkend', '86400'])
    check('certificado local cobre a origem e tem mais de 24 h de validade', matched.includes('does match'))
  } else {
    check('certificado local informado', false)
  }
  if (args['access-policy'] === 'public-invited') {
    console.log('PENDENTE confirmar contas convidadas, allowlist Google, recusa de cadastro público e autorização das APIs no endereço publicado.')
  }
  console.log(`PENDENTE verificação da política ${args['access-policy']}, cadeia HTTPS e smoke no endereço publicado.`)
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
