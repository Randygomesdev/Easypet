import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { authenticate } from './authenticate'
import { ignoreHTTPSErrors } from './wave-b-fixtures'

const tutorEmail = 'tutor@example.test'
const partnerAEmail = 'parceiro-a@example.test'
const partnerBEmail = 'parceiro-b@example.test'
const reviewProject = process.env.E2E_REVIEW_PROJECT ?? ''

function reviewProbe(code: string, input?: object) {
  if (!/^easypet-e2e-[a-f0-9]{10}$/.test(reviewProject)) throw new Error('Projeto descartável inválido.')
  return execFileSync('docker', ['exec', '-i', `${reviewProject}-pet-fault-1`, 'node', '--input-type=module', '-e', code], {
    input: JSON.stringify(input ?? {}),
    encoding: 'utf8',
    timeout: 10_000,
  })
}

function serviceDirect(url: string, options?: { method?: string; headers?: Record<string, string>; data?: object }) {
  return JSON.parse(reviewProbe(`
    import { readFileSync } from 'node:fs'
    const { url, method, headers, data } = JSON.parse(readFileSync(0, 'utf8'))
    const response = await fetch(url, {
      method, headers, body: data ? JSON.stringify(data) : undefined,
      redirect: 'manual', signal: AbortSignal.timeout(5000),
    })
    const body = await response.text()
    console.log(JSON.stringify({ status: response.status, body }))
  `, { url, ...options }))
}

function password() {
  if (!process.env.E2E_TEST_PASSWORD) throw new Error('Execute npm run test:e2e para provisionar as contas.')
  return process.env.E2E_TEST_PASSWORD
}

async function login(page: Page, email: string, landing: RegExp) {
  await page.goto('/login')
  await page.getByPlaceholder('seu@email.com').fill(email)
  await page.locator('input[type=password]').fill(password())
  await page.getByRole('button', { name: 'Entrar no Easypet' }).click()
  await expect(page).toHaveURL(landing)
}

async function post(api: APIRequestContext, path: string, data: object, headers?: Record<string, string>) {
  const response = await api.post('/api/v1' + path, { data, headers })
  expect(response.ok(), `POST ${path} retornou ${response.status()}`).toBeTruthy()
  return response.json()
}

async function authorize(api: APIRequestContext, email: string) {
  const { token } = await authenticate(api, email, password())
  return { Authorization: `Bearer ${token}` }
}

function consultationDay() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(Date.now() + 2 * 86_400_000))
}

async function seedPartner(api: APIRequestContext, headers: Record<string, string>, name: string, cnpj: string) {
  const weekdays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
  const partner = await post(api, '/partners', {
    name, legalName: name, cnpj, latitude: -27.5, longitude: -48.5,
    businessHours: weekdays.map(dayOfWeek => ({
      dayOfWeek, businessStartHour: '08:00', businessEndHour: '18:00', closed: false,
    })),
  }, headers)
  const staff = await post(api, `/partners/${partner.id}/staff`, { name: 'Veterinária E2E', status: 'ACTIVE' }, headers)
  const categories = await api.get('/api/v1/categories', { headers })
  expect(categories.ok()).toBeTruthy()
  const category = (await categories.json()).find((item: { slug: string }) => item.slug === 'saude')
  expect(category).toBeDefined()
  await post(api, `/partners/${partner.id}/services`, {
    name: 'Consulta E2E', price: 60, durationMinutes: 30,
    billingUnit: 'HOURLY', categoryId: category.id, staffIds: [staff.id],
  }, headers)
  const schedule = await api.put(`/api/v1/partners/staff/${staff.id}/schedule`, {
    headers, data: weekdays.map((_, i) => ({ dayOfWeek: i + 1, startTime: '08:00', endTime: '18:00' })),
  })
  expect(schedule.ok()).toBeTruthy()
}

