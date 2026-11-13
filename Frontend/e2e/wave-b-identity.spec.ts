import { expect, test } from '@playwright/test'
import { bearer, capturedLink, directStatus, docker, json, openAuthPage, signIn, smtpUrl, sql, submitAuthForm, token } from './wave-b-fixtures'

test.skip(!smtpUrl, 'Requer o ambiente descartável da onda B.')

test('recuperação SMTP de uso único invalida o JWT antigo no Gateway e no Booking direto', async ({ page, request, baseURL }) => {
  const email = 'recuperacao@example.test'
  const old = bearer(await token(request, email))
  const invalid = await json(request, 'POST', '/auth/reset-password/validate', 400, undefined, { token: 'invalido' })
  expect(invalid).toMatchObject({ code: 'RESET_TOKEN_INVALID' })
  await json(request, 'POST', '/auth/forgot-password', 200, undefined, { email })
  const origin = new URL(baseURL!).origin
  const expired = await capturedLink(email, origin, '/reset-password')
  expect(sql('auth', `UPDATE password_reset_tokens SET expiry_date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo') - interval '1 minute'
    WHERE user_id = (SELECT id FROM users WHERE email = 'recuperacao@example.test') AND used_at IS NULL
    RETURNING id;`)).toMatch(/^[a-f\d-]{36}$/i)
  const expiredCheck = await json(request, 'POST', '/auth/reset-password/validate', 400, undefined, {
    token: expired.searchParams.get('token'),
  })
  expect(expiredCheck).toMatchObject({ code: 'RESET_TOKEN_EXPIRED' })
  await page.goto('/forgot-password')
  await page.getByLabel('E-mail').fill(email)
  const sent = await submitAuthForm(page, '/auth/forgot-password', page.getByRole('button', { name: 'Enviar link de recuperação' }))
  expect(sent.status()).toBe(200)
  await expect(page.getByRole('status')).toContainText('Se houver uma conta ativa')

  const link = await capturedLink(email, origin, '/reset-password', expired.href)
  await openAuthPage(page, link.href, 'POST', '/auth/reset-password/validate')
  const newPassword = 'nova-senha-e2e-2026'
  await page.getByLabel(/^Nova senha/).fill(newPassword)
  await page.getByLabel('Confirme a nova senha').fill(newPassword)
  const reset = await submitAuthForm(page, '/auth/reset-password', page.getByRole('button', { name: 'Salvar nova senha' }))
  expect(reset.status()).toBe(200)
  const reused = await json(request, 'POST', '/auth/reset-password', 400, undefined, {
    token: link.searchParams.get('token'), newPassword,
  })
  expect(reused).toMatchObject({ code: 'RESET_TOKEN_USED' })
  expect((await request.get('/api/v1/bookings/my-bookings', { headers: old })).status()).toBe(401)
  expect(directStatus('http://booking-service:8084/api/v1/bookings/my-bookings', old.Authorization)).toBe(401)
  await signIn(page, email, newPassword)
  await expect(page).toHaveURL(/\/app\/home$/)
})

test('inativação revoga o tutor no Gateway e nos serviços diretos', async ({ request }) => {
  const admin = bearer(await token(request, 'admin@example.test'))
  const headers = bearer(await token(request, 'inativacao@example.test'))
  const session = await request.get('/api/v1/auth/session', { headers })
  expect(session.status()).toBe(200)
  const { userId } = await session.json()
  const status = await request.patch(`/api/v1/admin/customers/${userId}/active`, { headers: admin, data: { active: false } })
  expect(status.status()).toBe(200)
  for (const [service, path] of [
    ['pet-service:8082', '/pets'],
    ['booking-service:8084', '/bookings/my-bookings'],
    ['partner-service:8083', '/partners/catalog'],
    ['payment-service:8085', '/payments/cashier/charges'],
  ]) {
    const api = '/api/v1' + path
    expect((await request.get(api, { headers })).status(), path).toBe(401)
    expect(directStatus(`http://${service}${api}`, headers.Authorization), service).toBe(401)
  }
})

test('Auth indisponível fecha o acesso no Gateway e nos serviços diretos', async ({ request }) => {
  const headers = bearer(await token(request, 'tutor@example.test'))
  docker(['pause', '{project}-auth-service-1'])
  try {
    expect((await request.get('/api/v1/bookings/my-bookings', { headers, timeout: 9000 })).status()).toBe(503)
    for (const [service, path] of [
      ['pet-service:8082', '/pets'],
      ['booking-service:8084', '/bookings/my-bookings'],
      ['partner-service:8083', '/partners/catalog'],
      ['payment-service:8085', '/payments/cashier/charges'],
    ]) {
      expect.soft(directStatus(`http://${service}/api/v1${path}`, headers.Authorization), service).toBe(503)
    }
  } finally {
    docker(['unpause', '{project}-auth-service-1'])
  }
})
