import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, expect } from '@playwright/test'
import { build, createServer, preview } from 'vite'
import { checkOnboarding } from '../../features/onboarding/onboarding.browser.mjs'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const buildDir = await mkdtemp(join(tmpdir(), 'easypet-s01-'))
const host = '127.0.0.1'
const devPort = 19141
const previewPort = 19142
const previewUrl = `http://${host}:${previewPort}`
const screenshots = process.env.EASYPET_S01_SCREENSHOTS
const appErrors = []
let devServer
let previewServer
let browser

process.env.VITE_API_URL = '/api/v1'
process.env.VITE_INTERNAL_PILOT = 'true'
process.env.VITE_WAVE_B_ENABLED = 'true'
process.env.VITE_AUTH_RECOVERY_ENABLED = 'true'

const userId = '43bf8767-c38a-4ca8-a09a-bb680a2897be'
const token = 'local-design-system-test'
const partnerId = '4b3cf7e7-3bb7-4e49-9c78-fd99a6d808be'
const receptionPermissions = ['BOOKINGS_READ', 'BOOKINGS_WRITE', 'DESK_CUSTOMERS_MANAGE', 'CASH_RECEIVE']

async function newPage(viewport, role, { storedRole = role, team, sessionStatus = 200 } = {}) {
  const page = await browser.newPage({ viewport, colorScheme: 'light' })
  page.on('pageerror', error => appErrors.push(error.message))
  await page.route('**/api/**', route => route.fulfill({ status: 503 }))

  if (role) {
    const user = { token, id: userId, role: storedRole, name: 'Sessão de teste', email: 'local@example.test' }
    await page.addInitScript(user => {
      if (sessionStorage.getItem('design-system-session-seeded')) return
      sessionStorage.setItem('design-system-session-seeded', 'true')
      localStorage.setItem('token', user.token)
      localStorage.setItem('user', JSON.stringify(user))
    }, user)
    await page.route('**/api/v1/auth/session', route => {
      assert.equal(route.request().headers().authorization, `Bearer ${token}`)
      return route.fulfill({ status: sessionStatus, json: {
        userId, role, partnerId: team ? partnerId : null, accessRole: team?.role ?? null,
        permissions: team?.permissions ?? [], teamAccessId: team ? userId : null,
      } })
    })
  }

  return page
}

async function checkLayout(page) {
  const fits = await page.locator('main').evaluate(main => main.scrollWidth <= main.clientWidth)
  assert.ok(fits, 'A galeria deve caber na área de conteúdo')
  await expect(page.locator('#cores [title="--color-primary-50"]').locator('..').locator('div')).toHaveCSS('background-color', 'rgb(232, 240, 247)')
}

async function saveScreenshot(page, filename) {
  if (screenshots) await page.screenshot({ path: join(screenshots, filename) })
}