test.beforeAll(async ({ request }) => {
  const a = await authorize(request, partnerAEmail)
  const b = await authorize(request, partnerBEmail)
  // Playwright pode reiniciar o worker após uma falha no primeiro cenário.
  if ((await request.get('/api/v1/partners/me', { headers: a })).status() === 404) {
    await seedPartner(request, a, 'Clínica A E2E', '11111111000101')
  }
  if ((await request.get('/api/v1/partners/me', { headers: b })).status() === 404) {
    await post(request, '/partners', {
      name: 'Clínica B E2E', legalName: 'Clínica B E2E', cnpj: '11111111000102', latitude: -27.5, longitude: -48.5,
    }, b)
  }
})

test('tutor cadastra pet e reserva; parceiro registra e conclui o atendimento', async ({ page, browser, request, baseURL }) => {
  const date = consultationDay()
  const tutor = await authorize(request, tutorEmail)
  const partnerHeaders = await authorize(request, partnerAEmail)
  const partnerResponse = await request.get('/api/v1/partners/me', { headers: partnerHeaders })
  expect(partnerResponse.ok()).toBeTruthy()
  const partner = await partnerResponse.json()

  await login(page, tutorEmail, /\/app\/home$/)
  await page.getByRole('link', { name: 'Meus Pets' }).click()
  await page.getByRole('button', { name: 'Adicionar Pet' }).first().click()
  await page.getByPlaceholder('Ex: Rex').fill('Bidu E2E')
  await page.getByPlaceholder('Ex: Labrador').fill('SRD')
  await page.locator('input[type=date]').fill('2022-01-01')
  await page.getByPlaceholder('Ex: 12.5').fill('8')
  await page.getByRole('button', { name: 'Criar Pet' }).click()
  await expect(page).toHaveURL(/\/app\/pets$/)

  await page.goto(`/app/parceiros/${partner.id}`)
  await page.getByRole('button', { name: 'Agendar', exact: true }).click()
  await page.getByRole('combobox').selectOption({ label: 'Bidu E2E (Cão)' })
  await page.locator('input[type=date]').fill(date)
  await page.getByRole('button', { name: 'Ver horários' }).click()
  await page.getByRole('button', { name: '10:00', exact: true }).click()
  await page.getByRole('button', { name: 'Próximo' }).click()
  await page.getByRole('button', { name: 'Solicitar agendamento' }).click()
  await expect(page.getByText('Agendamento solicitado!')).toBeVisible()
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()

  const pendingBookings = await request.get('/api/v1/bookings/my-bookings', { headers: tutor })
  expect(pendingBookings.ok()).toBeTruthy()
  const [pending] = (await pendingBookings.json()).content
  expect(pending.status).toBe('PENDING')
  const bookingPath = `/api/v1/bookings/${pending.id}`
  const skipped = await request.patch(`${bookingPath}/status?status=COMPLETED`, { headers: partnerHeaders })
  expect(skipped.status()).toBe(400)
  expect((await skipped.json()).message).toContain('PENDING para COMPLETED')
  const stillPending = await request.get(bookingPath, { headers: tutor })
  expect(stillPending.ok()).toBeTruthy()
  expect((await stillPending.json()).status).toBe('PENDING')

  const partnerPage = await browser.newPage({ baseURL, ignoreHTTPSErrors, timezoneId: 'America/Sao_Paulo' })
  try {
    // A fila mostra o dia atual do navegador. Simula a chegada do dia da consulta.
    await partnerPage.clock.setFixedTime(new Date(`${date}T10:00:00-03:00`))
    await login(partnerPage, partnerAEmail, /\/partner\/dashboard$/)
    await partnerPage.getByRole('link', { name: 'Agendamentos' }).click()
    const row = partnerPage.getByRole('row').filter({ hasText: 'Bidu E2E' })
    await row.getByRole('button', { name: 'Confirmar', exact: true }).click()
    await expect(row.getByText('Confirmado', { exact: true })).toBeVisible()
    await row.getByRole('button', { name: 'Iniciar Atendimento' }).click()
    const visit = partnerPage.getByRole('button', { name: /Bidu E2E/ })
    await expect(visit.getByText('Em atendimento')).toBeVisible()
    await partnerPage.getByRole('button', { name: 'Observações da Consulta' }).click()
    await partnerPage.getByPlaceholder('Anamnese, diagnóstico, orientações…').fill('Registro clínico E2E')
    await partnerPage.getByRole('button', { name: 'Salvar Registro' }).click()
    await expect(partnerPage.getByText('Registro salvo com sucesso!')).toBeVisible()
    await partnerPage.getByRole('button', { name: 'Fechar painel' }).click()
    await partnerPage.getByRole('button', { name: 'Finalizar Atendimento' }).click()
    await expect(visit).toBeDisabled()
  } finally {
    await partnerPage.close()
  }

  await page.getByRole('link', { name: 'Agendamentos' }).click()
  const bookingCard = page.getByRole('button', { name: /Bidu E2E/ })
  await expect(bookingCard.getByText('Finalizado', { exact: true })).toBeVisible()
  await expect(bookingCard.getByText('Clínica A E2E', { exact: true })).toBeVisible()
  await expect(bookingCard.getByText('Consulta E2E', { exact: true })).toBeVisible()
  const bookings = await request.get('/api/v1/bookings/my-bookings', { headers: tutor })
  expect(bookings.ok()).toBeTruthy()
  const [booking] = (await bookings.json()).content
  expect(booking.id).toBe(pending.id)
  expect(booking.status).toBe('COMPLETED')
  const repeated = await request.patch(`${bookingPath}/status?status=COMPLETED`, { headers: partnerHeaders })
  expect(repeated.ok()).toBeTruthy()
  expect((await repeated.json()).status).toBe('COMPLETED')
  const reopened = await request.patch(`${bookingPath}/status?status=CONFIRMED`, { headers: partnerHeaders })
  expect(reopened.status()).toBe(400)
  const stillCompleted = await request.get(bookingPath, { headers: tutor })
  expect(stillCompleted.ok()).toBeTruthy()
  expect((await stillCompleted.json()).status).toBe('COMPLETED')
  const history = await request.get(`/api/v1/pets/${booking.petId}/history`, { headers: tutor })
  expect(history.ok()).toBeTruthy()
  expect((await history.json()).appointments).toEqual(expect.arrayContaining([
    expect.objectContaining({ bookingId: booking.id, source: 'PLATFORM', clinicalNotes: 'Registro clínico E2E' }),
  ]))
})

