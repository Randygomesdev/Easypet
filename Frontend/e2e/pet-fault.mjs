import { createServer, request } from 'node:http'
import { writeFileSync } from 'node:fs'

// Only this synthetic ID stalls. All normal requests use the real Pet Service.
createServer((incoming, outgoing) => {
  if (incoming.method === 'GET' && incoming.url === '/api/v1/pets/00000000-0000-4000-8000-000000000099') {
    writeFileSync('/tmp/easypet-pet-stalled', '')
    return
  }

  const upstream = request({
    hostname: 'pet-service',
    port: 8082,
    path: incoming.url,
    method: incoming.method,
    headers: incoming.headers,
  }, response => {
    outgoing.writeHead(response.statusCode, response.headers)
    response.pipe(outgoing)
  })
  upstream.on('error', () => {
    outgoing.writeHead(502).end()
  })
  outgoing.on('close', () => upstream.destroy())
  incoming.pipe(upstream)
}).listen(8082, '0.0.0.0')
