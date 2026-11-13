import { expect, test } from '@playwright/test'

test('proxy identifica requisições e protege a entrada da homologação', { tag: '@api' }, async ({ request, baseURL }) => {
  if (!baseURL) throw new Error('Defina E2E_BASE_URL com a origem da stack descartável.')
  const forged = {
    'X-Request-Id': 'identificador-forjado',
    'X-User-Id': '00000000-0000-0000-0000-000000000001',
    'X-User-Role': 'ADMIN',
  }
  const health = await request.get('/healthz', { headers: forged })
  expect(health.status()).toBe(204)
  const requestId = health.headers()['x-request-id']
  expect(requestId).toMatch(/^[a-f0-9]{32}$/)

  for (const path of [
    '/api/v1/auth/register',
    '/api/v1/auth/register/partner',
    '/api/v1/auth/oauth2/exchange',
    '/api/v1/internal/booking-events',
    '/api/v1/internal/notification-recipients/00000000-0000-4000-8000-000000000099',
    '/api/v1/payments/checkout',
    '/api/v1/partners;test/catalog',
  ]) {
    const response = await request.post(path, { headers: forged })
    expect(response.status(), path).toBe(404)
  }
  for (const path of [
    '/api/v1/admin/partners',
    '/api/v1/partners/me',
    '/api/v1/partners/catalog',
    '/api/v1/payments/cashier/charges',
    '/api/v1/partners/staff/00000000-0000-0000-0000-000000000001/schedule',
  ]) {
    const response = await request.get(path, { headers: forged })
    expect(response.status(), path).toBe(401)
    expect(response.headers()['x-request-id']).toMatch(/^[a-f0-9]{32}$/)
    expect(response.headers()['x-request-id']).not.toBe(requestId)
  }

  const sameOrigin = await request.post('/api/v1/bookings', { headers: { Origin: new URL(baseURL).origin, ...forged } })
  expect(sameOrigin.status()).toBe(401)

  for (const path of ['/reset-password', '/team/invitation']) {
    const response = await request.get(path)
    expect(response.headers()['referrer-policy']).toBe('no-referrer')
    expect(response.headers()['cache-control']).toBe('no-store')
  }
})
