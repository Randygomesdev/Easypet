import { createHash, generateKeyPairSync, randomUUID, sign } from 'node:crypto'
import { createServer } from 'node:http'

const issuer = 'http://oauth-provider:8090'
const { GOOGLE_CLIENT_ID: client, GOOGLE_CLIENT_SECRET: secret, GOOGLE_REDIRECT_URI: redirect } = process.env
if (!client || !secret || !redirect || new URL(redirect).hostname !== '127.0.0.1') {
  throw new Error('O provedor fictício requer credenciais descartáveis e callback em loopback.')
}

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const kid = randomUUID()
const jwk = { ...publicKey.export({ format: 'jwk' }), kid, use: 'sig', alg: 'RS256' }
const pending = new Map()
const grants = new Map()
const accounts = {
  tutor: ['tutor@gmail.com', 'Tutor Google', 'fixture-tutor'],
  admin: ['admin@gmail.com', 'Admin Google', 'fixture-admin'],
  inactive: ['inativo@gmail.com', 'Inativo Google', 'fixture-inactive'],
  team: ['equipe@gmail.com', 'Equipe Google', 'fixture-team'],
  unknown: ['desconhecido@gmail.com', 'Sem Conta', 'fixture-unknown'],
}
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url')

function take(map, id) {
  const record = map.get(id)
  map.delete(id)
  return record && record.expires > Date.now() ? record : undefined
}

async function form(request) {
  let input = ''
  for await (const chunk of request) {
    input += chunk
    if (input.length > 16384) throw new Error('Corpo excedeu o limite da fixture.')
  }
  return new URLSearchParams(input)
}

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(body))
}

const server = createServer(async (request, response) => {
  try {
    const { pathname, searchParams } = new URL(request.url, issuer)
    if (request.method === 'GET' && pathname === '/jwks') return json(response, 200, { keys: [jwk] })
    if (request.method === 'GET' && pathname === '/authorize') {
      if (searchParams.get('client_id') !== client || searchParams.get('redirect_uri') !== redirect
          || searchParams.get('response_type') !== 'code' || !searchParams.get('scope')?.split(' ').includes('openid')
          || !searchParams.get('nonce') || !searchParams.get('state') || searchParams.get('code_challenge_method') !== 'S256'
          || !searchParams.get('code_challenge')) return json(response, 400, { error: 'invalid_request' })
      const id = randomUUID()
      pending.set(id, { params: searchParams, expires: Date.now() + 120000 })
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
      return response.end(`<!doctype html><title>Provedor OIDC de teste</title>
        <form method="post" action="/authorize"><input type="hidden" name="id" value="${id}">
        ${Object.keys(accounts).map(account => `<button name="account" value="${account}">${account}</button>`).join('')}
        <button name="account" value="cancel">cancelar</button></form>`)
    }
    if (request.method === 'POST' && pathname === '/authorize') {
      const fields = await form(request)
      const entry = take(pending, fields.get('id'))
      const selection = fields.get('account')
      if (!entry || (selection !== 'cancel' && !Object.hasOwn(accounts, selection))) {
        return json(response, 400, { error: 'invalid_request' })
      }
      const callback = new URL(redirect)
      callback.searchParams.set('state', entry.params.get('state'))
      if (selection === 'cancel') callback.searchParams.set('error', 'access_denied')
      else {
        const code = randomUUID()
        grants.set(code, { ...entry, account: accounts[selection] })
        callback.searchParams.set('code', code)
      }
      return response.writeHead(303, { Location: callback.href, 'Cache-Control': 'no-store' }).end()
    }
    if (request.method === 'POST' && pathname === '/token') {
      const fields = await form(request)
      const basic = 'Basic ' + Buffer.from(`${client}:${secret}`).toString('base64')
      if (request.headers.authorization !== basic
          && (fields.get('client_id') !== client || fields.get('client_secret') !== secret)) {
        return json(response, 401, { error: 'invalid_client' })
      }
      const grant = take(grants, fields.get('code'))
      const verifier = fields.get('code_verifier')
      if (!grant || fields.get('grant_type') !== 'authorization_code' || fields.get('redirect_uri') !== redirect
          || !verifier || createHash('sha256').update(verifier).digest('base64url') !== grant.params.get('code_challenge')) {
        return json(response, 400, { error: 'invalid_grant' })
      }
      const [email, name, sub] = grant.account
      const iat = Math.floor(Date.now() / 1000)
      const token = `${encode({ alg: 'RS256', typ: 'JWT', kid })}.${encode({
        iss: issuer, aud: client, sub, email, name, email_verified: true, iat, exp: iat + 120,
        nonce: grant.params.get('nonce'),
      })}`
      return json(response, 200, {
        access_token: randomUUID(), token_type: 'Bearer', expires_in: 120, scope: 'openid email profile',
        id_token: `${token}.${sign('RSA-SHA256', Buffer.from(token), privateKey).toString('base64url')}`,
      })
    }
    return json(response, 404, { error: 'not_found' })
  } catch {
    return json(response, 400, { error: 'invalid_request' })
  }
})

server.listen(8090, '0.0.0.0')
