import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { authenticate as authenticateFixture } from './authenticate'

const adminEmail = 'admin@example.test'
const partnerEmail = 'parceiro-a@example.test'
const tutorEmail = 'tutor@example.test'
const fixtureEmail = 'parceiro-admin-fixture@example.test'
const fixture = {
  name: 'Clínica Cadastro Administrativo E2E',
  legalName: 'Razão Social Privada E2E',
  cnpj: '11111111000103',
  stateRegistration: '990001001',
  municipalRegistration: '990001002',
  email: 'fiscal-admin-fixture@example.test',
  contactPhone: '48912340987',
  city: 'Florianópolis',
  state: 'SC',
  latitude: -27.5,
  longitude: -48.5,
}
const adminPath = '/api/v1/admin/partners'
const catalogPath = '/api/v1/partners/catalog'

type Credentials = { id: string; token: string; role: string }

function password() {
  if (!process.env.E2E_TEST_PASSWORD) throw new Error('Execute npm run test:e2e para provisionar as contas.')
  return process.env.E2E_TEST_PASSWORD
}

async function authenticate(request: APIRequestContext, email: string, role: string): Promise<Credentials> {
  const credentials = await authenticateFixture(request, email, password())
  expect(credentials.role).toBe(role)
  return credentials
}

function authorization({ token }: Credentials) {
  return { Authorization: `Bearer ${token}` }
}

async function login(page: Page, email: string, landing: RegExp) {
  await page.goto('/login')
  await page.getByPlaceholder('seu@email.com').fill(email)
  await page.locator('input[type=password]').fill(password())
  await page.getByRole('button', { name: 'Entrar no Easypet' }).click()
  await expect(page).toHaveURL(landing)
}

function expectNoPrivateData(text: string) {
  for (const value of [
    fixture.legalName, fixture.cnpj, fixture.stateRegistration, fixture.municipalRegistration,
    fixture.email, fixture.contactPhone,
  ]) {
    expect(text).not.toContain(value)
  }
}

function expectCatalogFields(entry: object) {
  expect(entry).toMatchObject({ id: fixtureId, name: fixture.name })
  for (const field of ['legalName', 'cnpj', 'stateRegistration', 'municipalRegistration', 'email', 'contactPhone']) {
    expect(entry).not.toHaveProperty(field)
  }
}

let fixtureId: string

test.beforeAll(async ({ request }) => {
  const headers = authorization(await authenticate(request, fixtureEmail, 'PARTNER'))
  const current = await request.get('/api/v1/partners/me', { headers })
  if (current.ok()) {
    const currentPartner = await current.json()
    expect(currentPartner).toMatchObject(fixture)
    fixtureId = currentPartner.id
    return
  }

  expect(current.status()).toBe(404)
  const created = await request.post('/api/v1/partners', { headers, data: fixture })
  expect(created.status()).toBe(201)
  fixtureId = (await created.json()).id
})

