import { expect, test, type BrowserContext, type Page, type APIRequestContext } from '@playwright/test'
import { bearer, sql, token } from './wave-b-fixtures'

const enabled = process.env.E2E_GOOGLE_OAUTH === '1'
const start = '/api/v1/oauth2/authorization/google'
const callback = '/api/v1/login/oauth2/code/google'
const exchange = '/api/v1/auth/oauth2/exchange'
const provider = process.env.E2E_OAUTH_PROVIDER_URL
const noRedirect = { maxRedirects: 0 }
const providerButton = (page: Page) => page.getByRole('button', { name: /google/i })

// Keep OAuth redirects and cookies out of browser artifacts.
test.use({ trace: 'off', screenshot: 'off' })

test('Google desligado oculta entrada e mantém as três rotas fechadas', async ({ page, request }) => {
  test.skip(enabled, 'Requer o build com Google desabilitado.')
  await page.goto('/login')
  await expect(providerButton(page)).toHaveCount(0)
  expect((await request.get(start, noRedirect)).status()).toBe(404)
  expect((await request.get(callback, noRedirect)).status()).toBe(404)
  expect((await request.post(exchange, { data: { code: 'fixture' } })).status()).toBe(404)
  await page.goto('/login-success#code=fixture')
  await expect(page).toHaveURL(/\/login$/)
})