async function checkCustomerList(page, apiPath) {
  await page.route(`**/api/v1/${apiPath}?*`, route => route.fulfill({
    json: { content: [], number: 0, size: 10, totalElements: 0, totalPages: 0 },
  }))

  await page.getByRole('link', { name: apiPath.startsWith('admin/') ? 'Tutores' : 'Clientes', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Clientes', exact: true })).toBeVisible()
  await expect(page.getByRole('searchbox', { name: 'Buscar clientes' })).toBeVisible()
  await expect(page.getByText('Nenhum cliente cadastrado.')).toBeVisible()
}

try {
  process.env.NODE_ENV = 'production'
  await build({ root, build: { outDir: buildDir, emptyOutDir: true }, logLevel: 'warn' })
  previewServer = await preview({ root, build: { outDir: buildDir }, preview: { host, port: previewPort, strictPort: true } })

  process.env.NODE_ENV = 'development'
  devServer = await createServer({ root, cacheDir: join(buildDir, '.vite'), server: { host, port: devPort, strictPort: true } })
  await devServer.listen()
  browser = await chromium.launch({ channel: process.env.EASYPET_S01_BROWSER_CHANNEL || undefined })

  const desktop = { width: 1440, height: 960 }
  const page = await newPage(desktop)
  await page.goto(`http://${host}:${devPort}/design-system`)
  await expect(page.getByRole('heading', { name: 'Design system', exact: true })).toBeVisible()
  await checkLayout(page)
  await saveScreenshot(page, 'desktop-claro.png')

  const fieldsLink = page.getByRole('link', { name: 'Campos e selects' })
  await fieldsLink.click()
  await expect(page).toHaveURL(/#campos$/)
  const name = page.getByRole('textbox', { name: 'Nome do pet' })
  await page.getByRole('button', { name: 'Salvar exemplo' }).click()
  await expect(name).toBeFocused()
  await expect(name).toHaveAttribute('aria-invalid', 'true')
  await expect(name).toHaveAccessibleDescription('Digite pelo menos dois caracteres. Informe pelo menos dois caracteres.')
  await name.fill('Luna')
  await expect(name).not.toHaveAttribute('aria-invalid', 'true')
  const species = page.getByRole('combobox', { name: 'Espécie' })
  await name.press('Tab')
  await expect(species).toBeFocused()
  await species.selectOption('CAT')
  await expect(species).toHaveValue('CAT')
  await page.getByRole('button', { name: 'Salvar exemplo' }).click()
  await expect(page.getByText('Exemplo salvo para Luna.')).toBeVisible()

  const trigger = page.getByRole('button', { name: 'Abrir diálogo' })
  const modal = page.getByRole('dialog', { name: 'Confirmar exemplo' })
  await trigger.press('Enter')
  await expect(modal).toBeVisible()
  await expect(modal.getByRole('button', { name: 'Fechar' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(modal.getByRole('button', { name: 'Cancelar' })).toBeFocused()
  await page.keyboard.press('Tab')
  const confirm = modal.getByRole('button', { name: 'Confirmar', exact: true })
  await expect(confirm).toBeFocused()
  await name.evaluate(input => input.focus())
  await expect(confirm).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
  await expect(trigger).toBeFocused()
  await trigger.press('Enter')
  await confirm.click()
  await expect(page.getByText('Exemplo confirmado.')).toBeVisible()
  await expect(trigger).toBeFocused()

  const pagination = page.getByRole('navigation', { name: 'Paginação' })
  const previous = pagination.getByRole('button', { name: 'Página anterior' })
  const next = pagination.getByRole('button', { name: 'Próxima página' })
  await expect(previous).toBeDisabled()
  await next.click()
  await expect(pagination.getByRole('status')).toHaveText('Página 2 de 2')
  await expect(next).toBeDisabled()
  await expect(page.getByRole('cell', { name: 'Amora' })).toBeVisible()
  await previous.click()
  await expect(page.getByRole('cell', { name: 'Luna' })).toBeVisible()
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByText('Consulta concluída')).toBeVisible()
  const fieldSnippet = page.locator('#campos details')
  await fieldSnippet.locator('summary').click()
  await expect(fieldSnippet.locator('code')).toContainText('SelectField')
  await page.getByRole('button', { name: 'Modo escuro' }).click()
  await expect(page.locator('html')).toHaveClass('dark')
  await checkLayout(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await saveScreenshot(page, 'desktop-escuro.png')

  const visitor = await newPage(desktop)
  let recoveryRequests = 0
  await visitor.route('**/api/v1/auth/forgot-password', route => {
    assert.deepEqual(route.request().postDataJSON(), { email: 'tutor@example.test' })
    recoveryRequests += 1
    if (recoveryRequests === 1) return route.fulfill({ status: 429, headers: { 'Retry-After': '1' } })
    return route.fulfill({ status: 200, body: '' })
  })
  await visitor.goto(`${previewUrl}/forgot-password`)
  await expect(visitor.getByRole('heading', { name: 'Recuperar senha' })).toBeVisible()
  await visitor.getByRole('textbox', { name: 'E-mail' }).fill('tutor@example.test')
  await visitor.getByRole('button', { name: 'Enviar link de recuperação' }).click()
  await expect(visitor.getByRole('alert')).toContainText('Muitas solicitações')
  await expect(visitor.getByRole('textbox', { name: 'E-mail' })).toHaveValue('tutor@example.test')
  assert.equal(recoveryRequests, 1)
  await visitor.getByRole('button', { name: 'Enviar link de recuperação' }).click()
  await expect(visitor.getByRole('status')).toContainText('Se houver uma conta ativa')
  await visitor.route('**/api/v1/auth/reset-password/validate', route => {
    assert.deepEqual(route.request().postDataJSON(), { token: 'reset-ficticio' })
    return route.fulfill({ status: 400, json: { code: 'RESET_TOKEN_EXPIRED' } })
  })
  await visitor.goto(`${previewUrl}/reset-password?token=reset-ficticio`)
  await expect(visitor.getByRole('heading', { name: 'Redefinir senha' })).toBeVisible()
  await expect(visitor.getByRole('alert')).toHaveText('Este link de recuperação expirou.')
  await visitor.route('**/api/v1/auth/team/invitations/accept', route => {
    assert.deepEqual(route.request().postDataJSON(), { token: 'convite-ficticio', name: 'Recepção', password: 'senha-ficticia' })
    return route.fulfill({ json: { status: 'ACTIVE' } })
  })
  await visitor.goto(`${previewUrl}/team/invitation?token=convite-ficticio`)
  await expect(visitor.getByRole('heading', { name: 'Convite para equipe' })).toBeVisible()
  await visitor.getByRole('textbox', { name: 'Nome completo' }).fill('Recepção')
  await visitor.getByLabel(/^Senha/).fill('senha-ficticia')
  await visitor.getByRole('button', { name: 'Aceitar convite' }).click()
  await expect(visitor.getByRole('status')).toHaveText('Sua conta de equipe foi ativada.')
  await visitor.goto(`${previewUrl}/design-system`)
  await expect(visitor).toHaveURL(`${previewUrl}/login`)
  await expect(visitor.getByRole('heading', { name: 'Design system' })).toHaveCount(0)
  await visitor.route('**/api/v1/auth/login', route => {
    assert.equal(route.request().headers().authorization, undefined)
    return route.fulfill({ json: { id: userId, token, name: 'Recepção', email: 'recepcao@example.test', role: 'TEAM_MEMBER' } })
  })
  await visitor.route('**/api/v1/auth/session', route => route.fulfill({ json: {
    userId, role: 'TEAM_MEMBER', partnerId, accessRole: 'RECEPTION',
    permissions: receptionPermissions, teamAccessId: userId,
  } }))
  await visitor.getByRole('textbox', { name: 'Email', exact: true }).fill('recepcao@example.test')
  await visitor.getByLabel('Senha', { exact: true }).fill('senha-ficticia')
  await visitor.getByRole('button', { name: 'Entrar no Easypet' }).click()
  await expect(visitor).toHaveURL(`${previewUrl}/partner/agendamentos`)
  await expect(visitor.getByRole('link', { name: 'Caixa' })).toBeVisible()

  const customer = await newPage(desktop, 'CUSTOMER', { storedRole: 'ADMIN' })
  await customer.goto(`${previewUrl}/design-system`)
  await expect(customer).toHaveURL(`${previewUrl}/app/home`)
  await expect(customer.getByRole('link', { name: 'Design system' })).toHaveCount(0)
  await customer.route('**/api/v1/partners/customer-claims/redeem', route => {
    assert.deepEqual(route.request().postDataJSON(), { token: 'prova-local' })
    return route.fulfill({ json: { customerId: userId, partnerId, claimedAt: '2026-11-13T15:00:00Z' } })
  })
  await customer.getByRole('link', { name: 'Vincular cadastro' }).click()
  await expect(customer).toHaveURL(`${previewUrl}/app/reivindicar-cadastro`)
  await customer.getByRole('textbox', { name: 'Código de vinculação' }).fill('prova-local')
  await customer.getByRole('button', { name: 'Vincular cadastro', exact: true }).click()
  await expect(customer.getByRole('status')).toHaveText('Cadastro vinculado com sucesso.')

  const partner = await newPage(desktop, 'PARTNER')
  await partner.goto(`${previewUrl}/design-system`)
  await expect(partner).toHaveURL(`${previewUrl}/partner/dashboard`)
  await expect(partner.getByRole('link', { name: 'Design system' })).toHaveCount(0)
  await checkCustomerList(partner, 'partners/me/customers')
  await expect(partner).toHaveURL(`${previewUrl}/partner/clientes`)
  await partner.getByRole('button', { name: 'Novo cliente' }).click()
  const customerDialog = partner.getByRole('dialog', { name: 'Novo cliente' })
  await expect(customerDialog.getByRole('textbox', { name: 'Nome do tutor' })).toBeVisible()
  await partner.keyboard.press('Escape')
  await expect(partner.getByRole('button', { name: 'Novo cliente' })).toBeFocused()
  await partner.route('**/api/v1/partners/me', route => route.fulfill({ json: { id: partnerId } }))
  await partner.route('**/api/v1/auth/team/accesses', route => route.fulfill({ json: [] }))
  await partner.getByRole('link', { name: 'Equipe', exact: true }).click()
  await expect(partner).toHaveURL(`${previewUrl}/partner/equipe`)
  await expect(partner.getByRole('heading', { name: 'Equipe', exact: true })).toBeVisible()

  const reception = await newPage(desktop, 'TEAM_MEMBER', {
    storedRole: 'PARTNER',
    team: { role: 'RECEPTION', permissions: receptionPermissions },
  })
  await reception.goto(`${previewUrl}/partner/equipe`)
  await expect(reception).toHaveURL(`${previewUrl}/partner/agendamentos`)
  await expect(reception.getByRole('link', { name: 'Cadastro', exact: true })).toHaveCount(0)
  await expect(reception.getByRole('link', { name: 'Equipe', exact: true })).toHaveCount(0)
  await expect(reception.getByRole('link', { name: 'Caixa' })).toBeVisible()
  await checkCustomerList(reception, 'partners/me/customers')
  let forbiddenLedgerRequests = 0
  await reception.route('**/api/v1/payments/cashier/days?*', route => {
    forbiddenLedgerRequests += 1
    return route.fulfill({ status: 403 })
  })
  await reception.route('**/api/v1/payments/cashier/context', route => route.fulfill({ json: {
    actorId: userId, partnerId, businessDate: '2026-11-13', closedToday: false, canReceive: true, canClose: false,
  } }))
  await reception.route('**/api/v1/payments/cashier/charges?*', route => route.fulfill({ json: {
    content: [], number: 0, size: 10, totalElements: 0, totalPages: 0,
  } }))
  await reception.getByRole('link', { name: 'Caixa', exact: true }).click()
  await expect(reception.getByRole('heading', { name: 'Caixa', exact: true })).toBeVisible()
  await expect(reception.getByRole('button', { name: 'Nova cobrança' })).toBeEnabled()
  await expect(reception.getByLabel('Data do extrato')).toHaveCount(0)
  assert.equal(forbiddenLedgerRequests, 0)

  const manager = await newPage(desktop, 'TEAM_MEMBER', {
    team: { role: 'MANAGER', permissions: [...receptionPermissions, 'CASH_CLOSE'] },
  })
  await manager.route('**/api/v1/payments/cashier/context', route => route.fulfill({ json: {
    actorId: userId, partnerId, businessDate: '2026-11-13', closedToday: false, canReceive: true, canClose: true,
  } }))
  await manager.goto(`${previewUrl}/partner/caixa`)
  await expect(manager.getByLabel('Data do extrato')).toBeVisible()
  await expect(manager.getByRole('link', { name: 'Equipe', exact: true })).toHaveCount(0)

  const professional = await newPage(desktop, 'TEAM_MEMBER', {
    team: { role: 'PROFESSIONAL', permissions: ['BOOKINGS_ASSIGNED_READ', 'BOOKINGS_ASSIGNED_ATTEND'] },
  })
  await professional.goto(`${previewUrl}/partner/caixa`)
  await expect(professional).toHaveURL(`${previewUrl}/partner/atendimento`)
  await expect(professional.getByRole('link', { name: 'Agendamentos' })).toBeVisible()
  await expect(professional.getByRole('link', { name: 'Caixa' })).toHaveCount(0)
  await expect(professional.getByRole('link', { name: 'Clientes' })).toHaveCount(0)
  await professional.goto(`${previewUrl}/app/reivindicar-cadastro`)
  await expect(professional).toHaveURL(`${previewUrl}/partner/atendimento`)

  const incomplete = await newPage(desktop, 'TEAM_MEMBER', {
    team: { role: 'PROFESSIONAL', permissions: ['BOOKINGS_ASSIGNED_ATTEND'] },
  })
  await incomplete.goto(`${previewUrl}/partner/atendimento`)
  await expect(incomplete).toHaveURL(`${previewUrl}/painel`)
  await expect(incomplete.getByRole('alert')).toHaveText('Seu acesso não tem um painel disponível.')

  const unavailable = await newPage(desktop, 'ADMIN', { sessionStatus: 503 })
  await unavailable.goto(`${previewUrl}/design-system`)
  await expect(unavailable.getByRole('alert')).toHaveText('Não foi possível verificar sua sessão.')
  await expect(unavailable.getByRole('heading', { name: 'Design system' })).toHaveCount(0)
  assert.equal(await unavailable.evaluate(() => localStorage.getItem('token')), token)
  await unavailable.route('**/api/v1/auth/session', route => route.fulfill({ json: {
    userId, role: 'ADMIN', partnerId: null, accessRole: null, permissions: [], teamAccessId: null,
  } }))
  await unavailable.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(unavailable.getByRole('heading', { name: 'Design system' })).toBeVisible()

  const forbidden = await newPage(desktop, 'PARTNER')
  await forbidden.route('**/api/v1/partners/me/customers?*', route => route.fulfill({ status: 403 }))
  await forbidden.goto(`${previewUrl}/partner/clientes`)
  await expect(forbidden.getByRole('alert')).toContainText('Não foi possível carregar os clientes.')
  await expect(forbidden).toHaveURL(`${previewUrl}/partner/clientes`)
  assert.equal(await forbidden.evaluate(() => localStorage.getItem('token')), token)
  let limitedRequests = 0
  await forbidden.route('**/api/v1/partners/me/customers?*', route => {
    limitedRequests += 1
    return route.fulfill({ status: 429, headers: { 'Retry-After': '1' } })
  })
  await forbidden.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(forbidden.getByRole('alert')).toContainText('Não foi possível carregar os clientes.')
  await expect(forbidden).toHaveURL(`${previewUrl}/partner/clientes`)
  assert.equal(limitedRequests, 1)
  assert.equal(await forbidden.evaluate(() => localStorage.getItem('token')), token)
  await forbidden.route('**/api/v1/partners/me/customers?*', route => route.fulfill({ status: 401 }))
  await forbidden.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(forbidden).toHaveURL(`${previewUrl}/login`)
  assert.equal(await forbidden.evaluate(() => localStorage.getItem('token')), null)

  const revoked = await newPage(desktop, 'ADMIN', { sessionStatus: 401 })
  await revoked.goto(`${previewUrl}/design-system`)
  await expect(revoked).toHaveURL(`${previewUrl}/login`)
  assert.equal(await revoked.evaluate(() => localStorage.getItem('user')), null)

  const admin = await newPage({ width: 360, height: 800 }, 'ADMIN')
  await admin.goto(`${previewUrl}/design-system`)
  await expect(admin.getByRole('heading', { name: 'Design system', exact: true })).toBeVisible()
  await checkLayout(admin)
  await saveScreenshot(admin, 'mobile-claro.png')
  await admin.getByRole('button', { name: 'Modo escuro' }).click()
  await expect(admin.locator('html')).toHaveClass('dark')
  await expect(admin.locator('#cores')).toHaveCSS('background-color', 'rgb(15, 47, 80)')
  await expect(admin.getByRole('combobox', { name: 'Espécie' })).toHaveCSS('color-scheme', 'dark')
  await checkLayout(admin)
  await saveScreenshot(admin, 'mobile-escuro.png')

  await admin.reload()
  await expect(admin.locator('html')).toHaveClass('dark')
  await expect(admin.getByRole('link', { name: 'Design system' })).toHaveCount(0)
  await admin.getByRole('button', { name: 'Abrir menu' }).click()
  const galleryLink = admin.getByRole('link', { name: 'Design system' })
  await expect(galleryLink).toHaveAttribute('aria-current', 'page')
  await galleryLink.click()
  await expect(admin.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false')
  await admin.getByRole('button', { name: 'Notificações' }).click()
  await expect(admin.getByText('Tudo em dia por aqui!')).toBeVisible()
  await checkLayout(admin)
  await admin.getByRole('button', { name: 'Abrir menu' }).click()
  await checkCustomerList(admin, 'admin/reception-customers')
  await expect(admin).toHaveURL(`${previewUrl}/admin/clientes`)
  await expect(admin.getByRole('button', { name: 'Novo cliente' })).toHaveCount(0)
  const accountId = 'c53fc675-3236-45d9-b3f6-d3678cbecaa5'
  let accountActive = true
  const account = () => ({ id: accountId, name: 'Ana Souza', email: 'ana@example.test', active: accountActive })
  await admin.route('**/api/v1/admin/customers?*', route => route.fulfill({ json: {
    content: [account()],
    page: 0, size: 10, totalElements: 1, totalPages: 1,
  } }))
  await admin.route(`**/api/v1/admin/customers/${accountId}/active`, route => {
    assert.equal(route.request().method(), 'PATCH')
    assert.equal(route.request().headers().authorization, `Bearer ${token}`)
    assert.deepEqual(route.request().postDataJSON(), { active: !accountActive })
    accountActive = !accountActive
    return route.fulfill({ json: account() })
  })
  await admin.getByRole('button', { name: 'Contas da plataforma' }).click()
  await expect(admin.getByRole('table', { name: 'Contas de clientes da plataforma' })).toContainText('Ana Souza')
  await admin.getByRole('button', { name: 'Desativar conta de Ana Souza' }).click()
  await admin.getByRole('dialog', { name: 'Desativar conta' }).getByRole('button', { name: 'Desativar conta' }).click()
  await expect(admin.getByRole('status').filter({ hasText: 'Conta desativada.' })).toBeVisible()
  await admin.getByRole('button', { name: 'Reativar conta de Ana Souza' }).click()
  await admin.getByRole('dialog', { name: 'Reativar conta' }).getByRole('button', { name: 'Reativar conta' }).click()
  await expect(admin.getByRole('status').filter({ hasText: 'Conta reativada.' })).toBeVisible()
  await expect(admin.getByRole('button', { name: 'Desativar conta de Ana Souza' })).toBeVisible()
  await admin.getByRole('button', { name: 'Abrir menu' }).click()
  await admin.getByRole('link', { name: 'Notificações', exact: true }).click()
  await expect(admin).toHaveURL(`${previewUrl}/admin/notificacoes`)
  await expect(admin.getByRole('heading', { name: 'Notificações', exact: true })).toBeVisible()
  await admin.route('**/api/v1/admin/notifications?*', route => {
    assert.equal(new URL(route.request().url()).searchParams.get('bookingId'), partnerId)
    assert.equal(route.request().headers().authorization, `Bearer ${token}`)
    return route.fulfill({ json: { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 } })
  })
  await admin.route(`**/api/v1/bookings/${partnerId}`, route => route.fulfill({ json: { receptionCustomerId: null } }))
  await admin.getByRole('textbox', { name: 'ID da reserva' }).fill(partnerId)
  await admin.getByRole('button', { name: 'Consultar' }).click()
  await expect(admin.getByText('Nenhuma entrega para esta reserva')).toBeVisible()

  const onboarding = await newPage({ width: 360, height: 800 }, 'PARTNER')
  await checkOnboarding(onboarding, previewUrl, partnerId)

  assert.deepEqual(appErrors, [])
  console.log('Design system: interações, temas, layout e restrição por papel aprovados no Chromium.')
} finally {
  await Promise.allSettled([browser?.close(), devServer?.close(), previewServer?.close()])
  // Only remove the directory created by mkdtemp for this run.
  assert.equal(buildDir.startsWith(join(tmpdir(), 'easypet-s01-')), true)
  await rm(buildDir, { recursive: true, force: true })
}