test('parceiro B não vê a reserva na agenda nem lê ou altera dados do parceiro A', async ({ page, request }) => {
  const tutor = await authorize(request, tutorEmail)
  const a = await authorize(request, partnerAEmail)
  const b = await authorize(request, partnerBEmail)
  const partnerResponse = await request.get('/api/v1/partners/me', { headers: a })
  expect(partnerResponse.ok()).toBeTruthy()
  const partner = await partnerResponse.json()
  const otherPartnerResponse = await request.get('/api/v1/partners/me', { headers: b })
  expect(otherPartnerResponse.ok()).toBeTruthy()
  const otherPartner = await otherPartnerResponse.json()
  const pet = await post(request, '/pets', {
    name: 'Pet Restrito E2E', species: 'DOG', breed: 'SRD', gender: 'MALE', weight: 8, birthDate: '2022-01-01',
  }, tutor)
  const date = consultationDay()
  const booking = await post(request, '/bookings', {
    petId: pet.id, partnerId: partner.id, serviceId: partner.services[0].id,
    bookingDate: `${date}T09:00:00`, type: 'CONSULTATION', price: 60,
  }, tutor)
  const path = `/api/v1/bookings/${booking.id}`
  expect((await request.get(path, { headers: a })).status()).toBe(200)
  expect((await request.get(`/api/v1/pets/${pet.id}/history`, { headers: a })).status()).toBe(200)

  await page.clock.setFixedTime(new Date(`${date}T09:00:00-03:00`))
  await login(page, partnerBEmail, /\/partner\/dashboard$/)
  const agenda = page.waitForResponse(response =>
    new URL(response.url()).pathname === `/api/v1/bookings/partner/${otherPartner.id}` && response.ok(),
  )
  await page.getByRole('link', { name: 'Agendamentos' }).click()
  const agendaResponse = await agenda
  expect((await agendaResponse.json()).content).toEqual([])
  await expect(page.getByText('Nenhum agendamento encontrado.', { exact: true }).filter({ visible: true })).toBeVisible()
  await expect(page.getByText('Pet Restrito E2E')).toHaveCount(0)

  expect((await request.get(path, { headers: b })).status()).toBe(404)
  expect((await request.patch(`${path}/status?status=CONFIRMED`, { headers: b })).status()).toBe(404)
  expect((await request.get(`/api/v1/pets/${pet.id}/history`, { headers: b })).status()).toBe(404)
  const unchanged = await request.get(path, { headers: a })
  expect((await unchanged.json()).status).toBe('PENDING')
})