test('somente ADMIN lista, busca e abre o cadastro completo de parceiros', async ({ page, request }) => {
  const admin = await authenticate(request, adminEmail, 'ADMIN')
  const headers = authorization(admin)
  const list = await request.get(adminPath, { headers, params: { name: fixture.name, page: 0, size: 1 } })
  expect(list.status()).toBe(200)
  expect(await list.json()).toMatchObject({
    number: 0,
    size: 1,
    content: [expect.objectContaining({ ...fixture, id: fixtureId })],
  })
  const detail = await request.get(`${adminPath}/${fixtureId}`, { headers })
  expect(detail.status()).toBe(200)
  expect(await detail.json()).toMatchObject({ ...fixture, id: fixtureId })

  const initialList = page.waitForResponse(response =>
    new URL(response.url()).pathname === adminPath && response.request().method() === 'GET',
  )
  await login(page, adminEmail, /\/admin\/visao-geral$/)
  expect((await initialList).status()).toBe(200)
  await page.goto('/admin/parceiros')
  await expect(page.getByRole('heading', { name: 'Parceiros', exact: true })).toBeVisible()
  const filteredList = page.waitForResponse(response => {
    const url = new URL(response.url())
    return url.pathname === adminPath && url.searchParams.get('name') === fixture.name
  })
  await page.getByPlaceholder('Buscar por nome…').fill(fixture.name)
  expect((await filteredList).status()).toBe(200)
  const row = page.getByRole('row').filter({ hasText: fixture.email })
  await expect(row.getByText(fixture.name, { exact: true })).toBeVisible()
  await expect(row.getByText(fixture.legalName, { exact: true })).toBeVisible()
  await row.getByTitle('Editar', { exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/admin/parceiros/${fixtureId}$`))
  await page.reload()
  await expect(page.getByPlaceholder('Razão Social', { exact: true })).toHaveValue(fixture.legalName)
  await expect(page.getByPlaceholder('e-mail', { exact: true })).toHaveValue(fixture.email)
})

test('API administrativa rejeita anônimo, JWT adulterado e cabeçalhos de papel forjados', { tag: '@api' }, async ({ request }) => {
  const admin = await authenticate(request, adminEmail, 'ADMIN')
  const partner = await authenticate(request, partnerEmail, 'PARTNER')
  const tutor = await authenticate(request, tutorEmail, 'CUSTOMER')
  const forged = { 'X-User-Role': 'ADMIN', 'X-User-Id': admin.id, 'X-User-Email': adminEmail }
  const [jwtHeader, jwtPayload, signature] = admin.token.split('.')
  const alteredSignature = (signature[0] === 'A' ? 'B' : 'A') + signature.slice(1)
  const invalid = { Authorization: `Bearer ${jwtHeader}.${jwtPayload}.${alteredSignature}` }

  for (const [label, headers, status] of [
    ['anônimo', {}, 401],
    ['cabeçalhos sem JWT', forged, 401],
    ['JWT adulterado', { ...invalid, ...forged }, 401],
    ['PARTNER', authorization(partner), 403],
    ['PARTNER com cabeçalhos forjados', { ...authorization(partner), ...forged }, 403],
    ['CUSTOMER', authorization(tutor), 403],
    ['CUSTOMER com cabeçalhos forjados', { ...authorization(tutor), ...forged }, 403],
  ] as const) {
    for (const path of [adminPath, `${adminPath}/${fixtureId}`]) {
      const response = await request.get(path, { headers })
      expect(response.status(), `${label} em ${path}`).toBe(status)
      expectNoPrivateData(await response.text())
    }
  }

  for (const credentials of [admin, partner, tutor]) {
    const headers = authorization(credentials)
    for (const path of ['/api/v1/partners', `/api/v1/partners/${fixtureId}`]) {
      const response = await request.get(path, { headers })
      expect(response.status(), `${credentials.role} em rota legada ${path}`).toBe(404)
      expectNoPrivateData(await response.text())
    }
  }

  const current = await request.get('/api/v1/partners/me', {
    headers: { ...authorization(partner), ...forged },
    params: { id: fixtureId },
  })
  expect([200, 404]).toContain(current.status())
  const currentBody = await current.text()
  expectNoPrivateData(currentBody)
  if (current.ok()) expect(JSON.parse(currentBody).id).not.toBe(fixtureId)
})

test('rota administrativa redireciona anônimo, parceiro e tutor; tutor mantém catálogo sem dados fiscais', async ({ page, request }) => {
  const adminPage = `/admin/parceiros/${fixtureId}`
  await page.goto(adminPage)
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText(fixture.legalName, { exact: true })).toHaveCount(0)

  await login(page, fixtureEmail, /\/partner\/dashboard$/)
  await page.goto(adminPage)
  await expect(page).toHaveURL(/\/partner\/dashboard$/)
  await expect(page.getByText(fixture.legalName, { exact: true })).toHaveCount(0)

  await page.evaluate(() => localStorage.clear())
  await login(page, tutorEmail, /\/app\/home$/)
  await page.goto(adminPage)
  await expect(page).toHaveURL(/\/app\/home$/)
  await expect(page.getByText(fixture.legalName, { exact: true })).toHaveCount(0)

  const headers = authorization(await authenticate(request, tutorEmail, 'CUSTOMER'))
  const list = await request.get(catalogPath, { headers, params: { name: fixture.name } })
  expect(list.status()).toBe(200)
  const listBody = await list.text()
  const entries = JSON.parse(listBody).content
  expect(entries).toHaveLength(1)
  expectCatalogFields(entries[0])
  expectNoPrivateData(listBody)
  const detail = await request.get(`${catalogPath}/${fixtureId}`, { headers })
  expect(detail.status()).toBe(200)
  const detailBody = await detail.text()
  expectCatalogFields(JSON.parse(detailBody))
  expectNoPrivateData(detailBody)

  await page.getByRole('searchbox', { name: 'Buscar no catálogo' }).fill(fixture.name)
  await page.getByRole('heading', { name: fixture.name, exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/app/parceiros/${fixtureId}$`))
  await expect(page.getByRole('heading', { name: fixture.name, exact: true })).toBeVisible()
  await expect(page.getByText(fixture.legalName, { exact: true })).toHaveCount(0)
  await expect(page.getByText(fixture.email, { exact: true })).toHaveCount(0)
})

test('galeria de design system carrega direto apenas para ADMIN', async ({ page }) => {
  await page.goto('/design-system')
  await expect(page).toHaveURL(/\/login$/)

  await login(page, fixtureEmail, /\/partner\/dashboard$/)
  await page.goto('/design-system')
  await expect(page).toHaveURL(/\/partner\/dashboard$/)

  await page.evaluate(() => localStorage.clear())
  await login(page, adminEmail, /\/admin\/visao-geral$/)
  await page.goto('/design-system')
  await expect(page.getByRole('heading', { name: 'Design system', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Design system', exact: true })).toBeVisible()
})