test.describe('Google habilitado com provedor local', () => {
  test.skip(!enabled, 'Requer o provedor descartável.')
  async function enter(context: BrowserContext, origin: string, account: string) {
    const response = await context.request.get(start, {
      ...noRedirect,
      headers: { 'X-Forwarded-Proto': 'http', 'X-Forwarded-Host': 'forged.invalid', Forwarded: 'host=forged.invalid' },
    })
    expect(response.status()).toBe(302)
    const location = new URL(response.headers().location)
    expect(location.origin).toBe(provider)
    expect(location.searchParams.get('redirect_uri')).toBe(origin + callback)
    expect(location.searchParams.get('code_challenge_method')).toBe('S256')
    expect(location.searchParams.has('state')).toBe(true)
    expect(location.searchParams.has('nonce')).toBe(true)
    expect(await context.cookies()).toContainEqual(expect.objectContaining({
      name: 'EASYPET_OAUTH', path: '/api/v1', httpOnly: true, secure: true, sameSite: 'Lax',
    }))
    const authorization = await context.request.get(location.href)
    expect(authorization.status()).toBe(200)
    const id = /name="id" value="([a-f0-9-]+)"/.exec(await authorization.text())?.[1]
    expect(Boolean(id)).toBe(true)
    const grant = await context.request.post(location.origin + '/authorize', {
      ...noRedirect, form: { id: id!, account },
    })
    expect(grant.status()).toBe(303)
    return new URL(grant.headers().location)
  }

  async function complete(context: BrowserContext, address: URL) {
    const response = await context.request.get(address.href, noRedirect)
    expect(response.status()).toBe(302)
    expect(response.headers()['cache-control']).toBe('no-store')
    expect(response.headers()['referrer-policy']).toBe('no-referrer')
    return new URL(response.headers().location)
  }

  async function exchangeCode(request: APIRequestContext, origin: string, code: string, status: number) {
    const response = await request.post(exchange, { headers: { Origin: origin }, data: { code } })
    expect(response.status()).toBe(status)
    expect(response.headers()['cache-control']).toBe('no-store')
    return status === 200 ? await response.json() : undefined
  }

  test('login no navegador conserva o papel CUSTOMER e as negativas do piloto', async ({ page, request }) => {
    await page.goto('/login')
    await providerButton(page).click()
    await page.getByRole('button', { name: 'tutor', exact: true }).click()
    await expect(page).toHaveURL(/\/app\/home$/)
    const credential = await page.evaluate(() => localStorage.getItem('token'))
    expect(Boolean(credential)).toBe(true)
    const headers = bearer(credential!)
    const session = await request.get('/api/v1/auth/session', { headers })
    expect(session.status()).toBe(200)
    expect((await session.json()).role).toBe('CUSTOMER')
    expect((await request.get('/api/v1/admin/partners', { headers })).status()).toBe(403)
    expect((await request.get('/api/v1/admin/partners')).status()).toBe(401)
    for (const path of ['/api/v1/oauth2/authorization/other', '/api/v1/login/oauth2/code/other', exchange]) {
      expect((await request.get(path, noRedirect)).status(), path).toBe(404)
    }
    expect((await request.post(callback)).status()).toBe(404)
  })

  test('cancelamento no navegador informa o motivo e oferece nova entrada', async ({ page }) => {
    await page.goto('/login')
    await providerButton(page).click()
    await page.getByRole('button', { name: 'cancelar', exact: true }).click()
    await expect(page).toHaveURL(/\/login\?error=google_cancelled$/)
    await expect(page.getByText(/login com Google cancelado/i)).toBeVisible()
    await expect(providerButton(page)).toBeEnabled()
  })

  test('código de troca pertence ao navegador e é consumido uma vez', async ({ context, browser, baseURL }) => {
    const origin = baseURL!
    const target = await complete(context, await enter(context, origin, 'admin'))
    expect(target.origin).toBe(origin)
    expect(target.pathname).toBe('/login-success')
    expect(target.search).toBe('')
    const code = new URLSearchParams(target.hash.slice(1)).get('code')!
    expect(Boolean(code)).toBe(true)
    const foreign = await browser.newContext({ baseURL: origin, ignoreHTTPSErrors: true })
    try {
      await exchangeCode(foreign.request, origin, code, 401)
    } finally { await foreign.close() }
    await exchangeCode(context.request, 'https://forged.invalid', code, 403)
    const session = await exchangeCode(context.request, origin, code, 200)
    expect(session.role).toBe('ADMIN')
    expect((await context.request.get('/api/v1/admin/partners', { headers: bearer(session.token) })).status()).toBe(200)
    await exchangeCode(context.request, origin, code, 401)
  })

  test('revogação entre callback e troca recusa o login', async ({ context, baseURL, request }) => {
    const origin = baseURL!
    const target = await complete(context, await enter(context, origin, 'tutor'))
    const code = new URLSearchParams(target.hash.slice(1)).get('code')!
    expect(Boolean(code)).toBe(true)
    const admin = bearer(await token(request, 'admin@example.test'))
    const tutorId = sql('auth', "SELECT id FROM users WHERE email = 'tutor@gmail.com';")
    expect(tutorId).toMatch(/^[a-f0-9-]{36}$/)
    const operation = '/api/v1/admin/customers/' + tutorId + '/active'
    const disabled = await request.patch(operation, { headers: admin, data: { active: false } })
    expect(disabled.status()).toBe(200)
    try {
      await exchangeCode(context.request, origin, code, 401)
    } finally {
      const restored = await request.patch(operation, { headers: admin, data: { active: true } })
      expect(restored.status()).toBe(200)
    }
  })

  test('código de troca vencido é recusado pelo Auth', async ({ context, baseURL }) => {
    test.setTimeout(155_000)
    const origin = baseURL!
    const target = await complete(context, await enter(context, origin, 'tutor'))
    expect(target.pathname).toBe('/login-success')
    const code = new URLSearchParams(target.hash.slice(1)).get('code')!
    expect(Boolean(code)).toBe(true)
    const expiration = Date.now() + 122_000
    while (Date.now() < expiration) {
      await new Promise(resolve => setTimeout(resolve, Math.min(expiration - Date.now(), 25_000)))
    }
    await exchangeCode(context.request, origin, code, 401)
  })

  test('cancelamento, state adulterado, callback em outro navegador e contas recusadas', async ({ browser, baseURL }) => {
    const origin = baseURL!
    for (const [account, error] of [
      ['cancel', 'google_cancelled'], ['inactive', 'google_failed'], ['team', 'google_failed'], ['unknown', 'google_failed'],
    ]) {
      const context = await browser.newContext({ baseURL: origin, ignoreHTTPSErrors: true })
      try {
        const target = await complete(context, await enter(context, origin, account))
        expect(target.pathname).toBe('/login')
        expect(target.searchParams.get('error')).toBe(error)
      } finally { await context.close() }
    }
    const context = await browser.newContext({ baseURL: origin, ignoreHTTPSErrors: true })
    const foreign = await browser.newContext({ baseURL: origin, ignoreHTTPSErrors: true })
    try {
      const address = await enter(context, origin, 'tutor')
      expect((await complete(foreign, address)).searchParams.get('error')).toBe('google_failed')
      address.searchParams.set('state', 'invalid')
      expect((await complete(context, address)).searchParams.get('error')).toBe('google_failed')
    } finally {
      await context.close()
      await foreign.close()
    }
  })
})