test('balcão vincula tutor e pet ao estabelecimento e recusa acesso de outro parceiro', { tag: '@api' }, async ({ request }) => {
  const a = await authorize(request, partnerAEmail)
  const b = await authorize(request, partnerBEmail)
  const tutor = await authorize(request, tutorEmail)
  const customers = '/api/v1/partners/me/customers'
  const data = { name: 'Marina Balcão E2E', email: 'marina-balcao@example.test' }
  const created = await request.post(customers, { headers: a, data })
  expect(created.status()).toBe(201)
  const customer = await created.json()
  expect(customer).toMatchObject({ ...data, accountStatus: 'UNCLAIMED' })
  expect((await request.post(customers, { headers: a, data })).status()).toBe(409)
  expect((await request.get(`${customers}/${customer.id}`, { headers: b })).status()).toBe(404)
  expect((await request.get(customers, { headers: tutor })).status()).toBe(403)
  const admin = await authorize(request, 'admin@example.test')
  const adminPath = `/api/v1/admin/reception-customers/${customer.id}`
  const adminDetail = await request.get(adminPath, { headers: admin })
  expect(adminDetail.status()).toBe(200)
  expect(await adminDetail.json()).toMatchObject({ id: customer.id, partnerId: customer.partnerId })
  expect((await request.get(adminPath, { headers: a })).status()).toBe(403)

  const pets = `/api/v1/pets/reception/customers/${customer.id}`
  const pet = await request.post(pets, {
    headers: a,
    data: { name: 'Pipoca E2E', species: 'DOG', breed: 'SRD', gender: 'FEMALE', weight: 8.2, birthDate: '2022-04-10' },
  })
  expect(pet.status()).toBe(201)
  const { id } = await pet.json()
  const detail = await request.get(`${pets}/${id}`, { headers: a })
  expect(detail.status()).toBe(200)
  expect(await detail.json()).toMatchObject({ id, customerId: customer.id, partnerId: customer.partnerId })
  expect((await request.get(`${pets}/${id}`, { headers: b })).status()).toBe(404)
})

