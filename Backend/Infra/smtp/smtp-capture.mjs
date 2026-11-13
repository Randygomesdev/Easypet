import { createServer as httpServer } from 'node:http'
import { createServer as smtpServer } from 'node:net'

const messages = []
const rejected = new Set()
const held = new Set()
const addressPattern = /^[a-z0-9._+-]+@example\.test$/i
const maxMessageSize = 128 * 1024
const simulateFailures = process.env.SMTP_CAPTURE_TEST_FAULTS === '1'

const smtp = smtpServer(socket => {
  let buffer = ''
  let sender = ''
  let recipients = []
  let data = null
  const reply = line => socket.write(line + '\r\n')
  const reset = () => {
    sender = ''
    recipients = []
    data = null
  }
  socket.setEncoding('utf8')
  socket.setTimeout(10_000, () => socket.destroy())
  socket.on('error', () => socket.destroy())
  reply('220 smtp-capture ESMTP')
  socket.on('data', chunk => {
    buffer += chunk
    if (buffer.length > maxMessageSize) return socket.end('552 Line too long\r\n')
    let end
    while ((end = buffer.indexOf('\r\n')) >= 0) {
      const line = buffer.slice(0, end)
      buffer = buffer.slice(end + 2)
      if (data !== null) {
        if (line === '.') {
          if (messages.length >= 200) {
            reply('452 Capture capacity exceeded')
          } else {
            messages.push({ sender, recipients, raw: data, acceptedAt: new Date().toISOString() })
            if (recipients.some(address => held.has(address))) {
              socket.pause()
              return
            }
            reply('250 Captured')
          }
          reset()
        } else {
          data += (line.startsWith('..') ? line.slice(1) : line) + '\r\n'
          if (data.length > maxMessageSize) return socket.end('552 Message too large\r\n')
        }
        continue
      }

      const mail = /^MAIL FROM:<([^>]+)>/i.exec(line)
      const recipient = /^RCPT TO:<([^>]+)>/i.exec(line)
      if (/^EHLO /i.test(line)) reply('250-smtp-capture\r\n250 8BITMIME')
      else if (/^HELO /i.test(line) || line === 'NOOP') reply('250 smtp-capture')
      else if (line === 'QUIT') return socket.end('221 Closing\r\n')
      else if (line === 'RSET') { reset(); reply('250 Reset') }
      else if (mail) {
        reset()
        sender = addressPattern.test(mail[1]) ? mail[1].toLowerCase() : ''
        reply(sender ? '250 Sender accepted' : '550 Synthetic sender required')
      } else if (recipient) {
        const address = recipient[1].toLowerCase()
        if (!sender) reply('503 Sender required')
        else if (!addressPattern.test(address) || rejected.has(address)) reply('550 Recipient rejected')
        else { recipients.push(address); reply('250 Recipient accepted') }
      } else if (line === 'DATA' && recipients.length) {
        data = ''
        reply('354 End with <CRLF>.<CRLF>')
      } else reply('503 Invalid command or sequence')
    }
  })
})

const api = httpServer((request, response) => {
  const url = new URL(request.url, 'http://smtp-capture')
  const recipient = url.searchParams.get('recipient')?.toLowerCase()
  if (request.method === 'GET' && url.pathname === '/health') {
    response.writeHead(smtp.listening ? 204 : 503).end()
  } else if (request.method === 'GET' && url.pathname === '/messages' && addressPattern.test(recipient ?? '')) {
    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      .end(JSON.stringify(messages.filter(message => message.recipients.includes(recipient))))
  } else if (simulateFailures && ['/reject', '/hold'].includes(url.pathname) && addressPattern.test(recipient ?? '')) {
    const addresses = url.pathname === '/reject' ? rejected : held
    if (request.method === 'PUT') addresses.add(recipient)
    else if (request.method === 'DELETE') addresses.delete(recipient)
    else return response.writeHead(405).end()
    response.writeHead(204).end()
  } else response.writeHead(404).end()
})

const host = process.env.SMTP_CAPTURE_BIND ?? '0.0.0.0'
smtp.listen(Number(process.env.SMTP_CAPTURE_PORT ?? 1025), host, () => {
  const httpHost = simulateFailures ? host : '127.0.0.1'
  api.listen(Number(process.env.SMTP_CAPTURE_HTTP_PORT ?? 8025), httpHost, () => {
    process.send?.({ smtp: smtp.address().port, http: api.address().port })
  })
})
