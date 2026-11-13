import { expect, test } from '@playwright/test'

test.skip(process.env.E2E_H1 !== '1', 'Requer o aceite H1 descartável.')

test('ingresso conserva 429 com IP forjado e recupera após recarga do limitador', async ({ request, baseURL }) => {
  expect(new URL(baseURL!).hostname).toBe('127.0.0.1')
  const path = '/api/v1/auth/forgot-password'
  const total = 24
  const concurrency = 8
  const statuses: number[] = []
  const start = performance.now()
  for (let offset = 0; offset < total; offset += concurrency) {
    await Promise.all(Array.from({ length: concurrency }, async (_, index) => {
      const ip = `192.0.2.${offset + index + 1}`
      const response = await request.post(path, {
        data: {}, timeout: 5000,
        headers: {
          'X-Forwarded-For': ip, Forwarded: `for=${ip}`,
          'X-Easypet-Edge-IP': ip, 'X-Easypet-Client-IP': ip, 'X-Easypet-Ingress-Token': 'forjado',
        },
      })
      statuses.push(response.status())
      await response.dispose()
    }))
  }
  expect(statuses).toContain(400)
  expect(statuses).toContain(429)
  expect(statuses.every(status => status === 400 || status === 429)).toBe(true)
  console.log(`Smoke local: ${total} pedidos, concorrência ${concurrency}, ${Math.round(performance.now() - start)} ms, ${statuses.filter(status => status === 429).length} respostas 429.`)
  await expect.poll(async () => (await request.post(path, { data: {}, timeout: 5000 })).status(),
    { timeout: 5000, intervals: [1200] }).toBe(400)
})