test('agenda disputa a última vaga e caixa registra baixa parcial idempotente', { tag: '@api' }, async ({ request }) => {
  const tutor = await authorize(request, tutorEmail)
  const a = await authorize(request, partnerAEmail)
  const b = await authorize(request, partnerBEmail)
  const partnerResponse = await request.get('/api/v1/partners/me', { headers: a })
  expect(partnerResponse.ok()).toBeTruthy()
  const partner = await partnerResponse.json()
  const pets = await Promise.all(['Pet Agenda A E2E', 'Pet Agenda B E2E'].map(name =>
    post(request, '/pets', { name, species: 'DOG', breed: 'SRD', gender: 'MALE', weight: 8, birthDate: '2022-01-01' }, tutor),
  ))
  const booking = {
    partnerId: partner.id, serviceId: partner.services[0].id,
    bookingDate: `${consultationDay()}T16:00:00`, type: 'CONSULTATION', price: 60,
  }
  const keys = [randomUUID(), randomUUID()]
  const reserve = (index: number) => request.post('/api/v1/bookings', {
    headers: { ...tutor, 'Idempotency-Key': keys[index] },
    data: { ...booking, petId: pets[index].id },
  })
  const attempts = await Promise.all([reserve(0), reserve(1)])
  expect(attempts.map(response => response.status()).sort()).toEqual([201, 409])
  const winner = attempts.findIndex(response => response.status() === 201)
  const { id: bookingId } = await attempts[winner].json()
  const repeated = await reserve(winner)
  expect(repeated.status()).toBe(201)
  expect(await repeated.json()).toMatchObject({ id: bookingId })
  expect((await request.patch(`/api/v1/bookings/${bookingId}/status?status=CONFIRMED`, { headers: a })).status()).toBe(200)

  const charges = '/api/v1/payments/cashier/charges'
  const charge = await request.post(charges, {
    headers: { ...a, 'Idempotency-Key': randomUUID() },
    data: { bookingId, description: 'Atendimento E2E', baseCents: 6000, extrasCents: 500, discountCents: 0 },
  })
  expect(charge.status()).toBe(200)
  const chargePath = `${charges}/${(await charge.json()).id}`
  const receive = () => request.post(`${chargePath}/receipts`, {
    headers: receiptHeaders,
    data: { method: 'PIX', amountCents: 4000 },
  })
  const receiptHeaders = { ...a, 'Idempotency-Key': randomUUID() }
  const receipt = await receive()
  const replay = await receive()
  expect(receipt.status()).toBe(200)
  expect(replay.status()).toBe(200)
  expect(await replay.json()).toEqual(await receipt.json())
  const detail = await request.get(chargePath, { headers: a })
  expect(detail.status()).toBe(200)
  expect(await detail.json()).toMatchObject({
    charge: { totalCents: 6500, receivedCents: 4000, balanceCents: 2500 },
    movements: [expect.objectContaining({ amountCents: 4000, type: 'RECEIPT' })],
  })
  expect((await request.get(chargePath, { headers: b })).status()).toBe(404)
  expect.soft((await request.get(chargePath)).status(), 'ausência de JWT no caixa').toBe(401)
  expect.soft((await request.get(chargePath, {
    headers: { Authorization: 'Bearer jwt-invalido' },
  })).status(), 'JWT inválido no caixa').toBe(401)
  const forbidden = await request.get(chargePath, { headers: tutor })
  expect.soft(forbidden.status(), 'JWT válido de tutor deve receber 403 conforme o contrato do caixa').toBe(403)
  if (reviewProject) {
    const directCharge = 'http://payment-service:8085' + chargePath
    expect.soft(serviceDirect(directCharge).status, 'Payment direto sem JWT').toBe(401)
    expect.soft(serviceDirect(directCharge, {
      headers: { Authorization: 'Bearer jwt-invalido' },
    }).status, 'Payment direto com JWT inválido').toBe(401)
    expect.soft(serviceDirect(directCharge, { headers: tutor }).status, 'Payment direto com JWT de tutor').toBe(403)
  }

  const dayPath = '/api/v1/payments/cashier/days'
  const dayResponse = await request.get(dayPath, { headers: a })
  expect(dayResponse.status()).toBe(200)
  const day = await dayResponse.json()
  expect(day).toMatchObject({ closedAt: null, totals: { netCents: 4000 } })
  const closed = await request.post(`${dayPath}/${day.businessDate}/close`, {
    headers: { ...a, 'Idempotency-Key': randomUUID() },
  })
  expect(closed.status()).toBe(200)
  const afterClose = await request.get(dayPath, { headers: a, params: { date: day.businessDate } })
  expect(afterClose.status()).toBe(200)
  expect(await afterClose.json()).toMatchObject({
    closedAt: expect.any(String),
    totals: { netCents: 4000 },
  })
})

