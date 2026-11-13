import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, expect } from '@playwright/test'
import { build, preview } from 'vite'

const root = fileURLToPath(new URL('../../', import.meta.url))
const host = '127.0.0.1'
const port = 19143
const baseUrl = `http://${host}:${port}`
const authorizationPath = '/api/v1/oauth2/authorization/google'
const exchangePath = '/api/v1/auth/oauth2/exchange'
const userId = '43bf8767-c38a-4ca8-a09a-bb680a2897be'
const expiredCode = 'a'.repeat(43)
const validCode = 'b'.repeat(43)

process.env.NODE_ENV = 'production'
process.env.VITE_API_URL = '/api/v1'
process.env.VITE_INTERNAL_PILOT = 'true'
process.env.VITE_WAVE_B_ENABLED = 'true'
process.env.VITE_GOOGLE_AUTH_URL = 'https://invalido.example.test/'

const browser = await chromium.launch({ channel: process.env.EASYPET_S01_BROWSER_CHANNEL || undefined })

try {
  for (const enabled of [false, true]) {
    process.env.VITE_GOOGLE_AUTH_ENABLED = enabled ? 'true' : ''
    const outDir = await mkdtemp(join(tmpdir(), 'easypet-s01-google-'))
    let server
    const context = await browser.newContext({ viewport: { width: 360, height: 800 } })
    await context.route(url => url.origin !== baseUrl, route => route.abort())

    try {
      await build({ root, build: { outDir, emptyOutDir: true }, logLevel: 'warn' })
      server = await preview({ root, build: { outDir }, preview: { host, port, strictPort: true } })
      const page = await context.newPage()
      let exchanges = 0
      const user = { id: userId, token: 'sessao-local', role: 'CUSTOMER', name: 'Tutor de teste', email: 'tutor@example.test' }
      await page.route('**/api/**', route => route.fulfill({ status: 503 }))
      await page.route(`${baseUrl}${exchangePath}**`, route => {
        exchanges += 1
        assert.equal(route.request().method(), 'POST')
        assert.equal(new URL(route.request().url()).search, '')
        assert.equal(route.request().headers().origin, baseUrl)
        const code = route.request().postDataJSON().code
        if (code === expiredCode) return route.fulfill({ status: 401 })
        assert.equal(code, validCode)
        return route.fulfill({ json: user })
      })
      await page.route(`${baseUrl}${authorizationPath}`, route => route.fulfill({ status: 200, body: 'Início OAuth simulado' }))
      await page.route('**/api/v1/auth/session', route => route.fulfill({ json: {
        userId, role: 'CUSTOMER', partnerId: null, accessRole: null, permissions: [], teamAccessId: null,
      } }))

      await page.goto(`${baseUrl}/login`)
      await expect(page.getByRole('button', { name: 'Entrar no Easypet' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Registrar', exact: true })).toHaveCount(0)
      const googleEntry = page.getByText(/^(Continuar|Entrar) com Google$/)
      if (enabled) {
        await expect(googleEntry).toBeVisible()
        await googleEntry.click()
        await expect(page).toHaveURL(`${baseUrl}${authorizationPath}`)
      } else {
        await expect(googleEntry).toHaveCount(0)
      }

      await page.goto(`${baseUrl}/login-success#code=${expiredCode}`)
      if (enabled) await expect.poll(() => exchanges).toBe(1)
      else await expect(page).toHaveURL(`${baseUrl}/login`)
      assert.equal(exchanges, enabled ? 1 : 0)
      if (enabled) {
        await expect(page).toHaveURL(`${baseUrl}/login-success`)
        await expect(page.getByRole('alert')).toContainText('Não foi possível concluir o login com Google.')
        await page.goto(`${baseUrl}/login`)
        await page.goto(`${baseUrl}/login-success#code=${validCode}`)
        await expect(page).toHaveURL(`${baseUrl}/app/home`)
        assert.equal(exchanges, 2)
      } else {
        await page.evaluate(user => {
          localStorage.setItem('token', user.token)
          localStorage.setItem('user', JSON.stringify(user))
        }, user)
      }

      await page.goto(`${baseUrl}/seja-parceiro`)
      await expect(page).toHaveURL(`${baseUrl}/login`)
      await page.goto(`${baseUrl}/app/carrinho`)
      await expect(page).toHaveURL(`${baseUrl}/app/pets`)
      await page.goto(`${baseUrl}/app/pagamento/sucesso`)
      await expect(page).toHaveURL(`${baseUrl}/app/pets`)
      console.log(`Google ${enabled ? 'ligado' : 'desligado'}: entrada, retorno e restrições do piloto aprovados.`)
    } finally {
      await context.close()
      await server?.close()
      assert.ok(outDir.startsWith(join(tmpdir(), 'easypet-s01-google-')))
      await rm(outDir, { recursive: true, force: true })
    }
  }
} finally {
  await browser.close()
}