test('Partner recusa a leitura fiscal legada na rede interna', { tag: '@api' }, async ({ request }) => {
  test.skip(!reviewProject, 'Requer o projeto descartável do aceite R01.')
  const owner = await authorize(request, partnerAEmail)
  const partner = await request.get('/api/v1/partners/me', { headers: owner })
  expect(partner.status()).toBe(200)
  const { id, cnpj, services } = await partner.json()
  const tutor = await authorize(request, tutorEmail)
  const other = await authorize(request, partnerBEmail)
  const admin = await authorize(request, 'admin@example.test')
  const partnerDirect = (path: string, headers?: Record<string, string>) =>
    serviceDirect('http://partner-service:8083/api/v1' + path, { headers })
  for (const path of ['/partners', `/partners/${id}`]) {
    expect(partnerDirect(path).status, `anônimo em ${path}`).toBe(401)
    for (const headers of [tutor, other]) {
      const result = partnerDirect(path, headers)
      expect(result.status, path).toBe(403)
      expect(result.body).not.toContain(cnpj)
    }
    expect(partnerDirect(path, admin).status, path).toBe(200)
  }
  expect(partnerDirect(`/partners/${id}`, owner).status).toBe(200)
  const internal = `/internal/partners/${id}/operations`
  expect(partnerDirect(internal).status).toBe(401)
  const projected = partnerDirect(internal, tutor)
  expect(projected.status).toBe(200)
  const body = JSON.parse(projected.body)
  expect(Object.keys(body).sort()).toEqual(['active', 'boardingCapacity', 'businessHours', 'id', 'name', 'services'])
  expect(body).toMatchObject({ id, active: true })
  expect(body.businessHours.length).toBeGreaterThan(0)
  expect(body.services).toContainEqual({
    id: services[0].id, name: 'Consulta E2E', price: 60, durationMinutes: 30, billingUnit: 'HOURLY',
  })
  expect((await request.get('/api/v1' + internal, { headers: tutor })).status()).toBe(404)

  // Creating a catalog template checks Payment's Partner client without granting credits.
  const templates = 'http://payment-service:8085/api/v1/payments/packages/templates'
  const template = serviceDirect(templates, {
    method: 'POST',
    headers: { ...owner, 'Content-Type': 'application/json' },
    data: { partnerId: id, serviceId: services[0].id, name: 'Modelo E2E', quantity: 2, price: 60, validityDays: 30 },
  })
  expect(template.status).toBe(201)
  const purchase = serviceDirect(`http://payment-service:8085/api/v1/payments/packages/purchase/${JSON.parse(template.body).id}`, {
    method: 'POST', headers: tutor,
  })
  expect(purchase.status).toBe(400)
})

test('timeout de Pet libera a agenda e permite repetir a reserva', { tag: '@api' }, async ({ request }) => {
  test.skip(!reviewProject, 'Requer a falha HTTP controlada do aceite R01.')
  const tutor = await authorize(request, tutorEmail)
  const owner = await authorize(request, partnerAEmail)
  const partnerResponse = await request.get('/api/v1/partners/me', { headers: owner })
  expect(partnerResponse.status()).toBe(200)
  const partner = await partnerResponse.json()
  const pet = await post(request, '/pets', {
    name: 'Pet Timeout E2E', species: 'DOG', breed: 'SRD', gender: 'MALE', weight: 8, birthDate: '2022-01-01',
  }, tutor)
  const key = randomUUID()
  const data = {
    partnerId: partner.id, serviceId: partner.services[0].id,
    bookingDate: `${consultationDay()}T17:00:00`, type: 'CONSULTATION', price: 60,
  }
  const reserve = (petId: string) => request.post('/api/v1/bookings', {
    headers: { ...tutor, 'Idempotency-Key': key }, data: { ...data, petId }, timeout: 12_000,
  })
  const start = Date.now()
  const stalled = reserve('00000000-0000-4000-8000-000000000099').then(
    response => ({ response, elapsed: Date.now() - start }), error => ({ error }),
  )
  await expect.poll(() => reviewProbe(`
    import { existsSync } from 'node:fs'
    console.log(existsSync('/tmp/easypet-pet-stalled'))
  `).trim(), { timeout: 7000 }).toBe('true')
  const recovered = reserve(pet.id)
  const result = await stalled
  if ('error' in result) throw result.error
  expect(result.response.status()).toBe(503)
  expect(result.elapsed).toBeLessThan(10_000)
  console.log(`Pet sem resposta: Booking retornou 503 em ${result.elapsed} ms.`)
  const response = await recovered
  expect(response.status()).toBe(201)
  expect(await response.json()).toMatchObject({ petId: pet.id, status: 'PENDING' })
})
